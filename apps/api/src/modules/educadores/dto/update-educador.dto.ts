import { PartialType } from '@nestjs/mapped-types';
import { CreateEducadorDto } from './create-educador.dto';

export class UpdateEducadorDto extends PartialType(CreateEducadorDto) {}
