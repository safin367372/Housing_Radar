import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/auth/Login.jsx'
import Signup from './pages/auth/Signup.jsx'
import ListingDetailPage from './pages/ListingDetailPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import Navbar from './components/Navbar.jsx'
import ListingCard from './components/ListingCard.jsx'
import ChatbotWidget from './components/ChatbotWidget.jsx'
import AccountBanner from './components/AccountBanner.jsx'
import { getListings } from './api/listings.js'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/listings/:id" element={<ListingDetailPage />} />
      <Route path="/student" element={<ProtectedRoute role="student"><HomePage loggedIn /></ProtectedRoute>} />
      <Route path="/owner" element={<ProtectedRoute role="owner"><DashboardPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function HomePage({ loggedIn = false }) {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [rateUnit, setRateUnit] = useState('month')
  const [propertyType, setPropertyType] = useState('all')
  const [amenity, setAmenity] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [sort, setSort] = useState('newest')
  const [pageSize, setPageSize] = useState('6')
  const [page, setPage] = useState(1)
  const [listings, setListings] = useState([])
  const [pagination, setPagination] = useState({ total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState({})

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      const params = { page, limit: Number(pageSize), sort }
      if (query.trim()) params.search = query.trim()
      if (location.trim()) params.location = location.trim()
      if (propertyType !== 'all') params.propertyType = propertyType
      if (minPrice !== '' || maxPrice !== '') params.rateUnit = rateUnit
      if (minPrice !== '') params.minPrice = Number(minPrice)
      if (maxPrice !== '') params.maxPrice = Number(maxPrice)
      if (amenity) params.amenities = amenity
      if (availableOnly) params.available = true

      setLoading(true)
      setError('')
      getListings(params, controller.signal)
        .then(data => {
          setListings(data.listings || [])
          setPagination(data.pagination || { total: 0, pages: 0 })
        })
        .catch(requestError => {
          if (requestError.code !== 'ERR_CANCELED') {
            setError(requestError.response?.data?.message || 'Could not load stays. Check that the backend is running.')
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 250)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, location, minPrice, maxPrice, rateUnit, propertyType, amenity, availableOnly, sort, pageSize, page, reloadKey])

  function openFilters() {
    setDraftFilters({ query, location, minPrice, maxPrice, rateUnit, propertyType, amenity, availableOnly, sort, pageSize })
    setFiltersOpen(true)
  }

  function changeDraft(key, value) {
    setDraftFilters(current => ({ ...current, [key]: value }))
  }

  function applyFilters() {
    setQuery(draftFilters.query || '')
    setLocation(draftFilters.location || '')
    setMinPrice(draftFilters.minPrice || '')
    setMaxPrice(draftFilters.maxPrice || '')
    setRateUnit(draftFilters.rateUnit || 'month')
    setPropertyType(draftFilters.propertyType || 'all')
    setAmenity(draftFilters.amenity || '')
    setAvailableOnly(Boolean(draftFilters.availableOnly))
    setSort(draftFilters.sort || 'newest')
    setPageSize(draftFilters.pageSize || '6')
    setPage(1)
    setFiltersOpen(false)
  }

  function clearFilters() {
    const defaults = { query: '', location: '', minPrice: '', maxPrice: '', rateUnit: 'month', propertyType: 'all', amenity: '', availableOnly: false, sort: 'newest', pageSize: '6' }
    setQuery('')
    setLocation('')
    setMinPrice('')
    setMaxPrice('')
    setRateUnit('month')
    setPropertyType('all')
    setAmenity('')
    setAvailableOnly(false)
    setSort('newest')
    setPageSize('6')
    setPage(1)
    setDraftFilters(defaults)
  }

  useEffect(() => {
    if (!filtersOpen) return undefined
    const originalOverflow = document.body.style.overflow
    const handleEscape = event => {
      if (event.key === 'Escape') setFiltersOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [filtersOpen])

  const total = pagination.total || 0
  const pageCount = pagination.pages || 0
  const firstResult = total ? (page - 1) * Number(pageSize) + 1 : 0
  const lastResult = Math.min(page * Number(pageSize), total)
  const activeFilterCount = [location, minPrice, maxPrice, propertyType !== 'all', amenity, availableOnly, sort !== 'newest'].filter(Boolean).length
  const invalidPriceDraft = (draftFilters.minPrice !== '' && draftFilters.minPrice !== undefined && (!Number.isInteger(Number(draftFilters.minPrice)) || Number(draftFilters.minPrice) < 0)) || (draftFilters.maxPrice !== '' && draftFilters.maxPrice !== undefined && (!Number.isInteger(Number(draftFilters.maxPrice)) || Number(draftFilters.maxPrice) < 0)) || (draftFilters.minPrice !== '' && draftFilters.minPrice !== undefined && draftFilters.maxPrice !== '' && draftFilters.maxPrice !== undefined && Number(draftFilters.minPrice) > Number(draftFilters.maxPrice))

  return (
    <>
      <Navbar />
      {loggedIn && <AccountBanner role="student" />}
      <main>
        <section className="hero" id="explore">
          <div className="hero-inner">
            <div className="hero-copy">
              <div className="hero-kicker"><span className="kicker-dot" /> MADE FOR STUDENT LIFE</div>
              <h1>Find a place<br />that feels like <em>you.</em></h1>
              <p className="hero-description">Hostels, PGs, hotels, and lodges—find the right kind of stay in the place you need.</p>
              <div className="hero-proof"><div className="avatar-stack"><span>AM</span><span>RV</span><span>SK</span></div><span><strong>Student approved</strong><br />Find your next home with confidence</span></div>
            </div>
            <div className="hero-art">
              <div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/>
              <div className="art-window"><img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85" alt="Bright, comfortable shared living room"/><div className="art-label"><span className="art-label-icon">⌂</span><span><b>Your next chapter</b><small>Starts right here</small></span><span className="art-sparkle">✦</span></div></div>
              <div className="float-note note-top"><span className="note-icon">⌖</span><span><b>In the right place</b><small>Near the places that matter</small></span></div>
              <div className="float-note note-bottom"><span className="note-icon green">✓</span><span><b>Verified stays</b><small>Details to help you choose</small></span></div>
              <span className="deco-star star-one">✳</span><span className="deco-star star-two">✦</span>
            </div>
          </div>
          <div className="hero-bottom-rule" />
        </section>

        <section className="explore-section">
          <div className="section-top"><div><span className="section-kicker">YOUR SEARCH STARTS HERE</span><h2>Find your kind of place</h2><p className="section-description">Set your own budget, choose a stay type, and search around a location.</p></div><a className="text-link" href="#all-stays">Browse all stays <span>→</span></a></div>
          <div className="filter-toolbar">
            <label className="filter-search"><SearchIcon /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by hostel, feature, or keyword" aria-label="Search listings" /></label>
            <button className={'all-filters-button' + (activeFilterCount ? ' has-active-filters' : '')} type="button" onClick={openFilters} aria-haspopup="dialog" aria-expanded={filtersOpen}>
              <FilterIcon /> <span>All filters</span>{activeFilterCount > 0 && <span className="active-filter-count">{activeFilterCount}</span>}
            </button>
          </div>
          <div className="listing-heading" id="all-stays"><div><span className="section-kicker">A GOOD PLACE TO LAND</span><h2>Places people are exploring</h2></div><span className="results-label">{loading ? 'Loading…' : total ? `Showing ${firstResult}–${lastResult} of ${total} stays` : '0 stays'}</span></div>
          {error && <div className="listing-state listing-error" role="alert">{error}<button onClick={() => setReloadKey(value => value + 1)}>Try again</button></div>}
          {!error && loading && <div className="listing-state">Finding stays for you…</div>}
          {!error && !loading && <div className="listing-grid">{listings.length ? listings.map(item => <ListingCard key={item.id} listing={item} />) : <div className="empty-state">No stays match those filters yet. Try another search or price range.</div>}</div>}
          {!error && !loading && pageCount > 1 && <nav className="pagination" aria-label="Listing pages"><button type="button" disabled={page <= 1} onClick={() => { setPage(value => Math.max(1, value - 1)); document.getElementById('all-stays')?.scrollIntoView({ behavior: 'smooth' }) }}>← Previous</button><span>Page {page} of {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => { setPage(value => Math.min(pageCount, value + 1)); document.getElementById('all-stays')?.scrollIntoView({ behavior: 'smooth' }) }}>Next →</button></nav>}
          <div className="map-banner"><div className="map-mark"><PinIcon /></div><div><b>Want to see what’s nearby?</b><span>See stays on a map and compare areas before you decide.</span></div><button className="map-button">Explore the map <span>→</span></button></div>
        </section>
        <section className="how-section" id="how-it-works"><span className="section-kicker">MADE SIMPLE</span><h2>A place to stay, in three easy steps.</h2><div className="steps-grid"><div><span>01</span><b>Find your fit</b><p>Search trusted places by budget, room type, and what matters to you.</p></div><div><span>02</span><b>Get to know it</b><p>See the details, amenities, and distance before you make a decision.</p></div><div><span>03</span><b>Feel at home</b><p>Reach out to the owner and get ready for your next chapter.</p></div></div></section>
      </main>
      {filtersOpen && (
        <div className="filter-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setFiltersOpen(false) }}>
          <section className="filter-dialog" role="dialog" aria-modal="true" aria-labelledby="filter-dialog-title">
            <header className="filter-dialog-header"><h2 id="filter-dialog-title">Filters</h2><button type="button" className="filter-close-button" onClick={() => setFiltersOpen(false)} aria-label="Close filters">×</button></header>
            <div className="filter-dialog-body">
              <section className="filter-section">
                <h3>Type of place</h3>
                <div className="filter-type-options" role="group" aria-label="Type of place">
                  {[['all', 'Any type'], ['hostel', 'Hostel'], ['pg', 'PG'], ['hotel', 'Hotel'], ['lodge', 'Lodge']].map(([value, label]) => <button type="button" key={value} className={draftFilters.propertyType === value ? 'selected' : ''} onClick={() => changeDraft('propertyType', value)}>{label}</button>)}
                </div>
              </section>
              <section className="filter-section">
                <div className="filter-section-heading"><h3>Price range</h3><span>Choose a budget per stay period</span></div>
                <div className="price-period-toggle" role="group" aria-label="Price period"><button type="button" className={draftFilters.rateUnit === 'month' ? 'selected' : ''} onClick={() => changeDraft('rateUnit', 'month')}>Per month</button><button type="button" className={draftFilters.rateUnit === 'night' ? 'selected' : ''} onClick={() => changeDraft('rateUnit', 'night')}>Per night</button></div>
                <div className="price-slider-wrap" style={{ '--range-low': `${Math.min(100, Number(draftFilters.minPrice || 0) / 20000 * 100)}%`, '--range-high': `${Math.min(100, Number(draftFilters.maxPrice || 20000) / 20000 * 100)}%` }}>
                  <div className="price-slider-track" />
                  <input aria-label="Minimum price slider" type="range" min="0" max="20000" step="100" value={draftFilters.minPrice || 0} onChange={event => { const next = Number(event.target.value); const upper = Number(draftFilters.maxPrice || 20000); changeDraft('minPrice', next >= upper ? String(Math.max(0, upper - 100)) : next === 0 ? '' : String(next)) }} />
                  <input aria-label="Maximum price slider" type="range" min="0" max="20000" step="100" value={draftFilters.maxPrice || 20000} onChange={event => { const next = Number(event.target.value); const lower = Number(draftFilters.minPrice || 0); changeDraft('maxPrice', next <= lower ? String(Math.min(20000, lower + 100)) : next === 20000 ? '' : String(next)) }} />
                </div>
                <div className="price-inputs"><label><span>Minimum</span><span className="price-input-wrap">₹<input type="number" min="0" step="1" inputMode="numeric" value={draftFilters.minPrice || ''} onChange={event => changeDraft('minPrice', event.target.value)} placeholder="Any" /></span></label><label><span>Maximum</span><span className="price-input-wrap">₹<input type="number" min="0" step="1" inputMode="numeric" value={draftFilters.maxPrice || ''} onChange={event => changeDraft('maxPrice', event.target.value)} placeholder="No limit" /></span></label></div>
                {invalidPriceDraft && <p className="filter-validation" role="alert">Use whole rupee amounts and keep the minimum at or below the maximum.</p>}
                <div className="budget-suggestions"><span>Try a budget</span><button type="button" onClick={() => { changeDraft('rateUnit', 'month'); changeDraft('minPrice', '3000'); changeDraft('maxPrice', '5000') }}>₹3,000–₹5,000 / month</button><button type="button" onClick={() => { changeDraft('rateUnit', 'month'); changeDraft('minPrice', '5000'); changeDraft('maxPrice', '7000') }}>₹5,000–₹7,000 / month</button></div>
              </section>
              <section className="filter-section filter-location-section">
                <h3>Location and amenities</h3>
                <label className="dialog-field"><span>Near an area, landmark, or city</span><input value={draftFilters.location || ''} onChange={event => changeDraft('location', event.target.value)} placeholder="e.g. Chengannur railway station" /></label>
                <label className="dialog-field"><span>Amenity</span><select value={draftFilters.amenity || ''} onChange={event => changeDraft('amenity', event.target.value)}><option value="">Any amenity</option><option>Wi-Fi</option><option>Meals</option><option>Laundry</option><option>Parking</option><option>Study room</option><option>AC</option><option>CCTV</option></select></label>
                <label className="dialog-checkbox"><input type="checkbox" checked={Boolean(draftFilters.availableOnly)} onChange={event => changeDraft('availableOnly', event.target.checked)} /><span>Show listings marked available</span></label>
              </section>
              <section className="filter-section filter-sort-section">
                <h3>Sort and display</h3>
                <label className="dialog-field"><span>Sort by</span><select value={draftFilters.sort || 'newest'} onChange={event => changeDraft('sort', event.target.value)}><option value="newest">Recently added</option><option value="priceAsc">Price: low to high</option><option value="priceDesc">Price: high to low</option><option value="rating">Highest rated</option></select></label>
                <label className="dialog-field"><span>Listings per page</span><select value={draftFilters.pageSize || '6'} onChange={event => changeDraft('pageSize', event.target.value)}><option value="4">4 listings</option><option value="6">6 listings</option><option value="8">8 listings</option></select></label>
              </section>
            </div>
            <footer className="filter-dialog-footer"><button className="filter-clear-button" type="button" onClick={clearFilters}>Clear all</button><button className="filter-apply-button" type="button" disabled={invalidPriceDraft} onClick={applyFilters}>Show stays</button></footer>
          </section>
        </div>
      )}
      <ChatbotWidget />
      <footer className="footer"><Link className="brand" to="/"><span className="brand-mark"><RadarIcon /></span><span>housing<span className="brand-accent">radar</span></span></Link><span>A better way to find a place to stay.</span><small>HousingRadar · Here for every kind of stay</small></footer>
    </>
  )
}

function SearchIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4.3 4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> }
function FilterIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M7 12h10m-7 5h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="8" cy="7" r="2" fill="currentColor"/><circle cx="14" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="17" r="2" fill="currentColor"/></svg> }
function PinIcon() { return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M16.25 8.33c0 4.17-6.25 9.17-6.25 9.17S3.75 12.5 3.75 8.33a6.25 6.25 0 1 1 12.5 0Z" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="8.33" r="2.08" stroke="currentColor" strokeWidth="1.5"/></svg> }
function RadarIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5.64 5.64a9 9 0 1 0 12.72 0M8.47 8.47a5 5 0 1 0 7.06 0M12 12l6.36-6.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="18.5" cy="5.5" r="1.5" fill="currentColor"/></svg> }
