import { Controller, Get, Post, Delete, Body, Param, Request, UseGuards } from '@nestjs/common'
import { EvidenceService } from './evidence.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('evidence')
export class EvidenceController {
  constructor(private svc: EvidenceService) {}

  @Get('operation/:operationId')
  findByOperation(@Param('operationId') operationId: string) {
    return this.svc.findByOperation(operationId)
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.svc.create(body, req.user.id)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id)
  }
}
