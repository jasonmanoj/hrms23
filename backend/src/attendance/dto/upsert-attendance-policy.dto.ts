import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpsertAttendancePolicyDto {
  @IsString() name: string;
  @IsOptional() minimumWorkingHours?: number;
  @IsOptional() halfDayHours?: number;
  @IsOptional() @IsInt() @Min(0) gracePeriodMinutes?: number;
  @IsOptional() @IsInt() @Min(0) lateArrivalMarkAfterMinutes?: number;
  @IsOptional() @IsBoolean() overtimeEnabled?: boolean;
  @IsOptional() @IsBoolean() allowMultipleCheckIns?: boolean;
  @IsOptional() @IsInt() autoCheckoutAfterHours?: number;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
