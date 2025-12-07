import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class FieldDto {
  @IsString()
  label!: string;

  @IsString()
  @IsIn(['text', 'number', 'date', 'select', 'checkbox'])
  type!: 'text' | 'number' | 'date' | 'select' | 'checkbox';

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  options?: string[];
}