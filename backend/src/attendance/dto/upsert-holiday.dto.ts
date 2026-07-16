import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpsertHolidayDto {
  @IsString() name: string;
  @IsDateString() date: string;
  @IsOptional() @IsUUID() locationId?: string;
}
