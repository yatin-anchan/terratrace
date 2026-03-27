import { Injectable, Inject } from '@nestjs/common'
import Groq from 'groq-sdk'
import { desc, eq } from 'drizzle-orm'
import {
  operations,
  subjects,
  evidence,
  simulationRuns,
  searchSectors,
  basecamps,
  pois,
} from '../db/schema'
import type { ChatDto } from './dto'
import { SimulationService } from '../simulation/simulation.service'

type ActionIntent =
  | 'create'
  | 'add'
  | 'update'
  | 'edit'
  | 'change'
  | 'rename'
  | 'delete'
  | 'remove'
  | 'status'
  | 'simulate'
  | 'unknown'

type EntityIntent =
  | 'subject'
  | 'operation'
  | 'evidence'
  | 'basecamp'
  | 'poi'
  | 'simulation'
  | 'unknown'

type SubjectDraft = {
  name?: string
  age?: number | 'unknown'
  sex?: 'male' | 'female' | 'unknown'
  clothing?: string
  medicalHistory?: string
  intentCategory?: string
  experienceLevel?: string
  mobilityLevel?: string
  fitness?: string
  lastKnownLocation?: { lat: number; lng: number } | null
  lastKnownLocationText?: string
  lastContactTime?: string | null
}

type GuidedDraftState = {
  subjectId?: string
  subjectDraft: SubjectDraft
}

@Injectable()
export class AiService {
  private groq: Groq
  private guidedDrafts = new Map<string, GuidedDraftState>()

  constructor(
    @Inject('DB') private db: any,
    private readonly simulationService: SimulationService
  ) {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }

  // ── parsing helpers ────────────────────────────────────────────

  private normalizeText(message: string) {
    return message.trim().replace(/\s+/g, ' ')
  }

  private detectAction(message: string): ActionIntent {
    const lower = message.toLowerCase()

    if (/\brename\b/.test(lower)) return 'rename'
    if (/\bdelete\b/.test(lower)) return 'delete'
    if (/\bremove\b/.test(lower)) return 'remove'
    if (/\bupdate\b/.test(lower)) return 'update'
    if (/\bedit\b/.test(lower)) return 'edit'
    if (/\bchange\b/.test(lower)) return 'change'
    if (/\bcreate\b/.test(lower)) return 'create'
    if (/\badd\b/.test(lower)) return 'add'
    if (/\bstatus\b|\bsummary\b|\bsummarize\b/.test(lower)) return 'status'
    if (/\bsimulate\b|\bsimulation\b|\brun sim\b|\brun a sim\b/.test(lower)) return 'simulate'

    return 'unknown'
  }

  private detectEntity(message: string): EntityIntent {
    const lower = message.toLowerCase()

    if (/\bsubject\b|\bperson\b|\bmissing person\b/.test(lower)) return 'subject'
    if (/\boperation\b|\bmission\b/.test(lower)) return 'operation'
    if (/\bevidence\b|\bwitness\b|\bcctv\b|\bping\b|\btrack\b/.test(lower)) return 'evidence'
    if (/\bbasecamp\b|\bcamp\b/.test(lower)) return 'basecamp'
    if (/\bpoi\b|\bpoint of interest\b/.test(lower)) return 'poi'
    if (/\bsimulation\b|\bsim\b/.test(lower)) return 'simulation'

    return 'unknown'
  }

  private extractName(message: string): string | undefined {
  const trimmed = this.normalizeText(message)

  const patterns = [
    /name\s+is\s+([A-Za-z][A-Za-z\s.'-]{1,})/i,
    /person(?:'s)?\s+name\s+is\s+([A-Za-z][A-Za-z\s.'-]{1,})/i,
    /missing\s+person(?:'s)?\s+name\s+is\s+([A-Za-z][A-Za-z\s.'-]{1,})/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})(?=\s+(?:age|male|female|lkp|wearing)\b|$)/,
    /^([A-Za-z][A-Za-z\s.'-]{2,40}?)(?=\s*(?:age\s*:|male\b|female\b|lkp\s*:|wearing\b|$))/i,
  ]

  for (const p of patterns) {
    const m = trimmed.match(p)
    if (m?.[1]) {
      const candidate = m[1].trim()
      if (candidate.length >= 2) return candidate
    }
  }

  return undefined
}

  private extractAge(message: string): number | 'unknown' | undefined {
    const lower = message.toLowerCase()

    if (/\bage unknown\b|\bunknown age\b/.test(lower)) return 'unknown'

    const patterns = [
      /\bage\s*(?:is|:)?\s*(\d{1,3})\b/i,
      /\b(\d{1,3})\s*(?:years old|yrs old|yr old|yo)\b/i,
    ]

    for (const p of patterns) {
      const m = lower.match(p)
      if (m?.[1]) {
        const age = Number(m[1])
        if (age >= 0 && age <= 120) return age
      }
    }

    return undefined
  }

  private extractSex(message: string): 'male' | 'female' | 'unknown' | undefined {
    const lower = message.toLowerCase()

    if (/\bmale\b|\bman\b|\bboy\b/.test(lower)) return 'male'
    if (/\bfemale\b|\bwoman\b|\bgirl\b/.test(lower)) return 'female'
    if (/\bunknown sex\b|\bsex unknown\b|\bgender unknown\b|\bunknown gender\b/.test(lower)) {
      return 'unknown'
    }

    return undefined
  }

  private extractLatLng(message: string): { lat: number; lng: number } | undefined {
    const m = message.match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/)
    if (!m) return undefined

    const lat = Number(m[1])
    const lng = Number(m[2])

    if (Number.isNaN(lat) || Number.isNaN(lng)) return undefined
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return undefined

    return { lat, lng }
  }

  private extractClothing(message: string): string | undefined {
    const lower = message.toLowerCase()

    if (/\bunknown clothing\b|\bclothing unknown\b/.test(lower)) return 'unknown'

    const patterns = [
      /\bwearing\s+(.+?)(?:\.|,|;|$)/i,
      /\bclothing\s*(?:is|:)?\s+(.+?)(?:\.|,|;|$)/i,
      /\bdressed in\s+(.+?)(?:\.|,|;|$)/i,
    ]

    for (const p of patterns) {
      const m = lower.match(p)
      if (m?.[1]) return m[1].trim()
    }

    return undefined
  }

  private extractMedicalHistory(message: string): string | undefined {
    const lower = message.toLowerCase()

    if (/\bmedical unknown\b|\bunknown medical\b|\bno medical history\b/.test(lower)) {
      return 'unknown'
    }

    const patterns = [
      /\bmedical(?: history)?\s*(?:is|:)?\s+(.+?)(?:\.|,|;|$)/i,
      /\bcondition(?:s)?\s*(?:is|:)?\s+(.+?)(?:\.|,|;|$)/i,
      /\bhas\s+(.+?)(?:\s+condition|\s+medical issue|\s+medical issues)(?:\.|,|;|$)/i,
    ]

    for (const p of patterns) {
      const m = lower.match(p)
      if (m?.[1]) return m[1].trim()
    }

    return undefined
  }

  private extractIntentCategory(message: string): string | undefined {
    const lower = message.toLowerCase()

    if (/\bintent unknown\b|\bunknown intent\b/.test(lower)) return 'unknown'
    if (/\bhiker\b/.test(lower)) return 'hiker'
    if (/\bdementia\b/.test(lower)) return 'dementia'
    if (/\bchild\b/.test(lower)) return 'child'
    if (/\bdespondent\b/.test(lower)) return 'despondent'
    if (/\belderly\b/.test(lower)) return 'elderly'
    if (/\bautis(m|tic)\b/.test(lower)) return 'autism'

    return undefined
  }

  private extractExperienceLevel(message: string): string | undefined {
    const lower = message.toLowerCase()

    if (/\bexperience unknown\b|\bunknown experience\b/.test(lower)) return 'unknown'
    if (/\bhigh experience\b|\bexperienced\b/.test(lower)) return 'high'
    if (/\bmedium experience\b|\bsome experience\b/.test(lower)) return 'medium'
    if (/\blow experience\b|\binexperienced\b/.test(lower)) return 'low'
    if (/\bno experience\b/.test(lower)) return 'none'

    return undefined
  }

  private extractMobilityLevel(message: string): string | undefined {
    const lower = message.toLowerCase()

    if (/\bmobility unknown\b|\bunknown mobility\b/.test(lower)) return 'unknown'
    if (/\bimmobile\b|\bcannot walk\b/.test(lower)) return 'immobile'
    if (/\blimited mobility\b|\binjured\b|\blimp\b/.test(lower)) return 'limited'
    if (/\bfull mobility\b|\bmobile\b|\bfit\b/.test(lower)) return 'full'

    return undefined
  }

  private extractFitness(message: string): string | undefined {
    const lower = message.toLowerCase()

    if (/\bfitness unknown\b|\bunknown fitness\b/.test(lower)) return 'unknown'
    if (/\bhigh fitness\b|\bvery fit\b/.test(lower)) return 'high'
    if (/\bmedium fitness\b|\bmoderate fitness\b/.test(lower)) return 'medium'
    if (/\blow fitness\b|\bunfit\b/.test(lower)) return 'low'

    return undefined
  }

  private extractLocationDescription(message: string): string | undefined {
    const lower = message.toLowerCase()

    if (this.extractLatLng(message)) return undefined
    if (/\blocation unknown\b|\bunknown location\b|\blkp unknown\b/.test(lower)) return 'unknown'

    const patterns = [
      /\blast known location\s*(?:is|:)?\s+(.+)/i,
      /\blast seen\s+(.+)/i,
      /\bseen near\s+(.+)/i,
      /\bnear\s+(.+)/i,
      /\bat\s+(.+)/i,
    ]

    for (const p of patterns) {
      const m = lower.match(p)
      if (m?.[1]) {
        const value = m[1].trim()
        if (value.length >= 4) return value
      }
    }

    if (
      /\bpark\b|\btrail\b|\broad\b|\bhill\b|\bforest\b|\bstation\b|\bbeach\b|\bcoast\b|\blake\b|\briver\b|\bcliff\b/.test(
        lower
      )
    ) {
      return this.normalizeText(message)
    }

    return undefined
  }

  private extractRenameTarget(message: string): string | undefined {
    const patterns = [
      /\brename\s+(?:the\s+)?operation\s+to\s+(.+)/i,
      /\bchange\s+(?:the\s+)?operation\s+name\s+to\s+(.+)/i,
      /\bupdate\s+(?:the\s+)?operation\s+name\s+to\s+(.+)/i,
    ]

    for (const p of patterns) {
      const m = message.match(p)
      if (m?.[1]) return m[1].trim()
    }

    return undefined
  }

  private extractSubjectFields(message: string): Partial<SubjectDraft> {
    const patch: Partial<SubjectDraft> = {}

    const name = this.extractName(message)
    const age = this.extractAge(message)
    const sex = this.extractSex(message)
    const clothing = this.extractClothing(message)
    const medicalHistory = this.extractMedicalHistory(message)
    const intentCategory = this.extractIntentCategory(message)
    const experienceLevel = this.extractExperienceLevel(message)
    const mobilityLevel = this.extractMobilityLevel(message)
    const fitness = this.extractFitness(message)
    const lastKnownLocation = this.extractLatLng(message)
    const lastKnownLocationText = this.extractLocationDescription(message)

    if (name !== undefined) patch.name = name
    if (age !== undefined) patch.age = age
    if (sex !== undefined) patch.sex = sex
    if (clothing !== undefined) patch.clothing = clothing
    if (medicalHistory !== undefined) patch.medicalHistory = medicalHistory
    if (intentCategory !== undefined) patch.intentCategory = intentCategory
    if (experienceLevel !== undefined) patch.experienceLevel = experienceLevel
    if (mobilityLevel !== undefined) patch.mobilityLevel = mobilityLevel
    if (fitness !== undefined) patch.fitness = fitness
    if (lastKnownLocation !== undefined) patch.lastKnownLocation = lastKnownLocation
    if (lastKnownLocationText !== undefined) patch.lastKnownLocationText = lastKnownLocationText

    return patch
  }

  private hasAnySubjectField(patch: Partial<SubjectDraft>) {
    return Object.keys(patch).length > 0
  }

  private mergeDraft(existing: SubjectDraft, patch: Partial<SubjectDraft>): SubjectDraft {
    return {
      ...existing,
      ...patch,
    }
  }

  private getMissingSubjectFields(draft: SubjectDraft): string[] {
    const missing: string[] = []

    if (!draft.name) missing.push('name')
    if (draft.age === undefined) missing.push('age')
    if (!draft.sex) missing.push('sex')
    if (!draft.lastKnownLocation && !draft.lastKnownLocationText) missing.push('last known location')

    return missing
  }

  private summarizeCapturedFields(draft: SubjectDraft): string[] {
    const parts: string[] = []

    if (draft.name) parts.push(`name: ${draft.name}`)
    if (draft.age !== undefined) parts.push(`age: ${draft.age}`)
    if (draft.sex) parts.push(`sex: ${draft.sex}`)
    if (draft.clothing) parts.push(`clothing: ${draft.clothing}`)
    if (draft.medicalHistory) parts.push(`medical: ${draft.medicalHistory}`)
    if (draft.intentCategory) parts.push(`intent: ${draft.intentCategory}`)
    if (draft.experienceLevel) parts.push(`experience: ${draft.experienceLevel}`)
    if (draft.mobilityLevel) parts.push(`mobility: ${draft.mobilityLevel}`)
    if (draft.fitness) parts.push(`fitness: ${draft.fitness}`)

    if (draft.lastKnownLocation) {
      parts.push(`coordinates: ${draft.lastKnownLocation.lat}, ${draft.lastKnownLocation.lng}`)
    } else if (draft.lastKnownLocationText) {
      parts.push(`location note: ${draft.lastKnownLocationText}`)
    }

    return parts
  }

  private buildMissingPrompt(missing: string[]) {
    if (missing.length === 0) return 'Initial subject setup is complete.'

    if (missing.length === 1) {
      return `I still need the subject's **${missing[0]}**.`
    }

    if (missing.length === 2) {
      return `I still need the subject's **${missing[0]}** and **${missing[1]}**.`
    }

    const allButLast = missing.slice(0, -1).map((m) => `**${m}**`).join(', ')
    const last = `**${missing[missing.length - 1]}**`
    return `I still need the subject's ${allButLast}, and ${last}.`
  }

  private async getLatestSubject(operationId: string) {
    const rows = await this.db
      .select()
      .from(subjects)
      .where(eq(subjects.operationId, operationId))
      .orderBy(desc(subjects.createdAt))
      .limit(1)

    return rows[0] ?? null
  }

  private shouldAutoRunSimulation(state: GuidedDraftState) {
    const draft = state.subjectDraft
    const hasName = !!draft.name
    const hasLkp = !!draft.lastKnownLocation || !!draft.lastKnownLocationText
    const hasAge = draft.age !== undefined
    const hasSex = !!draft.sex
    return hasName && hasLkp && hasAge && hasSex
  }

  // ── tactical AI helpers ────────────────────────────────────────

  private buildSimulationAdvice(subjectDraft: SubjectDraft) {
    const notes: string[] = []

    if ((subjectDraft.intentCategory ?? '').toLowerCase() === 'despondent') {
      notes.push('elevated-risk terrain, water edges, isolated paths, and cliff-adjacent areas should be considered')
    }

    if ((subjectDraft.intentCategory ?? '').toLowerCase() === 'dementia') {
      notes.push('disoriented wandering and irregular route choices should be considered')
    }

    if ((subjectDraft.mobilityLevel ?? '').toLowerCase() === 'limited') {
      notes.push('reduced travel distance and earlier stationary behavior are likely')
    }

    if ((subjectDraft.experienceLevel ?? '').toLowerCase() === 'high') {
      notes.push('trail-following and navigable-route persistence are more likely')
    }

    if ((subjectDraft.fitness ?? '').toLowerCase() === 'low') {
      notes.push('fatigue and early shelter-seeking should be weighted higher')
    }

    return notes
  }

  private buildTacticalAdvice(input: {
    subjectDraft?: SubjectDraft
    operation?: any
    weather?: {
      temperature?: number
      windSpeed?: number
      precipitation?: number
      visibility?: string
    }
  }) {
    const draft = input.subjectDraft ?? {}
    const op = input.operation ?? {}
    const weather = input.weather ?? {}

    const advice: string[] = []
    const risks: string[] = []
    const nextActions: string[] = []

    const terrain = String(op.terrainRegion ?? 'unknown').toLowerCase()
    const intent = String(draft.intentCategory ?? 'unknown').toLowerCase()
    const mobility = String(draft.mobilityLevel ?? 'unknown').toLowerCase()
    const experience = String(draft.experienceLevel ?? 'unknown').toLowerCase()
    const fitness = String(draft.fitness ?? 'unknown').toLowerCase()

    const rain = weather.precipitation ?? 0
    const wind = weather.windSpeed ?? 0
    const visibility = String(weather.visibility ?? 'unknown').toLowerCase()

    if (terrain.includes('forest')) {
      advice.push('Prioritize trails, drainage lines, shelter points, and downhill movement corridors.')
    }

    if (terrain.includes('highland')) {
      advice.push('Prioritize gullies, ledges, downhill lines, and terrain traps before broad ridge sweeps.')
      risks.push('Highland terrain increases injury, entrapment, and cliff-adjacent risk.')
    }

    if (terrain.includes('coastal')) {
      advice.push('Search coastal access paths, low ground, water-adjacent routes, and shelter structures.')
      risks.push('Coastal terrain increases tide, exposure, and water-edge hazard.')
    }

    if (terrain.includes('urban')) {
      advice.push('Prioritize CCTV, transport nodes, road crossings, and structured POIs.')
    }

    if (intent === 'dementia') {
      advice.push('Expect irregular wandering, low route logic, and attraction to obvious corridors or boundaries.')
      nextActions.push('Obtain witness timelines and likely wandering direction.')
    }

    if (intent === 'child') {
      advice.push('Concentrate early on concealment spaces, nearby hazards, and attraction points.')
      risks.push('Children often have shorter travel radius but high hazard exposure.')
    }

    if (intent === 'despondent') {
      advice.push('Expand search to isolated locations, water edges, elevated-risk terrain, and secluded access routes.')
      risks.push('Intent profile may increase probability of high-risk destination selection.')
    }

    if (mobility === 'limited' || fitness === 'low') {
      advice.push('Bias search toward shorter travel radius and earlier stationary outcomes.')
      nextActions.push('Search near LKP first before widening sectors.')
    }

    if (experience === 'high') {
      advice.push('Expect stronger trail retention, route choice persistence, and longer travel potential.')
    }

    if (rain > 10) {
      advice.push('Rain increases shelter-seeking and reduces sustainable movement.')
      risks.push('Rain raises hypothermia, slip, and visibility-related risk.')
    }

    if (wind > 20) {
      advice.push('High wind reduces long-range movement and increases refuge-seeking behavior.')
    }

    if (visibility.includes('poor') || visibility.includes('low')) {
      advice.push('Poor visibility increases disorientation and slower movement.')
      nextActions.push('Use tighter sectoring and route-based search logic.')
    }

    if (!draft.lastKnownLocation && !draft.lastKnownLocationText) {
      nextActions.push('Establish a reliable LKP before widening search assumptions.')
    }

    if (!draft.clothing || draft.clothing === 'unknown') {
      nextActions.push('Get clothing description for witness confirmation and field recognition.')
    }

    if (!draft.medicalHistory || draft.medicalHistory === 'unknown') {
      nextActions.push('Confirm medical history for exposure, medication, and survival-risk assessment.')
    }

    return {
      advice: Array.from(new Set(advice)).slice(0, 5),
      risks: Array.from(new Set(risks)).slice(0, 4),
      nextActions: Array.from(new Set(nextActions)).slice(0, 4),
    }
  }

  private formatTacticalBrief(data: {
    advice: string[]
    risks: string[]
    nextActions: string[]
  }) {
    let out = `**Tactical assessment**\n\n`

    if (data.advice.length) {
      out += `**Likely movement / search implications**\n`
      for (const item of data.advice) out += `- ${item}\n`
      out += `\n`
    }

    if (data.risks.length) {
      out += `**Key risks**\n`
      for (const item of data.risks) out += `- ${item}\n`
      out += `\n`
    }

    if (data.nextActions.length) {
      out += `**Recommended next actions**\n`
      for (const item of data.nextActions) out += `- ${item}\n`
    }

    return out.trim()
  }

  // ── DB tools ───────────────────────────────────────────────────

  private async toolCreateSubject(operationId: string, args: any) {
    const [s] = await this.db
      .insert(subjects)
      .values({
        operationId,
        name: args.name,
        age: args.age === 'unknown' ? null : args.age,
        sex: args.sex,
        intentCategory: args.intentCategory,
        experienceLevel: args.experienceLevel,
        mobilityLevel: args.mobilityLevel,
        medicalHistory: args.medicalHistory,
        clothing: args.clothing,
        lastKnownLocation: args.lastKnownLocation ?? null,
        lastContactTime: args.lastContactTime ? new Date(args.lastContactTime) : null,
      })
      .returning()

    return { ok: true, subject: s }
  }

  private async toolUpdateSubject(subjectId: string, args: any) {
    const patch: Record<string, any> = {}

    if (args.name !== undefined) patch.name = args.name
    if (args.age !== undefined) patch.age = args.age === 'unknown' ? null : args.age
    if (args.sex !== undefined) patch.sex = args.sex
    if (args.intentCategory !== undefined) patch.intentCategory = args.intentCategory
    if (args.experienceLevel !== undefined) patch.experienceLevel = args.experienceLevel
    if (args.mobilityLevel !== undefined) patch.mobilityLevel = args.mobilityLevel
    if (args.medicalHistory !== undefined) patch.medicalHistory = args.medicalHistory
    if (args.clothing !== undefined) patch.clothing = args.clothing
    if (args.lastKnownLocation !== undefined) patch.lastKnownLocation = args.lastKnownLocation
    if (args.lastContactTime !== undefined) {
      patch.lastContactTime = args.lastContactTime ? new Date(args.lastContactTime) : null
    }

    const [s] = await this.db
      .update(subjects)
      .set(patch)
      .where(eq(subjects.id, subjectId))
      .returning()

    return { ok: true, subject: s }
  }

  private async toolDeleteSubject(operationId: string, subjectId?: string) {
  let targetId = subjectId

  if (!targetId) {
    const rows = await this.db
      .select()
      .from(subjects)
      .where(eq(subjects.operationId, operationId))
      .orderBy(desc(subjects.createdAt))
      .limit(1)

    targetId = rows[0]?.id
  }

  if (!targetId) {
    return { ok: false, error: 'No subject found to delete.' }
  }

  // Null out FK reference using drizzle (raw execute doesn't work with Neon serverless)
  await this.db
    .update(simulationRuns)
    .set({ subjectId: null })
    .where(eq(simulationRuns.subjectId, targetId))

  const deleted = await this.db.delete(subjects).where(eq(subjects.id, targetId)).returning()
  return { ok: true, deleted: deleted[0] ?? null }
}

  private async toolAddEvidence(operationId: string, args: any) {
    const [e] = await this.db
      .insert(evidence)
      .values({
        operationId,
        type: args.type,
        location: args.location ?? null,
        confidenceScore: args.confidenceScore,
        source: args.source,
        notes: args.notes,
        timestamp: args.timestamp ? new Date(args.timestamp) : new Date(),
      })
      .returning()

    return { ok: true, evidence: e }
  }

  private async toolDeleteEvidence(operationId: string, evidenceId?: string) {
  let targetId = evidenceId

  if (!targetId) {
    const rows = await this.db
      .select({ id: evidence.id })
      .from(evidence)
      .where(eq(evidence.operationId, operationId))
      .orderBy(desc(evidence.createdAt))
      .limit(1)

    targetId = rows[0]?.id
  }

  if (!targetId) {
    return { ok: false, error: 'No evidence found to delete.' }
  }

  const deleted = await this.db
    .delete(evidence)
    .where(eq(evidence.id, targetId))
    .returning()

  return {
    ok: true,
    deleted: deleted[0] ?? null,
  }
}

  private async toolPlaceBasecamp(operationId: string, args: any) {
    const [b] = await this.db
      .insert(basecamps)
      .values({
        operationId,
        name: args.name,
        location: args.location,
        notes: args.notes ?? '',
      })
      .returning()

    return { ok: true, basecamp: b }
  }

  private async toolDeleteBasecamp(operationId: string, basecampId?: string) {
    let targetId = basecampId

    if (!targetId) {
      const rows = await this.db
        .select()
        .from(basecamps)
        .where(eq(basecamps.operationId, operationId))
        .orderBy(desc(basecamps.createdAt))
        .limit(1)

      targetId = rows[0]?.id
    }

    if (!targetId) {
      return { ok: false, error: 'No basecamp found to delete.' }
    }

    const deleted = await this.db.delete(basecamps).where(eq(basecamps.id, targetId)).returning()
    return { ok: true, deleted: deleted[0] ?? null }
  }

  private async toolAddPoi(operationId: string, args: any) {
    const [p] = await this.db
      .insert(pois)
      .values({
        operationId,
        name: args.name,
        type: args.type ?? 'general',
        location: args.location,
        notes: args.notes ?? '',
      })
      .returning()

    return { ok: true, poi: p }
  }

  private async toolDeletePoi(operationId: string, poiId?: string) {
    let targetId = poiId

    if (!targetId) {
      const rows = await this.db
        .select()
        .from(pois)
        .where(eq(pois.operationId, operationId))
        .orderBy(desc(pois.createdAt))
        .limit(1)

      targetId = rows[0]?.id
    }

    if (!targetId) {
      return { ok: false, error: 'No POI found to delete.' }
    }

    const deleted = await this.db.delete(pois).where(eq(pois.id, targetId)).returning()
    return { ok: true, deleted: deleted[0] ?? null }
  }

  private async toolUpdateOperation(operationId: string, args: any) {
    const [op] = await this.db
      .update(operations)
      .set({ ...args, updatedAt: new Date() })
      .where(eq(operations.id, operationId))
      .returning()

    return { ok: true, operation: op }
  }

  private async toolRunSimulation(operationId: string, args: any) {
  const [op] = await this.db
    .select()
    .from(operations)
    .where(eq(operations.id, operationId))
    .limit(1)

  const subs = await this.db
    .select()
    .from(subjects)
    .where(eq(subjects.operationId, operationId))
    .orderBy(desc(subjects.createdAt))
    .limit(1)

  const subject = subs[0] ?? null

  const subjectProfile = {
    age: subject?.age ?? args?.subjectProfile?.age ?? 'unknown',
    fitness: args?.subjectProfile?.fitness ?? 'unknown',
    experience: subject?.experienceLevel ?? args?.subjectProfile?.experience ?? 'unknown',
    intentCategory: subject?.intentCategory ?? args?.subjectProfile?.intentCategory ?? 'unknown',
    mobilityLevel: subject?.mobilityLevel ?? args?.subjectProfile?.mobilityLevel ?? 'unknown',
    sex:
      args?.subjectProfile?.sex === 'male' ||
      args?.subjectProfile?.sex === 'female' ||
      args?.subjectProfile?.sex === 'unknown'
        ? args.subjectProfile.sex
        : subject?.sex === 'male' || subject?.sex === 'female' || subject?.sex === 'unknown'
        ? subject.sex
        : 'unknown',
  }

  const weatherSnapshot =
    args?.weatherSnapshot && typeof args.weatherSnapshot === 'object'
      ? {
          temperature: args.weatherSnapshot.temperature,
          windSpeed: args.weatherSnapshot.windSpeed,
          windDirection: args.weatherSnapshot.windDirection,
          precipitation: args.weatherSnapshot.precipitation,
          visibility: args.weatherSnapshot.visibility,
        }
      : undefined

  const result = await this.simulationService.runSimulation({
    operationId,
    subjectId: subject?.id ?? args?.subjectId,
    source: 'ai',
    agentCount: args?.agentCount ?? 250,
    durationHours: args?.durationHours ?? 12,
    weatherSnapshot,
    subjectProfile,
  })

  return { ok: true, simulation: result, operationMode: op?.mode ?? 'manual' }
}

  private async toolGetStatus(operationId: string) {
    const [op] = await this.db.select().from(operations).where(eq(operations.id, operationId)).limit(1)
    const subs = await this.db.select().from(subjects).where(eq(subjects.operationId, operationId))
    const evs = await this.db.select().from(evidence).where(eq(evidence.operationId, operationId))
    const bcs = await this.db.select().from(basecamps).where(eq(basecamps.operationId, operationId))
    const ps = await this.db.select().from(pois).where(eq(pois.operationId, operationId))
    const sims = await this.db.select().from(simulationRuns).where(eq(simulationRuns.operationId, operationId))
    const sects = await this.db.select().from(searchSectors).where(eq(searchSectors.operationId, operationId))

    return {
      operation: op,
      subjects: subs,
      evidence: evs,
      basecamps: bcs,
      pois: ps,
      simulations: sims,
      sectors: sects,
    }
  }

  // ── structured tactical AI flow ────────────────────────────────

  private async handleAiDrivenNaturalInput(dto: ChatDto) {
    const operationId = dto.operationId
    const rawMessage = dto.message.trim()
    const message = this.normalizeText(rawMessage)

    const action = this.detectAction(message)
    const entity = this.detectEntity(message)

    const state =
      this.guidedDrafts.get(operationId) ?? {
        subjectId: undefined,
        subjectDraft: {},
      }

    const toolActions: any[] = []

    if ((action === 'rename' || action === 'update' || action === 'change') && entity === 'operation') {
      const renamed = this.extractRenameTarget(message)

      if (renamed) {
        const result = await this.toolUpdateOperation(operationId, { name: renamed })
        toolActions.push({
          tool: 'update_operation',
          args: { name: renamed },
          result,
        })

        return {
          reply: `Operation renamed to **${renamed}**.`,
          tokens: 0,
          toolActions,
        }
      }
    }

    if (action === 'status') {
      const result = await this.toolGetStatus(operationId)
      toolActions.push({
        tool: 'get_status',
        args: {},
        result,
      })

      return {
        reply:
          `Fetched the current operation status.\n\n` +
          `I can now help you review **subjects**, **evidence**, **basecamps**, **POIs**, **sectors**, and **simulation status**.`,
        tokens: 0,
        toolActions,
      }
    }

    if (action === 'delete' || action === 'remove') {
      if (entity === 'subject') {
        const result = await this.toolDeleteSubject(operationId)
        toolActions.push({ tool: 'delete_subject', args: {}, result })
        return {
          reply: result.ok ? `Subject deleted.` : `Delete failed: ${result.error}`,
          tokens: 0,
          toolActions,
        }
      }

      if (entity === 'evidence') {
        const result = await this.toolDeleteEvidence(operationId)
        toolActions.push({ tool: 'delete_evidence', args: {}, result })
        return {
          reply: result.ok ? `Evidence deleted.` : `Delete failed: ${result.error}`,
          tokens: 0,
          toolActions,
        }
      }

      if (entity === 'basecamp') {
        const result = await this.toolDeleteBasecamp(operationId)
        toolActions.push({ tool: 'delete_basecamp', args: {}, result })
        return {
          reply: result.ok ? `Basecamp deleted.` : `Delete failed: ${result.error}`,
          tokens: 0,
          toolActions,
        }
      }

      if (entity === 'poi') {
        const result = await this.toolDeletePoi(operationId)
        toolActions.push({ tool: 'delete_poi', args: {}, result })
        return {
          reply: result.ok ? `POI deleted.` : `Delete failed: ${result.error}`,
          tokens: 0,
          toolActions,
        }
      }

      return {
        reply:
          `I understood this as a delete/remove request, but I could not identify whether you meant **subject**, **evidence**, **basecamp**, or **POI**.`,
        tokens: 0,
        toolActions,
      }
    }

    if (action === 'simulate' || entity === 'simulation') {
      const result = await this.toolRunSimulation(operationId, {})
      toolActions.push({
        tool: 'run_simulation',
        args: {},
        result,
      })

      const simSummary = result.simulation?.summary
      return {
        reply:
          `Simulation queued and completed under **AI-driven control**.\n\n` +
          `${simSummary ? `**Summary:** ${simSummary}\n\n` : ''}` +
          `Check the **Results** panel and the **Map** for hotspots and probable movement paths.`,
        tokens: 0,
        toolActions,
      }
    }

    const subjectPatch = this.extractSubjectFields(message)
    const hasSubjectData = this.hasAnySubjectField(subjectPatch)

    const wantsSubjectUpdate =
      /\bsame subject\b|\bdon'?t create new\b|\bdont create new\b|\bupdate subject\b|\bedit subject\b|\badd more\b/.test(
        message.toLowerCase()
      ) || ((action === 'update' || action === 'edit' || action === 'change') && entity === 'subject')

    if (hasSubjectData) {
      state.subjectDraft = this.mergeDraft(state.subjectDraft, subjectPatch)
    }

    if (!state.subjectId && wantsSubjectUpdate) {
      const latestSubject = await this.getLatestSubject(operationId)
      if (latestSubject) {
        state.subjectId = latestSubject.id
        state.subjectDraft = this.mergeDraft(
          {
            name: latestSubject.name ?? undefined,
            age: latestSubject.age ?? 'unknown',
            sex:
              latestSubject.sex === 'male' ||
              latestSubject.sex === 'female' ||
              latestSubject.sex === 'unknown'
                ? latestSubject.sex
                : 'unknown',
            clothing: latestSubject.clothing ?? undefined,
            medicalHistory: latestSubject.medicalHistory ?? undefined,
            intentCategory: latestSubject.intentCategory ?? undefined,
            experienceLevel: latestSubject.experienceLevel ?? undefined,
            mobilityLevel: latestSubject.mobilityLevel ?? undefined,
            lastKnownLocation: latestSubject.lastKnownLocation ?? undefined,
          },
          state.subjectDraft
        )
      }
    }

    if (!state.subjectId && state.subjectDraft.name) {
      const createArgs = {
        name: state.subjectDraft.name,
        age: state.subjectDraft.age,
        sex: state.subjectDraft.sex ?? 'unknown',
        clothing: state.subjectDraft.clothing,
        medicalHistory: state.subjectDraft.medicalHistory,
        intentCategory: state.subjectDraft.intentCategory,
        experienceLevel: state.subjectDraft.experienceLevel,
        mobilityLevel: state.subjectDraft.mobilityLevel,
        lastKnownLocation: state.subjectDraft.lastKnownLocation,
        lastContactTime: state.subjectDraft.lastContactTime,
      }

      const result = await this.toolCreateSubject(operationId, createArgs)
      state.subjectId = result.subject?.id

      toolActions.push({
        tool: 'create_subject',
        args: createArgs,
        result,
      })
    } else if (state.subjectId && hasSubjectData) {
      const updateArgs: any = {}

      if (subjectPatch.name !== undefined) updateArgs.name = subjectPatch.name
      if (subjectPatch.age !== undefined) updateArgs.age = subjectPatch.age
      if (subjectPatch.sex !== undefined) updateArgs.sex = subjectPatch.sex
      if (subjectPatch.clothing !== undefined) updateArgs.clothing = subjectPatch.clothing
      if (subjectPatch.medicalHistory !== undefined) updateArgs.medicalHistory = subjectPatch.medicalHistory
      if (subjectPatch.intentCategory !== undefined) updateArgs.intentCategory = subjectPatch.intentCategory
      if (subjectPatch.experienceLevel !== undefined) updateArgs.experienceLevel = subjectPatch.experienceLevel
      if (subjectPatch.mobilityLevel !== undefined) updateArgs.mobilityLevel = subjectPatch.mobilityLevel
      if (subjectPatch.lastKnownLocation !== undefined) updateArgs.lastKnownLocation = subjectPatch.lastKnownLocation

      if (Object.keys(updateArgs).length > 0) {
        const result = await this.toolUpdateSubject(state.subjectId, updateArgs)
        toolActions.push({
          tool: 'update_subject',
          args: updateArgs,
          result,
        })
      }
    }

    this.guidedDrafts.set(operationId, state)

    if (entity === 'evidence' || /\bwitness\b|\bcctv\b|\bping\b|\btracks?\b/.test(message.toLowerCase())) {
      if (
        /\bwitness\b/.test(message.toLowerCase()) ||
        /\bcctv\b/.test(message.toLowerCase()) ||
        /\bping\b/.test(message.toLowerCase()) ||
        /\btracks?\b/.test(message.toLowerCase())
      ) {
        const evidenceType =
          /\bwitness\b/.test(message.toLowerCase())
            ? 'witness_statement'
            : /\bcctv\b/.test(message.toLowerCase())
            ? 'cctv_sighting'
            : /\bping\b/.test(message.toLowerCase())
            ? 'mobile_ping'
            : /\btracks?\b/.test(message.toLowerCase())
            ? 'tracks'
            : 'field_observation'

        const evArgs = {
          type: evidenceType,
          notes: rawMessage,
          confidenceScore: 70,
          location: this.extractLatLng(message),
          source: 'user_chat',
        }

        const result = await this.toolAddEvidence(operationId, evArgs)
        toolActions.push({
          tool: 'add_evidence',
          args: evArgs,
          result,
        })

        return {
          reply: `Evidence logged as **${evidenceType.replace(/_/g, ' ')}**.`,
          tokens: 0,
          toolActions,
        }
      }
    }

    if (entity === 'basecamp' && this.extractLatLng(message)) {
      const location = this.extractLatLng(message)!
      const result = await this.toolPlaceBasecamp(operationId, {
        name: 'ALPHA BASE',
        location,
        notes: rawMessage,
      })

      toolActions.push({
        tool: 'place_basecamp',
        args: { name: 'ALPHA BASE', location, notes: rawMessage },
        result,
      })

      return {
        reply: `Basecamp placed at **${location.lat}, ${location.lng}**.`,
        tokens: 0,
        toolActions,
      }
    }

    if (state.subjectId || hasSubjectData || action === 'create' || action === 'add') {
      const captured = this.summarizeCapturedFields(state.subjectDraft)
      const missing = this.getMissingSubjectFields(state.subjectDraft)

      let reply = ''

      if (captured.length > 0) {
        reply += `Recorded: ${captured.map((x) => `**${x}**`).join(', ')}.\n\n`
      }

      reply += this.buildMissingPrompt(missing)

      if (missing.includes('last known location')) {
        reply +=
          `\n\nYou can give the location by:\n` +
          `- typing coordinates like **19.2183, 72.9781**\n` +
          `- describing the place in words\n` +
          `- or using **Pick on Map**`
      }

      if (missing.length === 0) {
        const [op] = await this.db
          .select()
          .from(operations)
          .where(eq(operations.id, operationId))
          .limit(1)

        const tactical = this.buildTacticalAdvice({
          subjectDraft: state.subjectDraft,
          operation: op,
          weather: {
            temperature: 24,
            windSpeed: 8,
            precipitation: 0,
            visibility: 'moderate',
          },
        })

        const advice = this.buildSimulationAdvice(state.subjectDraft)
        const shouldSimulate = this.shouldAutoRunSimulation(state)

        if (shouldSimulate) {
          const simResult = await this.toolRunSimulation(operationId, {
            subjectProfile: {
              age: state.subjectDraft.age ?? 'unknown',
              fitness: state.subjectDraft.fitness ?? 'unknown',
              experience: state.subjectDraft.experienceLevel ?? 'unknown',
              intentCategory: state.subjectDraft.intentCategory ?? 'unknown',
              mobilityLevel: state.subjectDraft.mobilityLevel ?? 'unknown',
              sex: state.subjectDraft.sex ?? 'unknown',
            },
          })

          toolActions.push({
            tool: 'run_simulation',
            args: {
              subjectProfile: {
                age: state.subjectDraft.age ?? 'unknown',
                fitness: state.subjectDraft.fitness ?? 'unknown',
                experience: state.subjectDraft.experienceLevel ?? 'unknown',
                intentCategory: state.subjectDraft.intentCategory ?? 'unknown',
                mobilityLevel: state.subjectDraft.mobilityLevel ?? 'unknown',
                sex: state.subjectDraft.sex ?? 'unknown',
              },
            },
            result: simResult,
          })

          reply += `\n\nI had enough data to run an **AI-driven simulation** automatically.`

          if (simResult.simulation?.summary) {
            reply += `\n\n**Simulation summary:** ${simResult.simulation.summary}`
          }
        }

        if (advice.length > 0) {
          reply += `\n\n**Additional subject-based guidance:**`
          for (const item of advice) {
            reply += `\n- ${item}`
          }
        }

        reply += `\n\n${this.formatTacticalBrief(tactical)}`
        reply += `\n\nYou can continue with **evidence**, **witness info**, **basecamp placement**, or **status review**.`
      }

      return {
        reply,
        tokens: 0,
        toolActions,
      }
    }

    return null
  }

  // ── Groq tools ────────────────────────────────────────────────

  private getTools() {
    return [
      {
        type: 'function' as const,
        function: {
          name: 'create_subject',
          description: 'Add a missing person / subject to the operation.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: ['number', 'string'] as any },
              sex: { type: 'string', enum: ['male', 'female', 'unknown'] },
              intentCategory: { type: 'string' },
              experienceLevel: { type: 'string', enum: ['none', 'low', 'medium', 'high', 'unknown'] },
              mobilityLevel: { type: 'string', enum: ['full', 'limited', 'immobile', 'unknown'] },
              medicalHistory: { type: 'string' },
              clothing: { type: 'string' },
              lastKnownLocation: {
                type: 'object',
                properties: {
                  lat: { type: 'number' },
                  lng: { type: 'number' },
                },
              },
              lastContactTime: { type: 'string' },
            },
            required: ['name'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'add_evidence',
          description: 'Log evidence to the operation.',
          parameters: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: [
                  'witness_statement',
                  'cctv_sighting',
                  'mobile_ping',
                  'clothing_item',
                  'tracks',
                  'drone_image',
                  'field_observation',
                  'negative_search',
                ],
              },
              source: { type: 'string' },
              notes: { type: 'string' },
              confidenceScore: { type: 'number' },
              location: {
                type: 'object',
                properties: {
                  lat: { type: 'number' },
                  lng: { type: 'number' },
                },
              },
              timestamp: { type: 'string' },
            },
            required: ['type', 'notes'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'place_basecamp',
          description: 'Place a basecamp on the map.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              location: {
                type: 'object',
                properties: {
                  lat: { type: 'number' },
                  lng: { type: 'number' },
                },
                required: ['lat', 'lng'],
              },
              notes: { type: 'string' },
            },
            required: ['name', 'location'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'add_poi',
          description: 'Add a point of interest to the map.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              type: { type: 'string' },
              location: {
                type: 'object',
                properties: {
                  lat: { type: 'number' },
                  lng: { type: 'number' },
                },
                required: ['lat', 'lng'],
              },
              notes: { type: 'string' },
            },
            required: ['name', 'location'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'update_operation',
          description: 'Update operation details.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              status: {
                type: 'string',
                enum: ['draft', 'active', 'suspended', 'escalated', 'closed', 'archived'],
              },
              terrainRegion: { type: 'string' },
              searchRadius: { type: 'number' },
              notes: { type: 'string' },
              operationalDays: { type: 'number' },
            },
          },
        },
      },
      {
  type: 'function' as const,
  function: {
    name: 'run_simulation',
    description: 'Queue a simulation run. In AI-driven mode this must be AI-triggered only.',
    parameters: {
      type: 'object',
      properties: {
        agentCount: { type: 'number' },
        durationHours: { type: 'number' },
        weatherSnapshot: {
          type: 'object',
          properties: {
            temperature: { type: 'number' },
            windSpeed: { type: 'number' },
            windDirection: { type: 'string' },
            precipitation: { type: 'number' },
            visibility: { type: 'string' },
          },
        },
        subjectProfile: {
          type: 'object',
          properties: {
            age: { type: ['number', 'string'] as any },
            fitness: { type: 'string' },
            experience: { type: 'string' },
            intentCategory: { type: 'string' },
            mobilityLevel: { type: 'string' },
            sex: { type: 'string', enum: ['male', 'female', 'unknown'] },
          },
        },
      },
    },
  },
},
      {
        type: 'function' as const,
        function: {
          name: 'get_status',
          description: 'Get full current status of the operation.',
          parameters: {
            type: 'object',
            properties: {},
          },
        },
      },
    ]
  }

  // ── context builder ───────────────────────────────────────────

  private async buildOperationContext(operationId: string): Promise<string> {
    try {
      const [op] = await this.db.select().from(operations).where(eq(operations.id, operationId)).limit(1)
      const subs = await this.db.select().from(subjects).where(eq(subjects.operationId, operationId))
      const evs = await this.db.select().from(evidence).where(eq(evidence.operationId, operationId))
      const sims = await this.db.select().from(simulationRuns).where(eq(simulationRuns.operationId, operationId)).limit(5)
      const sectors = await this.db.select().from(searchSectors).where(eq(searchSectors.operationId, operationId))
      const bcs = await this.db.select().from(basecamps).where(eq(basecamps.operationId, operationId))
      const ps = await this.db.select().from(pois).where(eq(pois.operationId, operationId))

      let ctx = `=== CURRENT OPERATION DATA ===\n`

      if (op) {
        ctx += `\nOPERATION: ${op.name} | Mode: ${op.mode ?? 'manual'} | Status: ${op.status}\n`
        ctx += `Terrain: ${op.terrainRegion ?? 'Unknown'} | Radius: ${op.searchRadius ?? '?'} km | Day: ${op.operationalDays ?? 1}\n`
        if (op.areaOfInterest) ctx += `Center: ${JSON.stringify(op.areaOfInterest)}\n`
        ctx += `Notes: ${op.notes ?? 'None'}\n`
      }

      ctx += subs.length > 0
        ? `\nSUBJECTS (${subs.length}):\n` +
          subs
            .map(
              (s: any, i: number) =>
                `${i + 1}. ${s.name}, Age: ${s.age ?? 'unknown'}, ${s.sex ?? 'unknown'}, Intent: ${s.intentCategory ?? 'unknown'}, Exp: ${s.experienceLevel ?? 'unknown'}, Mobility: ${s.mobilityLevel ?? 'unknown'}\n   Medical: ${s.medicalHistory ?? 'unknown'} | Clothing: ${s.clothing ?? 'unknown'}\n   LKP: ${s.lastKnownLocation ? JSON.stringify(s.lastKnownLocation) : 'Unknown'}`
            )
            .join('\n')
        : `\nSUBJECTS: None yet.\n`

      ctx += evs.length > 0
        ? `\n\nEVIDENCE (${evs.length}):\n` +
          evs
            .map(
              (e: any, i: number) =>
                `${i + 1}. ${e.type} | Confidence: ${e.confidenceScore ?? '?'}% | Source: ${e.source ?? '?'}\n   ${e.notes} | Location: ${e.location ? JSON.stringify(e.location) : 'Unknown'}`
            )
            .join('\n')
        : `\n\nEVIDENCE: None yet.\n`

      ctx += bcs.length > 0
        ? `\n\nBASECAMPS (${bcs.length}):\n` +
          bcs.map((b: any) => `- ${b.name}: ${JSON.stringify(b.location)}`).join('\n')
        : `\n\nBASECAMPS: None yet.\n`

      ctx += ps.length > 0
        ? `\n\nPOIs (${ps.length}):\n` +
          ps.map((p: any) => `- ${p.name} (${p.type}): ${JSON.stringify(p.location)}`).join('\n')
        : `\n\nPOIs: None yet.\n`

      ctx += sectors.length > 0
        ? `\n\nSECTORS (${sectors.length}):\n` +
          sectors
            .map((s: any, i: number) => `${i + 1}. ${s.name}: ${s.searched ? 'SEARCHED' : 'PENDING'} | Priority: ${s.priorityScore ?? '?'}`)
            .join('\n')
        : `\n\nSECTORS: None defined.\n`

      if (sims.length > 0) {
        const latest = sims[sims.length - 1]
        ctx += `\n\nLATEST SIMULATION: ${latest.agentCount} agents, ${latest.durationHours}h | Status: ${latest.status}\n`
      } else {
        ctx += `\n\nSIMULATIONS: None run yet.\n`
      }

      return ctx
    } catch (err) {
      return `=== OPERATION CONTEXT: Unable to fetch (${err}) ===\n`
    }
  }

  // ── main chat ─────────────────────────────────────────────────

  async chat(dto: ChatDto) {
    const operationContext = await this.buildOperationContext(dto.operationId)
    const isAiDriven = dto.mode === 'ai_driven'

    if (isAiDriven) {
      const structured = await this.handleAiDrivenNaturalInput(dto)
      if (structured) return structured
    }

    const systemPrompt = isAiDriven
      ? `You are TerraTrace AI — the primary operator of this SAR operation in AI-Driven mode.

${operationContext}

Rules:
- Respect the user's latest message over your previous question.
- If the user gives partial details, use them.
- Unknown values are acceptable.
- Do not force rigid turn order.
- Do not offer standalone manual simulation control in AI-driven mode.
- For run_simulation, NEVER pass full database rows or nulls. Only pass:
  { age, fitness, experience, intentCategory, mobilityLevel, sex }
  and optionally weatherSnapshot as an object.
- Only claim actions that were actually performed.
- Think actively about weather, terrain, time since missing, rivers, cliffs, trails, shelter, fatigue, and intent.
- Use **bold** for key actions, entities, and recommendations.`
      : `You are TerraTrace AI — an expert SAR advisor embedded in this operation.

      Deletion rules:
- Do NOT delete entities blindly
- Check dependencies (simulations, evidence)
- Prefer update or archive over delete

${operationContext}

Advisory mode only:
- answer questions
- explain risks
- recommend actions
- do not perform tool actions in manual mode
- use **bold** for key terms`

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...dto.history.map((h) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: dto.message },
    ]

    const toolActions: any[] = []

    if (isAiDriven) {
      let loopCount = 0

      while (loopCount < 5) {
        loopCount++

        const completion = await this.groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages,
          tools: this.getTools(),
          tool_choice: 'auto',
          max_tokens: 1024,
          temperature: 0.4,
        })

        const choice = completion.choices[0]
        const msg = choice.message

        messages.push({
          role: 'assistant',
          content: msg.content,
          tool_calls: msg.tool_calls,
        })

        if (choice.finish_reason === 'tool_calls' && msg.tool_calls?.length) {
          for (const tc of msg.tool_calls) {
            const fname = tc.function.name
            const rawArgs = JSON.parse(tc.function.arguments || '{}')
            const args = { ...rawArgs }

          if (args.weatherSnapshot == null) delete args.weatherSnapshot
          if (args.subjectProfile == null) delete args.subjectProfile
            let result: any = {}

            try {
              if (fname === 'create_subject') {
                result = await this.toolCreateSubject(dto.operationId, args)
              } else if (fname === 'add_evidence') {
                result = await this.toolAddEvidence(dto.operationId, args)
              } else if (fname === 'place_basecamp') {
                result = await this.toolPlaceBasecamp(dto.operationId, args)
              } else if (fname === 'add_poi') {
                result = await this.toolAddPoi(dto.operationId, args)
              } else if (fname === 'update_operation') {
                result = await this.toolUpdateOperation(dto.operationId, args)
              } else if (fname === 'run_simulation') {
                result = await this.toolRunSimulation(dto.operationId, args)
              } else if (fname === 'get_status') {
                result = await this.toolGetStatus(dto.operationId)
              }
            } catch (err) {
              result = { ok: false, error: String(err) }
            }

            toolActions.push({ tool: fname, args, result })

            messages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: JSON.stringify(result),
            })
          }
        } else {
          return {
            reply: msg.content ?? 'Done.',
            tokens: completion.usage?.total_tokens ?? 0,
            toolActions,
          }
        }
      }

      return {
        reply: 'Processing complete. Check the map for updates.',
        tokens: 0,
        toolActions,
      }
    }

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 1024,
      temperature: 0.4,
    })

    return {
      reply: completion.choices[0]?.message?.content ?? 'No response.',
      tokens: completion.usage?.total_tokens ?? 0,
      toolActions: [],
    }
  }

  async summarizeOperation(operationId: string) {
    const ctx = await this.buildOperationContext(operationId)

    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are a SAR operation summarizer. Be concise and tactical.\n\n${ctx}`,
        },
        {
          role: 'user',
          content:
            'Summarize current status. Highlight priority sectors, key evidence, next actions, risks. Under 150 words.',
        },
      ],
      max_tokens: 512,
      temperature: 0.3,
    })

    return {
      summary: completion.choices[0]?.message?.content ?? '',
    }
  }

  async explainSector(sectorName: string, probability: number) {
    const completion = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a SAR probability analyst.' },
        {
          role: 'user',
          content: `Explain why **${sectorName}** has probability **${probability}%** in a forest/highland SAR op. Think about terrain, weather, shelter, trails, rivers, cliffs, fatigue, and subject intent. Under 120 words.`,
        },
      ],
      max_tokens: 256,
      temperature: 0.3,
    })

    return {
      explanation: completion.choices[0]?.message?.content ?? '',
    }
  }
}