import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { PoisService } from './pois.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('pois')
export class PoisController {
  constructor(private svc: PoisService) {}

  @Get('operation/:operationId')
  findByOperation(@Param('operationId') operationId: string) {
    return this.svc.findByOperation(operationId)
  }

  @Post()
  create(@Body() body: any) { return this.svc.create(body) }

  @Delete(':id')
  remove(@Param('id') id: string) { return this.svc.remove(id) }
}
