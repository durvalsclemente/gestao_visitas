import { PartialType } from '@nestjs/mapped-types';
import { CreateAssistidoDto } from './create-assistido.dto';

export class UpdateAssistidoDto extends PartialType(CreateAssistidoDto) {}
