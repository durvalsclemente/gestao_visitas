import { IsDateString, IsOptional } from 'class-validator';

export class DashboardQueryDto {
  /** Data inicial (inclusiva). Default: 6 meses atrás. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** Data final (inclusiva). Default: hoje. */
  @IsOptional()
  @IsDateString()
  to?: string;
}
