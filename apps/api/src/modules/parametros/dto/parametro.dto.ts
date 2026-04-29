import { PartialType } from '@nestjs/mapped-types';
import { IsDefined, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export class CreateParametroDto {
  @IsString()
  @Matches(/^[a-z0-9_.\-]+$/i, {
    message: 'Chave aceita apenas letras, números, ponto, underline e hífen',
  })
  @MaxLength(100)
  chave!: string;

  /** Aceita string, number, boolean, array ou objeto. */
  @IsDefined({ message: 'Valor é obrigatório' })
  valor!: unknown;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  descricao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  categoria?: string;
}

export class UpdateParametroDto extends PartialType(CreateParametroDto) {}

export class ListParametroDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  categoria?: string;
}
