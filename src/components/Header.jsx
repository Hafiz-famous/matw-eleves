import { Link } from 'react-router-dom'
import { supabase } from '../supabase'

export default function Header({ session }) {
  return (
    <header className="bg-matw text-white shadow">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.jpg" alt="MATW-PROJECT" className="w-10 h-10 rounded-full bg-white" />
          <span className="font-bold">MATW-PROJECT</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline opacity-90">{session.user.email}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            className="bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  )
}
