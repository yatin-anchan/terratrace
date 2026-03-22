import { Module } from '@nestjs/common'
import { PoisService } from './pois.service'
import { PoisController } from './pois.controller'
@Module({ providers: [PoisService], controllers: [PoisController] })
export class PoisModule {}
