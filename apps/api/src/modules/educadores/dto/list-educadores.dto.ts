import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { EducadorCargo } from '@prisma/client';
import { PaginationDto } from '../../../common/pagination/pagination.dto';

export class ListEducadoresDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsEnum(EducadorCargo)
  cargo?: EducadorCargo;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  ativo?: boolean;
}
