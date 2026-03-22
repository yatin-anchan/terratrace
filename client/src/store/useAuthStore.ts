import { create } from 'zustand'
import type { User } from '../types'

interface AuthState {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  logout: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  token: null,
  setAuth: (user, token) => {
    set({ user, token })
  },
  logout: () => {
    localStorage.removeItem('tt_token')
    localStorage.removeItem('tt_user')
    set({ user: null, token: null })
  },
  isAuthenticated: () => {
    return !!(get().token || localStorage.getItem('tt_token'))
  },
}))

// Rehydrate on app start
const savedToken = localStorage.getItem('tt_token')
const savedUser = localStorage.getItem('tt_user')
if (savedToken && savedUser) {
  try {
    useAuthStore.setState({
      token: savedToken,
      user: JSON.parse(savedUser),
    })
  } catch {
    localStorage.removeItem('tt_token')
    localStorage.removeItem('tt_user')
  }
}