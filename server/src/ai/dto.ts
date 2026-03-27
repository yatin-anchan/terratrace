export class ChatDto {
  operationId: string
  message: string
  mode?: string
  history: { role: 'user' | 'assistant'; content: string }[]
}