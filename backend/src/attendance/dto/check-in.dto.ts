import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CheckInDto {
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsIn(['WEB_PORTAL', 'MOBILE_APP']) source?: 'WEB_PORTAL' | 'MOBILE_APP';
}

export class CheckOutDto {
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() notes?: string;
}

export class UpsertAttendanceDto {
  @IsString() employeeId: string;
  @IsString() date: string;
  @IsOptional() @IsString() checkInAt?: string;
  @IsOptional() @IsString() checkOutAt?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() notes?: string;
}
