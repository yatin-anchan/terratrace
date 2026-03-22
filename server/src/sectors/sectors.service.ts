import { Injectable, Inject } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { searchSectors } from '../db/schema'

@Injectable()
export class SectorsService {
  constructor(@Inject('DB') private db: any) {}

  async findByOperation(operationId: string) {
    return this.db.select().from(searchSectors).where(eq(searchSectors.operationId, operationId))
  }

  async create(data: any) {
    const [s] = await this.db.insert(searchSectors).values({
      operationId: data.operationId,
      name: data.name,
      polygon: data.polygon,
      terrainDifficulty: data.terrainDifficulty,
      assignedTeam: data.assignedTeam,
      searched: false,
      priorityScore: data.priorityScore ?? null,
    }).returning()
    return s
  }

  async markSearched(id: string, data: any) {
    const [s] = await this.db.update(searchSectors)
      .set({ searched: true, findings: data.findings, coverageQuality: data.coverageQuality, dateSearched: new Date() })
      .where(eq(searchSectors.id, id))
      .returning()
    return s
  }
}
