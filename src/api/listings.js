import api from './axios.js'

export async function getListings(params = {}, signal) {
  const response = await api.get('/listings', { params, signal })
  return response.data
}

export async function getListing(id, signal) {
  const response = await api.get('/listings/' + encodeURIComponent(id), { signal })
  return response.data.listing
}

export async function createListing(payload) {
  const response = await api.post('/listings', payload)
  return response.data.listing
}

export async function getMyListings(signal) {
  const response = await api.get('/listings/mine', { signal })
  return response.data.listings
}
