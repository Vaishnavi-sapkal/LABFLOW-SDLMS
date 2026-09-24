import {
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Inject,
  InternalServerErrorException,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { LoginUserDto } from './dto/login-user.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PatientSignupDto } from './dto/patient-signup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RegistrationGuard } from './registration.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject('AUTH_LOGIC')
    private readonly authLogic: any,
  ) {}

  // =========================
  // REGISTER
  // =========================

  @Post('register')
  @UseGuards(RegistrationGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create an account (admin; receptionist may create patients only)',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
  })
  async register(@Body() data: RegisterUserDto) {
    try {
      return await this.authLogic.register(data);
    } catch (error) {
      if (error instanceof Error && error.message === 'Email already registered') {
        throw new ConflictException(error.message);
      }

      throw new InternalServerErrorException();
    }
  }

  @Post('patient-signup')
  @ApiOperation({ summary: 'Register a patient account pending email verification' })
  async patientSignup(@Body() data: PatientSignupDto) {
    try {
      return await this.authLogic.patientSignup(data);
    } catch (error) {
      if (error instanceof Error && error.message === 'Email already registered') {
        throw new ConflictException(error.message);
      }
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) throw error;
      throw new InternalServerErrorException('Unable to create the patient account');
    }
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify a patient email address using a verification token' })
  async verifyEmail(@Body() data: VerifyEmailDto) {
    try {
      return await this.authLogic.verifyEmail(data);
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid or expired verification token') {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Unable to verify email');
    }
  }

  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend a patient email verification link' })
  async resendVerification(@Body() data: ResendVerificationDto) {
    try {
      return await this.authLogic.resendVerification(data);
    } catch {
      // Keep the response generic to avoid account enumeration.
      return { message: 'If an unverified patient account exists for this email, verification email processing has been requested.' };
    }
  }

  // =========================
  // LOGIN
  // =========================

  @Post('login')
  @ApiOperation({
    summary: 'Login user and generate JWT token',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful and JWT token generated',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password',
  })
  async login(@Body() data: LoginUserDto) {
    try {
      return await this.authLogic.login(data);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message === 'Invalid email or password' ||
          error.message === 'User account is inactive' ||
          error.message === 'Please verify your email before logging in')
      ) {
        throw new UnauthorizedException(error.message);
      }

      throw new InternalServerErrorException();
    }
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Send a password reset link',
  })
  @ApiResponse({
    status: 201,
    description: 'Password reset link request processed',
  })
  async forgotPassword(@Body() data: ForgotPasswordDto) {
    try {
      return await this.authLogic.forgotPassword(data);
    } catch {
      throw new InternalServerErrorException();
    }
  }

  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset a password using a reset token',
  })
  @ApiResponse({
    status: 201,
    description: 'Password reset successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired reset token',
  })
  async resetPassword(@Body() data: ResetPasswordDto) {
    try {
      return await this.authLogic.resetPassword(data);
    } catch (error) {
      if (error instanceof Error && error.message === 'Invalid or expired reset token') {
        throw new BadRequestException(error.message);
      }

      throw new InternalServerErrorException();
    }
  }

  // =========================
  // JWT PROTECTED ENDPOINT
  // =========================

  @Get('protected')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Test JWT protected endpoint',
  })
  @ApiResponse({
    status: 200,
    description: 'JWT token is valid',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async getProtected(@Req() req: any) {
    try {
      return { message: 'JWT authentication successful', user: await this.authLogic.getActiveUser(req.user.userId) };
    } catch (error) {
      if (error instanceof Error && error.message === 'User account is inactive') {
        throw new UnauthorizedException(error.message);
      }
      throw new InternalServerErrorException('Unable to validate the user account');
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get the current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile returned',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid, missing, or inactive JWT user',
  })
  async getMe(@Req() req: any) {
    try {
      return await this.authLogic.getMyProfile(req.user.userId);
    } catch (error) {
      if (error instanceof Error && error.message === 'User account is inactive') {
        throw new UnauthorizedException(error.message);
      }
      throw new InternalServerErrorException('Unable to validate the user account');
    }
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update the current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile updated',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid, missing, or inactive JWT user',
  })
  async updateMe(@Req() req: any, @Body() data: UpdateMeDto) {
    try {
      return await this.authLogic.updateMyProfile(req.user.userId, data);
    } catch (error) {
      if (error instanceof Error && error.message === 'User account is inactive') {
        throw new UnauthorizedException(error.message);
      }
      throw new InternalServerErrorException('Unable to update the user account');
    }
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change the current user password' })
  @ApiResponse({
    status: 201,
    description: 'Password updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'New password validation failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid credentials or inactive JWT user',
  })
  async changePassword(@Req() req: any, @Body() data: ChangePasswordDto) {
    try {
      return await this.authLogic.changeMyPassword(req.user.userId, data);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      if (error instanceof Error && error.message === 'User account is inactive') {
        throw new UnauthorizedException(error.message);
      }
      throw new InternalServerErrorException('Unable to update the password');
    }
  }

  // =========================
  // ADMIN ONLY ENDPOINT
  // =========================

  @Get('admin-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Test admin-only access',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin access granted',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - JWT token missing or invalid',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
  })
  getAdminTest(@Req() req: any) {
    return {
      message: 'Admin access granted',
      user: req.user,
    };
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List user accounts (admin only)' })
  listUsers() {
    return this.authLogic.listUsers();
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Hard-delete a user account and clean up its linked profile' })
  async deleteUser(@Param('id') id: string, @Req() request: any) {
    try {
      return await this.authLogic.deleteUser(id, request.user.userId);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException || error instanceof ServiceUnavailableException) throw error;
      if (error instanceof Error && error.message === 'You cannot delete your own account while logged in.') {
        throw new BadRequestException(error.message);
      }
      throw new InternalServerErrorException('Unable to delete the user account');
    }
  }
}

@ApiTags('Health')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Check auth service health' })
  health() {
    return { status: 'ok', service: 'auth' };
  }
}
