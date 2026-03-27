import { Injectable, Inject, BadRequestException, ForbiddenException } from '@nestjs/common'
import { and, desc, eq } from 'drizzle-orm'
import { simulationRuns, operations, subjects } from '../db/schema'
import type { RunSimulationDto } from './dto'




export interface AgentPath {
  agentId: number
  path: { lat: number; lng: number; t: number }[]
  finalLat: number
  finalLng: number
  behavior: string
}

export interface Hotspot {
  lat: number
  lng: number
  probability: number
  radius: number
  label: string
  rationale?: string
}

export interface SectorProbability {
  name: string
  probability: number
}

export interface SimulationResult {
  runId: string
  agentCount: number
  hotspots: Hotspot[]
  samplePaths: { agentId: number; behavior: string; path: { lat: number; lng: number; t: number }[] }[]
  sectorProbabilities: SectorProbability[]
  summary: string
}

type WeatherInput = {
  temperature?: number
  windSpeed?: number
  windDirection?: string
  precipitation?: number
  visibility?: string
}

type SubjectProfileInput = {
  age?: number | 'unknown'
  fitness?: string
  experience?: string
  intentCategory?: string
  mobilityLevel?: string
  sex?: 'male' | 'female' | 'unknown'
}

type SubjectRow = {
  id: string
  age: number | null
  sex: string | null
  experienceLevel: string | null
  intentCategory: string | null
  mobilityLevel: string | null
  lastKnownLocation: { lat: number; lng: number } | null
}

type BehaviorProfile = {
  name: string
  weight: number
  drift: { lat: number; lng: number }
  riskAffinity: number
  waterAffinity: number
  shelterAffinity: number
  trailAffinity: number
  cliffAffinity: number
}



@Injectable()
export class SimulationService {
  constructor(@Inject('DB') private db: any) {}

  async runSimulation(dto: RunSimulationDto): Promise<SimulationResult> {
    const [op] = await this.db
      .select()
      .from(operations)
      .where(eq(operations.id, dto.operationId))
      .limit(1)

    if (!op) {
      throw new BadRequestException('Operation not found.')
    }

    if (op.mode === 'ai_driven' && dto.source !== 'ai') {
      throw new ForbiddenException(
        'Simulation in AI-driven mode can only be triggered by TerraTrace AI.'
      )
    }

    let subject: SubjectRow | null = null

if (dto.subjectId) {
  const rows = await this.db
    .select()
    .from(subjects)
    .where(and(eq(subjects.id, dto.subjectId), eq(subjects.operationId, dto.operationId)))
    .limit(1)

  subject = (rows[0] as SubjectRow | undefined) ?? null
} else {
  const rows = await this.db
    .select()
    .from(subjects)
    .where(eq(subjects.operationId, dto.operationId))
    .orderBy(desc(subjects.createdAt))
    .limit(1)

  subject = (rows[0] as SubjectRow | undefined) ?? null
}

    const baseLat =
      subject?.lastKnownLocation?.lat ??
      op?.areaOfInterest?.lat

    const baseLng =
      subject?.lastKnownLocation?.lng ??
      op?.areaOfInterest?.lng

    if (baseLat == null || baseLng == null) {
      throw new BadRequestException(
        'Simulation requires a subject LKP or operation area of interest.'
      )
    }

    const subjectProfile: SubjectProfileInput = {
      age: dto.subjectProfile?.age ?? subject?.age ?? 'unknown',
      fitness: dto.subjectProfile?.fitness ?? 'unknown',
      experience: dto.subjectProfile?.experience ?? subject?.experienceLevel ?? 'unknown',
      intentCategory: dto.subjectProfile?.intentCategory ?? subject?.intentCategory ?? 'unknown',
      mobilityLevel: dto.subjectProfile?.mobilityLevel ?? subject?.mobilityLevel ?? 'unknown',
      sex: this.normalizeSex(dto.subjectProfile?.sex ?? subject?.sex),
    }

    const weather: WeatherInput = {
      temperature: dto.weatherSnapshot?.temperature ?? 24,
      windSpeed: dto.weatherSnapshot?.windSpeed ?? 5,
      windDirection: dto.weatherSnapshot?.windDirection ?? 'unknown',
      precipitation: dto.weatherSnapshot?.precipitation ?? 0,
      visibility: dto.weatherSnapshot?.visibility ?? 'moderate',
    }

    const behaviors = this.buildBehaviorProfiles(subjectProfile, weather, op?.terrainRegion ?? 'mixed')
    const agents: AgentPath[] = []
    const finalPositions: { lat: number; lng: number; behavior: string }[] = []

    const steps = Math.min(Math.max(dto.durationHours * 2, 4), 32)

    for (let i = 0; i < dto.agentCount; i++) {
      const profile = this.pickBehavior(behaviors)
      const path: { lat: number; lng: number; t: number }[] = [
        {
          lat: baseLat,
          lng: baseLng,
          t: 0,
        },
      ]

      let curLat = baseLat
      let curLng = baseLng

      for (let s = 1; s <= steps; s++) {
        const weatherFactor = this.getWeatherMovementFactor(weather)
        const mobilityFactor = this.getMobilityFactor(subjectProfile)
        const visibilityFactor = this.getVisibilityFactor(weather.visibility)
        const terrainFactor = this.getTerrainFactor(op?.terrainRegion ?? 'mixed')

        const totalFactor =
          weatherFactor * mobilityFactor * visibilityFactor * terrainFactor

        const noiseLat = (Math.random() - 0.5) * 0.003
        const noiseLng = (Math.random() - 0.5) * 0.003

        const terrainBias = this.getTerrainBias(profile, op?.terrainRegion ?? 'mixed')
        const weatherBias = this.getWeatherBias(weather)

        curLat += (profile.drift.lat + terrainBias.lat + weatherBias.lat + noiseLat) * totalFactor
        curLng += (profile.drift.lng + terrainBias.lng + weatherBias.lng + noiseLng) * totalFactor

        path.push({
          lat: Number(curLat.toFixed(5)),
          lng: Number(curLng.toFixed(5)),
          t: s,
        })
      }

      agents.push({
        agentId: i,
        path,
        finalLat: curLat,
        finalLng: curLng,
        behavior: profile.name,
      })

      finalPositions.push({
        lat: curLat,
        lng: curLng,
        behavior: profile.name,
      })
    }

    const hotspots = this.clusterHotspots(finalPositions, dto.agentCount, subjectProfile, weather)
    const sectorProbabilities = this.calcSectorProbs(finalPositions, baseLat, baseLng)
    const summary = this.generateSummary(hotspots, dto.agentCount, subjectProfile, weather, op?.terrainRegion ?? 'mixed')

    const samplePaths = agents
      .filter((_, i) => i % Math.max(1, Math.floor(dto.agentCount / 20)) === 0)
      .map((a) => ({
        agentId: a.agentId,
        behavior: a.behavior,
        path: a.path,
      }))

    const [run] = await this.db
      .insert(simulationRuns)
      .values({
        operationId: dto.operationId,
        subjectId: subject?.id ?? null,
        agentCount: dto.agentCount,
        durationHours: dto.durationHours,
        weatherSnapshot: weather,
        parameters: subjectProfile,
        status: 'complete',
        probabilitySurface: { hotspots, sectorProbabilities },
        hotspots,
      })
      .returning()

    return {
      runId: run.id,
      agentCount: dto.agentCount,
      hotspots,
      samplePaths,
      sectorProbabilities,
      summary,
    }
  }

  private buildBehaviorProfiles(
    subject: SubjectProfileInput,
    weather: WeatherInput,
    terrainRegion: string
  ): BehaviorProfile[] {
    const intent = (subject.intentCategory ?? 'unknown').toLowerCase()
    const mobility = (subject.mobilityLevel ?? 'unknown').toLowerCase()
    const fitness = (subject.fitness ?? 'unknown').toLowerCase()
    const experience = (subject.experience ?? 'unknown').toLowerCase()

    const rain = weather.precipitation ?? 0
    const wind = weather.windSpeed ?? 0

    let profiles: BehaviorProfile[] = [
      {
        name: 'trail_follower',
        weight: 0.28,
        drift: { lat: 0.006, lng: 0.004 },
        riskAffinity: 0.2,
        waterAffinity: 0.1,
        shelterAffinity: 0.2,
        trailAffinity: 0.9,
        cliffAffinity: 0.05,
      },
      {
        name: 'downhill',
        weight: 0.2,
        drift: { lat: -0.005, lng: 0.003 },
        riskAffinity: 0.25,
        waterAffinity: 0.4,
        shelterAffinity: 0.15,
        trailAffinity: 0.25,
        cliffAffinity: 0.1,
      },
      {
        name: 'shelter_seek',
        weight: 0.18,
        drift: { lat: 0.004, lng: -0.005 },
        riskAffinity: 0.1,
        waterAffinity: 0.15,
        shelterAffinity: 0.9,
        trailAffinity: 0.3,
        cliffAffinity: 0.02,
      },
      {
        name: 'random_walk',
        weight: 0.18,
        drift: { lat: 0.002, lng: -0.002 },
        riskAffinity: 0.35,
        waterAffinity: 0.2,
        shelterAffinity: 0.2,
        trailAffinity: 0.2,
        cliffAffinity: 0.08,
      },
      {
        name: 'stationary',
        weight: 0.16,
        drift: { lat: 0, lng: 0 },
        riskAffinity: 0.05,
        waterAffinity: 0.05,
        shelterAffinity: 0.4,
        trailAffinity: 0.1,
        cliffAffinity: 0,
      },
    ]

    if (intent === 'child') {
      profiles = profiles.map((p) =>
        p.name === 'stationary' ? { ...p, weight: p.weight + 0.08 } :
        p.name === 'trail_follower' ? { ...p, weight: p.weight - 0.03 } :
        p
      )
    }

    if (intent === 'dementia') {
      profiles = profiles.map((p) =>
        p.name === 'random_walk' ? { ...p, weight: p.weight + 0.12 } :
        p.name === 'trail_follower' ? { ...p, weight: p.weight - 0.05 } :
        p
      )
    }

    if (intent === 'despondent') {
      profiles = profiles.map((p) =>
        p.name === 'downhill'
          ? { ...p, weight: p.weight + 0.08, cliffAffinity: 0.18, waterAffinity: 0.5 }
          : p
      )
    }

    if (mobility === 'limited' || fitness === 'low') {
      profiles = profiles.map((p) =>
        p.name === 'stationary'
          ? { ...p, weight: p.weight + 0.12 }
          : p.name === 'trail_follower'
          ? { ...p, weight: p.weight - 0.04 }
          : p
      )
    }

    if (experience === 'high') {
      profiles = profiles.map((p) =>
        p.name === 'trail_follower'
          ? { ...p, weight: p.weight + 0.08 }
          : p
      )
    }

    if (rain > 10 || wind > 20) {
      profiles = profiles.map((p) =>
        p.name === 'shelter_seek'
          ? { ...p, weight: p.weight + 0.12 }
          : p.name === 'random_walk'
          ? { ...p, weight: p.weight - 0.06 }
          : p
      )
    }

    if (terrainRegion.toLowerCase().includes('coast')) {
      profiles = profiles.map((p) =>
        p.name === 'downhill'
          ? { ...p, waterAffinity: p.waterAffinity + 0.15 }
          : p
      )
    }

    const total = profiles.reduce((sum, p) => sum + p.weight, 0)
    return profiles.map((p) => ({ ...p, weight: p.weight / total }))
  }

  private pickBehavior(profiles: BehaviorProfile[]) {
    const rand = Math.random()
    let cum = 0
    for (const p of profiles) {
      cum += p.weight
      if (rand <= cum) return p
    }
    return profiles[0]
  }

  private getWeatherMovementFactor(weather: WeatherInput) {
    const wind = weather.windSpeed ?? 0
    const rain = weather.precipitation ?? 0

    let factor = 1
    factor *= Math.max(0.55, 1 - wind / 60)
    factor *= Math.max(0.5, 1 - rain / 40)

    return factor
  }

  private getMobilityFactor(subject: SubjectProfileInput) {
    const mobility = (subject.mobilityLevel ?? 'unknown').toLowerCase()
    const fitness = (subject.fitness ?? 'unknown').toLowerCase()

    let factor = 1

    if (mobility === 'limited') factor *= 0.65
    if (mobility === 'immobile') factor *= 0.2
    if (fitness === 'low') factor *= 0.8
    if (fitness === 'high') factor *= 1.1

    return factor
  }

  private getVisibilityFactor(visibility?: string) {
    const v = (visibility ?? 'moderate').toLowerCase()
    if (v.includes('poor')) return 0.7
    if (v.includes('low')) return 0.8
    if (v.includes('good')) return 1
    return 0.9
  }

  private getTerrainFactor(terrainRegion: string) {
    const t = terrainRegion.toLowerCase()
    if (t.includes('forest')) return 0.85
    if (t.includes('highland')) return 0.75
    if (t.includes('urban')) return 1
    if (t.includes('coastal')) return 0.9
    return 0.9
  }

  private normalizeSex(value: unknown): 'male' | 'female' | 'unknown' {
  if (value === 'male' || value === 'female' || value === 'unknown') {
    return value
  }
  return 'unknown'
}

  private getTerrainBias(profile: BehaviorProfile, terrainRegion: string) {
    const t = terrainRegion.toLowerCase()

    if (t.includes('highland')) {
      return {
        lat: -0.002 * (profile.riskAffinity + profile.waterAffinity),
        lng: 0.001 * profile.trailAffinity,
      }
    }

    if (t.includes('forest')) {
      return {
        lat: 0.001 * profile.shelterAffinity,
        lng: 0.002 * profile.trailAffinity,
      }
    }

    if (t.includes('coastal')) {
      return {
        lat: -0.001 * profile.waterAffinity,
        lng: 0.002 * profile.shelterAffinity,
      }
    }

    return { lat: 0, lng: 0 }
  }

  private getWeatherBias(weather: WeatherInput) {
    const windDirection = (weather.windDirection ?? '').toLowerCase()

    if (windDirection.includes('north')) return { lat: -0.001, lng: 0 }
    if (windDirection.includes('south')) return { lat: 0.001, lng: 0 }
    if (windDirection.includes('east')) return { lat: 0, lng: -0.001 }
    if (windDirection.includes('west')) return { lat: 0, lng: 0.001 }

    return { lat: 0, lng: 0 }
  }

  private clusterHotspots(
    positions: { lat: number; lng: number; behavior: string }[],
    total: number,
    subject: SubjectProfileInput,
    weather: WeatherInput
  ): Hotspot[] {
    const grid: Record<string, { count: number; behaviors: Record<string, number> }> = {}
    const cellSize = 0.008

    positions.forEach((p) => {
      const key = `${Math.round(p.lat / cellSize)}_${Math.round(p.lng / cellSize)}`
      if (!grid[key]) grid[key] = { count: 0, behaviors: {} }
      grid[key].count += 1
      grid[key].behaviors[p.behavior] = (grid[key].behaviors[p.behavior] ?? 0) + 1
    })

    const sorted = Object.entries(grid)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)

    const maxCount = sorted[0]?.[1]?.count ?? 1

    return sorted.map(([key, bucket], i) => {
      const [latK, lngK] = key.split('_').map(Number)
      const dominantBehavior =
        Object.entries(bucket.behaviors).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'unknown'

      return {
        lat: Number((latK * cellSize).toFixed(5)),
        lng: Number((lngK * cellSize).toFixed(5)),
        probability: Number(((bucket.count / maxCount) * 100).toFixed(1)),
        radius: 220 + i * 70,
        label: `HOTSPOT-${i + 1}`,
        rationale: this.buildHotspotRationale(dominantBehavior, subject, weather),
      }
    })
  }

  private buildHotspotRationale(
    dominantBehavior: string,
    subject: SubjectProfileInput,
    weather: WeatherInput
  ) {
    const parts: string[] = []

    if (dominantBehavior === 'trail_follower') {
      parts.push('movement clustered along the most navigable route tendency')
    } else if (dominantBehavior === 'shelter_seek') {
      parts.push('agents favored shelter-seeking behavior')
    } else if (dominantBehavior === 'downhill') {
      parts.push('terrain and fatigue favored downhill drift')
    } else if (dominantBehavior === 'stationary') {
      parts.push('reduced mobility increased stationary probability')
    } else {
      parts.push('disoriented movement pattern concentrated here')
    }

    if ((weather.precipitation ?? 0) > 10) {
      parts.push('rain increased shelter-seeking pressure')
    }
    if ((weather.windSpeed ?? 0) > 20) {
      parts.push('high wind reduced long-range movement')
    }
    if ((subject.mobilityLevel ?? '').toLowerCase() === 'limited') {
      parts.push('limited mobility constrained spread')
    }

    return parts.join('; ')
  }

  private calcSectorProbs(
    positions: { lat: number; lng: number; behavior: string }[],
    baseLat: number,
    baseLng: number
  ): SectorProbability[] {
    const sectors = [
      { name: 'SEC-A', minLat: baseLat - 0.012, maxLat: baseLat + 0.004, minLng: baseLng - 0.012, maxLng: baseLng - 0.002 },
      { name: 'SEC-B', minLat: baseLat - 0.004, maxLat: baseLat + 0.008, minLng: baseLng - 0.002, maxLng: baseLng + 0.010 },
      { name: 'SEC-C', minLat: baseLat + 0.002, maxLat: baseLat + 0.014, minLng: baseLng + 0.002, maxLng: baseLng + 0.014 },
    ]

    const total = positions.length || 1

    return sectors.map((s) => {
      const count = positions.filter(
        (p) =>
          p.lat >= s.minLat &&
          p.lat <= s.maxLat &&
          p.lng >= s.minLng &&
          p.lng <= s.maxLng
      ).length

      return {
        name: s.name,
        probability: Number(((count / total) * 100).toFixed(1)),
      }
    })
  }

  private generateSummary(
    hotspots: Hotspot[],
    agentCount: number,
    subject: SubjectProfileInput,
    weather: WeatherInput,
    terrainRegion: string
  ) {
    const top = hotspots[0]
    if (!top) {
      return 'Simulation complete. No clear hotspots identified.'
    }

    const lines: string[] = []
    lines.push(`Simulation complete (${agentCount} agents).`)
    lines.push(
      `Primary hotspot at ${top.lat.toFixed(4)}N ${top.lng.toFixed(4)}E with ${top.probability}% probability concentration.`
    )

    if (top.rationale) {
      lines.push(`Reasoning: ${top.rationale}.`)
    }

    if ((weather.precipitation ?? 0) > 10) {
      lines.push('Recommend prioritizing sheltered routes and drainage-adjacent areas due to rain.')
    }

    if ((weather.windSpeed ?? 0) > 20) {
      lines.push('Wind conditions likely reduced long-range movement and increased nearby refuge behavior.')
    }

    if ((subject.intentCategory ?? '').toLowerCase() === 'despondent') {
      lines.push('Include elevated-risk terrain, water-adjacent areas, and isolated approaches in tasking.')
    }

    if (terrainRegion.toLowerCase().includes('highland')) {
      lines.push('Search downhill movement corridors, gullies, and accessible ledges first.')
    }

    return lines.join(' ')
  }

  async getSimulations(operationId: string) {
    return this.db
      .select()
      .from(simulationRuns)
      .where(eq(simulationRuns.operationId, operationId))
      .orderBy(simulationRuns.createdAt)
  }
}