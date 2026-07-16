import { IsNumber, IsString, IsUUID } from 'class-validator';

export class AdjustBalanceDto {
  @IsUUID() employeeId: string;
  @IsUUID() leaveTypeId: string;
  @IsNumber() amount: number; // positive to credit, negative to debit
  @IsString() note: string;
}
