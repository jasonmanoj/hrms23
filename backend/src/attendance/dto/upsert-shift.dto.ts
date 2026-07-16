import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpsertShiftDto {
  @IsString() name: string;
  @IsString() startTime: string;
  @IsString() endTime: string;
  @IsOptional() @IsInt() @Min(0) gracePeriodMinutes?: number;
  @IsOptional() @IsInt() @Min(0) breakMinutes?: number;
  @IsOptional() minimumHours?: number;
  @IsOptional() halfDayHours?: number;
  @IsOptional() @IsBoolean() overtimeEligible?: boolean;
}
