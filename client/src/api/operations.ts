import client from './client'
import type { Operation } from '../types'

export const getOperations = async () => {
  const res = await client.get<Operation[]>('/operations')
  return res.data
}

export const getOperation = async (id: string) => {
  const res = await client.get<Operation>(`/operations/${id}`)
  return res.data
}

export const createOperation = async (data: Partial<Operation>) => {
  const res = await client.post<Operation>('/operations', data)
  return res.data
}

export const updateOperation = async (id: string, data: Partial<Operation>) => {
  const res = await client.patch<Operation>(`/operations/${id}`, data)
  return res.data
}

export const deleteOperation = async (id: string) => {
  await client.delete(`/operations/${id}`)
}