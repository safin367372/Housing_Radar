import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar({ hideSearch = false }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchLocation, setSearchLocation] = useState('')
  const { pathname } = useLocation()
  const showSearch = !hideSearch && (pathname === '/' || pathname === '/student')
  let user = null
  try { user = localStorage.getItem('token') ? JSON.parse(localStorage.getItem('user') || 'null') : null } catch { user = null }
  const dashboardPath = user?.role === 'owner' ? '/owner' : '/student'
  return (
    <header className="topbar">
      <div className={hideSearch ? "nav-inner nav-inner-no-search" : "nav-inner"}>
        <Link className="brand" to="/" onClick={() => window.dispatchEvent(new Event('housingradar:show-landing'))} aria-label="HousingRadar home">
          <span className="brand-mark"><RadarIcon /></span><span>housing<span className="brand-accent">radar</span></span>
        </Link>
        {showSearch && <form className="nav-search-trigger" role="search" onSubmit={event => { event.preventDefault(); window.dispatchEvent(new CustomEvent('housingradar:search', { detail: { location: searchLocation } })) }}>
          <label htmlFor="nav-search-location">Where to?</label><i />
          <input id="nav-search-location" type="search" placeholder="Search stays" value={searchLocation} onChange={event => setSearchLocation(event.target.value)} />
          <button className="nav-search-icon" type="submit" aria-label="Search stays"><SearchIcon /></button>
        </form>}
        <button className="menu-toggle" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><span></span><span></span><span></span></button>
        <nav className={menuOpen ? 'nav-links open' : 'nav-links'}>
          {user?.role === 'student' ? <Link className="nav-link" to="/student/bookings" onClick={() => setMenuOpen(false)}>My bookings</Link> : <Link className="nav-link" to="/signup" onClick={() => setMenuOpen(false)}>List your stay</Link>}
          {user
            ? <Link className="nav-login" to={dashboardPath} onClick={() => setMenuOpen(false)}>My account</Link>
            : <><Link className="nav-login" to="/login">Log in</Link><Link className="button button-small" to="/signup">Get started <span aria-hidden="true">→</span></Link></>}
        </nav>
      </div>
    </header>
  )
}

function RadarIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5.64 5.64a9 9 0 1 0 12.72 0M8.47 8.47a5 5 0 1 0 7.06 0M12 12l6.36-6.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="18.5" cy="5.5" r="1.5" fill="currentColor"/></svg>
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" stroke="currentColor" strokeWidth="1.8"/><path d="m16 16 4.3 4.3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
}
