import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  newPassword!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  confirmNewPassword!: string;
}
