import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { PermissionAction } from '@prisma/client';

class PermissionGrantDto {
  @IsString()
  module: string;

  @IsEnum(PermissionAction, { each: true })
  @IsArray()
  actions: PermissionAction[];
}

export class UpsertRoleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => PermissionGrantDto)
  permissions: PermissionGrantDto[];
}
