import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { NivelSigilo, TipoDocumento } from '@prisma/client';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

/**
 * Limite por arquivo aceito por documento (10 MB).
 * Validação de tamanho real do binário fica para o pipeline de
 * upload; aqui validamos só o `tamanho` declarado no metadata.
 */
export const DOCUMENTO_MAX_SIZE = 10 * 1024 * 1024;

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'text/plain',
  'text/csv',
];

export class CreateDocumentoDto {
  @IsString()
  @MinLength(2)
  @MaxLength(180)
  nome!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @MaxLength(120)
  mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(DOCUMENTO_MAX_SIZE)
  tamanho!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  hash?: string;

  @IsOptional()
  @IsEnum(TipoDocumento)
  tipo?: TipoDocumento;

  @IsOptional()
  @IsEnum(NivelSigilo)
  sigilo?: NivelSigilo;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string;

  // ----- Vínculos (informe APENAS UM) -----
  @IsOptional()
  @IsUUID()
  assistidoId?: string;

  @IsOptional()
  @IsUUID()
  solicitacaoId?: string;

  @IsOptional()
  @IsUUID()
  visitaId?: string;

  @IsOptional()
  @IsUUID()
  relatorioId?: string;

  @IsOptional()
  @IsUUID()
  planoAcaoId?: string;
}

export class UpdateDocumentoDto extends PartialType(CreateDocumentoDto) {}

export class ListDocumentosDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(TipoDocumento)
  tipo?: TipoDocumento;

  @IsOptional()
  @IsEnum(NivelSigilo)
  sigilo?: NivelSigilo;

  @IsOptional()
  @IsUUID()
  assistidoId?: string;

  @IsOptional()
  @IsUUID()
  solicitacaoId?: string;

  @IsOptional()
  @IsUUID()
  visitaId?: string;

  @IsOptional()
  @IsUUID()
  relatorioId?: string;

  @IsOptional()
  @IsUUID()
  planoAcaoId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  apenasMeus?: boolean;
}
