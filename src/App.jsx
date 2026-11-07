import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase, configManquante } from './supabase'
import Login from './pages/Login'
import Accueil from './pages/Accueil'
import EleveDetail from './pages/EleveDetail'
import EleveForm from './pages/EleveForm'

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (configManquante) {
    return <p className="p-6 text-red-600">URL ou clé manquante dans .env.local</p>
  }

  if (session === undefined) {
    return (
      <div className="min-h-screen bg-matw-light flex items-center justify-center text-gray-600">
        Chargement...
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Accueil session={session} />} />
        <Route path="/eleves/nouveau" element={<EleveForm session={session} />} />
        <Route path="/eleves/:id" element={<EleveDetail session={session} />} />
        <Route path="/eleves/:id/modifier" element={<EleveForm session={session} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
