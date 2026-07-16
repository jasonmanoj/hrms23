import { IsString } from 'class-validator';

export class UpsertDesignationDto {
  @IsString()
  title: string;
}
