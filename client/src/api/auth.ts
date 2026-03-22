import client from './client'
import type { User } from '../types'

export const login = async (email: string, password: string) => {
  const res = await client.post<{ user: User; token: string }>('/auth/login', {
    email,
    password,
  })
  return res.data
}

export const register = async (
  name: string,
  email: string,
  password: string,
  role: string
) => {
  const res = await client.post<{ user: User; token: string }>('/auth/register', {
    name,
    email,
    password,
    role,
  })
  return res.data
}

export const getMe = async () => {
  const res = await client.get<User>('/auth/me')
  return res.data
}