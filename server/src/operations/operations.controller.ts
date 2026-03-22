import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Request, UseGuards,
} from '@nestjs/common'
import { OperationsService } from './operations.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { CreateOperationDto, UpdateOperationDto } from './dto'

@UseGuards(JwtAuthGuard)
@Controller('operations')
export class OperationsController {
  constructor(private ops: OperationsService) {}

  @Get()
  findAll(@Request() req: any) {
    return this.ops.findAll(req.user.id)
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ops.findOne(id)
  }

  @Post()
  create(@Body() dto: CreateOperationDto, @Request() req: any) {
    return this.ops.create(dto, req.user.id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOperationDto) {
    return this.ops.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ops.remove(id)
  }
  @Get(':id/export')
async export(@Param('id') id: string) {
  const op = await this.ops.findOne(id)
  return { operation: op, exportedAt: new Date().toISOString() }
}
}