import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'shrutitest2026@gmail.com' })
  @IsEmail()
  email!: string;
}
