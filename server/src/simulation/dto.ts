export class RunSimulationDto {
  operationId: string
  subjectId?: string

  // 'manual' = explicit UI/manual run
  // 'ai' = AI-triggered run
  source?: 'manual' | 'ai'

  agentCount: number
  durationHours: number

  weatherSnapshot?: {
    temperature?: number
    windSpeed?: number
    windDirection?: string
    precipitation?: number
    visibility?: string
  }

  subjectProfile?: {
    age?: number | 'unknown'
    fitness?: string
    experience?: string
    intentCategory?: string
    mobilityLevel?: string
    sex?: 'male' | 'female' | 'unknown'
  }
}