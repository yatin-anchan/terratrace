import client from './client'

export const runSimulation = async (data: {
  operationId: string
  agentCount: number
  durationHours: number
  weatherSnapshot?: object
  subjectProfile?: object
}) => {
  const res = await client.post('/simulation/run', data)
  return res.data
}

export const getSimulations = async (operationId: string) => {
  const res = await client.get(`/simulation/operation/${operationId}`)
  return res.data
}