import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase, configManquante } from './supabase'
import { useProfil } from './utils/profil'
import Login from './pages/Login'
import Accueil from './pages/Accueil'
import EleveDetail from './pages/EleveDetail'
import EleveForm from './pages/EleveForm'
import SaisieNotes from './pages/SaisieNotes'
import Presences from './pages/Presences'
import DashboardDirection from './pages/DashboardDirection'
import GestionComptes from './pages/GestionComptes'
import Garde from './components/Garde'

function EcranMessage({ titre, texte, alerte }) {
  return (
    <div className="min-h-screen bg-matw-light flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8 text-center">
        <h1 className={`font-bold mb-2 ${alerte ? 'text-red-600' : 'text-matw-dark'}`}>{titre}</h1>
        <p className="text-gray-600 text-sm mb-5">{texte}</p>
        <button
          onClick={() => supabase.auth.signOut()}
          className="bg-matw hover:bg-matw-dark text-white font-semibold rounded-lg px-4 py-2"
        >
          Déconnexion
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const { profil, classesEnseignant } = useProfil(session)

  if (configManquante) {
    return <p className="p-6 text-red-600">URL ou clé manquante dans .env.local</p>
  }

  if (session === undefined || (session && profil === undefined)) {
    return (
      <div className="min-h-screen bg-matw-light flex items-center justify-center text-gray-600">
        Chargement...
      </div>
    )
  }

  if (!session) return <Login />

  if (!profil || !profil.role) {
    return (
      <EcranMessage
        titre="Compte en attente"
        texte="Votre compte n'a pas encore de rôle attribué. Contactez l'administrateur MATW."
      />
    )
  }

  if (!profil.actif) {
    return (
      <EcranMessage
        titre="Compte désactivé"
        texte="Ce compte a été désactivé. Contactez l'administrateur MATW."
        alerte
      />
    )
  }

  const { role } = profil

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            role === 'direction' ? (
              <DashboardDirection session={session} profil={profil} />
            ) : (
              <Accueil session={session} profil={profil} />
            )
          }
        />
        <Route
          path="/eleves/nouveau"
          element={
            <Garde role={role} roles={['admin']}>
              <EleveForm session={session} profil={profil} />
            </Garde>
          }
        />
        <Route
          path="/eleves/:id"
          element={
            <Garde role={role} roles={['admin', 'direction', 'enseignant']}>
              <EleveDetail session={session} profil={profil} />
            </Garde>
          }
        />
        <Route
          path="/eleves/:id/modifier"
          element={
            <Garde role={role} roles={['admin']}>
              <EleveForm session={session} profil={profil} />
            </Garde>
          }
        />
        <Route
          path="/notes"
          element={
            <Garde role={role} roles={['admin', 'enseignant']}>
              <SaisieNotes session={session} profil={profil} classesEnseignant={classesEnseignant} />
            </Garde>
          }
        />
        <Route
          path="/presences"
          element={
            <Garde role={role} roles={['admin', 'enseignant']}>
              <Presences session={session} profil={profil} classesEnseignant={classesEnseignant} />
            </Garde>
          }
        />
        <Route
          path="/comptes"
          element={
            <Garde role={role} roles={['admin']}>
              <GestionComptes session={session} profil={profil} />
            </Garde>
          }
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
