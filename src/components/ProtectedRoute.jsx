import { Navigate } from 'react-router-dom'

export default function ProtectedRoute({ role, children }) {
  let user = null
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    localStorage.removeItem('user')
  }

  if (!localStorage.getItem('token') || !user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={user.role === 'owner' ? '/owner' : '/student'} replace />
  return children
}
