import api from './axios.js'

export async function getListings(params = {}, signal) {
  const response = await api.get('/listings', { params, signal })
  return response.data
}

export async function getListing(id, signal) {
  const response = await api.get('/listings/' + encodeURIComponent(id), { signal })
  return response.data.listing
}

export async function getListingReviews(id, signal) {
  const response = await api.get(`/listings/${encodeURIComponent(id)}/reviews`, { signal })
  return response.data.reviews
}

export async function getListingRoomAvailability(id, startDate, endDate, signal, roomTypeKey) {
  const response = await api.get(`/listings/${encodeURIComponent(id)}/room-availability`, { params: { startDate, endDate, ...(roomTypeKey ? { roomTypeKey } : {}) }, signal })
  return response.data.unavailableRoomIds
}

export async function createListing(payload) {
  const response = await api.post('/listings', payload)
  return response.data.listing
}

export async function updateListing(id, payload) {
  const response = await api.put('/listings/' + encodeURIComponent(id), payload)
  return response.data.listing
}

export async function deleteListing(id) {
  const response = await api.delete('/listings/' + encodeURIComponent(id))
  return response.data
}

export async function setListingActive(id, isActive) {
  const response = await api.patch('/listings/' + encodeURIComponent(id) + '/status', { isActive })
  return response.data.listing
}

export async function getMyListings(signal) {
  const response = await api.get('/listings/mine', { signal })
  return response.data.listings
}
