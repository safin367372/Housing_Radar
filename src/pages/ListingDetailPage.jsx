import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import ChatbotWidget from '../components/ChatbotWidget.jsx'
import { getListing, getListingReviews, getListingRoomAvailability } from '../api/listings.js'
import { createBooking } from '../api/bookings.js'

export default function ListingDetailPage() {
  const { id } = useParams()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reviews, setReviews] = useState([])
  const [bookingBusy, setBookingBusy] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [bookingNotice, setBookingNotice] = useState('')
  const [bookingUser, setBookingUser] = useState(null)
  const [selectedRoomIds, setSelectedRoomIds] = useState([])
  const [selectedRoomTypeKey, setSelectedRoomTypeKey] = useState('')
  const [startDate, setStartDate] = useState(() => dateAfter(1))
  const [endDate, setEndDate] = useState(() => dateAfter(31))
  const [unavailableRoomIds, setUnavailableRoomIds] = useState([])
  const [roomAvailabilityLoading, setRoomAvailabilityLoading] = useState(false)
  const [roomAvailabilityError, setRoomAvailabilityError] = useState('')
  const roomMapEnabled = Boolean(listing?.owner && !listing?.isDemo)
  const instantBookingPreview = listing?.priceUnit === 'night' && ['hotel', 'lodge'].includes(listing?.propertyType)

  useEffect(() => {
    try { setBookingUser(JSON.parse(localStorage.getItem('user') || 'null')) } catch { setBookingUser(null) }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    getListing(id, controller.signal)
      .then(setListing)
      .catch(requestError => {
        if (requestError.code !== 'ERR_CANCELED') {
          setError(requestError.response?.data?.message || 'Could not load this stay. Check your connection and try again.')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [id])

  useEffect(() => {
    if (!listing?.id) return undefined
    const controller = new AbortController()
    getListingReviews(listing.id, controller.signal).then(setReviews).catch(() => {})
    return () => controller.abort()
  }, [listing?.id])

  useEffect(() => {
    if (!listing?.id || !roomMapEnabled || !startDate || !endDate || endDate <= startDate) {
      setUnavailableRoomIds([])
      setRoomAvailabilityLoading(false)
      setRoomAvailabilityError('')
      return undefined
    }
    const controller = new AbortController()
    let active = true
    const refreshAvailability = async () => {
      setRoomAvailabilityLoading(true)
      try {
        const unavailable = await getListingRoomAvailability(listing.id, startDate, endDate, controller.signal, selectedRoomTypeKey)
        if (active) { setUnavailableRoomIds(unavailable); setRoomAvailabilityError('') }
      } catch (requestError) {
        if (active && requestError.code !== 'ERR_CANCELED') setRoomAvailabilityError(requestError.response?.data?.message || 'Could not check room availability.')
      } finally {
        if (active) setRoomAvailabilityLoading(false)
      }
    }
    refreshAvailability()
    const timer = window.setInterval(refreshAvailability, 12000)
    window.addEventListener('focus', refreshAvailability)
    return () => { active = false; controller.abort(); window.clearInterval(timer); window.removeEventListener('focus', refreshAvailability) }
  }, [listing?.id, roomMapEnabled, startDate, endDate, selectedRoomTypeKey])

  useEffect(() => {
    if (unavailableRoomIds.length) setSelectedRoomIds(current => { const next = current.filter(roomId => !unavailableRoomIds.includes(roomId)); return next.length === current.length ? current : next })
  }, [unavailableRoomIds])

  async function handleBookingSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    setBookingBusy(true)
    setBookingError('')
    setBookingNotice('')
    try {
      await createBooking(listing.id, { startDate: data.get('startDate'), endDate: data.get('endDate'), rooms: roomMapEnabled ? selectedRoomIds.length : Number(data.get('rooms')), ...(roomMapEnabled ? { selectedRoomIds, roomTypeKey: selectedRoomTypeKey } : {}), message: data.get('message') })
      setBookingNotice(roomMapEnabled ? 'Room request sent. The owner will confirm your selected room.' : 'Request sent. You can follow its status from My bookings.')
      form.reset()
      setSelectedRoomIds([])
    } catch (requestError) {
      setBookingError(requestError.response?.data?.message || 'Could not send the booking request.')
    } finally {
      setBookingBusy(false)
    }
  }

  const effectiveRoomTypes = listing?.roomTypes?.length ? listing.roomTypes : listing ? [{ key: 'legacy', name: listing.roomType, price: listing.price, priceUnit: listing.priceUnit, capacity: 1, totalRooms: listing.availableRooms || 0, amenities: [] }] : []
  const selectedRoomType = effectiveRoomTypes.find(type => type.key === selectedRoomTypeKey) || effectiveRoomTypes[0]
  useEffect(() => { if (selectedRoomType && selectedRoomType.key !== selectedRoomTypeKey) { setSelectedRoomTypeKey(selectedRoomType.key); setSelectedRoomIds([]) } }, [selectedRoomType, selectedRoomTypeKey])
  const roomPrefix = listing?.name?.toLowerCase().includes('gloriace') ? 'G' : 'R'
  const roomIds = selectedRoomType ? Array.from({ length: Math.max(0, Number(selectedRoomType.totalRooms) || 0) }, (_, index) => selectedRoomType.key === 'legacy' ? `${roomPrefix}-${String(index + 1).padStart(2, '0')}` : `${selectedRoomType.key}-${String(index + 1).padStart(2, '0')}`) : []
  const locationText = listing
    ? [listing.location?.area, listing.location?.city].filter(Boolean).join(', ')
    : ''
  const photos = listing?.photos?.length ? listing.photos : []
  const coordinates = listing?.location?.coordinates
  const hasCoordinates = Number.isFinite(coordinates?.lat) && Number.isFinite(coordinates?.lng)
  const mapQuery = hasCoordinates
    ? `${coordinates.lat},${coordinates.lng}`
    : [listing?.location?.address, locationText, 'Kerala, India'].filter(Boolean).join(', ')
  const campusQuery = 'College of Engineering Chengannur, Chengannur, Kerala, India'
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_EMBED_API_KEY?.trim()
  const mapsUrl = new URL('https://www.google.com/maps/dir/')
  mapsUrl.searchParams.set('api', '1')
  mapsUrl.searchParams.set('origin', campusQuery)
  mapsUrl.searchParams.set('destination', mapQuery)
  const mapEmbedUrl = mapQuery && mapsApiKey
    ? `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(mapsApiKey)}&origin=${encodeURIComponent(campusQuery)}&destination=${encodeURIComponent(mapQuery)}&mode=driving`
    : mapQuery
      ? `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`
      : ''

  return (
    <>
      <Navbar />
      <main className="detail-page">
        <div className="detail-back"><Link to="/">← Back to all stays</Link></div>
        {loading && <div className="detail-message">Loading stay details…</div>}
        {!loading && error && <div className="detail-message detail-error"><p>{error}</p><Link className="button" to="/">Back to stays</Link></div>}
        {!loading && !error && listing && (
          <>
            <div className="detail-title-row">
              <div><span className="section-kicker">{listing.typeLabel}</span><h1>{listing.name}</h1><p className="detail-location"><PinIcon />{locationText || 'Location not provided'}</p></div>
              {listing.isDemo && <span className="detail-sample-note">Demo rates and amenities · confirm details with owner</span>}
            </div>
            <section className="detail-gallery" aria-label="Property photos">
              {photos.length ? photos.slice(0, 4).map((photo, index) => <img key={photo + index} src={photo} alt={listing.name + ' photo ' + (index + 1)} className={'detail-photo detail-photo-' + index} />) : <div className="detail-no-photo">Photos coming soon</div>}
            </section>
            <div className="detail-columns">
              <div className="detail-main">
                <section className="detail-section">
                  <span className="section-kicker">ABOUT THIS STAY</span>
                  <h2>A little more about the place</h2>
                  <p>{listing.description}</p>
                </section>
                <section className="detail-section">
                  <span className="section-kicker">WHAT’S INCLUDED</span>
                  <h2>Amenities</h2>
                  {listing.amenities?.length
                    ? <ul className="amenity-list">{listing.amenities.map(amenity => <li key={amenity}><span>✓</span>{amenity}</li>)}</ul>
                    : <p>Amenities haven’t been added yet.</p>}
                </section>
                <section className="detail-section detail-location-section">
                  <span className="section-kicker">THE NEIGHBORHOOD</span>
                  <h2>Location</h2>
                  <p>{listing.location?.address ? listing.location.address + ', ' : ''}{locationText || 'Location not provided'}</p>
                  {mapEmbedUrl && <div className="detail-map-wrap">
                    <iframe
                      className="detail-map-frame"
                      title={mapsApiKey ? `Driving directions from College of Engineering Chengannur to ${listing.name}` : `Map showing ${listing.name}`}
                      src={mapEmbedUrl}
                      loading="lazy"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                    />
                    {mapsApiKey
                      ? <p className="detail-map-caption">The embedded route shows the driving distance and estimated travel time from College of Engineering Chengannur.</p>
                      : <p className="detail-map-caption">Map preview uses the listed address. Add a restricted Google Maps Embed API key to show directions and route distance from the college.</p>}
                    <a className="detail-map-link" href={mapsUrl.toString()} target="_blank" rel="noreferrer">Open directions in Google Maps ↗</a>
                  </div>}
                </section>
                {listing.ownerDetails && (listing.ownerDetails.name || listing.ownerDetails.phones?.length > 0) && (
                  <section className="detail-section owner-contact-section">
                    <span className="section-kicker">CONTACT</span>
                    <h2>Speak with the owner</h2>
                    {listing.ownerDetails.name && <p className="owner-contact-name">{listing.ownerDetails.name}</p>}
                    {listing.ownerDetails.phones?.length
                      ? <div className="owner-phone-list">{listing.ownerDetails.phones.map((phone, index) => {
                          const callable = phone.replace(/[^+\d]/g, '')
                          const digits = phone.replace(/\D/g, '')
                          const whatsappNumber = digits.length === 10 ? '91' + digits : digits.startsWith('0') && digits.length === 11 ? '91' + digits.slice(1) : digits
                          const whatsappMessage = `Hi, I found ${listing.name} on HousingRadar. Is it currently available?`
                          return <div className="owner-contact-actions" key={phone + index}>
                            <a className="button call-owner-button" href={'tel:' + callable}><span aria-hidden="true">☎</span> Call {phone}</a>
                            {/^\d{10,15}$/.test(whatsappNumber) && <a className="button whatsapp-button" href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`} target="_blank" rel="noreferrer">Message on WhatsApp ↗</a>}
                          </div>
                        })}</div>
                      : <p>Phone contact was not provided.</p>}
                  </section>
                )}
              </div>
              <aside className="detail-price-card">
                <span className="section-kicker">ROOM OPTIONS</span>
                <div className="detail-room-options">{effectiveRoomTypes.map(type => <button key={type.key} type="button" className={'detail-room-option' + (type.key === selectedRoomType?.key ? ' selected' : '')} aria-pressed={type.key === selectedRoomType?.key} onClick={() => { setSelectedRoomTypeKey(type.key); setSelectedRoomIds([]) }}><span><b>{type.name}</b><small>Up to {type.capacity} guest{type.capacity === 1 ? '' : 's'} · {type.totalRooms} room{type.totalRooms === 1 ? '' : 's'}</small>{type.amenities?.length > 0 && <small>{type.amenities.join(' · ')}</small>}</span><strong>₹{Number(type.price).toLocaleString('en-IN')}<small> / {type.priceUnit}</small></strong></button>)}</div>
                <div className={'detail-availability' + (listing.available ? '' : ' full')}><i />{listing.isDemo ? 'Confirm availability with owner' : listing.available ? 'Rooms available' : 'Currently full'}</div>
                <div className="detail-room-count"><strong>{selectedRoomType?.totalRooms ?? 0}</strong><span><b>Rooms in this option</b><small>{listing.isDemo ? 'Sample count · not live availability' : roomMapEnabled ? 'Availability depends on selected dates' : 'Ask the owner to confirm before booking'}</small></span></div>
                {instantBookingPreview && <div className="booking-mode-preview"><span>INSTANT BOOKING · COMING SOON</span><p>Payments are not connected yet. For now, booking requests still go to the owner for approval.</p></div>}
                <hr />
                <p className="detail-price-help">Availability and rates are provided by the property owner.</p>
                {listing.owner && <div className="detail-booking-area">
                  <h2>Request these rooms</h2>
                  {bookingUser?.role === 'student'
                    ? <form className="detail-booking-form" onSubmit={handleBookingSubmit}>
                        <label><span>From</span><input name="startDate" type="date" required min={dateAfter(1)} value={startDate} onChange={event => { const value = event.target.value; setStartDate(value); if (endDate <= value) setEndDate(dateAfterFrom(value, 1)) }} /></label>
                        <label><span>Until</span><input name="endDate" type="date" required min={dateAfterFrom(startDate, 1)} value={endDate} onChange={event => setEndDate(event.target.value)} /></label>
                        {roomMapEnabled ? <><fieldset className="demo-room-picker"><legend>Choose a {selectedRoomType?.name || 'room'}</legend><p>Open requests and confirmed bookings for your dates show in red.</p><div className="demo-room-legend"><span><i className="free" /> Available</span><span><i className="reserved" /> Requested or booked</span></div><div className="demo-room-grid" aria-label={'Choose rooms at ' + listing.name}>{roomIds.map((roomId, index) => { const chosen = selectedRoomIds.includes(roomId); const unavailable = unavailableRoomIds.includes(roomId); return <button key={roomId} type="button" disabled={unavailable || roomAvailabilityLoading || Boolean(roomAvailabilityError)} className={'demo-room-tile' + (chosen ? ' selected' : '') + (unavailable ? ' reserved' : '')} aria-pressed={chosen} aria-label={roomTileLabel(roomId, selectedRoomType?.key) + (unavailable ? ', unavailable for selected dates' : ', available')} onClick={() => setSelectedRoomIds(current => chosen ? current.filter(value => value !== roomId) : current.length < 20 ? [...current, roomId] : current)}><small>{index < 6 ? 'GROUND' : 'FIRST'} FLOOR</small><b>{roomTileLabel(roomId, selectedRoomType?.key)}</b></button> })}</div><span className="demo-room-selection">{roomAvailabilityLoading ? 'Checking room requests…' : roomAvailabilityError ? roomAvailabilityError : selectedRoomIds.length ? `Selected: ${selectedRoomIds.join(', ')}` : 'Select one or more rooms'}</span></fieldset></> : <label><span>Rooms requested</span><input name="rooms" type="number" required min="1" max="20" defaultValue="1" /></label>}
                        <label><span>Message <small>Optional</small></span><textarea name="message" rows="2" maxLength="1000" placeholder="Add a question for the owner" /></label>
                        {bookingError && <p className="booking-message error" role="alert">{bookingError}</p>}
                        {bookingNotice && <p className="booking-message success" role="status">{bookingNotice} <Link to="/student/bookings">Open bookings</Link></p>}
                        <button className="button booking-submit" type="submit" disabled={bookingBusy || !listing.available || (roomMapEnabled && (selectedRoomIds.length === 0 || roomAvailabilityLoading || Boolean(roomAvailabilityError)))}>{bookingBusy ? 'Sending…' : listing.available ? roomMapEnabled ? 'Request selected room' : 'Send booking request' : 'No rooms currently available'}</button>
                      </form>
                    : bookingUser?.role === 'owner'
                      ? <p className="detail-price-help">Sign in with a student account to request a stay.</p>
                      : <p className="detail-price-help"><Link to="/login">Sign in as a student</Link> to request a stay.</p>}
                </div>}
              </aside>
            </div>
            <section className="detail-section detail-reviews-section">
              <span className="section-kicker">GUEST FEEDBACK</span>
              <h2>Reviews {reviews.length > 0 && <small>({reviews.length})</small>}</h2>
              {reviews.length ? <div className="listing-reviews">{reviews.map(review => <article className="listing-review" key={review.id}><div><strong>{review.student?.name || 'Verified guest'}</strong><span>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)} · {new Date(review.createdAt).toLocaleDateString('en-IN')}</span></div><p>{review.comment || 'No written comment.'}</p><small>Verified stay</small></article>)}</div> : <p>No verified reviews yet. Guests can review after a completed stay.</p>}
            </section>
          </>
        )}
      </main>
      <ChatbotWidget />
    </>
  )
}

function PinIcon() { return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M16.25 8.33c0 4.17-6.25 9.17-6.25 9.17S3.75 12.5 3.75 8.33a6.25 6.25 0 1 1 12.5 0Z" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="8.33" r="2.08" stroke="currentColor" strokeWidth="1.5"/></svg> }
function dateAfter(days) { const date = new Date(); date.setDate(date.getDate() + days); return formatDate(date) }
function dateAfterFrom(value, days) { const date = new Date(`${value}T00:00:00`); date.setDate(date.getDate() + days); return formatDate(date) }
function formatDate(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }
function roomTileLabel(roomId, typeKey) { return typeKey === 'legacy' ? roomId : `Room ${roomId.split('-').at(-1)}` }
