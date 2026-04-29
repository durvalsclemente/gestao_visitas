import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { VisitaTipo } from '@prisma/client';

export class DesignarVisitaDto {
  /** Solicitação de origem (deve estar APROVADA). */
  @IsUUID()
  solicitacaoId!: string;

  @IsUUID()
  visitadorId!: string;

  @IsOptional()
  @IsUUID()
  visitadorSecundarioId?: string;

  @IsEnum(VisitaTipo)
  tipo!: VisitaTipo;

  @IsDateString()
  dataAgendada!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duracaoMinutos?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  endereco?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string;
}
