import { Link, NavLink } from 'react-router-dom'
import { supabase } from '../supabase'

const lien = ({ isActive }) =>
  `px-3 py-2 text-sm font-medium border-b-2 ${
    isActive ? 'border-white' : 'border-transparent opacity-80 hover:opacity-100'
  }`

const LIBELLES_ROLE = {
  admin: 'Administrateur',
  direction: 'Direction',
  enseignant: 'Enseignant',
}

export default function Header({ session, profil }) {
  const role = profil?.role
  const nomAffiche =
    profil?.prenom || profil?.nom ? `${profil.prenom || ''} ${profil.nom || ''}`.trim() : session.user.email

  return (
    <header className="bg-matw text-white shadow">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.jpg" alt="MATW-PROJECT" className="w-10 h-10 rounded-full bg-white" />
          <span className="font-bold">MATW-PROJECT</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="opacity-90">{nomAffiche}</span>
            {role && (
              <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">
                {LIBELLES_ROLE[role] || role}
              </span>
            )}
          </div>
          <button
            onClick={() => supabase.auth.signOut()}
            className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5"
          >
            Déconnexion
          </button>
        </div>
      </div>
      {role !== 'direction' && (
        <nav className="max-w-5xl mx-auto flex gap-1 px-3 border-t border-white/20">
          <NavLink to="/" end className={lien}>Élèves</NavLink>
          <NavLink to="/notes" className={lien}>Notes</NavLink>
          <NavLink to="/presences" className={lien}>Présences</NavLink>
          {role === 'admin' && <NavLink to="/comptes" className={lien}>Comptes</NavLink>}
        </nav>
      )}
    </header>
  )
}
