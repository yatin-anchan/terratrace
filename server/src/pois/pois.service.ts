import { Injectable, Inject } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { pois } from '../db/schema'

@Injectable()
export class PoisService {
  constructor(@Inject('DB') private db: any) {}

  async findByOperation(operationId: string) {
    return this.db.select().from(pois).where(eq(pois.operationId, operationId))
  }

  async create(data: any) {
    const [p] = await this.db.insert(pois).values({
      operationId: data.operationId,
      name: data.name,
      type: data.type,
      location: data.location,
      notes: data.notes,
    }).returning()
    return p
  }

  async remove(id: string) {
    await this.db.delete(pois).where(eq(pois.id, id))
    return { deleted: true }
  }
}
