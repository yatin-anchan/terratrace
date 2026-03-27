import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ChatToolAction {
  tool: string
  args: any
  result: any
}

export interface ChatMessage {
  role: 'ai' | 'user'
  text: string
  toolActions?: ChatToolAction[]
}

interface ChatState {
  messagesByOperation: Record<string, ChatMessage[]>
  setMessages: (operationId: string, messages: ChatMessage[]) => void
  appendMessage: (operationId: string, message: ChatMessage) => void
  clearMessages: (operationId: string) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messagesByOperation: {},

      setMessages: (operationId, messages) =>
        set((state) => ({
          messagesByOperation: {
            ...state.messagesByOperation,
            [operationId]: messages,
          },
        })),

      appendMessage: (operationId, message) =>
        set((state) => ({
          messagesByOperation: {
            ...state.messagesByOperation,
            [operationId]: [...(state.messagesByOperation[operationId] ?? []), message],
          },
        })),

      clearMessages: (operationId) =>
        set((state) => {
          const next = { ...state.messagesByOperation }
          delete next[operationId]
          return { messagesByOperation: next }
        }),
    }),
    {
      name: 'terratrace-chat-store',
    }
  )
)