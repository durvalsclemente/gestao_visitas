import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { MotivoNaoRealizacao } from '@prisma/client';

export class NaoRealizadaDto {
  @IsEnum(MotivoNaoRealizacao)
  motivoNaoRealizacao!: MotivoNaoRealizacao;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoesNaoRealizacao?: string;
}
