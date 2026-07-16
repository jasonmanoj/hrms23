import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RegularizationType } from '@prisma/client';

export class RequestRegularizationDto {
  @IsString() date: string;
  @IsEnum(RegularizationType) type: RegularizationType;
  @IsOptional() @IsString() requestedCheckIn?: string;
  @IsOptional() @IsString() requestedCheckOut?: string;
  @IsString() reason: string;
}

export class ResolveRegularizationDto {
  @IsOptional() @IsString() comments?: string;
}
