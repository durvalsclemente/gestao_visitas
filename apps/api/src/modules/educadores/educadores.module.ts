import { Module } from '@nestjs/common';
import { EducadoresController } from './educadores.controller';
import { EducadoresService } from './educadores.service';

@Module({
  controllers: [EducadoresController],
  providers: [EducadoresService],
})
export class EducadoresModule {}
