import { IsString, MaxLength, MinLength } from 'class-validator';

export class CancelarVisitaDto {
  @IsString()
  @MinLength(3, { message: 'Informe o motivo do cancelamento' })
  @MaxLength(500)
  motivoCancelamento!: string;
}
