export class RunSimulationDto {
  operationId: string
  subjectId?: string
  agentCount: number
  durationHours: number
  weatherSnapshot?: {
    temperature: number
    windSpeed: number
    windDirection: string
    precipitation: number
    visibility: string
  }
  subjectProfile?: {
    age: number
    fitness: string
    experience: string
    intentCategory: string
    mobilityLevel: string
  }
}