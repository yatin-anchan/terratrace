import { Module } from '@nestjs/common'
import { FieldResultsService } from './field-results.service'
import { FieldResultsController } from './field-results.controller'
@Module({ providers: [FieldResultsService], controllers: [FieldResultsController] })
export class FieldResultsModule {}
