import { Module } from '@nestjs/common';
import { AssistidosController } from './assistidos.controller';
import { AssistidosService } from './assistidos.service';

@Module({
  controllers: [AssistidosController],
  providers: [AssistidosService],
})
export class AssistidosModule {}
