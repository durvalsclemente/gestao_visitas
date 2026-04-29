import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { VisitaStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export class AgendaQueryDto extends PaginationDto {
  /** Inclusivo. */
  @IsOptional()
  @IsDateString()
  de?: string;

  /** Exclusivo. */
  @IsOptional()
  @IsDateString()
  ate?: string;

  /** Filtra visitas em que o visitador é primário OU secundário. */
  @IsOptional()
  @IsUUID()
  visitadorId?: string;

  @IsOptional()
  @IsUUID()
  assistidoId?: string;

  @IsOptional()
  @IsEnum(VisitaStatus)
  status?: VisitaStatus;
}
