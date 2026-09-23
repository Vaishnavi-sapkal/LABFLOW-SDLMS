import { BadRequestException, Module, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { isValidObjectId, Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { User, UserDocument, UserSchema } from './auth.schema';
import { AuthController, HealthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { RegistrationGuard } from './registration.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
    }),

    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn:
            configService.get<string>('JWT_EXPIRES_IN') || '1d',
        },
      }),
    }),
  ],

  controllers: [AuthController, HealthController],

  providers: [
    {
      provide: 'AUTH_LOGIC',

      inject: [
        getModelToken(User.name),
        JwtService,
        ConfigService,
      ],

      useFactory: (
        userModel: Model<User>,
        jwtService: JwtService,
        configService: ConfigService,
      ) => {
        const sendVerificationEmail = async (user: UserDocument, token: string) => {
          const notificationServiceUrl = configService.get<string>('NOTIFICATION_SERVICE_URL');
          const internalSecret = configService.get<string>('INTERNAL_SERVICE_SECRET');
          const frontendUrl = configService.get<string>('FRONTEND_URL');
          if (!notificationServiceUrl || !internalSecret || !frontendUrl) return false;

          try {
            const response = await fetch(`${notificationServiceUrl.replace(/\/$/, '')}/notifications`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-internal-service-key': internalSecret,
              },
              body: JSON.stringify({
                userId: String(user._id),
                recipientEmail: user.email,
                role: 'patient',
                title: 'Verify your LabFlow email address',
                message: `Verify your LabFlow patient account: ${frontendUrl.replace(/\/$/, '')}/verify-email?token=${token}. This link expires in 30 minutes.`,
                category: 'registration',
                priority: 'normal',
              }),
            });
            if (!response.ok) return false;
            const notification = await response.json().catch(() => null);
            return notification?.emailStatus === 'sent';
          } catch {
            return false;
          }
        };

        return {

        // =========================
        // REGISTER
        // =========================
        register: async (data: any) => {
          const email = data.email.toLowerCase().trim();

          const existingUser = await userModel.findOne({ email });

          if (existingUser) {
            throw new Error('Email already registered');
          }

          const hashedPassword = await bcrypt.hash(
            data.password,
            10,
          );

          const user = await userModel.create({
            name: data.name,
            email,
            password: hashedPassword,
            role: data.role,
            isActive: true,
            emailVerified: true,
            mobile: data.mobile,
          });

          return {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            mobile: user.mobile,
          };
        },

        patientSignup: async (data: any) => {
          const email = data.email.toLowerCase().trim();
          const existingUser = await userModel.findOne({ email });
          if (existingUser) {
            if (existingUser.role === 'patient' && !existingUser.isActive && existingUser.emailVerified === false) {
              return {
                message: 'If an unverified patient account exists for this email, verification email processing has been requested.',
                verificationEmailSent: false,
              };
            }
            throw new Error('Email already registered');
          }

          const user = await userModel.create({
            name: data.fullName.trim(),
            email,
            password: await bcrypt.hash(data.password, 10),
            mobile: data.mobile.trim(),
            role: 'patient',
            isActive: false,
            emailVerified: false,
          });

          try {
            const patientServiceUrl = configService.get<string>('PATIENT_SERVICE_URL');
            const internalSecret = configService.get<string>('INTERNAL_SERVICE_SECRET');
            if (!patientServiceUrl || !internalSecret) {
              throw new ServiceUnavailableException('Patient registration is temporarily unavailable');
            }

            const profileResponse = await fetch(`${patientServiceUrl.replace(/\/$/, '')}/patients`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-internal-service-key': internalSecret,
              },
              body: JSON.stringify({
                fullName: data.fullName.trim(),
                dateOfBirth: data.dateOfBirth,
                gender: data.gender,
                mobile: data.mobile.trim(),
                email,
                consentToTesting: data.consentToTesting,
                consentToDetailsVerification: data.consentToDetailsVerification,
                userId: String(user._id),
              }),
            });
            if (!profileResponse.ok) {
              const profileError = await profileResponse.json().catch(() => ({}));
              throw new Error(typeof profileError?.message === 'string' ? profileError.message : 'Unable to create patient profile');
            }
          } catch (error) {
            await user.deleteOne();
            if (error instanceof ServiceUnavailableException) throw error;
            throw error;
          }

          const token = crypto.randomBytes(32).toString('hex');
          user.verificationTokenHash = crypto.createHash('sha256').update(token).digest('hex');
          user.verificationTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
          await user.save();

          const verificationEmailSent = await sendVerificationEmail(user, token);
          return {
            message: verificationEmailSent
              ? 'Registration successful. Please verify your email before logging in.'
              : 'Registration is pending. We could not complete email delivery; please use resend verification.',
            verificationEmailSent,
          };
        },

        verifyEmail: async (data: any) => {
          const verificationTokenHash = crypto.createHash('sha256').update(data.token).digest('hex');
          const user = await userModel.findOne({
            role: 'patient',
            isActive: false,
            emailVerified: false,
            verificationTokenHash,
            verificationTokenExpiresAt: { $gt: new Date() },
          });
          if (!user) throw new Error('Invalid or expired verification token');

          user.emailVerified = true;
          user.isActive = true;
          user.verificationTokenHash = undefined;
          user.verificationTokenExpiresAt = undefined;
          await user.save();
          return { message: 'Email verified successfully. You can now log in to LabFlow.' };
        },

        resendVerification: async (data: any) => {
          const response = { message: 'If an unverified patient account exists for this email, verification email processing has been requested.' };
          const email = data.email.toLowerCase().trim();
          const user = await userModel.findOne({ email, role: 'patient', isActive: false, emailVerified: false });
          if (!user) return response;

          const token = crypto.randomBytes(32).toString('hex');
          user.verificationTokenHash = crypto.createHash('sha256').update(token).digest('hex');
          user.verificationTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
          await user.save();
          await sendVerificationEmail(user, token);
          return response;
        },

        // =========================
        // LOGIN
        // =========================
        login: async (data: any) => {
          const email = data.email.toLowerCase().trim();

          const user = await userModel.findOne({ email });

          if (!user) {
            throw new Error('Invalid email or password');
          }

          const isPasswordValid = await bcrypt.compare(
            data.password,
            user.password,
          );

          if (!isPasswordValid) {
            throw new Error('Invalid email or password');
          }

          if (user.role === 'patient' && user.emailVerified === false) {
            throw new Error('Please verify your email before logging in');
          }

          if (!user.isActive) {
            throw new Error('User account is inactive');
          }

          const payload = {
            sub: user._id,
            email: user.email,
            role: user.role,
          };

          const accessToken = jwtService.sign(payload);

          return {
            access_token: accessToken,
            user: {
              id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
              isActive: user.isActive,
              mobile: user.mobile,
            },
          };
        },

        forgotPassword: async (data: any) => {
          const email = data.email.toLowerCase().trim();
          const user = await userModel.findOne({ email });
          const response = {
            message: 'If an account exists for that email, a password reset link has been sent.',
          };

          if (!user || !user.isActive) {
            return response;
          }

          const token = crypto.randomBytes(32).toString('hex');
          user.resetPasswordTokenHash = crypto.createHash('sha256').update(token).digest('hex');
          user.resetPasswordExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
          await user.save();

          try {
            await fetch(`${configService.get<string>('NOTIFICATION_SERVICE_URL')}/notifications`, {
              method: 'POST',
              headers: {
                'x-internal-service-key': configService.get<string>('INTERNAL_SERVICE_SECRET') ?? '',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                recipientEmail: user.email,
                role: user.role,
                title: 'Reset your LabFlow password',
                message: `Use this link to reset your password: ${configService.get<string>('FRONTEND_URL')}/reset-password?token=${token}. This link expires in 30 minutes. If you did not request this, ignore this email.`,
                category: 'registration',
                priority: 'normal',
              }),
            });
          } catch (error) {
            console.error('Failed to send password reset notification', error);
          }

          return response;
        },

        resetPassword: async (data: any) => {
          const resetPasswordTokenHash = crypto.createHash('sha256').update(data.token).digest('hex');
          const user = await userModel.findOne({
            resetPasswordTokenHash,
            resetPasswordExpiresAt: { $gt: new Date() },
          });

          if (!user) {
            throw new Error('Invalid or expired reset token');
          }

          user.password = await bcrypt.hash(data.newPassword, 10);
          user.resetPasswordTokenHash = undefined;
          user.resetPasswordExpiresAt = undefined;
          await user.save();

          return { message: 'Password reset successfully' };
        },

        listUsers: async () => {
          const users = await userModel.find().select('-password').sort({ createdAt: -1 }).lean().exec();
          return users.map((user: any) => ({
            id: String(user._id), name: user.name, email: user.email, role: user.role, isActive: user.isActive, mobile: user.mobile,
          }));
        },

        getActiveUser: async (userId: string) => {
          const user = await userModel.findById(userId).select('-password').lean().exec();
          if (!user || !user.isActive) throw new Error('User account is inactive');
          return { userId: String(user._id), email: user.email, role: user.role };
        },

        getMe: async (userId: string) => {
          const user = await userModel.findById(userId).exec();
          if (!user) throw new NotFoundException('User account was not found');
          return {
            id: String(user._id),
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            mobile: user.mobile,
          };
        },

        updateMe: async (userId: string, dto: any) => {
          const user = await userModel.findById(userId).exec();
          if (!user) throw new NotFoundException('User account was not found');

          if (dto.name !== undefined) user.name = dto.name;
          if (dto.mobile !== undefined) user.mobile = dto.mobile;

          await user.save();

          return {
            id: String(user._id),
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            mobile: user.mobile,
          };
        },

        changePassword: async (userId: string, dto: any) => {
          const user = await userModel.findById(userId).exec();
          if (!user) throw new NotFoundException('User account was not found');

          const currentPasswordMatches = await bcrypt.compare(dto.currentPassword, user.password);
          if (!currentPasswordMatches) throw new Error('Current password is incorrect');

          user.password = await bcrypt.hash(dto.newPassword, 10);
          await user.save();

          return { message: 'Password updated successfully' };
        },

        deleteUser: async (id: string, actorUserId: string) => {
          if (!isValidObjectId(id)) throw new BadRequestException('A valid user ID is required');
          if (String(id) === String(actorUserId)) {
            throw new Error('You cannot delete your own account while logged in.');
          }

          const user = await userModel.findById(id).exec();
          if (!user) throw new NotFoundException('User account was not found');

          // Fail closed: an interrupted deletion leaves a disabled account, never an
          // active account whose profile has already been removed/deactivated.
          if (user.isActive) {
            user.isActive = false;
            await user.save();
          }

          const internalSecret = configService.get<string>('INTERNAL_SERVICE_SECRET');
          if (!internalSecret) throw new ServiceUnavailableException('INTERNAL_SERVICE_SECRET is not configured');
          const baseUrl = user.role === 'doctor'
            ? configService.get<string>('DOCTOR_SERVICE_URL') ?? 'http://localhost:3005'
            : configService.get<string>('PATIENT_SERVICE_URL') ?? 'http://localhost:3002';
          const path = user.role === 'doctor'
            ? `/doctors/by-user/${encodeURIComponent(String(user._id))}/deactivate`
            : `/patients/by-user/${encodeURIComponent(String(user._id))}`;

          if (user.role === 'doctor' || user.role === 'patient') {
            let response: Response;
            try {
              response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
                method: user.role === 'doctor' ? 'PATCH' : 'DELETE',
                headers: { 'x-internal-service-key': internalSecret },
              });
            } catch {
              throw new ServiceUnavailableException(`Unable to contact the ${user.role} service`);
            }
            if (!response.ok) {
              throw new ServiceUnavailableException(`Unable to ${user.role === 'doctor' ? 'deactivate the doctor profile' : 'delete the patient profile'}`);
            }
          }

          await user.deleteOne();
          return { deleted: true, id: String(user._id), role: user.role };
        },
        };
      },
    },

    // =========================
    // JWT STRATEGY
    // =========================
    JwtStrategy,
    RegistrationGuard,
  ],
})
export class AuthModule {}
