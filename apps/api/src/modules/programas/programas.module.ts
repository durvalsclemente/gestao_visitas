import { Module } from '@nestjs/common';
import { ProgramasController } from './programas.controller';

@Module({
  controllers: [ProgramasController],
})
export class ProgramasModule {}
