import { IsDateString, IsEmail, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { EmploymentType, Gender, MaritalStatus } from '@prisma/client';

export class UpsertEmployeeDto {
  @IsOptional() @IsString() employeeNumber?: string;

  @IsString() firstName: string;
  @IsOptional() @IsString() middleName?: string;
  @IsString() lastName: string;
  @IsOptional() @IsString() profilePhotoUrl?: string;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @IsEnum(MaritalStatus) maritalStatus?: MaritalStatus;
  @IsOptional() @IsEmail() personalEmail?: string;
  @IsOptional() @IsString() mobileNumber?: string;
  @IsOptional() @IsString() emergencyContactName?: string;
  @IsOptional() @IsString() emergencyContactPhone?: string;
  @IsOptional() @IsString() residentialAddress?: string;

  @IsOptional() @IsDateString() dateOfJoining?: string;
  @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType;
  @IsOptional() @IsDateString() probationStart?: string;
  @IsOptional() @IsDateString() probationEnd?: string;
  @IsOptional() @IsDateString() confirmationDate?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() designationId?: string;
  @IsOptional() @IsUUID() reportingManagerId?: string;
  @IsOptional() @IsUUID() locationId?: string;
  @IsOptional() @IsUUID() businessUnitId?: string;
  @IsOptional() @IsUUID() costCenterId?: string;
  @IsOptional() @IsUUID() gradeId?: string;
  @IsOptional() noticePeriodDays?: number;
  @IsOptional() @IsDateString() lastWorkingDate?: string;

  @IsOptional() @IsString() passportNumber?: string;
  @IsOptional() @IsDateString() passportExpiry?: string;
  @IsOptional() @IsString() visaNumber?: string;
  @IsOptional() @IsDateString() visaExpiry?: string;
  @IsOptional() @IsString() nationalIdNumber?: string;
  @IsOptional() @IsString() labourCardNumber?: string;
  @IsOptional() @IsDateString() labourCardExpiry?: string;
  @IsOptional() @IsString() drivingLicenceNumber?: string;
  @IsOptional() @IsString() taxIdNumber?: string;
  @IsOptional() @IsString() workPermitDetails?: string;

  // Sensitive - only applied when caller has employee-sensitive-fields:EDIT permission.
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() accountHolderName?: string;
  @IsOptional() @IsString() accountNumber?: string;
  @IsOptional() @IsString() iban?: string;
  @IsOptional() @IsString() swiftCode?: string;
  @IsOptional() @IsString() salaryCurrency?: string;
  @IsOptional() basicSalary?: number;
  @IsOptional() allowances?: number;
  @IsOptional() deductions?: number;
}
