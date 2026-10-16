import { useNavigate } from 'react-router-dom'

export default function AccountBanner({ role }) {
  const navigate = useNavigate()
  let user = null
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    user = null
  }

  function signOut() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/', { replace: true })
  }

  return (
    <div className="account-banner">
      <div className="account-avatar" aria-hidden="true">{(user?.name || 'U').trim().charAt(0).toUpperCase()}</div>
      <div className="account-banner-copy"><span>Signed in as</span><strong>{user?.name || 'HousingRadar user'}</strong></div>
      <span className="account-role">{role === 'owner' ? 'Property owner' : 'Student'}</span>
      <button type="button" className="account-signout" onClick={signOut}>Sign out</button>
    </div>
  )
}
