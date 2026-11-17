import { Navigate } from 'react-router-dom'

// Bloque l'accès à une route si le rôle courant n'est pas autorisé.
export default function Garde({ role, roles, children }) {
  if (!roles.includes(role)) return <Navigate to="/" replace />
  return children
}
