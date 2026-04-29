import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { ProgramaTipo } from '@prisma/client';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export class CreateProgramaDto {
  @IsString()
  @MaxLength(120)
  nome!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  codigo?: string;

  @IsOptional()
  @IsEnum(ProgramaTipo)
  tipo?: ProgramaTipo;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string;

  @IsOptional()
  @IsString()
  @Matches(/^#?[0-9a-fA-F]{3,8}$/, { message: 'Cor deve ser um HEX' })
  cor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cargaHoraria?: number;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  ativo?: boolean;
}

export class UpdateProgramaDto extends PartialType(CreateProgramaDto) {}

export class ListProgramaDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(ProgramaTipo)
  tipo?: ProgramaTipo;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  ativo?: boolean;
}
