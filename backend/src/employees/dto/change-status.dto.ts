import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EmployeeStatus } from '@prisma/client';

export class ChangeStatusDto {
  @IsEnum(EmployeeStatus)
  status: EmployeeStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}
