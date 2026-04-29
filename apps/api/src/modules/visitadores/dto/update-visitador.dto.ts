import { PartialType } from '@nestjs/mapped-types';
import { CreateVisitadorDto } from './create-visitador.dto';

export class UpdateVisitadorDto extends PartialType(CreateVisitadorDto) {}
