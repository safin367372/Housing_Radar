import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import AccountBanner from '../components/AccountBanner.jsx'
import { getMyListings } from '../api/listings.js'
import { getOwnerBookings, getOwnerComplaints, getOwnerReviews, updateOwnerBooking, updateOwnerComplaint } from '../api/bookings.js'

const sections = [
  { id: 'rooms', label: 'Rooms & bookings' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'complaints', label: 'Complaints' },
]

export default function OwnerListingManagementPage() {
  const { id } = useParams()
  const [listing, setListing] = useState(null)
  const [bookings, setBookings] = useState([])
  const [reviews, setReviews] = useState([])
  const [complaints, setComplaints] = useState([])
  const [section, setSection] = useState('rooms')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyId, setBusyId] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      getMyListings(controller.signal),
      getOwnerBookings(controller.signal, id),
      getOwnerReviews(controller.signal, id),
      getOwnerComplaints(controller.signal, id),
    ]).then(([listings, ownerBookings, ownerReviews, ownerComplaints]) => {
      setListing(listings.find(item => item.id === id) || null)
      setBookings(ownerBookings)
      setReviews(ownerReviews)
      setComplaints(ownerComplaints)
    }).catch(requestError => {
      if (requestError.code !== 'ERR_CANCELED') setError(requestError.response?.data?.message || 'Could not load this listing dashboard.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [id, reload])

  const occupiedRooms = useMemo(() => bookings.filter(item => item.status === 'confirmed').reduce((sum, item) => sum + item.rooms, 0), [bookings])
  const pendingCount = bookings.filter(item => item.status === 'pending').length
  const openComplaintCount = complaints.filter(item => item.status !== 'resolved').length

  async function updateBooking(booking, status) {
    setBusyId(booking.id)
    setError('')
    setNotice('')
    try {
      await updateOwnerBooking(booking.id, { status })
      setNotice(status === 'confirmed' ? 'Booking accepted. Rooms are now reserved.' : status === 'completed' ? 'Stay marked complete. Rooms are available again and a verified review is unlocked.' : 'Booking request declined.')
      setReload(value => value + 1)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update the booking.')
    } finally {
      setBusyId('')
    }
  }

  async function saveComplaint(event, complaint) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setBusyId(complaint.id)
    setError('')
    setNotice('')
    try {
      await updateOwnerComplaint(complaint.id, { status: data.get('status'), ownerResponse: data.get('ownerResponse') })
      setNotice('Complaint update saved. The guest can see your response in My bookings.')
      setReload(value => value + 1)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Could not update this complaint.')
    } finally {
      setBusyId('')
    }
  }

  return <>
    <Navbar />
    <AccountBanner role="owner" />
    <main className="listing-management-page">
      <div className="management-back"><Link to="/owner">← Back to owner dashboard</Link></div>
      {loading && <p className="booking-state">Loading listing management…</p>}
      {!loading && error && !listing && <div className="booking-message error" role="alert">{error}</div>}
      {!loading && listing && <>
        <header className="listing-management-heading">
          <div><span className="section-kicker">PROPERTY MANAGEMENT</span><h1>{listing.name}</h1><p>{listing.location?.area}, {listing.location?.city} · {listing.typeLabel}</p></div>
          <div className="management-availability"><span>{listing.availableRooms ?? 0}</span><small>rooms available</small></div>
        </header>
        {error && <p className="booking-message error" role="alert">{error}</p>}
        {notice && <p className="booking-message success" role="status">{notice}</p>}
        <nav className="management-tabs" role="tablist" aria-label="Property management sections">
          {sections.map(item => <button key={item.id} type="button" role="tab" aria-selected={section === item.id} className={section === item.id ? 'active' : ''} onClick={() => setSection(item.id)}>{item.label}<span>{item.id === 'rooms' ? pendingCount : item.id === 'reviews' ? reviews.length : openComplaintCount}</span></button>)}
        </nav>

        {section === 'rooms' && <section className="listing-management-section" role="tabpanel">
          <div className="management-section-heading"><div><span className="section-kicker">ROOM INVENTORY</span><h2>Rooms and booking requests</h2></div><div className="management-occupancy"><b>{occupiedRooms}</b><span>reserved / occupied</span></div></div>
          <p className="owner-management-empty">Confirming a booking reserves its rooms from availability. After the stay end date, mark it complete to return the rooms and let the guest leave a review.</p>
          {!bookings.length && <div className="management-empty-state">No booking requests for this property yet.</div>}
          <div className="management-record-list">{bookings.map(booking => <article className="owner-booking-row" key={booking.id}>
            <div className="owner-booking-main"><span className={'booking-status status-' + booking.status}>{booking.status}</span><h3>{booking.rooms} room{booking.rooms === 1 ? '' : 's'} · {booking.student?.name || 'Student'}</h3><p>{booking.student?.email || ''}</p><small>{displayDate(booking.startDate)} – {displayDate(booking.endDate)}</small>{booking.message && <p className="owner-booking-message">“{booking.message}”</p>}</div>
            <div className="owner-booking-actions">{booking.status === 'pending' && <><button className="owner-accept-button" type="button" disabled={busyId === booking.id || new Date(booking.startDate) <= new Date()} onClick={() => updateBooking(booking, 'confirmed')}>Accept</button><button className="owner-listing-delete" type="button" disabled={busyId === booking.id} onClick={() => updateBooking(booking, 'rejected')}>Decline</button></>}{booking.status === 'confirmed' && (new Date(booking.endDate) <= new Date() ? <button className="owner-accept-button" type="button" disabled={busyId === booking.id} onClick={() => updateBooking(booking, 'completed')}>Mark complete</button> : <small className="owner-completion-note">Complete after {displayDate(booking.endDate)}</small>)}</div>
          </article>)}</div>
        </section>}

        {section === 'reviews' && <section className="listing-management-section" role="tabpanel">
          <div className="management-section-heading"><div><span className="section-kicker">VERIFIED GUEST FEEDBACK</span><h2>Reviews for {listing.name}</h2></div><div className="management-occupancy"><b>{reviews.length}</b><span>reviews</span></div></div>
          {!reviews.length && <div className="management-empty-state">No reviews yet. Guests can review after their completed stay.</div>}
          <div className="owner-feedback-list">{reviews.map(review => <article className="owner-feedback-card" key={review.id}><header><b>{review.student?.name || 'Guest'}</b><span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span></header><p>{review.comment || 'No written comment.'}</p><small>Verified stay · {displayDate(review.createdAt)}</small></article>)}</div>
        </section>}

        {section === 'complaints' && <section className="listing-management-section" role="tabpanel">
          <div className="management-section-heading"><div><span className="section-kicker">GUEST SUPPORT</span><h2>Complaints for {listing.name}</h2></div><div className="management-occupancy"><b>{openComplaintCount}</b><span>unresolved</span></div></div>
          {!complaints.length && <div className="management-empty-state">No complaints have been submitted for this property.</div>}
          <div className="owner-complaint-list">{complaints.map(complaint => <form className="owner-complaint-card" key={complaint.id} onSubmit={event => saveComplaint(event, complaint)}><header><div><b>{complaint.category.replace('_', ' ')} · {complaint.student?.name || 'Guest'}</b><small>{displayDate(complaint.createdAt)} · {complaint.student?.email}</small></div><span className={'complaint-status complaint-' + complaint.status}>{complaint.status.replace('_', ' ')}</span></header><p>{complaint.message}</p><label><span>Response to guest</span><textarea name="ownerResponse" rows="3" maxLength="2000" defaultValue={complaint.ownerResponse} placeholder="Add an update or explain how you resolved it" /></label><div className="owner-complaint-controls"><select name="status" defaultValue={complaint.status}><option value="open">Open</option><option value="in_review">In review</option><option value="resolved">Resolved</option></select><button className="owner-accept-button" type="submit" disabled={busyId === complaint.id}>{busyId === complaint.id ? 'Saving…' : 'Save update'}</button></div></form>)}</div>
        </section>}
      </>}
    </main>
  </>
}

function displayDate(value) { return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) }
