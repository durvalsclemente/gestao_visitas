import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  /**
   * Indicadores consolidados do tenant para um intervalo de datas.
   * Default: últimos 6 meses.
   */
  @Get()
  metrics(@Query() q: DashboardQueryDto) {
    return this.service.metrics(q);
  }
}
