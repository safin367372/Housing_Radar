import api from './axios.js'

export async function login(credentials) {
  const response = await api.post('/auth/login', credentials)
  return response.data
}

export async function signup(details) {
  const response = await api.post('/auth/signup', details)
  return response.data
}
