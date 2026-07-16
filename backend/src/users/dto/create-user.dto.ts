import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsUUID()
  roleId: string;

  @IsOptional()
  @IsUUID()
  employeeId?: string;
}
