import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegistrarAcompanhamentoDto {
  @IsString()
  @MinLength(5)
  @MaxLength(5000)
  evolucao!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  dificuldades?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  proximosPassos?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  necessitaNovaVisita?: boolean;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  encerraCaso?: boolean;
}
