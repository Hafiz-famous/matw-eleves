import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { CLASSES, PERIODES, ANNEE_SCOLAIRE } from '../constantes'
import Header from '../components/Header'
import { calculerMoyenne } from '../utils/calculs'

export default function DashboardDirection({ session, profil }) {
  const [eleves, setEleves] = useState([])
  const [matieres, setMatieres] = useState([])
  const [notes, setNotes] = useState([])
  const [periode, setPeriode] = useState(PERIODES[0])
  const [annee] = useState(ANNEE_SCOLAIRE)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    let actif = true
    setChargement(true)
    Promise.all([
      supabase.rpc('effectifs_direction'),
      supabase.from('matieres').select('*'),
      supabase.from('notes').select('eleve_id, matiere_id, periode, note').eq('annee_scolaire', annee),
    ]).then(([e, m, n]) => {
      if (!actif) return
      if (e.error) setErreur(e.error.message)
      else setEleves(e.data || [])
      if (!m.error) setMatieres(m.data || [])
      if (!n.error) setNotes(n.data || [])
      setChargement(false)
    })
    return () => {
      actif = false
    }
  }, [annee])

  const parClasse = useMemo(() => {
    const r = {}
    CLASSES.forEach((c) => {
      r[c] = { total: 0, actifs: 0 }
    })
    eleves.forEach((e) => {
      if (!r[e.classe]) r[e.classe] = { total: 0, actifs: 0 }
      r[e.classe].total++
      if (e.statut === 'actif') r[e.classe].actifs++
    })
    return r
  }, [eleves])

  const moyenneClasse = useMemo(() => {
    const r = {}
    CLASSES.forEach((classe) => {
      const idsClasse = new Set(eleves.filter((e) => e.classe === classe).map((e) => e.id))
      const matieresClasse = matieres.filter((m) => m.classe === classe)
      const parEleve = {}
      notes
        .filter((n) => n.periode === periode && idsClasse.has(n.eleve_id))
        .forEach((n) => {
          if (!parEleve[n.eleve_id]) parEleve[n.eleve_id] = {}
          parEleve[n.eleve_id][n.matiere_id] = Number(n.note)
        })
      const moyennes = Object.values(parEleve)
        .map((notesEleve) => calculerMoyenne(notesEleve, matieresClasse))
        .filter((m) => m !== null)
      r[classe] = moyennes.length ? moyennes.reduce((a, b) => a + b, 0) / moyennes.length : null
    })
    return r
  }, [eleves, matieres, notes, periode])

  const total = eleves.length
  const actifs = eleves.filter((e) => e.statut === 'actif').length

  return (
    <div className="min-h-screen bg-gray-50">
      <Header session={session} profil={profil} />
      <main className="max-w-5xl mx-auto p-4">
        <h2 className="text-xl font-bold text-matw-dark mb-4">Tableau de bord — Direction</h2>

        {erreur && <p className="text-red-600 mb-3">Erreur : {erreur}</p>}
        {chargement ? (
          <p className="text-gray-500">Chargement...</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3 mb-6">
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm text-gray-500">Effectif total</p>
                <p className="text-3xl font-bold text-matw-dark">{total}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm text-gray-500">Élèves actifs</p>
                <p className="text-3xl font-bold text-green-600">{actifs}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-sm text-gray-500">Élèves inactifs</p>
                <p className="text-3xl font-bold text-gray-500">{total - actifs}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-matw-dark">Résultats scolaires par classe</h3>
              <select
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
                value={periode}
                onChange={(e) => setPeriode(e.target.value)}
              >
                {PERIODES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-matw-light">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Classe</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700">Effectif</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700">Actifs</th>
                    <th className="px-3 py-2 text-center font-semibold text-matw-dark">Moyenne de classe</th>
                  </tr>
                </thead>
                <tbody>
                  {CLASSES.map((c) => (
                    <tr key={c} className="border-t border-gray-100">
                      <td className="px-3 py-2 font-medium text-gray-800">{c}</td>
                      <td className="px-3 py-2 text-center">{parClasse[c]?.total || 0}</td>
                      <td className="px-3 py-2 text-center">{parClasse[c]?.actifs || 0}</td>
                      <td className="px-3 py-2 text-center font-semibold text-matw-dark">
                        {moyenneClasse[c] !== null && moyenneClasse[c] !== undefined
                          ? moyenneClasse[c].toFixed(2).replace('.', ',')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Espace Direction — lecture seule. Pour toute modification, contactez l'administrateur.
            </p>
          </>
        )}
      </main>
    </div>
  )
}
