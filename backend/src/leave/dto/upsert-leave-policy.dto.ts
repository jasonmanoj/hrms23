import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

class PolicyRuleDto {
  @IsUUID() leaveTypeId: string;
  @IsOptional() annualEntitlementOverride?: number;
}

export class UpsertLeavePolicyDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PolicyRuleDto)
  rules: PolicyRuleDto[];
}

export class AssignLeavePolicyDto {
  @IsUUID() employeeId: string;
  @IsUUID() leavePolicyId: string;
}
