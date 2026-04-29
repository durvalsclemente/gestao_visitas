import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  Criticidade,
  MotivoNaoRealizacao,
  SituacaoVisita,
  StatusCaso,
} from '@prisma/client';

const HORA_HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * Salvamento parcial do relatório (rascunho do wizard). Tudo opcional —
 * a validação completa só ocorre na rota `finalizar`.
 */
export class UpdateRelatorioVisitaDto {
  // Identificação
  @IsOptional()
  @IsDateString()
  dataExecucao?: string;

  @IsOptional()
  @IsString()
  @Matches(HORA_HHMM, { message: 'horaInicio deve estar em HH:mm' })
  horaInicio?: string;

  @IsOptional()
  @IsString()
  @Matches(HORA_HHMM, { message: 'horaFim deve estar em HH:mm' })
  horaFim?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  presencaFamilia?: boolean;

  // Situação
  @IsOptional()
  @IsEnum(SituacaoVisita)
  situacao?: SituacaoVisita;

  @IsOptional()
  @IsEnum(MotivoNaoRealizacao)
  motivoNaoRealizacao?: MotivoNaoRealizacao;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoesNaoRealizacao?: string;

  // Avaliação técnica
  @IsOptional() @IsString() @MaxLength(5000) condicoesResidencia?: string;

  /** Array livre de membros da família — `[{ nome, idade?, vinculo? }]`. */
  @IsOptional()
  @IsObject({ each: false })
  composicaoFamiliar?: unknown;

  @IsOptional() @IsString() @MaxLength(5000) higiene?: string;
  @IsOptional() @IsString() @MaxLength(5000) alimentacao?: string;
  @IsOptional() @IsString() @MaxLength(5000) condicoesEmocionais?: string;
  @IsOptional() @IsString() @MaxLength(5000) relacoesFamiliares?: string;
  @IsOptional() @IsString() @MaxLength(5000) redeApoio?: string;
  @IsOptional() @IsString() @MaxLength(5000) vulnerabilidade?: string;
  @IsOptional() @IsString() @MaxLength(5000) comportamentoAssistido?: string;
  @IsOptional() @IsString() @MaxLength(10000) relatos?: string;
  @IsOptional() @IsString() @MaxLength(5000) dificuldades?: string;
  @IsOptional() @IsString() @MaxLength(5000) impactosOsc?: string;
  @IsOptional() @IsString() @MaxLength(10000) analiseTecnica?: string;
  @IsOptional() @IsString() @MaxLength(5000) fatoresAgravantes?: string;
  @IsOptional() @IsString() @MaxLength(5000) fatoresProtetivos?: string;
  @IsOptional() @IsString() @MaxLength(5000) recomendacoes?: string;
  @IsOptional() @IsString() @MaxLength(5000) planoInicial?: string;

  // Conclusão
  @IsOptional()
  @IsEnum(Criticidade)
  criticidadeFinal?: Criticidade;

  @IsOptional()
  @IsEnum(StatusCaso)
  statusCaso?: StatusCaso;

  // Assinatura
  @IsOptional()
  @IsString()
  @MaxLength(120)
  assinanteNome?: string;

  /** data:image/png;base64,... ou outro formato. Limite ~2 MB. */
  @IsOptional()
  @IsString()
  @MaxLength(2_500_000)
  assinaturaImagem?: string;
}
