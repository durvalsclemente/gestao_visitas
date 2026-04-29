import { IsIn, IsOptional } from 'class-validator';

export type RelatorioModo = 'resumido' | 'completo';

export class RelatorioPdfQueryDto {
  @IsOptional()
  @IsIn(['resumido', 'completo'])
  modo?: RelatorioModo;
}
