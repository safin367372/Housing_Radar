import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../../api/auth.js'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      const result = await login({ email, password })
      if (!result?.token || !result?.user) {
        throw new Error('The server returned an incomplete sign-in response.')
      }
      if (!['student', 'owner'].includes(result.user.role)) {
        throw new Error('The server returned an unknown account type.')
      }
      localStorage.setItem('token', result.token)
      localStorage.setItem('user', JSON.stringify(result.user))
      navigate(result.user.role === 'owner' ? '/owner' : '/student', { replace: true })
    } catch (requestError) {
      const message = requestError.response?.data?.message
      setError(message || (requestError.code === 'ERR_NETWORK'
        ? 'Could not reach the sign-in service. Check that the backend is running and try again.'
        : requestError.message || 'Sign-in failed. Check your details and try again.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <header className="auth-topbar">
        <Link className="brand" to="/" aria-label="HousingRadar home"><span className="brand-mark"><RadarIcon /></span><span>housing<span className="brand-accent">radar</span></span></Link>
        <Link className="auth-back-link" to="/">← Back to stays</Link>
      </header>
      <div className="auth-layout">
        <section className="auth-story">
          <img src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=85" alt="A welcoming shared living space" />
          <div className="auth-story-shade" />
          <div className="auth-story-copy"><span>YOUR NEXT CHAPTER</span><h1>Good to have<br />you <em>back.</em></h1><p>Sign in to pick up where you left off.</p></div>
          <span className="auth-photo-caption">A place for every kind of stay</span>
        </section>
        <section className="auth-form-side">
          <div className="auth-card">
            <span className="section-kicker">WELCOME BACK</span>
            <h2>Sign in to HousingRadar</h2>
            <p className="auth-intro">Sign in with the email and password for your account.</p>
            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-label" htmlFor="login-email">Email address</label>
              <input className="auth-input" id="login-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} required />
              <div className="password-label-row"><label className="auth-label" htmlFor="login-password">Password</label><button type="button" className="forgot-link" onClick={() => setError('Password reset is not connected yet. Please contact the project team.')}>Forgot password?</button></div>
              <div className="password-wrap"><input className="auth-input" id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={event => setPassword(event.target.value)} required /><button type="button" className="show-password" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></div>
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="button auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'} <span aria-hidden="true">→</span></button>
            </form>
            <p className="auth-footnote">We’ll take you to the right place based on your account type.</p>
            <div className="auth-home-link"><span>New to HousingRadar?</span> <Link to="/signup">Create an account</Link></div>
          </div>
        </section>
      </div>
    </main>
  )
}

function RadarIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5.64 5.64a9 9 0 1 0 12.72 0M8.47 8.47a5 5 0 1 0 7.06 0M12 12l6.36-6.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="18.5" cy="5.5" r="1.5" fill="currentColor"/></svg> }
