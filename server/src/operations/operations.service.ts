import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { operations } from '../db/schema'
import type { CreateOperationDto, UpdateOperationDto } from './dto'

@Injectable()
export class OperationsService {
  constructor(@Inject('DB') private db: any) {}

  async findAll(userId: string) {
    return this.db
      .select()
      .from(operations)
      .where(eq(operations.createdBy, userId))
      .orderBy(operations.createdAt)
  }

  async findOne(id: string) {
    const [op] = await this.db
      .select()
      .from(operations)
      .where(eq(operations.id, id))
      .limit(1)

    if (!op) throw new NotFoundException('Operation not found')
    return op
  }

  async create(dto: CreateOperationDto, userId: string) {
    const [op] = await this.db
      .insert(operations)
      .values({
        name: dto.name,
        terrainRegion: dto.terrainRegion || 'Unknown',
        searchRadius: dto.searchRadius || 10,
        operationalDays: dto.operationalDays || 7,
        notes: dto.notes || '',
        status: (dto.status as any) || 'draft',
        createdBy: userId,
      })
      .returning()
    return op
  }

  async update(id: string, dto: UpdateOperationDto) {
    const [op] = await this.db
      .update(operations)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(operations.id, id))
      .returning()

    if (!op) throw new NotFoundException('Operation not found')
    return op
  }

  async remove(id: string) {
    await this.db.delete(operations).where(eq(operations.id, id))
    return { deleted: true }
  }
}