import { Link } from 'react-router-dom'

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-main">
        <section className="site-footer-brand" aria-label="HousingRadar">
          <Link className="brand" to="/" aria-label="HousingRadar home">
            <span className="brand-mark"><RadarIcon /></span>
            <span>housing<span className="brand-accent">radar</span></span>
          </Link>
          <p>Find a place that feels right.</p>
        </section>
        <nav className="site-footer-links" aria-label="HousingRadar links">
          <h2>HousingRadar</h2>
          <Link to="/">Home</Link>
          <a href="/?view=search">Browse stays</a>
          <Link to="/login">Log in</Link>
        </nav>
        <nav className="site-footer-links" aria-label="For property owners">
          <h2>For owners</h2>
          <Link to="/signup">List your property</Link>
          <Link to="/signup">Create an account</Link>
        </nav>
        <section className="site-footer-project">
          <h2>About us</h2>
          <p>HousingRadar is a student-built accommodation project.</p>
          <small>Developed by the HousingRadar student team.</small>
        </section>
      </div>
      <div className="site-footer-bottom">© {new Date().getFullYear()} HousingRadar · Student project</div>
    </footer>
  )
}

function RadarIcon() {
  return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5.64 5.64a9 9 0 1 0 12.72 0M8.47 8.47a5 5 0 1 0 7.06 0M12 12l6.36-6.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="18.5" cy="5.5" r="1.5" fill="currentColor"/></svg>
}
