import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import AccountBanner from '../components/AccountBanner.jsx'
import { cancelBooking, createComplaint, createReview, getMyBookings } from '../api/bookings.js'

const statusLabels = { pending: 'Waiting for owner', confirmed: 'Confirmed', rejected: 'Declined', completed: 'Completed', cancelled: 'Cancelled' }

export default function MyBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getMyBookings(controller.signal)
      .then(setBookings)
      .catch(requestError => { if (requestError.code !== 'ERR_CANCELED') setError(requestError.response?.data?.message || 'Could not load your booking requests.') })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [reload])

  const submitAction = useCallback(async (event, action, successMessage) => {
    event.preventDefault()
    const bookingId = event.currentTarget.dataset.bookingId
    const form = new FormData(event.currentTarget)
    const payload = action === 'review'
      ? { rating: Number(form.get('rating')), comment: form.get('comment') }
      : { category: form.get('category'), message: form.get('message') }
    setBusyId(bookingId)
    setError('')
    setNotice('')
    try {
      if (action === 'review') await createReview(bookingId, payload)
      else await createComplaint(bookingId, payload)
      setNotice(successMessage)
      setReload(value => value + 1)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not submit that request.')
    } finally {
      setBusyId('')
    }
  }, [])

  async function handleCancel(booking) {
    if (!window.confirm('Cancel this booking request?')) return
    setBusyId(booking.id)
    setError('')
    try {
      await cancelBooking(booking.id)
      setNotice('Booking cancelled.')
      setReload(value => value + 1)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not cancel this booking.')
    } finally {
      setBusyId('')
    }
  }

  return <>
    <Navbar />
    <AccountBanner role="student" />
    <main className="booking-page">
      <header className="booking-page-heading"><span className="section-kicker">YOUR STAYS</span><h1>Booking requests</h1><p>Track owner responses, share feedback after a completed stay, or report an issue.</p></header>
      {error && <p className="booking-message error" role="alert">{error}</p>}
      {notice && <p className="booking-message success" role="status">{notice}</p>}
      {loading && <p className="booking-state">Loading your requests…</p>}
      {!loading && !error && !bookings.length && <div className="booking-empty"><h2>No booking requests yet</h2><p>Open a stay and send a booking request to see it here.</p><Link className="button" to="/student">Browse stays</Link></div>}
      {!loading && bookings.length > 0 && <div className="booking-list">{bookings.map(booking => {
        const property = booking.listing
        return <article className="booking-card" key={booking.id}>
          <div className="booking-card-top"><div><span className="section-kicker">{property?.propertyType || 'STAY'}</span><h2>{property ? <Link to={'/listings/' + (property.id || property._id)}>{property.name}</Link> : 'Listing unavailable'}</h2><p>{dateLabel(booking.startDate)} – {dateLabel(booking.endDate)} · {booking.roomTypeName ? booking.roomTypeName + ' · ' : ''}{booking.rooms} room{booking.rooms === 1 ? '' : 's'}</p></div><span className={'booking-status status-' + booking.status}>{statusLabels[booking.status] || booking.status}</span></div>
          {booking.selectedRoomIds?.length > 0 && <p className="booking-student-note">Requested rooms: {booking.selectedRoomIds.map(roomId => formatRoomId(roomId, booking.roomTypeKey)).join(', ')}</p>}
          {booking.statusNote && <p className="booking-owner-note">Owner note: {booking.statusNote}</p>}
          {booking.message && <p className="booking-student-note">Your message: {booking.message}</p>}
          {booking.complaints?.map(complaint => <div className="student-complaint-update" key={complaint.id}><b>Complaint · {complaint.status.replace('_', ' ')}</b><p>{complaint.message}</p>{complaint.ownerResponse && <small>Owner response: {complaint.ownerResponse}</small>}</div>)}
          {(booking.status === 'pending' || (booking.status === 'confirmed' && new Date(booking.startDate) > new Date())) && <button className="booking-secondary-button" type="button" disabled={busyId === booking.id} onClick={() => handleCancel(booking)}>Cancel request</button>}
          {booking.status === 'completed' && (booking.review
            ? <div className="submitted-review"><b>Your review</b><span>{'★'.repeat(booking.review.rating)}{'☆'.repeat(5 - booking.review.rating)} · {booking.review.comment || 'No written comment'}</span></div>
            : <form className="booking-action-form" data-booking-id={booking.id} onSubmit={event => submitAction(event, 'review', 'Your review was submitted.') }><h3>Review this stay</h3><div className="booking-form-row"><label><span>Rating</span><select name="rating" defaultValue="5"><option value="5">5 · Excellent</option><option value="4">4 · Good</option><option value="3">3 · Okay</option><option value="2">2 · Poor</option><option value="1">1 · Bad</option></select></label><label className="booking-comment-field"><span>Comment <small>Optional</small></span><textarea name="comment" maxLength="2000" rows="2" placeholder="Share a helpful note about your stay" /></label></div><button className="button booking-submit" type="submit" disabled={busyId === booking.id}>{busyId === booking.id ? 'Submitting…' : 'Submit review'}</button></form>)}
          {['confirmed', 'completed'].includes(booking.status) && <details className="complaint-details"><summary>Report a problem with this stay</summary><form className="booking-action-form" data-booking-id={booking.id} onSubmit={event => submitAction(event, 'complaint', 'Your complaint was sent to the property owner.') }><label><span>Issue type</span><select name="category"><option value="room">Room or maintenance</option><option value="cleanliness">Cleanliness</option><option value="facilities">Facilities</option><option value="conduct">Staff or owner conduct</option><option value="billing">Billing</option><option value="other">Other</option></select></label><label><span>Describe the issue</span><textarea name="message" required minLength="10" maxLength="3000" rows="3" placeholder="Give the owner enough detail to understand and address it" /></label><button className="button booking-submit" type="submit" disabled={busyId === booking.id}>{busyId === booking.id ? 'Sending…' : 'Send complaint'}</button></form></details>}
        </article>
      })}</div>}
    </main>
  </>
}

function dateLabel(value) {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatRoomId(roomId, roomTypeKey) { return roomTypeKey && roomTypeKey !== 'legacy' ? `Room ${roomId.split('-').at(-1)}` : roomId }
