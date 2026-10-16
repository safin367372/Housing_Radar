import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import AccountBanner from '../components/AccountBanner.jsx'
import { createListing, getMyListings } from '../api/listings.js'

export default function DashboardPage() {
  const [listings, setListings] = useState([])
  const [loadingListings, setLoadingListings] = useState(true)
  const [listingsError, setListingsError] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [success, setSuccess] = useState('')
  const [formKey, setFormKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    getMyListings(controller.signal)
      .then(setListings)
      .catch(error => {
        if (error.code !== 'ERR_CANCELED') setListingsError(error.response?.data?.message || 'Could not load your listings.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingListings(false)
      })
    return () => controller.abort()
  }, [])

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    setSuccess('')
    const form = event.currentTarget
    const data = new FormData(form)
    const payload = {
      name: data.get('name'),
      propertyType: data.get('propertyType'),
      description: data.get('description'),
      location: { area: data.get('area'), city: data.get('city'), address: data.get('address') },
      price: Number(data.get('price')),
      priceUnit: data.get('priceUnit'),
      availableRooms: Number(data.get('availableRooms')),
      roomType: data.get('roomType'),
      amenities: String(data.get('amenities') || '').split(',').map(item => item.trim()).filter(Boolean),
      photos: String(data.get('photos') || '').split('\n').map(item => item.trim()).filter(Boolean),
      contactPhone: data.get('contactPhone'),
      available: data.get('available') === 'on',
    }

    try {
      const listing = await createListing(payload)
      setListings(current => [listing, ...current])
      setSuccess('Your listing is live and now appears in search results.')
      setFormKey(current => current + 1)
    } catch (error) {
      setFormError(error.response?.data?.message || 'Could not publish the listing. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Navbar />
      <AccountBanner role="owner" />
      <main className="owner-dashboard">
        <section className="owner-dashboard-heading"><div><span className="section-kicker">OWNER SPACE</span><h1>Manage your stays</h1><p>Add a place and help guests find the right stay.</p></div><a className="owner-preview-link" href="#your-listings">Your listings ↓</a></section>
        <div className="owner-dashboard-grid">
          <section className="owner-form-card">
            <div className="owner-form-heading"><span className="owner-form-icon">＋</span><div><h2>Add a new listing</h2><p>Share accurate details so guests know what to expect.</p></div></div>
            <form key={formKey} className="owner-listing-form" onSubmit={handleSubmit}>
              <label className="owner-form-field full"><span>Listing name</span><input name="name" required minLength="2" maxLength="120" placeholder="e.g. Greenview Hostel" /></label>
              <div className="owner-form-row"><label className="owner-form-field"><span>Type of place</span><select name="propertyType" required defaultValue="hostel"><option value="hostel">Hostel</option><option value="pg">PG</option><option value="hotel">Hotel</option><option value="lodge">Lodge</option></select></label><label className="owner-form-field"><span>Room type</span><input name="roomType" required maxLength="80" placeholder="e.g. 2 sharing" /></label></div>
              <label className="owner-form-field"><span>Description</span><textarea name="description" required minLength="10" maxLength="3000" rows="4" placeholder="Describe the rooms, house rules, and what makes this stay useful." /></label>
              <div className="owner-form-row"><label className="owner-form-field"><span>Area / neighborhood</span><input name="area" required maxLength="100" placeholder="e.g. Yamuna Nagar" /></label><label className="owner-form-field"><span>City</span><input name="city" required maxLength="100" placeholder="e.g. Chengannur" /></label></div>
              <label className="owner-form-field"><span>Street address <small>Optional</small></span><textarea name="address" maxLength="300" rows="2" placeholder="Full address or directions" /></label>
              <div className="owner-form-row owner-price-row"><label className="owner-form-field"><span>Price</span><span className="owner-price-input"><span>₹</span><input name="price" type="number" required min="1" max="10000000" step="1" placeholder="5000" /></span></label><label className="owner-form-field"><span>Charge</span><select name="priceUnit" required defaultValue="month"><option value="month">Per month</option><option value="night">Per night</option></select></label></div>
              <label className="owner-form-field"><span>Rooms available</span><input name="availableRooms" type="number" required min="0" max="999" step="1" defaultValue="3" /></label>
              <label className="owner-form-field"><span>Amenities <small>Separate with commas</small></span><input name="amenities" placeholder="Wi-Fi, Meals, Laundry" /></label>
              <label className="owner-form-field"><span>Photo URLs <small>One URL per line</small></span><textarea name="photos" rows="2" placeholder="https://example.com/room.jpg" /></label>
              <label className="owner-form-field"><span>Contact phone <small>Shown on your listing</small></span><input name="contactPhone" type="tel" placeholder="+91 98765 43210" /></label>
              <label className="owner-availability"><input name="available" type="checkbox" defaultChecked /><span>Rooms are currently available</span></label>
              {formError && <p className="owner-form-message error" role="alert">{formError}</p>}
              {success && <p className="owner-form-message success" role="status">{success}</p>}
              <button className="button owner-submit" type="submit" disabled={saving}>{saving ? 'Publishing…' : 'Publish listing'}<span>→</span></button>
              <p className="owner-form-note">Only share contact details you’re comfortable showing publicly.</p>
            </form>
          </section>

          <section className="owner-listings-section" id="your-listings">
            <div className="owner-listings-heading"><div><span className="section-kicker">YOUR PROPERTIES</span><h2>Your listings</h2></div><span className="owner-listing-count">{listings.length}</span></div>
            {loadingListings && <div className="owner-listing-state">Loading your listings…</div>}
            {!loadingListings && listingsError && <div className="owner-listing-state error">{listingsError}</div>}
            {!loadingListings && !listingsError && !listings.length && <div className="owner-empty-listings"><span>⌂</span><b>No listings yet</b><p>Publish your first stay and it will show up here.</p></div>}
            {!loadingListings && listings.map(listing => <Link className="owner-listing-row" to={'/listings/' + listing.id} key={listing.id}><img src={listing.photos?.[0] || 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=240&q=75'} alt=""/><span className="owner-listing-info"><small>{listing.typeLabel}</small><b>{listing.name}</b><span>{listing.location?.area}, {listing.location?.city}</span></span><strong>₹{listing.price.toLocaleString('en-IN')}<small> / {listing.priceUnit}</small></strong></Link>)}
            <Link className="owner-browse-link" to="/">View all public stays <span>→</span></Link>
          </section>
        </div>
      </main>
    </>
  )
}
