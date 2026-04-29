import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class RealizarVisitaDto {
  @IsOptional()
  @IsDateString()
  dataRealizada?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  resultado?: string;
}
