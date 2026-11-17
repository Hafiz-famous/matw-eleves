import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabase'
import { CLASSES } from '../constantes'
import Header from '../components/Header'
import EleveCard from '../components/EleveCard'
import { pdfListeClasse } from '../utils/pdf'

function normaliser(texte) {
  return (texte || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export default function Accueil({ session, profil }) {
  const estAdmin = profil?.role === 'admin'
  const [eleves, setEleves] = useState([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [recherche, setRecherche] = useState('')
  const [classe, setClasse] = useState('')
  const [statut, setStatut] = useState('actif')
  const [pdfEnCours, setPdfEnCours] = useState(false)

  useEffect(() => {
    supabase
      .from('eleves')
      .select('id, matricule, nom, prenom, classe, statut, photo_url')
      .order('nom')
      .then(({ data, error }) => {
        if (error) setErreur(error.message)
        else setEleves(data)
        setChargement(false)
      })
  }, [])

  async function telechargerListe() {
    setPdfEnCours(true)
    try {
      let req = supabase
        .from('eleves')
        .select('*, tuteurs(*), contacts_urgence(*)')
        .order('nom')
      if (classe) req = req.eq('classe', classe)
      if (statut) req = req.eq('statut', statut)
      const { data, error } = await req
      if (error) throw error
      const affiches = new Set(elevesFiltres.map((e) => e.id))
      const liste = data.filter((e) => affiches.has(e.id))
      const titre =
        (classe || 'Toutes les classes') +
        (statut === 'actif' ? ' (actifs)' : statut === 'inactif' ? ' (inactifs)' : '')
      await pdfListeClasse(liste, titre)
    } catch (e) {
      setErreur('Impossible de créer le PDF : ' + e.message)
    }
    setPdfEnCours(false)
  }

  const elevesFiltres = useMemo(() => {
    const q = normaliser(recherche)
    return eleves.filter((e) => {
      if (classe && e.classe !== classe) return false
      if (statut && e.statut !== statut) return false
      if (!q) return true
      const texte = normaliser(`${e.prenom} ${e.nom} ${e.matricule || ''}`)
      return texte.includes(q)
    })
  }, [eleves, recherche, classe, statut])

  return (
    <div className="min-h-screen bg-gray-50">
      <Header session={session} profil={profil} />

      <main className="max-w-5xl mx-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold text-matw-dark">Élèves</h2>
          <button
            onClick={telechargerListe}
            disabled={pdfEnCours || elevesFiltres.length === 0}
            className="bg-white border border-matw text-matw-dark hover:bg-matw-light rounded-lg px-3 py-1.5 text-sm disabled:opacity-50"
          >
            {pdfEnCours ? 'Création du PDF...' : 'Télécharger la liste (PDF)'}
          </button>
        </div>
          {estAdmin && (
            <Link
              to="/eleves/nouveau"
              className="bg-matw hover:bg-matw-dark text-white font-semibold rounded-lg px-4 py-2"
            >
              + Nouvel élève
            </Link>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="search"
            placeholder="Rechercher un nom, un prénom, un matricule..."
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-matw"
          />
          <select
            value={classe}
            onChange={(e) => setClasse(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2"
          >
            <option value="">Toutes les classes</option>
            {CLASSES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2"
          >
            <option value="actif">Actifs</option>
            <option value="inactif">Inactifs</option>
            <option value="">Tous</option>
          </select>
        </div>

        {chargement && <p className="text-gray-500">Chargement...</p>}
        {erreur && <p className="text-red-600">Erreur : {erreur}</p>}

        {!chargement && !erreur && (
          <>
            <p className="text-sm text-gray-500 mb-2">
              {elevesFiltres.length} élève{elevesFiltres.length > 1 ? 's' : ''}
            </p>
            {elevesFiltres.length === 0 ? (
              <p className="text-gray-500 py-8 text-center">Aucun élève trouvé.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {elevesFiltres.map((e) => (
                  <EleveCard key={e.id} eleve={e} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}




