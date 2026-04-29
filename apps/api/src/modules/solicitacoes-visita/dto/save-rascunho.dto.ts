import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { FrequenciaFatoGerador } from '@prisma/client';

/**
 * Diferente do Create: TUDO é opcional para permitir salvar rascunho
 * mesmo com o formulário incompleto. A consistência só é exigida
 * no envio para triagem.
 */
export class SaveRascunhoDto {
  @IsOptional()
  @IsUUID()
  assistidoId?: string;

  @IsOptional()
  @IsUUID()
  programaId?: string;

  @IsOptional()
  @IsUUID()
  motivoPrincipalId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  @ArrayUnique()
  motivosSecundariosIds?: string[];

  @IsOptional()
  @IsUUID()
  prioridadeId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descricaoDetalhada?: string;

  @IsOptional()
  @IsDateString()
  dataFatoGerador?: string;

  @IsOptional()
  @IsEnum(FrequenciaFatoGerador)
  frequencia?: FrequenciaFatoGerador;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  acoesJaRealizadas?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  riscoImediato?: boolean;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  necessidadeAvaliacaoTecnica?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sugestaoPerfilVisitador?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string;
}
