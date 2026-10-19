import api from './axios.js'

export async function createBooking(listingId, payload) {
  const response = await api.post(`/bookings/listings/${encodeURIComponent(listingId)}`, payload)
  return response.data.booking
}

export async function getMyBookings(signal) {
  const response = await api.get('/bookings/mine', { signal })
  return response.data.bookings
}

export async function cancelBooking(id) {
  const response = await api.patch(`/bookings/${encodeURIComponent(id)}/cancel`)
  return response.data.booking
}

export async function createReview(bookingId, payload) {
  const response = await api.post(`/bookings/${encodeURIComponent(bookingId)}/reviews`, payload)
  return response.data.review
}

export async function createComplaint(bookingId, payload) {
  const response = await api.post(`/bookings/${encodeURIComponent(bookingId)}/complaints`, payload)
  return response.data.complaint
}

export async function getOwnerBookings(signal, listingId) {
  const response = await api.get('/owner/bookings', { signal, params: listingId ? { listingId } : undefined })
  return response.data.bookings
}

export async function updateOwnerBooking(id, payload) {
  const response = await api.patch(`/owner/bookings/${encodeURIComponent(id)}`, payload)
  return response.data.booking
}

export async function getOwnerReviews(signal, listingId) {
  const response = await api.get('/owner/reviews', { signal, params: listingId ? { listingId } : undefined })
  return response.data.reviews
}

export async function getOwnerComplaints(signal, listingId) {
  const response = await api.get('/owner/complaints', { signal, params: listingId ? { listingId } : undefined })
  return response.data.complaints
}

export async function updateOwnerComplaint(id, payload) {
  const response = await api.patch(`/owner/complaints/${encodeURIComponent(id)}`, payload)
  return response.data.complaint
}
