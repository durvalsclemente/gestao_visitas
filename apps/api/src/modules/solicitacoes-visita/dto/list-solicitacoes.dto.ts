import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { SolicitacaoVisitaStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export class ListSolicitacoesVisitaDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(SolicitacaoVisitaStatus)
  status?: SolicitacaoVisitaStatus;

  @IsOptional()
  @IsUUID()
  assistidoId?: string;

  @IsOptional()
  @IsUUID()
  prioridadeId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  apenasMinhas?: boolean;
}
