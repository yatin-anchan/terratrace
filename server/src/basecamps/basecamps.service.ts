import { Injectable, Inject } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { basecamps } from '../db/schema'

@Injectable()
export class BasecampsService {
  constructor(@Inject('DB') private db: any) {}

  async findByOperation(operationId: string) {
    return this.db.select().from(basecamps).where(eq(basecamps.operationId, operationId))
  }

  async create(data: any) {
    const [b] = await this.db.insert(basecamps).values({
      operationId: data.operationId,
      name: data.name,
      location: data.location,
      notes: data.notes,
    }).returning()
    return b
  }

  async remove(id: string) {
    await this.db.delete(basecamps).where(eq(basecamps.id, id))
    return { deleted: true }
  }
}
