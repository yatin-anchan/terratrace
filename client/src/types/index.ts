export type UserRole =
  | 'admin'
  | 'incident_commander'
  | 'search_coordinator'
  | 'field_team_leader'
  | 'analyst'

export type OperationStatus =
  | 'draft'
  | 'active'
  | 'suspended'
  | 'escalated'
  | 'closed'
  | 'archived'

export type EvidenceType =
  | 'witness_statement'
  | 'cctv_sighting'
  | 'mobile_ping'
  | 'clothing_item'
  | 'tracks'
  | 'drone_image'
  | 'field_observation'
  | 'negative_search'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface Operation {
  id: string
  name: string
  status: OperationStatus
  terrainRegion: string
  mode?: string
  searchRadius: number
  startDate: string
  operationalDays: number
  notes: string
  areaOfInterest: { lat: number; lng: number } | null
  createdAt: string
  updatedAt: string
  subjectCount?: number
  sectorCount?: number
  teamCount?: number
}

export interface Subject {
  id: string
  operationId: string
  name: string
  age: number
  sex: string
  personType: string
  experienceLevel: string
  intentCategory: string
  medicalHistory: string
  mobilityLevel: string
  clothing: string
  lastKnownLocation: { lat: number; lng: number } | null
  lastContactTime: string
  behaviorProfile: Record<string, unknown>
}

export interface Evidence {
  id: string
  operationId: string
  subjectId: string | null
  type: EvidenceType
  location: { lat: number; lng: number } | null
  timestamp: string
  confidenceScore: number
  source: string
  notes: string
  attachments: string[]
  createdAt: string
}

export interface SearchSector {
  id: string
  operationId: string
  name: string
  polygon: unknown
  priorityScore: number
  terrainDifficulty: string
  assignedTeam: string
  searched: boolean
  coverageQuality: number
  dateSearched: string | null
  findings: string
}

export interface SimulationRun {
  id: string
  operationId: string
  subjectId: string
  agentCount: number
  durationHours: number
  status: 'pending' | 'running' | 'complete' | 'failed'
  hotspots: Array<{ lat: number; lng: number; probability: number }>
  createdAt: string
}

export interface LogEntry {
  id: string
  operationId: string
  userId: string
  actionType: string
  affectedEntity: string
  previousValue: unknown
  newValue: unknown
  reason: string
  createdAt: string
}