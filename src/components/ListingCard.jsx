import { Link } from 'react-router-dom'

export default function ListingCard({ listing }) {
  const photo = listing.photos?.[0] || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=900&q=80'
  const location = [listing.location?.area, listing.location?.city].filter(Boolean).join(', ')

  return (
    <Link className="listing-card" to={'/listings/' + listing.id} aria-label={'View details for ' + listing.name}>
      <div className="listing-image-wrap">
        <img className="listing-image" src={photo} alt={listing.name + ' accommodation'} />
        <span className={'availability' + (listing.available ? '' : ' full')}><i />{listing.isDemo ? 'Availability unconfirmed' : listing.available ? 'Rooms available' : 'Currently full'}</span>
        {listing.isDemo && <span className="sample-badge">Demo details</span>}
        <span className="save-button" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg></span>
      </div>
      <div className="listing-content">
        <div className="listing-title-row"><div><span className="eyebrow">{listing.typeLabel}</span><h3>{listing.name}</h3></div><span className="rating">{listing.rating > 0 ? <><span>★</span> {listing.rating.toFixed(1)}</> : 'New'}</span></div>
        <p className="listing-location"><PinIcon />{location || 'Location not provided'}</p>
        <div className="listing-tags">{(listing.amenities || []).slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div>
        <div className="listing-footer"><span className="room-type">{listing.roomType}<small className="room-count">{listing.availableRooms ?? 0} rooms available{listing.isDemo ? ' · sample' : ''}</small></span><span className="price">₹{listing.price.toLocaleString('en-IN')}<small> / {listing.priceUnit}</small></span></div>
      </div>
    </Link>
  )
}

function PinIcon() { return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M16.25 8.33c0 4.17-6.25 9.17-6.25 9.17S3.75 12.5 3.75 8.33a6.25 6.25 0 1 1 12.5 0Z" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="8.33" r="2.08" stroke="currentColor" strokeWidth="1.5"/></svg> }
