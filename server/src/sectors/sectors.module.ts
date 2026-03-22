import { Module } from '@nestjs/common'
import { SectorsService } from './sectors.service'
import { SectorsController } from './sectors.controller'
@Module({ providers: [SectorsService], controllers: [SectorsController] })
export class SectorsModule {}
