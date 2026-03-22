import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DbModule } from './common/db.module'
import { AuthModule } from './auth/auth.module'
import { OperationsModule } from './operations/operations.module'
import { AiModule } from './ai/ai.module'
import { SimulationModule } from './simulation/simulation.module'
import { SubjectsModule } from './subjects/subjects.module'
import { EvidenceModule } from './evidence/evidence.module'
import { LogsModule } from './logs/logs.module'
import { FieldResultsModule } from './field-results/field-results.module'
import { BasecampsModule } from './basecamps/basecamps.module'
import { PoisModule } from './pois/pois.module'
import { SectorsModule } from './sectors/sectors.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    DbModule,
    AuthModule,
    OperationsModule,
    SubjectsModule,
    EvidenceModule,
    LogsModule,
    FieldResultsModule,
    BasecampsModule,
    PoisModule,
    SectorsModule,
    AiModule,
    SimulationModule,
  ],
})
export class AppModule {}