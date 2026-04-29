import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export class CreateTipoEncaminhamentoDto {
  @IsString()
  @MaxLength(80)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  codigo?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#?[0-9a-fA-F]{3,8}$/, { message: 'Cor deve ser um HEX' })
  cor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ordem?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  ativo?: boolean;
}

export class UpdateTipoEncaminhamentoDto extends PartialType(CreateTipoEncaminhamentoDto) {}

export class ListTipoEncaminhamentoDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  search?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  ativo?: boolean;
}
