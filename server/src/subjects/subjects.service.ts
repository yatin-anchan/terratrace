import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { subjects } from '../db/schema'

@Injectable()
export class SubjectsService {
  constructor(@Inject('DB') private db: any) {}

  async findByOperation(operationId: string) {
    return this.db.select().from(subjects).where(eq(subjects.operationId, operationId))
  }

  async create(data: any) {
    const [s] = await this.db.insert(subjects).values({
      operationId: data.operationId,
      name: data.name,
      age: data.age,
      sex: data.sex,
      personType: data.personType,
      experienceLevel: data.experienceLevel,
      intentCategory: data.intentCategory,
      medicalHistory: data.medicalHistory,
      mobilityLevel: data.mobilityLevel,
      clothing: data.clothing,
      lastKnownLocation: data.lastKnownLocation,
      lastContactTime: data.lastContactTime ? new Date(data.lastContactTime) : null,
    }).returning()
    return s
  }

  async remove(id: string) {
    await this.db.delete(subjects).where(eq(subjects.id, id))
    return { deleted: true }
  }

  async findOne(id: string) {
    const [s] = await this.db.select().from(subjects).where(eq(subjects.id, id)).limit(1)
    if (!s) throw new NotFoundException('Subject not found')
    return s
  }
}
