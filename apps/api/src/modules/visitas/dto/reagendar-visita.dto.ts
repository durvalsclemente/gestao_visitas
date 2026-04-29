import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReagendarVisitaDto {
  @IsDateString()
  novaDataAgendada!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivoReagendamento?: string;
}
