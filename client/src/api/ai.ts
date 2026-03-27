import client from './client'

export async function sendChatMessage(
  operationId: string,
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  mode: string = 'manual'
) {
  const res = await client.post('/ai/chat', { operationId, message, history, mode })
  return res.data
}

export async function summarizeOperation(operationId: string) {
  const res = await client.post(`/ai/summarize/${operationId}`)
  return res.data
}

export async function explainSector(sectorName: string, probability: number) {
  const res = await client.post('/ai/explain-sector', { sectorName, probability })
  return res.data
}