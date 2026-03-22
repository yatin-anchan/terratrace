import { Injectable, Inject } from '@nestjs/common'
import Groq from 'groq-sdk'
import { eq } from 'drizzle-orm'
import { operations, subjects, evidence, simulationRuns, searchSectors } from '../db/schema'
import type { ChatDto } from './dto'

@Injectable()
export class AiService {
  private groq: Groq

  constructor(@Inject('DB') private db: any) {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }

  private async buildOperationContext(operationId: string): Promise<string> {
    try {
      const [op] = await this.db.select().from(operations).where(eq(operations.id, operationId)).limit(1)
      const subs = await this.db.select().from(subjects).where(eq(subjects.operationId, operationId))
      const evs = await this.db.select().from(evidence).where(eq(evidence.operationId, operationId))
      const sims = await this.db.select().from(simulationRuns).where(eq(simulationRuns.operationId, operationId)).limit(5)
      const sectors = await this.db.select().from(searchSectors).where(eq(searchSectors.operationId, operationId))

      let ctx = `=== CURRENT OPERATION DATA ===\n`

      if (op) {
        ctx += `\nOPERATION: ${op.name}\n`
        ctx += `Status: ${op.status}\n`
        ctx += `Terrain: ${op.terrainRegion ?? 'Unknown'}\n`
        ctx += `Search radius: ${op.searchRadius ?? 'Unknown'} km\n`
        ctx += `Day: ${op.operationalDays ?? 1}\n`
        ctx += `Notes: ${op.notes ?? 'None'}\n`
      }

      if (subs.length > 0) {
        ctx += `\nSUBJECTS (${subs.length}):\n`
        subs.forEach((s: any, i: number) => {
          ctx += `${i + 1}. ${s.name ?? 'Unknown'}, Age: ${s.age ?? 'Unknown'}, Sex: ${s.sex ?? 'Unknown'}\n`
          ctx += `   Intent: ${s.intentCategory ?? 'Unknown'}, Experience: ${s.experienceLevel ?? 'Unknown'}\n`
          ctx += `   Mobility: ${s.mobilityLevel ?? 'Unknown'}, Medical: ${s.medicalHistory ?? 'None'}\n`
          if (s.lastKnownLocation) ctx += `   LKP: ${JSON.stringify(s.lastKnownLocation)}\n`
          if (s.lastContactTime) ctx += `   Last contact: ${s.lastContactTime}\n`
          if (s.clothing) ctx += `   Clothing: ${s.clothing}\n`
        })
      } else {
        ctx += `\nSUBJECTS: None added yet.\n`
      }

      if (evs.length > 0) {
        ctx += `\nEVIDENCE (${evs.length} items):\n`
        evs.forEach((e: any, i: number) => {
          ctx += `${i + 1}. Type: ${e.type}, Confidence: ${e.confidenceScore ?? 'Unknown'}%\n`
          ctx += `   Source: ${e.source ?? 'Unknown'}, Notes: ${e.notes ?? 'None'}\n`
          if (e.location) ctx += `   Location: ${JSON.stringify(e.location)}\n`
          if (e.timestamp) ctx += `   Time: ${e.timestamp}\n`
        })
      } else {
        ctx += `\nEVIDENCE: None logged yet.\n`
      }

      if (sectors.length > 0) {
        ctx += `\nSEARCH SECTORS (${sectors.length}):\n`
        sectors.forEach((s: any, i: number) => {
          ctx += `${i + 1}. ${s.name ?? `Sector ${i+1}`}: ${s.searched ? 'SEARCHED' : 'PENDING'}\n`
          if (s.priorityScore) ctx += `   Priority: ${s.priorityScore}\n`
          if (s.findings) ctx += `   Findings: ${s.findings}\n`
          if (s.coverageQuality) ctx += `   Coverage quality: ${s.coverageQuality}%\n`
        })
      } else {
        ctx += `\nSEARCH SECTORS: None defined yet.\n`
      }

      if (sims.length > 0) {
        ctx += `\nSIMULATION RUNS (${sims.length} total, showing latest):\n`
        const latest = sims[sims.length - 1]
        ctx += `Latest run: ${latest.agentCount} agents, ${latest.durationHours}h duration\n`
        ctx += `Status: ${latest.status}\n`
        if (latest.hotspots && Array.isArray(latest.hotspots)) {
          ctx += `Hotspots:\n`
          latest.hotspots.forEach((h: any, i: number) => {
            ctx += `  ${i+1}. ${h.label}: ${h.probability}% probability at ${h.lat}, ${h.lng}\n`
          })
        }
        if (latest.weatherSnapshot) {
          ctx += `Weather during sim: ${JSON.stringify(latest.weatherSnapshot)}\n`
        }
      } else {
        ctx += `\nSIMULATIONS: None run yet.\n`
      }

      return ctx
    } catch (err) {
      return `=== OPERATION CONTEXT: Unable to fetch (${err}) ===\n`
    }
  }

  async chat(dto: ChatDto) {
    const operationContext = await this.buildOperationContext(dto.operationId)

    const systemPrompt = `You are TerraTrace AI — an expert search and rescue assistant embedded in a live SAR platform.

${operationContext}

Your role:
- Answer questions about THIS specific operation using the data above
- Analyze evidence, suggest search priorities, explain sector rankings
- Generate tactical briefings and recommendations
- Interpret terrain and weather effects on subject movement
- Provide survival risk assessments based on actual subject data

Formatting rules:
- Use **bold** for important terms, sector names, subject names
- Use bullet points (- item) for lists
- Use numbered lists (1. item) for sequential steps
- Add blank lines between sections
- Keep responses focused and tactical
- Always reference actual data from the operation context above
- If data is missing, say so clearly rather than making it up
- Use SAR terminology: LKP, POA, POD, probability surface, sector, etc.`

    const messages = [
      ...dto.history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: dto.message },
    ]

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      max_tokens: 1024,
      temperature: 0.4,
    })

    return {
      reply: completion.choices[0]?.message?.content ?? 'No response generated.',
      tokens: completion.usage?.total_tokens ?? 0,
    }
  }

  async summarizeOperation(operationId: string) {
    const ctx = await this.buildOperationContext(operationId)
    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: `You are a SAR operation summarizer. Be concise and tactical. Use **bold** for key terms.\n\n${ctx}` },
        { role: 'user', content: 'Summarize the current status of this operation. Highlight priority sectors, key evidence, recommended next actions, and risks. Keep it under 150 words.' },
      ],
      max_tokens: 512,
      temperature: 0.3,
    })
    return { summary: completion.choices[0]?.message?.content ?? '' }
  }

  async explainSector(sectorName: string, probability: number) {
    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a SAR probability analyst. Use **bold** for key terms and bullet points for lists.' },
        { role: 'user', content: `Explain why **${sectorName}** has a probability of **${probability}%** in a forest/highland SAR operation. Consider evidence convergence, terrain attraction points, and subject behavior patterns. Be specific and tactical. Under 100 words.` },
      ],
      max_tokens: 256,
      temperature: 0.3,
    })
    return { explanation: completion.choices[0]?.message?.content ?? '' }
  }
}