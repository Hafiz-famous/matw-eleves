import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { CLASSES, ANNEE_SCOLAIRE } from '../constantes'
import Header from '../components/Header'

const STATUTS = [
  { v: 'present', label: 'Présent', couleur: 'bg-green-100 text-green-700 border-green-300' },
  { v: 'retard', label: 'Retard', couleur: 'bg-amber-100 text-amber-700 border-amber-300' },
  { v: 'absent', label: 'Absent', couleur: 'bg-red-100 text-red-700 border-red-300' },
]

function aujourdhui() {
  return new Date().toISOString().slice(0, 10)
}

export default function Presences({ session, profil, classesEnseignant }) {
  const classesDisponibles = profil?.role === 'enseignant' ? classesEnseignant : CLASSES
  const [classe, setClasse] = useState('')
  const [date, setDate] = useState(aujourdhui())
  const [eleves, setEleves] = useState([])
  const [valeurs, setValeurs] = useState({})
  const [chargement, setChargement] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!classe) {
      setEleves([])
      return
    }
    let actif = true
    setChargement(true)
    setMessage('')
    ;(async () => {
      try {
        const { data: liste, error } = await supabase
          .from('eleves')
          .select('id, nom, prenom')
          .eq('classe', classe)
          .eq('statut', 'actif')
          .order('nom')
        if (error) throw error
        const { data: presences, error: err2 } = await supabase
          .from('presences')
          .select('eleve_id, statut, remarque')
          .eq('classe', classe)
          .eq('date', date)
        if (err2) throw err2
        if (!actif) return
        setEleves(liste)
        const v = {}
        presences.forEach((p) => {
          v[p.eleve_id] = { statut: p.statut, remarque: p.remarque || '' }
        })
        liste.forEach((e) => {
          if (!v[e.id]) v[e.id] = { statut: 'present', remarque: '' }
        })
        setValeurs(v)
        setErreur('')
      } catch (err) {
        if (actif) setErreur(err.message || 'Erreur de chargement.')
      }
      if (actif) setChargement(false)
    })()
    return () => {
      actif = false
    }
  }, [classe, date])

  function changer(eleveId, champ, val) {
    setValeurs((prev) => ({ ...prev, [eleveId]: { ...prev[eleveId], [champ]: val } }))
  }

  async function enregistrer() {
    setEnvoi(true)
    setErreur('')
    setMessage('')
    try {
      const lignes = eleves.map((e) => ({
        eleve_id: e.id,
        classe,
        date,
        annee_scolaire: ANNEE_SCOLAIRE,
        statut: valeurs[e.id]?.statut || 'present',
        remarque: valeurs[e.id]?.remarque?.trim() || null,
        enregistre_par: session.user.id,
      }))
      const { error } = await supabase.from('presences').upsert(lignes, { onConflict: 'eleve_id,date' })
      if (error) throw error
      setMessage('Présences enregistrées ✅')
    } catch (err) {
      setErreur(err.message || 'Une erreur est survenue.')
    }
    setEnvoi(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header session={session} profil={profil} />
      <main className="max-w-3xl mx-auto p-4">
        <h2 className="text-xl font-bold text-matw-dark mb-3">Présences</h2>

        <div className="grid gap-2 sm:grid-cols-2 mb-4">
          <select
            className="rounded-lg border border-gray-300 bg-white px-3 py-2"
            value={classe}
            onChange={(e) => setClasse(e.target.value)}
          >
            <option value="">Choisir la classe...</option>
            {classesDisponibles.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="date"
            className="rounded-lg border border-gray-300 bg-white px-3 py-2"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {classesDisponibles.length === 0 && (
          <p className="text-gray-500 py-8 text-center">
            Aucune classe ne vous est attribuée pour le moment.
          </p>
        )}

        {erreur && (
          <p className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-3">
            {erreur}
          </p>
        )}
        {chargement && <p className="text-gray-500">Chargement...</p>}

        {classe && !chargement && eleves.length === 0 && (
          <p className="text-gray-500 py-8 text-center">Aucun élève actif dans cette classe.</p>
        )}

        {classe && !chargement && eleves.length > 0 && (
          <>
            <div className="flex flex-col gap-2">
              {eleves.map((e) => (
                <div
                  key={e.id}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-wrap items-center gap-2"
                >
                  <span className="font-medium text-gray-800 flex-1 min-w-[140px]">
                    {e.nom} {e.prenom}
                  </span>
                  <div className="flex gap-1">
                    {STATUTS.map((s) => (
                      <button
                        key={s.v}
                        type="button"
                        onClick={() => changer(e.id, 'statut', s.v)}
                        className={`text-xs font-semibold rounded-lg px-2.5 py-1.5 border ${
                          valeurs[e.id]?.statut === s.v ? s.couleur : 'border-gray-200 text-gray-400'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <input
                    placeholder="Remarque (optionnel)"
                    value={valeurs[e.id]?.remarque || ''}
                    onChange={(ev) => changer(e.id, 'remarque', ev.target.value)}
                    className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm w-full sm:w-48"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end mt-4">
              <button
                onClick={enregistrer}
                disabled={envoi}
                className="bg-matw hover:bg-matw-dark text-white font-semibold rounded-lg px-5 py-2 text-sm disabled:opacity-50"
              >
                {envoi ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
            {message && <p className="text-green-700 mt-3">{message}</p>}
          </>
        )}
      </main>
    </div>
  )
}
