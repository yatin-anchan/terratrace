import { create } from 'zustand'

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

export interface AgentPath {
  agentId: number
  behavior: string
  path: { lat: number; lng: number; t: number }[]
}

interface SimulationState {
  hotspots: Hotspot[]
  sectorProbabilities: SectorProbability[]
  samplePaths: AgentPath[]
  hasResults: boolean
  setResults: (hotspots: Hotspot[], sectorProbabilities: SectorProbability[], samplePaths: AgentPath[]) => void
  clearResults: () => void
}

export const useSimulationStore = create<SimulationState>()((set) => ({
  hotspots: [],
  sectorProbabilities: [],
  samplePaths: [],
  hasResults: false,
  setResults: (hotspots, sectorProbabilities, samplePaths) =>
    set({ hotspots, sectorProbabilities, samplePaths, hasResults: true }),
  clearResults: () =>
    set({ hotspots: [], sectorProbabilities: [], samplePaths: [], hasResults: false }),
}))