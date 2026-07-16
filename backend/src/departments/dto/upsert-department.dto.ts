import { IsOptional, IsString, IsUUID } from 'class-validator';

export class UpsertDepartmentDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;

  @IsOptional()
  @IsUUID()
  headEmployeeId?: string;
}
