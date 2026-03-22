export class ChatDto {
  operationId: string
  message: string
  history: { role: 'user' | 'assistant'; content: string }[]
}