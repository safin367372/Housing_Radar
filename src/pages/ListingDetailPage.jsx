import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import ChatbotWidget from '../components/ChatbotWidget.jsx'
import { getListing } from '../api/listings.js'

export default function ListingDetailPage() {
  const { id } = useParams()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

  const locationText = listing
    ? [listing.location?.area, listing.location?.city].filter(Boolean).join(', ')
    : ''
  const photos = listing?.photos?.length ? listing.photos : []
  const coordinates = listing?.location?.coordinates
  const mapQuery = listing?.location?.address || locationText
  const mapUrl = Number.isFinite(coordinates?.lat) && Number.isFinite(coordinates?.lng)
    ? 'https://www.google.com/maps/search/?api=1&query=' + coordinates.lat + ',' + coordinates.lng
    : mapQuery ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(mapQuery) : ''

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
                  {mapUrl && <a className="detail-map-link" href={mapUrl} target="_blank" rel="noreferrer">Open location in Google Maps ↗</a>}
                </section>
                {listing.ownerDetails && (listing.ownerDetails.name || listing.ownerDetails.phones?.length > 0) && (
                  <section className="detail-section owner-contact-section">
                    <span className="section-kicker">CONTACT</span>
                    <h2>Speak with the owner</h2>
                    {listing.ownerDetails.name && <p className="owner-contact-name">{listing.ownerDetails.name}</p>}
                    {listing.ownerDetails.phones?.length
                      ? <div className="owner-phone-list">{listing.ownerDetails.phones.map((phone, index) => {
                          const callable = phone.replace(/[^+\d]/g, '')
                          return <a className="button call-owner-button" key={phone + index} href={'tel:' + callable}><span aria-hidden="true">☎</span> Call {phone}</a>
                        })}</div>
                      : <p>Phone contact was not provided.</p>}
                  </section>
                )}
              </div>
              <aside className="detail-price-card">
                <span className="section-kicker">RATE AND ROOM</span>
                <div className="detail-price">₹{listing.price.toLocaleString('en-IN')}<small> / {listing.priceUnit}</small></div>
                <p>{listing.roomType}</p>
                <div className={'detail-availability' + (listing.available ? '' : ' full')}><i />{listing.isDemo ? 'Confirm availability with owner' : listing.available ? 'Rooms available' : 'Currently full'}</div>
                <div className="detail-room-count"><strong>{listing.availableRooms ?? 0}</strong><span><b>Rooms listed as available</b><small>{listing.isDemo ? 'Sample count · not live availability' : 'Ask the owner to confirm before booking'}</small></span></div>
                <hr />
                <p className="detail-price-help">Availability and rates are provided by the property owner.</p>
              </aside>
            </div>
          </>
        )}
      </main>
      <ChatbotWidget />
      <footer className="footer"><Link className="brand" to="/"><span className="brand-mark"><RadarIcon /></span><span>housing<span className="brand-accent">radar</span></span></Link><span>A better way to find a place to stay.</span><small>HousingRadar · Here for every kind of stay</small></footer>
    </>
  )
}

function PinIcon() { return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M16.25 8.33c0 4.17-6.25 9.17-6.25 9.17S3.75 12.5 3.75 8.33a6.25 6.25 0 1 1 12.5 0Z" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="8.33" r="2.08" stroke="currentColor" strokeWidth="1.5"/></svg> }
function RadarIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5.64 5.64a9 9 0 1 0 12.72 0M8.47 8.47a5 5 0 1 0 7.06 0M12 12l6.36-6.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="18.5" cy="5.5" r="1.5" fill="currentColor"/></svg> }
