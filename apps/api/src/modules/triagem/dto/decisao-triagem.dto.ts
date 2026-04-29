import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TriagemComplexidade, TriagemDecisao } from '@prisma/client';

export class DecisaoTriagemDto {
  @IsEnum(TriagemComplexidade)
  complexidade!: TriagemComplexidade;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  tipoAtendimentoIndicado?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  necessidadeDuplaVisita?: boolean;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  necessidadePsicologo?: boolean;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  necessidadeAssistenteSocial?: boolean;

  @IsOptional()
  @IsDateString()
  dataLimiteRecomendada?: string;

  @IsString()
  @MinLength(10, { message: 'Justificativa técnica precisa ter pelo menos 10 caracteres' })
  @MaxLength(5000)
  justificativaTecnica!: string;

  @IsEnum(TriagemDecisao)
  decisao!: TriagemDecisao;

  /** Obrigatório quando decisao=RECLASSIFICAR_PRIORIDADE. Validado no service. */
  @IsOptional()
  @IsUUID()
  prioridadeReclassificadaId?: string;

  /** Obrigatório quando decisao=ENCAMINHAR_OUTRO_SETOR. Validado no service. */
  @IsOptional()
  @IsUUID()
  setorEncaminhamentoId?: string;
}
