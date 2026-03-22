import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DbModule } from './common/db.module'
import { AuthModule } from './auth/auth.module'
import { OperationsModule } from './operations/operations.module'
import { AiModule } from './ai/ai.module'
import { SimulationModule } from './simulation/simulation.module'
import { SubjectsModule } from './subjects/subjects.module'
import { EvidenceModule } from './evidence/evidence.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DbModule,
    AuthModule,
    OperationsModule,
    SubjectsModule,
    EvidenceModule,
    AiModule,
    SimulationModule,
  ],
})
export class AppModule {}