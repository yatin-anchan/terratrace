import { Injectable, Inject } from '@nestjs/common'
import { eq, desc } from 'drizzle-orm'
import { searchSectors } from '../db/schema'

@Injectable()
export class FieldResultsService {
  constructor(@Inject('DB') private db: any) {}

  async findByOperation(operationId: string) {
    const sectors = await this.db.select().from(searchSectors)
      .where(eq(searchSectors.operationId, operationId))
      .orderBy(desc(searchSectors.createdAt))
    return sectors.filter((s: any) => s.searched)
  }

  async create(data: any) {
    const [s] = await this.db.insert(searchSectors).values({
      operationId: data.operationId,
      name: data.sectorName,
      assignedTeam: data.teamName,
      searched: true,
      coverageQuality: data.coverageQuality,
      findings: data.findings,
      notes: data.notes,
      dateSearched: data.dateSearched ? new Date(data.dateSearched) : new Date(),
      polygon: null,
      priorityScore: null,
      terrainDifficulty: null,
    }).returning()
    return {
      id: s.id,
      sectorName: s.name,
      teamName: s.assignedTeam,
      searched: s.searched,
      coverageQuality: s.coverageQuality,
      findings: s.findings,
      notes: s.notes,
      dateSearched: s.dateSearched,
    }
  }
}
