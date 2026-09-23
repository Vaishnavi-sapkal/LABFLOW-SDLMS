import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AuthGuard } from '@nestjs/passport';
import { Model } from 'mongoose';
import { User, UserDocument } from './auth.schema';

@Injectable()
export class RegistrationGuard extends AuthGuard('jwt') implements CanActivate {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    // A public patient may register before the laboratory has created its first
    // staff account. Keep the initial-admin bootstrap available in that case.
    const userCount = await this.userModel.countDocuments({ role: { $ne: 'patient' } });

    // The only anonymous staff registration permitted is initial system setup.
    if (userCount === 0) {
      if (request.body?.role !== 'admin') {
        throw new ForbiddenException('Only the first account may be created without authentication, and it must be an admin');
      }
      return true;
    }

    const authenticated = await super.canActivate(context);
    if (!authenticated) return false;

    const actor = request.user;
    if (actor?.role === 'admin') return true;
    if (actor?.role === 'receptionist' && request.body?.role === 'patient') return true;

    throw new ForbiddenException('Only admins may create staff accounts; receptionists may create patient accounts');
  }
}
