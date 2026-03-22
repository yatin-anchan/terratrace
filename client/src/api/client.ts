import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('tt_token')
  console.log('REQUEST TO:', config.url, '| TOKEN:', token ? token.substring(0, 20) + '...' : 'NONE')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default client