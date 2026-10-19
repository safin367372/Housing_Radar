import { Link } from 'react-router-dom'

export default function ListingCard({ listing, saved = false, onToggleSaved = () => {} }) {
  const photo = listing.photos?.[0] || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=900&q=80'
  const location = [listing.location?.area, listing.location?.city].filter(Boolean).join(', ')

  return (
    <article className="listing-card">
      <div className="listing-image-wrap">
        <Link className="listing-image-link" to={'/listings/' + listing.id} aria-label={'View details for ' + listing.name}><img className="listing-image" src={photo} alt={listing.name + ' accommodation'} /></Link>
        <span className={'availability' + (listing.available ? '' : ' full')}><i />{listing.isDemo ? 'Availability unconfirmed' : listing.available ? 'Rooms available' : 'Currently full'}</span>
        {listing.isDemo && <span className="sample-badge">Demo details</span>}
        <button type="button" className={'save-button' + (saved ? ' is-saved' : '')} aria-label={saved ? 'Remove ' + listing.name + ' from saved stays' : 'Save ' + listing.name} aria-pressed={saved} onClick={() => onToggleSaved(listing.id)}><svg viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg></button>
      </div>
      <Link className="listing-content" to={'/listings/' + listing.id} aria-label={'View details for ' + listing.name}>
        <div className="listing-title-row"><div><span className="eyebrow">{listing.typeLabel}</span><h3>{listing.name}</h3></div><span className="rating">{listing.rating > 0 ? <><span>★</span> {listing.rating.toFixed(1)}</> : 'New'}</span></div>
        <p className="listing-location"><PinIcon />{location || 'Location not provided'}</p>
        <div className="listing-tags">{(listing.amenities || []).slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div>
        <div className="listing-footer"><span className="room-type">{listing.roomType}<small className="room-count">{listing.availableRooms ?? 0} rooms available{listing.isDemo ? ' · sample' : ''}</small></span><span className="price">₹{listing.price.toLocaleString('en-IN')}<small> / {listing.priceUnit}</small></span></div>
      </Link>
    </article>
  )
}

function PinIcon() { return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M16.25 8.33c0 4.17-6.25 9.17-6.25 9.17S3.75 12.5 3.75 8.33a6.25 6.25 0 1 1 12.5 0Z" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="8.33" r="2.08" stroke="currentColor" strokeWidth="1.5"/></svg> }
