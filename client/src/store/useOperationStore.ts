import { create } from 'zustand'
import type { Operation } from '../types'

interface OperationState {
  operations: Operation[]
  selectedOperation: Operation | null
  setOperations: (ops: Operation[]) => void
  selectOperation: (op: Operation) => void
  clearSelection: () => void
  addOperation: (op: Operation) => void
  removeOperation: (id: string) => void
  updateOperation: (op: Operation) => void
}

export const useOperationStore = create<OperationState>((set) => ({
  operations: [],
  selectedOperation: null,
  setOperations: (ops) => set({ operations: ops }),
  selectOperation: (op) => set({ selectedOperation: op }),
  clearSelection: () => set({ selectedOperation: null }),
  addOperation: (op) => set((s) => ({ operations: [op, ...s.operations] })),
  removeOperation: (id) => set((s) => ({ operations: s.operations.filter((o) => o.id !== id) })),
  updateOperation: (op) => set((s) => ({
    operations: s.operations.map((o) => (o.id === op.id ? op : o)),
    selectedOperation: s.selectedOperation?.id === op.id ? op : s.selectedOperation,
  })),
}))