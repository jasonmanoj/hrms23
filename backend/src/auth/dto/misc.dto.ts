import { IsEmail, IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @IsString()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(10)
  password: string;
}

export class AcceptInvitationDto {
  @IsString()
  token: string;

  @IsString()
  @MinLength(10)
  password: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(10)
  newPassword: string;
}
