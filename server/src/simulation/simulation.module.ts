import { Module } from '@nestjs/common'
import { SimulationService } from './simulation.service'
import { SimulationController } from './simulation.controller'

@Module({
  providers: [SimulationService],
  controllers: [SimulationController],
  exports: [SimulationService],
})
export class SimulationModule {}