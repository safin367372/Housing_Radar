import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signup } from '../../api/auth.js'

export default function Signup() {
  const [role, setRole] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    if (!role) {
      setError('Choose whether you are signing up as a student or an owner.')
      return
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await signup({ name, email, password, role })
      if (!result?.token || !result?.user) {
        throw new Error('The server returned an incomplete sign-up response.')
      }
      if (result.user.role !== role) {
        throw new Error('The account role returned by the server does not match your selection.')
      }
      localStorage.setItem('token', result.token)
      localStorage.setItem('user', JSON.stringify(result.user))
      navigate(role === 'owner' ? '/owner' : '/student', { replace: true })
    } catch (requestError) {
      const message = requestError.response?.data?.message
      setError(message || (requestError.code === 'ERR_NETWORK'
        ? 'Could not reach the sign-up service. Check that the backend is running and try again.'
        : requestError.message || 'Sign-up failed. Please check your details and try again.'))
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
          <div className="auth-story-copy"><span>FIND YOUR PLACE</span><h1>Make room<br />for what’s <em>next.</em></h1><p>Create an account to get started.</p></div>
          <span className="auth-photo-caption">A place for every kind of stay</span>
        </section>
        <section className="auth-form-side">
          <div className="auth-card">
            <span className="section-kicker">JOIN HOUSINGRADAR</span>
            <h2>Create your account</h2>
            <p className="auth-intro">Choose your role, then add your details.</p>
            <form className="auth-form signup-form" onSubmit={handleSubmit}>
              <span className="auth-label">I’m signing up as</span>
              <div className="role-switch" role="group" aria-label="Choose account type">
                <button type="button" className={role === 'student' ? 'selected' : ''} onClick={() => { setRole('student'); setError('') }} aria-pressed={role === 'student'}><span className="role-icon"><PersonIcon /></span><span><b>Student</b><small>Find a place to stay</small></span></button>
                <button type="button" className={role === 'owner' ? 'selected' : ''} onClick={() => { setRole('owner'); setError('') }} aria-pressed={role === 'owner'}><span className="role-icon"><HomeIcon /></span><span><b>Owner</b><small>Manage your listings</small></span></button>
              </div>
              <label className="auth-label" htmlFor="signup-name">Full name</label>
              <input className="auth-input" id="signup-name" autoComplete="name" placeholder="Your name" value={name} onChange={event => setName(event.target.value)} required />
              <label className="auth-label" htmlFor="signup-email">Email address</label>
              <input className="auth-input" id="signup-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={event => setEmail(event.target.value)} required />
              <label className="auth-label" htmlFor="signup-password">Password</label>
              <div className="password-wrap"><input className="auth-input" id="signup-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={event => setPassword(event.target.value)} minLength={8} required /><button type="button" className="show-password" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button></div>
              <label className="auth-label" htmlFor="signup-confirm-password">Confirm password</label>
              <input className="auth-input" id="signup-confirm-password" type="password" autoComplete="new-password" placeholder="Enter your password again" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required />
              {error && <p className="auth-error" role="alert">{error}</p>}
              <button className="button auth-submit" type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating account…' : 'Create account'} <span aria-hidden="true">→</span></button>
            </form>
            <p className="auth-footnote">Your account type helps us show the right tools and pages.</p>
            <div className="auth-home-link"><span>Already have an account?</span> <Link to="/login">Sign in</Link></div>
          </div>
        </section>
      </div>
    </main>
  )
}

function RadarIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5.64 5.64a9 9 0 1 0 12.72 0M8.47 8.47a5 5 0 1 0 7.06 0M12 12l6.36-6.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="18.5" cy="5.5" r="1.5" fill="currentColor"/></svg> }
function PersonIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6"/><path d="M5.5 20c.4-3.2 2.7-5.2 6.5-5.2s6.1 2 6.5 5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg> }
function HomeIcon() { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m4 10 8-6 8 6v9a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1v-9Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg> }
