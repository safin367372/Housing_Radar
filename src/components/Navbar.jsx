import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  let user = null
  try { user = localStorage.getItem('token') ? JSON.parse(localStorage.getItem('user') || 'null') : null } catch { user = null }
  const homePath = user?.role === 'student' ? '/student' : '/'
  const dashboardPath = user?.role === 'owner' ? '/owner' : '/student'
  return (
    <header className="topbar">
      <div className="nav-inner">
        <Link className="brand" to="/" aria-label="HousingRadar home">
          <span className="brand-mark"><RadarIcon /></span><span>housing<span className="brand-accent">radar</span></span>
        </Link>
        <button className="menu-toggle" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><span></span><span></span><span></span></button>
        <nav className={menuOpen ? 'nav-links open' : 'nav-links'}>
          <Link className="nav-link active" to={homePath} onClick={() => setMenuOpen(false)}>Find a stay</Link>
          <Link className="nav-link" to={homePath + '#how-it-works'} onClick={() => setMenuOpen(false)}>How it works</Link>
          <span className="nav-divider" />
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
