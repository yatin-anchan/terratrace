import { Injectable, Inject } from '@nestjs/common'
import { eq, desc } from 'drizzle-orm'
import { logEntries } from '../db/schema'

@Injectable()
export class LogsService {
  constructor(@Inject('DB') private db: any) {}

  async findByOperation(operationId: string) {
    return this.db.select().from(logEntries)
      .where(eq(logEntries.operationId, operationId))
      .orderBy(desc(logEntries.createdAt))
  }

  async create(data: any, userId: string) {
    const [e] = await this.db.insert(logEntries).values({
      operationId: data.operationId,
      userId,
      actionType: data.actionType,
      affectedEntity: data.affectedEntity ?? '',
      previousValue: data.previousValue ?? null,
      newValue: data.newValue ?? null,
      reason: data.reason ?? '',
    }).returning()
    return e
  }
}
