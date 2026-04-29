import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { DiaSemana } from '@prisma/client';

const HORA_HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class CreateDisponibilidadeDto {
  @IsEnum(DiaSemana)
  diaSemana!: DiaSemana;

  @IsString()
  @Matches(HORA_HHMM, { message: 'horaInicio deve estar em HH:mm' })
  horaInicio!: string;

  @IsString()
  @Matches(HORA_HHMM, { message: 'horaFim deve estar em HH:mm' })
  horaFim!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  ativo?: boolean;
}

export class UpdateDisponibilidadeDto extends PartialType(CreateDisponibilidadeDto) {}
