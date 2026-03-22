import { Controller, Get, Post, Body, Param, Request, UseGuards } from '@nestjs/common'
import { LogsService } from './logs.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'

@UseGuards(JwtAuthGuard)
@Controller('logs')
export class LogsController {
  constructor(private svc: LogsService) {}

  @Get('operation/:operationId')
  findByOperation(@Param('operationId') operationId: string) {
    return this.svc.findByOperation(operationId)
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.svc.create(body, req.user.id)
  }
}
