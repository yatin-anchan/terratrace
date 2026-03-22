import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { FieldResultsService } from './field-results.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('field-results')
export class FieldResultsController {
  constructor(private svc: FieldResultsService) {}

  @Get('operation/:operationId')
  findByOperation(@Param('operationId') operationId: string) {
    return this.svc.findByOperation(operationId)
  }

  @Post()
  create(@Body() body: any) {
    return this.svc.create(body)
  }
}
