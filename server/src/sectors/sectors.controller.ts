import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common'
import { SectorsService } from './sectors.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('sectors')
export class SectorsController {
  constructor(private svc: SectorsService) {}

  @Get('operation/:operationId')
  findByOperation(@Param('operationId') operationId: string) {
    return this.svc.findByOperation(operationId)
  }

  @Post()
  create(@Body() body: any) { return this.svc.create(body) }

  @Patch(':id/searched')
  markSearched(@Param('id') id: string, @Body() body: any) {
    return this.svc.markSearched(id, body)
  }
}
