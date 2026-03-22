export class CreateOperationDto {
  name: string
  terrainRegion?: string
  searchRadius?: number
  operationalDays?: number
  notes?: string
  status?: string
}

export class UpdateOperationDto {
  name?: string
  status?: string
  terrainRegion?: string
  searchRadius?: number
  operationalDays?: number
  notes?: string
}