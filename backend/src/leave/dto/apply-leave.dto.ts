import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { LeaveDayType } from '@prisma/client';

export class ApplyLeaveDto {
  @IsUUID() leaveTypeId: string;
  @IsDateString() fromDate: string;
  @IsDateString() toDate: string;
  @IsOptional() @IsEnum(LeaveDayType) dayType?: LeaveDayType;
  @IsOptional() hours?: number;
  @IsOptional() @IsString() reason?: string;
  @IsOptional() @IsUUID() substituteId?: string;
  @IsOptional() @IsString({ each: true }) documentUrls?: string[];
}

export class ApprovalActionDto {
  @IsOptional() @IsString() comments?: string;
}
