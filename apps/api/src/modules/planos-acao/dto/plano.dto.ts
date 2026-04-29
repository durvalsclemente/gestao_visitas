import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PlanoAcaoStatus } from '@prisma/client';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export class CreatePlanoAcaoDto {
  @IsUUID()
  assistidoId!: string;

  @IsOptional()
  @IsUUID()
  visitaId?: string;

  @IsOptional()
  @IsUUID()
  solicitacaoId?: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  objetivo!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  problemaPrincipal!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  areaResponsavel?: string;

  @IsOptional()
  @IsDateString()
  prazo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  indicadorSucesso?: string;

  @IsOptional()
  @IsEnum(PlanoAcaoStatus)
  status?: PlanoAcaoStatus;

  @IsOptional()
  @IsDateString()
  dataRevisao?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  responsaveisExternalUserIds?: string[];
}

export class UpdatePlanoAcaoDto extends PartialType(CreatePlanoAcaoDto) {}

export class ListPlanosAcaoDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(PlanoAcaoStatus)
  status?: PlanoAcaoStatus;

  @IsOptional()
  @IsUUID()
  assistidoId?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value === 'true' : value,
  )
  apenasMeus?: boolean;
}
