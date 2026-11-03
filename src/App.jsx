import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/auth/Login.jsx'
import Signup from './pages/auth/Signup.jsx'
import ListingDetailPage from './pages/ListingDetailPage.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import OwnerListingManagementPage from './pages/OwnerListingManagementPage.jsx'
import MyBookingsPage from './pages/MyBookingsPage.jsx'
import Navbar from './components/Navbar.jsx'
import SiteFooter from './components/SiteFooter.jsx'
import ListingCard from './components/ListingCard.jsx'
import ChatbotWidget from './components/ChatbotWidget.jsx'
import { getListing, getListings } from './api/listings.js'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const stayIcon = L.divIcon({ className: 'stay-map-marker', html: '<span></span>', iconSize: [24, 24], iconAnchor: [12, 12] })

export default function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/listings/:id" element={<ListingDetailPage />} />
      <Route path="/student" element={<ProtectedRoute role="student"><HomePage loggedIn /></ProtectedRoute>} />
      <Route path="/student/bookings" element={<ProtectedRoute role="student"><MyBookingsPage /></ProtectedRoute>} />
      <Route path="/owner" element={<ProtectedRoute role="owner"><DashboardPage /></ProtectedRoute>} />
      <Route path="/owner/listings/:id/manage" element={<ProtectedRoute role="owner"><OwnerListingManagementPage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <SiteFooter />
    </>
  )
}

function HomePage({ loggedIn = false }) {
  const savedStorageKey = getSavedStorageKey()
  const sharedSearch = readSharedSearch()
  const [query, setQuery] = useState(sharedSearch.query)
  const [location, setLocation] = useState(sharedSearch.location)
  const [minPrice, setMinPrice] = useState(sharedSearch.minPrice)
  const [maxPrice, setMaxPrice] = useState(sharedSearch.maxPrice)
  const [rateUnit, setRateUnit] = useState(sharedSearch.rateUnit)
  const [propertyType, setPropertyType] = useState(sharedSearch.propertyType)
  const [roomType, setRoomType] = useState(sharedSearch.roomType)
  const [guestPolicy, setGuestPolicy] = useState(sharedSearch.guestPolicy)
  const [amenity, setAmenity] = useState(sharedSearch.amenity)
  const [availableOnly, setAvailableOnly] = useState(sharedSearch.availableOnly)
  const [sort, setSort] = useState(sharedSearch.sort)
  const [nextPage, setNextPage] = useState(2)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState('')
  const searchKey = JSON.stringify([query, location, minPrice, maxPrice, rateUnit, propertyType, roomType, guestPolicy, amenity, availableOnly, sort])
  const currentSearchKey = useRef(searchKey)
  currentSearchKey.current = searchKey
  const [listings, setListings] = useState([])
  const [pagination, setPagination] = useState({ total: 0, pages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [draftFilters, setDraftFilters] = useState(() => ({ query: sharedSearch.query, location: sharedSearch.location, minPrice: sharedSearch.minPrice, maxPrice: sharedSearch.maxPrice, rateUnit: sharedSearch.rateUnit, propertyType: sharedSearch.propertyType, roomType: sharedSearch.roomType, guestPolicy: sharedSearch.guestPolicy, amenity: sharedSearch.amenity, availableOnly: sharedSearch.availableOnly, sort: sharedSearch.sort }))
  const [mapOpen, setMapOpen] = useState(false)
  const [mapListings, setMapListings] = useState([])
  const [mapLoading, setMapLoading] = useState(false)
  const [mapError, setMapError] = useState('')
  const [savedIds, setSavedIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem(savedStorageKey) || '[]').filter(id => typeof id === 'string') }
    catch { return [] }
  })
  const [showSavedOnly, setShowSavedOnly] = useState(false)
  const [showAllStays, setShowAllStays] = useState(loggedIn || sharedSearch.hasSearch)
  const [shareNotice, setShareNotice] = useState('')
  const [savedListings, setSavedListings] = useState([])
  const [savedLoading, setSavedLoading] = useState(false)

  useEffect(() => {
    localStorage.setItem(savedStorageKey, JSON.stringify(savedIds))
  }, [savedStorageKey, savedIds])

  useEffect(() => {
    if (!showSavedOnly) return undefined
    if (!savedIds.length) {
      setSavedListings([])
      return undefined
    }
    const controller = new AbortController()
    let ignore = false
    setSavedLoading(true)
    Promise.all(savedIds.slice(0, 100).map(id => getListing(id, controller.signal).catch(() => null)))
      .then(items => { if (!ignore) setSavedListings(items.filter(Boolean)) })
      .finally(() => { if (!ignore) setSavedLoading(false) })
    return () => { ignore = true; controller.abort() }
  }, [showSavedOnly, savedIds])

  function toggleSaved(id) {
    setSavedIds(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id])
  }

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => {
      const params = buildListingParams({ query, location, minPrice, maxPrice, rateUnit, propertyType, roomType, guestPolicy, amenity, availableOnly, sort }, 1)
      setLoading(true)
      setError('')
      setLoadMoreError('')
      getListings(params, controller.signal)
        .then(data => {
          setListings(data.listings || [])
          setPagination(data.pagination || { total: 0, pages: 0 })
          setNextPage(2)
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
  }, [query, location, minPrice, maxPrice, rateUnit, propertyType, roomType, guestPolicy, amenity, availableOnly, sort, reloadKey])

  async function shareSearch() {
    const params = new URLSearchParams()
    params.set('view', 'search')
    if (query) params.set('q', query)
    if (location) params.set('location', location)
    if (propertyType !== 'all') params.set('type', propertyType)
    if (roomType) params.set('room', roomType)
    if (guestPolicy !== 'any') params.set('guests', guestPolicy)
    if (minPrice) params.set('min', minPrice)
    if (maxPrice) params.set('max', maxPrice)
    if (minPrice || maxPrice) params.set('period', rateUnit)
    if (amenity) params.set('amenity', amenity)
    if (availableOnly) params.set('available', 'true')
    if (sort !== 'newest') params.set('sort', sort)
    const url = `${window.location.origin}/?${params.toString()}`
    try {
      if (navigator.share) await navigator.share({ title: 'HousingRadar stays', text: location ? `Stays near ${location}` : 'Stays on HousingRadar', url })
      else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url)
      else window.prompt('Copy this search link', url)
      setShareNotice(navigator.share ? 'Shared' : 'Copied')
      window.setTimeout(() => setShareNotice(''), 2200)
    } catch (error) {
      if (error.name !== 'AbortError') setShareNotice('Could not share')
    }
  }

  async function loadMoreListings() {
    if (loadingMore || loading || listings.length >= (pagination.total || 0)) return
    const requestSearchKey = searchKey
    setLoadingMore(true)
    setLoadMoreError('')
    try {
      const data = await getListings(buildListingParams({ query, location, minPrice, maxPrice, rateUnit, propertyType, roomType, guestPolicy, amenity, availableOnly, sort }, nextPage))
      if (currentSearchKey.current !== requestSearchKey) return
      const newListings = data.listings || []
      setListings(current => [...current, ...newListings.filter(item => !current.some(existing => existing.id === item.id))])
      setPagination(data.pagination || { total: 0, pages: 0 })
      setNextPage((data.pagination?.page || nextPage) + 1)
    } catch (requestError) {
      if (currentSearchKey.current === requestSearchKey) setLoadMoreError(requestError.response?.data?.message || 'Could not load more stays. Please try again.')
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    if (!mapOpen) return undefined
    const controller = new AbortController()
    let ignore = false
    async function loadMapListings() {
      setMapLoading(true)
      setMapError('')
      try {
        const filters = { query, location, minPrice, maxPrice, rateUnit, propertyType, roomType, guestPolicy, amenity, availableOnly, sort }
        const first = await getListings(buildListingParams(filters, 1), controller.signal)
        const all = [...(first.listings || [])]
        const pages = first.pagination?.pages || 1
        for (let currentPage = 2; currentPage <= pages; currentPage += 1) {
          const result = await getListings(buildListingParams(filters, currentPage), controller.signal)
          all.push(...(result.listings || []))
        }
        if (!ignore) setMapListings(all)
      } catch (requestError) {
        if (!ignore && requestError.code !== 'ERR_CANCELED') setMapError('Could not load stays for the map. Please try again.')
      } finally {
        if (!ignore) setMapLoading(false)
      }
    }
    loadMapListings()
    return () => { ignore = true; controller.abort() }
  }, [mapOpen, reloadKey, query, location, minPrice, maxPrice, rateUnit, propertyType, roomType, guestPolicy, amenity, availableOnly, sort])

  function openFilters() {
    setDraftFilters(currentFilters())
    setFiltersOpen(true)
  }

  function currentFilters() { return { query, location, minPrice, maxPrice, rateUnit, propertyType, roomType, guestPolicy, amenity, availableOnly, sort } }

  function openAllStays(filters = currentFilters()) {
    setDraftFilters(filters)
    setShowAllStays(true)
  }

  useEffect(() => {
    const showOverview = () => {
      setShowAllStays(false)
      window.setTimeout(() => {
        const searchForm = document.getElementById('intro-search')
        searchForm?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        document.getElementById('intro-location')?.focus({ preventScroll: true })
      }, 80)
    }
    const submitNavSearch = event => {
      const searchText = String(event.detail?.location || '').trim()
      setQuery(searchText)
      setLocation('')
      setDraftFilters(current => ({ ...current, query: searchText, location: '' }))
      setShowSavedOnly(false)
      setMapOpen(false)
      setShowAllStays(true)
    }
    const showLanding = () => {
      setShowAllStays(false)
      setShowSavedOnly(false)
      window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0)
    }
    window.addEventListener('housingradar:show-overview', showOverview)
    window.addEventListener('housingradar:show-landing', showLanding)
    window.addEventListener('housingradar:search', submitNavSearch)
    return () => {
      window.removeEventListener('housingradar:show-overview', showOverview)
      window.removeEventListener('housingradar:show-landing', showLanding)
      window.removeEventListener('housingradar:search', submitNavSearch)
    }
  }, [])

  useEffect(() => {
    if (!showAllStays) return undefined
    const frame = window.requestAnimationFrame(() => document.getElementById('all-stays')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    return () => window.cancelAnimationFrame(frame)
  }, [showAllStays])

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
    setRoomType(draftFilters.roomType || '')
    setGuestPolicy(draftFilters.guestPolicy || 'any')
    setAmenity(draftFilters.amenity || '')
    setAvailableOnly(Boolean(draftFilters.availableOnly))
    setSort(draftFilters.sort || 'newest')
    replaceSearchUrl({ ...draftFilters, sort: draftFilters.sort || 'newest' })
    setReloadKey(value => value + 1)
    setFiltersOpen(false)
  }

  function clearFilters() {
    const defaults = { query: '', location: '', minPrice: '', maxPrice: '', rateUnit: 'month', propertyType: 'all', roomType: '', guestPolicy: 'any', amenity: '', availableOnly: false, sort: 'newest' }
    setQuery('')
    setLocation('')
    setMinPrice('')
    setMaxPrice('')
    setRateUnit('month')
    setPropertyType('all')
    setRoomType('')
    setGuestPolicy('any')
    setAmenity('')
    setAvailableOnly(false)
    setSort('newest')
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.hash)
    setReloadKey(value => value + 1)
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
  const activeFilterCount = [location, minPrice, maxPrice, propertyType !== 'all', roomType, guestPolicy !== 'any', amenity, availableOnly, sort !== 'newest'].filter(Boolean).length
  const invalidPriceDraft = (draftFilters.minPrice !== '' && draftFilters.minPrice !== undefined && (!Number.isInteger(Number(draftFilters.minPrice)) || Number(draftFilters.minPrice) < 0)) || (draftFilters.maxPrice !== '' && draftFilters.maxPrice !== undefined && (!Number.isInteger(Number(draftFilters.maxPrice)) || Number(draftFilters.maxPrice) < 0)) || (draftFilters.minPrice !== '' && draftFilters.minPrice !== undefined && draftFilters.maxPrice !== '' && draftFilters.maxPrice !== undefined && Number(draftFilters.minPrice) > Number(draftFilters.maxPrice))

  return (
    <>
      <Navbar hideSearch={showAllStays} />
      <main>
        {!showAllStays ? <>
          <section className="intro-hero" aria-labelledby="intro-title">
            <div className="intro-copy">
              <span className="section-kicker">ROOM TO FIND YOUR PLACE</span>
              <h1 id="intro-title">A good stay makes <em>all the difference.</em></h1>
              <p>From a bed for tonight to a room for the semester, find a stay that fits your plans and your budget.</p>
              <form className="intro-search" id="intro-search" onSubmit={event => { event.preventDefault(); openAllStays() }}>
                <label><span>Where are you headed?</span><input id="intro-location" value={location} onChange={event => setLocation(event.target.value)} placeholder="City, neighborhood, or landmark" /></label>
                <label><span>What kind of stay?</span><select value={propertyType} onChange={event => setPropertyType(event.target.value)}><option value="all">Any type</option><option value="hostel">Hostel</option><option value="pg">PG</option><option value="hotel">Hotel</option><option value="lodge">Lodge</option></select></label>
                <button type="submit" aria-label="Search stays"><SearchIcon /><span>Find stays</span></button>
              </form>
              <div className="intro-promises"><span><i>✓</i> Compare prices</span><span><i>✓</i> See room availability</span><span><i>✓</i> Contact owners</span></div>
            </div>
            <div className="intro-image-wrap"><img src="https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1400&q=85" alt="A bright shared accommodation room" /><div className="intro-image-caption"><span>Find a stay that feels right</span><small>Hostels · PGs · Hotels · Lodges</small></div><span className="intro-image-sticker">Your next<br />chapter starts here</span></div>
          </section>
          <section className="intro-categories" aria-label="Explore stay types"><div><span className="section-kicker">START WITH A STAY TYPE</span><h2>What are you looking for?</h2></div><div className="intro-category-list">{[['hostel', 'Hostels'], ['pg', 'PGs'], ['hotel', 'Hotels'], ['lodge', 'Lodges']].map(([type, label]) => <button key={type} type="button" onClick={() => { setPropertyType(type); setGuestPolicy('any'); openAllStays({ ...currentFilters(), propertyType: type, guestPolicy: 'any' }) }}>{label}<span>↗</span></button>)}</div></section>
          <section className="featured-section" aria-labelledby="featured-title">
            <div className="featured-heading"><div><span className="section-kicker">A FEW PLACES TO START</span><h2 id="featured-title">Stays to explore</h2><p>Browse a small selection, or search all available listings.</p></div><button className="featured-all-button" type="button" onClick={openAllStays}>Browse all stays <span>→</span></button></div>
            {error && <div className="listing-state listing-error" role="alert">{error}<button onClick={() => setReloadKey(value => value + 1)}>Try again</button></div>}
            {!error && loading && <div className="listing-state">Finding a few stays to get you started…</div>}
            {!error && !loading && <div className="listing-grid featured-grid">{listings.slice(0, 4).length ? listings.slice(0, 4).map(item => <ListingCard key={item.id} listing={item} saved={savedIds.includes(item.id)} onToggleSaved={toggleSaved} />) : <div className="empty-state">No stays match that search yet. Try another area or browse all stays.</div>}</div>}
          </section>
        </> : <section className="explore-section">
          <div className="explore-results-layout">
            <aside className="filter-sidebar" aria-label="Search filters">
              <header><div><span className="section-kicker">NARROW YOUR SEARCH</span><h2>Filters</h2></div><button type="button" onClick={clearFilters}>Clear all</button></header>
              <div className="filter-sidebar-body"><FilterFields draftFilters={draftFilters} changeDraft={changeDraft} invalidPriceDraft={invalidPriceDraft} /></div>
              <footer><button type="button" className="sidebar-apply" disabled={invalidPriceDraft} onClick={applyFilters}>Apply filters</button></footer>
            </aside>
            <div className="results-content">
          <section className="results-titlebar" id="all-stays"><div className="results-title-copy"><h1>{showSavedOnly ? 'Saved stays' : resultsTitle(propertyType)}</h1><p>{loading ? 'Searching stays…' : showSavedOnly ? `${savedListings.length} stays saved` : `${total} ${total === 1 ? 'stay' : 'stays'} found`}</p></div><div className="results-actions"><button type="button" className={'saved-toggle' + (showSavedOnly ? ' selected' : '')} onClick={() => { setMapOpen(false); setShowSavedOnly(value => !value) }} aria-pressed={showSavedOnly}><HeartIcon filled={showSavedOnly} /> Saved <span>{savedIds.length}</span></button><div className="view-toggle" role="group" aria-label="Results view"><button type="button" className={!mapOpen ? 'active' : ''} aria-pressed={!mapOpen} onClick={() => setMapOpen(false)}>▤ List</button><button type="button" className={mapOpen ? 'active' : ''} aria-pressed={mapOpen} onClick={() => { setShowSavedOnly(false); setMapOpen(true) }}><PinIcon /> Map</button></div><button type="button" className="share-search-button" onClick={shareSearch}><ShareIcon /> <span>{shareNotice || 'Share'}</span></button><button type="button" className="mobile-filter-button" onClick={openFilters}><FilterIcon /> Filters{activeFilterCount > 0 && <b>{activeFilterCount}</b>}</button></div></section>
          <form className="results-searchbar" onSubmit={event => { event.preventDefault(); applyFilters() }}><label><span>Where?</span><input value={location} onChange={event => { setLocation(event.target.value); changeDraft('location', event.target.value) }} placeholder="City, neighborhood, or landmark" /></label><i aria-hidden="true" /><label><span>Property or keyword</span><input value={query} onChange={event => { setQuery(event.target.value); changeDraft('query', event.target.value) }} placeholder="Stay name or feature" /></label><button type="submit" aria-label="Search stays"><SearchIcon /><span>Search</span></button></form>
          {error && <div className="listing-state listing-error" role="alert">{error}<button onClick={() => setReloadKey(value => value + 1)}>Try again</button></div>}
          {!error && (showSavedOnly ? savedLoading : loading) && <div className="listing-state">{showSavedOnly ? 'Loading your saved stays…' : 'Finding stays for you…'}</div>}
          {!mapOpen && !error && !(showSavedOnly ? savedLoading : loading) && <div className="listing-grid">{(showSavedOnly ? savedListings : listings).length ? (showSavedOnly ? savedListings : listings).map(item => <ListingCard key={item.id} listing={item} saved={savedIds.includes(item.id)} onToggleSaved={toggleSaved} />) : <div className="empty-state">{showSavedOnly ? 'You haven’t saved any stays yet. Tap the heart on a stay to keep it here.' : 'No stays match those filters yet. Try another search or price range.'}</div>}</div>}
          {!mapOpen && !error && !showSavedOnly && !loading && listings.length < total && <div className="load-more-area"><button className="load-more-button" type="button" onClick={loadMoreListings} disabled={loadingMore}>{loadingMore ? 'Loading more stays…' : 'Load more stays'}</button><span>{listings.length} of {total} shown</span>{loadMoreError && <p className="load-more-error" role="alert">{loadMoreError}</p>}</div>}
          {mapOpen && <section className="stay-map-panel" aria-label="Map of active stays">
            <div className="stay-map-heading"><div><span className="section-kicker">EXPLORE BY LOCATION</span><h3>Active stays on the map</h3></div><span>{mapListings.filter(item => Number.isFinite(item.location?.coordinates?.lat) && Number.isFinite(item.location?.coordinates?.lng)).length} mapped · {mapListings.length} stays</span></div>
            {mapLoading && <p className="stay-map-message">Loading locations…</p>}
            {!mapLoading && mapError && <p className="stay-map-message" role="alert">{mapError}</p>}
            {!mapLoading && !mapError && <>
              {mapListings.some(item => !Number.isFinite(item.location?.coordinates?.lat) || !Number.isFinite(item.location?.coordinates?.lng)) && <p className="stay-map-note">Some listings do not have coordinates yet, so they cannot appear as pins. Owners can add map coordinates when editing a listing.</p>}
              <MapContainer className="stay-map" center={[9.2667, 76.6667]} zoom={13} scrollWheelZoom={false}>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <FitStayBounds listings={mapListings} />
                <RefreshMapSize />
                {mapListings.filter(item => Number.isFinite(item.location?.coordinates?.lat) && Number.isFinite(item.location?.coordinates?.lng)).map(item => <Marker key={item.id} position={[item.location.coordinates.lat, item.location.coordinates.lng]} icon={stayIcon}><Popup><Link to={'/listings/' + item.id}><strong>{item.name}</strong></Link><br />{item.location?.area}, {item.location?.city}<br />₹{Number(item.price).toLocaleString('en-IN')} / {item.priceUnit}</Popup></Marker>)}
              </MapContainer>
              {!mapListings.some(item => Number.isFinite(item.location?.coordinates?.lat) && Number.isFinite(item.location?.coordinates?.lng)) && <p className="stay-map-empty">No listings have map coordinates yet. Add latitude and longitude to an owner listing to show its pin here.</p>}
            </>}
          </section>}
            </div>
          </div>
        </section>}
        {showAllStays && <section className="how-section" id="how-it-works"><span className="section-kicker">MADE SIMPLE</span><h2>A place to stay, in three easy steps.</h2><div className="steps-grid"><div><span>01</span><b>Find your fit</b><p>Search trusted places by budget, room type, and what matters to you.</p></div><div><span>02</span><b>Get to know it</b><p>See the details, amenities, and distance before you make a decision.</p></div><div><span>03</span><b>Feel at home</b><p>Reach out to the owner and get ready for your next chapter.</p></div></div></section>}
      </main>
      {filtersOpen && (
        <div className="filter-overlay" onMouseDown={event => { if (event.target === event.currentTarget) setFiltersOpen(false) }}>
          <section className="filter-dialog" role="dialog" aria-modal="true" aria-labelledby="filter-dialog-title">
            <header className="filter-dialog-header"><h2 id="filter-dialog-title">Filters</h2><button type="button" className="filter-close-button" onClick={() => setFiltersOpen(false)} aria-label="Close filters">×</button></header>
            <div className="filter-dialog-body"><FilterFields draftFilters={draftFilters} changeDraft={changeDraft} invalidPriceDraft={invalidPriceDraft} /></div>
            <footer className="filter-dialog-footer"><button className="filter-clear-button" type="button" onClick={clearFilters}>Clear all</button><button className="filter-apply-button" type="button" disabled={invalidPriceDraft} onClick={applyFilters}>Show stays</button></footer>
          </section>
        </div>
      )}
      <ChatbotWidget />
    </>
  )
}

function replaceSearchUrl(filters) {
  const params = new URLSearchParams()
  params.set('view', 'search')
  if (filters.query) params.set('q', filters.query)
  if (filters.location) params.set('location', filters.location)
  if (filters.propertyType && filters.propertyType !== 'all') params.set('type', filters.propertyType)
  if (filters.roomType) params.set('room', filters.roomType)
  if (filters.guestPolicy && filters.guestPolicy !== 'any') params.set('guests', filters.guestPolicy)
  if (filters.minPrice) params.set('min', filters.minPrice)
  if (filters.maxPrice) params.set('max', filters.maxPrice)
  if (filters.minPrice || filters.maxPrice) params.set('period', filters.rateUnit || 'month')
  if (filters.amenity) params.set('amenity', filters.amenity)
  if (filters.availableOnly) params.set('available', 'true')
  if (filters.sort && filters.sort !== 'newest') params.set('sort', filters.sort)
  const queryString = params.toString()
  window.history.replaceState(window.history.state, '', window.location.pathname + (queryString ? `?${queryString}` : '') + window.location.hash)
}

function resultsTitle(type) {
  return ({ all: 'Stays in your search', hostel: 'Hostels in your search', pg: 'PGs in your search', hotel: 'Hotels in your search', lodge: 'Lodges in your search' })[type] || 'Stays in your search'
}

function readSharedSearch() {
  const params = new URLSearchParams(window.location.search)
  const propertyType = ['hostel', 'pg', 'hotel', 'lodge'].includes(params.get('type')) ? params.get('type') : 'all'
  const rawGuestPolicy = ['men', 'women', 'mixed'].includes(params.get('guests')) ? params.get('guests') : 'any'
  const guestPolicy = ['hostel', 'pg', 'all'].includes(propertyType) ? rawGuestPolicy : 'any'
  const rawPeriod = params.get('period')
  const rawSort = params.get('sort')
  const recognized = ['q', 'location', 'type', 'room', 'guests', 'min', 'max', 'period', 'amenity', 'available', 'sort']
  const hasSearch = params.get('view') === 'search' || recognized.some(key => params.has(key))
  return {
    query: params.get('q') || '', location: params.get('location') || '', propertyType, roomType: params.get('room') || '', guestPolicy,
    minPrice: params.get('min') || '', maxPrice: params.get('max') || '',
    rateUnit: ['month', 'night'].includes(rawPeriod) ? rawPeriod : 'month',
    amenity: params.get('amenity') || '', availableOnly: params.get('available') === 'true',
    sort: ['newest', 'priceAsc', 'priceDesc', 'rating'].includes(rawSort) ? rawSort : 'newest',
    hasSearch,
  }
}

function FilterFields({ draftFilters, changeDraft, invalidPriceDraft }) {
  return <>
    <section className="filter-section"><h3>Type of place</h3><div className="filter-type-options" role="group" aria-label="Type of place">{[['all', 'Any type'], ['hostel', 'Hostel'], ['pg', 'PG'], ['hotel', 'Hotel'], ['lodge', 'Lodge']].map(([value, label]) => <button type="button" key={value} className={draftFilters.propertyType === value ? 'selected' : ''} onClick={() => { changeDraft('propertyType', value); if (!['all', 'hostel', 'pg'].includes(value)) changeDraft('guestPolicy', 'any') }}>{label}</button>)}</div></section>
    {(draftFilters.propertyType === 'all' || ['hostel', 'pg'].includes(draftFilters.propertyType)) && <section className="filter-section"><h3>Guest suitability</h3><label className="dialog-field"><span>Suitable for</span><select value={draftFilters.guestPolicy || 'any'} onChange={event => changeDraft('guestPolicy', event.target.value)}><option value="any">Any</option><option value="men">Men</option><option value="women">Women</option><option value="mixed">Mixed</option></select></label><small className="filter-help">This filter applies to hostels and PGs.</small></section>}
    <section className="filter-section"><div className="filter-section-heading"><h3>Price range</h3><span>Choose a budget per stay period</span></div><div className="price-period-toggle" role="group" aria-label="Price period"><button type="button" className={draftFilters.rateUnit === 'month' ? 'selected' : ''} onClick={() => changeDraft('rateUnit', 'month')}>Per month</button><button type="button" className={draftFilters.rateUnit === 'night' ? 'selected' : ''} onClick={() => changeDraft('rateUnit', 'night')}>Per night</button></div><div className="price-slider-wrap" style={{ '--range-low': `${Math.min(100, Number(draftFilters.minPrice || 0) / 20000 * 100)}%`, '--range-high': `${Math.min(100, Number(draftFilters.maxPrice || 20000) / 20000 * 100)}%` }}><div className="price-slider-track" /><input aria-label="Minimum price slider" type="range" min="0" max="20000" step="100" value={draftFilters.minPrice || 0} onChange={event => { const next = Number(event.target.value); const upper = Number(draftFilters.maxPrice || 20000); changeDraft('minPrice', next >= upper ? String(Math.max(0, upper - 100)) : next === 0 ? '' : String(next)) }} /><input aria-label="Maximum price slider" type="range" min="0" max="20000" step="100" value={draftFilters.maxPrice || 20000} onChange={event => { const next = Number(event.target.value); const lower = Number(draftFilters.minPrice || 0); changeDraft('maxPrice', next <= lower ? String(Math.min(20000, lower + 100)) : next === 20000 ? '' : String(next)) }} /></div><div className="price-inputs"><label><span>Minimum</span><span className="price-input-wrap">₹<input type="number" min="0" step="1" inputMode="numeric" value={draftFilters.minPrice || ''} onChange={event => changeDraft('minPrice', event.target.value)} placeholder="Any" /></span></label><label><span>Maximum</span><span className="price-input-wrap">₹<input type="number" min="0" step="1" inputMode="numeric" value={draftFilters.maxPrice || ''} onChange={event => changeDraft('maxPrice', event.target.value)} placeholder="No limit" /></span></label></div>{invalidPriceDraft && <p className="filter-validation" role="alert">Use whole rupee amounts and keep the minimum at or below the maximum.</p>}<div className="budget-suggestions"><span>Try a budget</span><button type="button" onClick={() => { changeDraft('rateUnit', 'month'); changeDraft('minPrice', '3000'); changeDraft('maxPrice', '5000') }}>₹3,000–₹5,000 / month</button><button type="button" onClick={() => { changeDraft('rateUnit', 'month'); changeDraft('minPrice', '5000'); changeDraft('maxPrice', '7000') }}>₹5,000–₹7,000 / month</button></div></section>
    <section className="filter-section"><h3>Room type</h3><label className="dialog-field"><span>Sharing or room name</span><input value={draftFilters.roomType || ''} onChange={event => changeDraft('roomType', event.target.value)} placeholder="e.g. 2 sharing, private room" /></label></section>
    <section className="filter-section filter-location-section"><h3>Amenities</h3><label className="dialog-field"><span>Amenity</span><select value={draftFilters.amenity || ''} onChange={event => changeDraft('amenity', event.target.value)}><option value="">Any amenity</option><option>Wi-Fi</option><option>Meals</option><option>Laundry</option><option>Parking</option><option>Study room</option><option>AC</option><option>CCTV</option></select></label><label className="dialog-checkbox"><input type="checkbox" checked={Boolean(draftFilters.availableOnly)} onChange={event => changeDraft('availableOnly', event.target.checked)} /><span>Show listings marked available</span></label></section>
    <section className="filter-section filter-sort-section"><h3>Sort results</h3><label className="dialog-field"><span>Sort by</span><select value={draftFilters.sort || 'newest'} onChange={event => changeDraft('sort', event.target.value)}><option value="newest">Recently added</option><option value="priceAsc">Price: low to high</option><option value="priceDesc">Price: high to low</option><option value="rating">Highest rated</option></select></label></section>
  </>
}

function buildListingParams(filters, page) {
  const params = { page, limit: 24, sort: filters.sort }
  if (filters.query.trim()) params.search = filters.query.trim()
  if (filters.location.trim()) params.location = filters.location.trim()
  if (filters.propertyType !== 'all') params.propertyType = filters.propertyType
  if (filters.roomType) params.roomType = filters.roomType
  if (filters.guestPolicy && filters.guestPolicy !== 'any') params.guestPolicy = filters.guestPolicy
  if (filters.minPrice !== '' || filters.maxPrice !== '') params.rateUnit = filters.rateUnit
  if (filters.minPrice !== '') params.minPrice = Number(filters.minPrice)
  if (filters.maxPrice !== '') params.maxPrice = Number(filters.maxPrice)
  if (filters.amenity) params.amenities = filters.amenity
  if (filters.availableOnly) params.available = true
  return params
}

function SearchIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4.3 4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg> }
function HeartIcon({ filled }) { return <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg> }
function ShareIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="18" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.7"/><circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.7"/><circle cx="18" cy="19" r="2.5" stroke="currentColor" strokeWidth="1.7"/><path d="m8.3 10.8 7.3-4.4M8.3 13.2l7.3 4.4" stroke="currentColor" strokeWidth="1.7"/></svg> }
function FilterIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M7 12h10m-7 5h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><circle cx="8" cy="7" r="2" fill="currentColor"/><circle cx="14" cy="12" r="2" fill="currentColor"/><circle cx="10" cy="17" r="2" fill="currentColor"/></svg> }
function PinIcon() { return <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M16.25 8.33c0 4.17-6.25 9.17-6.25 9.17S3.75 12.5 3.75 8.33a6.25 6.25 0 1 1 12.5 0Z" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="8.33" r="2.08" stroke="currentColor" strokeWidth="1.5"/></svg> }
function FitStayBounds({ listings }) {
  const map = useMap()
  useEffect(() => {
    const points = listings.map(item => item.location?.coordinates).filter(point => Number.isFinite(point?.lat) && Number.isFinite(point?.lng)).map(point => [point.lat, point.lng])
    if (points.length === 1) map.setView(points[0], 15)
    else if (points.length > 1) map.fitBounds(points, { padding: [32, 32], maxZoom: 15 })
  }, [listings, map])
  return null
}
function RefreshMapSize() {
  const map = useMap()
  useEffect(() => {
    const refresh = () => map.invalidateSize({ pan: false })
    const frame = window.requestAnimationFrame(refresh)
    const observer = new ResizeObserver(refresh)
    observer.observe(map.getContainer())
    document.addEventListener('visibilitychange', refresh)
    window.addEventListener('resize', refresh)
    window.addEventListener('orientationchange', refresh)
    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener('visibilitychange', refresh)
      window.removeEventListener('resize', refresh)
      window.removeEventListener('orientationchange', refresh)
    }
  }, [map])
  return null
}

function getSavedStorageKey() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    return `housingradar:saved-stays:${user?.id || 'guest'}`
  } catch {
    return 'housingradar:saved-stays:guest'
  }
}
