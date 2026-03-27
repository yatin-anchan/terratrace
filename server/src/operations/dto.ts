export class CreateOperationDto {
  name: string
  terrainRegion?: string
  searchRadius?: number
  operationalDays?: number
  notes?: string
  status?: string
  areaOfInterest?: { lat: number; lng: number } | null
  mode?: string
}
export class UpdateOperationDto {
  name?: string
  status?: string
  terrainRegion?: string
  searchRadius?: number
  operationalDays?: number
  notes?: string
  mode?: string
}