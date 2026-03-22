import { Injectable, Inject } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { simulationRuns } from '../db/schema'
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

@Injectable()
export class SimulationService {
  constructor(@Inject('DB') private db: any) {}

  async runSimulation(dto: RunSimulationDto): Promise<SimulationResult> {
    const baseLat = 16.4234
    const baseLng = 73.8812

    const behaviorProfiles = [
      { name: 'trail_follower', weight: 0.35, drift: { lat: 0.008,  lng: 0.006  } },
      { name: 'downhill',       weight: 0.25, drift: { lat: -0.005, lng: 0.004  } },
      { name: 'random_walk',    weight: 0.20, drift: { lat: 0.002,  lng: -0.003 } },
      { name: 'shelter_seek',   weight: 0.12, drift: { lat: 0.010,  lng: -0.008 } },
      { name: 'stationary',     weight: 0.08, drift: { lat: 0.0,    lng: 0.0    } },
    ]

    const agents: AgentPath[] = []
    const finalPositions: { lat: number; lng: number }[] = []

    for (let i = 0; i < dto.agentCount; i++) {
      const rand = Math.random()
      let cumWeight = 0
      let profile = behaviorProfiles[0]
      for (const p of behaviorProfiles) {
        cumWeight += p.weight
        if (rand <= cumWeight) { profile = p; break }
      }

      const windSpeed = dto.weatherSnapshot?.windSpeed ?? 0
      const speedFactor = Math.max(0.5, 1 - windSpeed / 50)
      const steps = Math.min(dto.durationHours * 2, 20)

      const path: { lat: number; lng: number; t: number }[] = [
        { lat: baseLat, lng: baseLng, t: 0 },
      ]

      let curLat = baseLat
      let curLng = baseLng

      for (let s = 1; s <= steps; s++) {
        const noise = () => (Math.random() - 0.5) * 0.004
        curLat += (profile.drift.lat + noise()) * speedFactor
        curLng += (profile.drift.lng + noise()) * speedFactor
        path.push({
          lat: parseFloat(curLat.toFixed(5)),
          lng: parseFloat(curLng.toFixed(5)),
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

      finalPositions.push({ lat: curLat, lng: curLng })
    }

    const hotspots = this.clusterHotspots(finalPositions, dto.agentCount)
    const sectorProbabilities = this.calcSectorProbs(finalPositions)
    const summary = this.generateSummary(hotspots, dto.agentCount)

    const samplePaths = agents
      .filter((_, i) => i % Math.max(1, Math.floor(dto.agentCount / 20)) === 0)
      .map((a) => ({ agentId: a.agentId, behavior: a.behavior, path: a.path }))

    const [run] = await this.db
      .insert(simulationRuns)
      .values({
        operationId: dto.operationId,
        agentCount: dto.agentCount,
        durationHours: dto.durationHours,
        weatherSnapshot: dto.weatherSnapshot ?? {},
        parameters: dto.subjectProfile ?? {},
        status: 'complete',
        probabilitySurface: { hotspots },
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

  private clusterHotspots(
  positions: { lat: number; lng: number }[],
  total: number,
): Hotspot[] {
  const grid: Record<string, number> = {}
  const cellSize = 0.008 // larger cells = more agents per cell

  positions.forEach((p) => {
    const key = `${Math.round(p.lat / cellSize)}_${Math.round(p.lng / cellSize)}`
    grid[key] = (grid[key] ?? 0) + 1
  })

  const sorted = Object.entries(grid)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)

  const maxCount = sorted[0]?.[1] ?? 1

  return sorted.map(([key, count], i) => {
    const [latK, lngK] = key.split('_').map(Number)
    return {
      lat: parseFloat((latK * cellSize).toFixed(5)),
      lng: parseFloat((lngK * cellSize).toFixed(5)),
      // normalize against the top cluster, not total agents
      probability: parseFloat(((count / maxCount) * 100).toFixed(1)),
      radius: 200 + i * 60,
      label: `HOTSPOT-${i + 1}`,
    }
  })
}

  private calcSectorProbs(
    positions: { lat: number; lng: number }[],
  ): SectorProbability[] {
    const sectors = [
      { name: 'SEC-A', minLat: 16.43,  maxLat: 16.44,  minLng: 73.865, maxLng: 73.875 },
      { name: 'SEC-B', minLat: 16.415, maxLat: 16.430, minLng: 73.878, maxLng: 73.895 },
      { name: 'SEC-C', minLat: 16.432, maxLat: 16.445, minLng: 73.885, maxLng: 73.900 },
    ]

    const total = positions.length
    return sectors.map((s) => {
      const count = positions.filter(
        (p) =>
          p.lat >= s.minLat &&
          p.lat <= s.maxLat &&
          p.lng >= s.minLng &&
          p.lng <= s.maxLng,
      ).length
      return {
        name: s.name,
        probability: parseFloat(((count / total) * 100).toFixed(1)),
      }
    })
  }

  private generateSummary(hotspots: Hotspot[], agentCount: number): string {
    const top = hotspots[0]
    if (!top) return 'Simulation complete. No clear hotspots identified.'
    return `Simulation complete (${agentCount} agents). Primary hotspot at ${top.lat.toFixed(4)}N ${top.lng.toFixed(4)}E with ${top.probability}% probability concentration. Recommend deploying search teams to high-probability zones first.`
  }

  async getSimulations(operationId: string) {
    return this.db
      .select()
      .from(simulationRuns)
      .where(eq(simulationRuns.operationId, operationId))
      .orderBy(simulationRuns.createdAt)
  }
}