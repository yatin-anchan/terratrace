import { Injectable, Inject } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { evidence } from '../db/schema'

@Injectable()
export class EvidenceService {
  constructor(@Inject('DB') private db: any) {}

  async findByOperation(operationId: string) {
    return this.db.select().from(evidence).where(eq(evidence.operationId, operationId)).orderBy(evidence.createdAt)
  }

  async create(data: any, userId: string) {
    const [e] = await this.db.insert(evidence).values({
      operationId: data.operationId,
      subjectId: data.subjectId ?? null,
      type: data.type,
      location: data.location ?? null,
      timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      confidenceScore: data.confidenceScore ?? 50,
      source: data.source ?? '',
      notes: data.notes ?? '',
      attachments: data.attachments ?? [],
      createdBy: userId,
    }).returning()
    return e
  }

  async remove(id: string) {
    await this.db.delete(evidence).where(eq(evidence.id, id))
    return { deleted: true }
  }
}
