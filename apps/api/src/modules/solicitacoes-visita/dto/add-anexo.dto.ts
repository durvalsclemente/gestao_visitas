import { Type } from 'class-transformer';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

/**
 * Metadata-only por enquanto: o arquivo em si será enviado por
 * pipeline próprio (multipart) num bloco futuro. Aqui só registramos
 * a referência (`url`) para que a solicitação tenha lista de anexos.
 */
export class AddAnexoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  nome!: string;

  @IsString()
  @MaxLength(120)
  mimeType!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  tamanho!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  url!: string;
}
