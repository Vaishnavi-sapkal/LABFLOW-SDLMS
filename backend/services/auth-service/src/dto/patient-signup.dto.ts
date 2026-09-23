import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEmail,
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const GENDERS = ['male', 'female', 'other'] as const;

export class PatientSignupDto {
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @Type(() => Date)
  @IsDate()
  dateOfBirth!: Date;

  @IsEnum(GENDERS)
  gender!: (typeof GENDERS)[number];

  @IsString()
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: 'mobile must be a valid phone number' })
  mobile!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsBoolean()
  consentToTesting!: boolean;

  @IsBoolean()
  consentToDetailsVerification!: boolean;
}
