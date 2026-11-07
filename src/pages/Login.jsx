import { useState } from 'react'
import { supabase } from '../supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState('')
  const [chargement, setChargement] = useState(false)

  async function seConnecter(e) {
    e.preventDefault()
    setErreur('')
    setChargement(true)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: motDePasse,
    })
    setChargement(false)
    if (error) {
      setErreur(
        error.message === 'Invalid login credentials'
          ? 'Email ou mot de passe incorrect.'
          : error.message
      )
    }
  }

  return (
    <div className="min-h-screen bg-matw-light flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="flex flex-col items-center gap-2 mb-6">
          <img src="/logo.jpg" alt="MATW-PROJECT" className="w-28 rounded-full" />
          <h1 className="text-xl font-bold text-matw-dark">Gestion des élèves</h1>
          <p className="text-sm text-gray-500">Connexion administrateur</p>
        </div>

        <form onSubmit={seConnecter} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-matw"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
            <input
              type="password"
              required
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-matw"
            />
          </div>

          {erreur && <p className="text-sm text-red-600">{erreur}</p>}

          <button
            type="submit"
            disabled={chargement}
            className="bg-matw hover:bg-matw-dark text-white font-semibold rounded-lg py-2.5 transition disabled:opacity-60"
          >
            {chargement ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
