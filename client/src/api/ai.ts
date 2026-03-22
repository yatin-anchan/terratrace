import client from './client'

export const sendChatMessage = async (
  operationId: string,
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[]
) => {
  const res = await client.post<{ reply: string; tokens: number }>('/ai/chat', {
    operationId,
    message,
    history,
  })
  return res.data
}

export const summarizeOperation = async (operationId: string) => {
  const res = await client.post<{ summary: string }>(`/ai/summarize/${operationId}`)
  return res.data
}

export const explainSector = async (sectorName: string, probability: number) => {
  const res = await client.post<{ explanation: string }>('/ai/explain-sector', {
    sectorName,
    probability,
  })
  return res.data
}