import { Module } from '@nestjs/common'
import { BasecampsService } from './basecamps.service'
import { BasecampsController } from './basecamps.controller'
@Module({ providers: [BasecampsService], controllers: [BasecampsController] })
export class BasecampsModule {}
