import { IsEmail, IsString, MinLength } from 'class-validator';

export class SignupDto {
  @IsString()
  @MinLength(2)
  organizationName: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @MinLength(10)
  adminPassword: string;

  @IsString()
  adminFirstName: string;

  @IsString()
  adminLastName: string;
}
