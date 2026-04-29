import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAcaoDto {
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  descricao!: string;

  @IsOptional()
  @IsString()
  responsavelExternalUserId?: string;

  @IsOptional()
  @IsDateString()
  prazo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ordem?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  concluida?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string;
}

export class UpdateAcaoDto extends PartialType(CreateAcaoDto) {}
