import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Gender } from '@prisma/client';

export class UpsertLeaveTypeDto {
  @IsString() name: string;
  @IsString() code: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isPaid?: boolean;
  @IsOptional() annualEntitlement?: number;
  @IsOptional() @IsEnum(['MONTHLY', 'YEARLY']) accrualFrequency?: string;
  @IsOptional() @IsBoolean() allowHalfDay?: boolean;
  @IsOptional() @IsBoolean() allowHourly?: boolean;
  @IsOptional() carryForwardLimit?: number;
  @IsOptional() @IsBoolean() allowEncashment?: boolean;
  @IsOptional() @IsBoolean() allowNegativeBalance?: boolean;
  @IsOptional() @IsEnum(Gender) applicableGender?: Gender;
  @IsOptional() @IsInt() requiresDocumentAboveDays?: number;
  @IsOptional() @IsInt() maxConsecutiveDays?: number;
  @IsOptional() @IsInt() @Min(0) minServiceDays?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
