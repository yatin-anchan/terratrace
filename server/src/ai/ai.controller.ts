import { Controller, Post, Body, Param, UseGuards } from '@nestjs/common'
import { AiService } from './ai.service'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { ChatDto } from './dto'

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private ai: AiService) {}

  @Post('chat')
  chat(@Body() dto: ChatDto) {
    return this.ai.chat(dto)
  }

  @Post('summarize/:operationId')
  summarize(@Param('operationId') operationId: string) {
    return this.ai.summarizeOperation(operationId)
  }

  @Post('explain-sector')
  explainSector(@Body() body: { sectorName: string; probability: number }) {
    return this.ai.explainSector(body.sectorName, body.probability)
  }
}