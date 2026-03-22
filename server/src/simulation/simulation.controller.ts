import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common'
import { SimulationService, SimulationResult } from './simulation.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { RunSimulationDto } from './dto'

@UseGuards(JwtAuthGuard)
@Controller('simulation')
export class SimulationController {
  constructor(private sim: SimulationService) {}

  @Post('run')
  run(@Body() dto: RunSimulationDto): Promise<SimulationResult> {
    return this.sim.runSimulation(dto)
  }

  @Get('operation/:operationId')
  getAll(@Param('operationId') operationId: string) {
    return this.sim.getSimulations(operationId)
  }
}