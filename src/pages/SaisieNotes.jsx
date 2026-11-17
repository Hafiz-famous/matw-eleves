import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'
import { CLASSES, PERIODES, ANNEE_SCOLAIRE } from '../constantes'
import Header from '../components/Header'
import {
  calculerMoyenne,
  calculerRangs,
  moyenneAnnuelle,
  appreciation,
  formaterNote,
  formaterRang,
} from '../utils/calculs'
import { pdfBulletin, pdfBulletinsClasse } from '../utils/bulletin'

const champ =
  'rounded-lg border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-matw'

function normaliser(v) {
  const t = (v ?? '').toString().replace(',', '.').trim()
  if (t === '') return ''
  const n = Number(t)
  return Number.isNaN(n) ? t : String(n)
}

function valide(v) {
  if (v === '') return true
  const n = Number(v)
  return !Number.isNaN(n) && n >= 0 && n <= 20
}

async function chargerNotesEleves(idsEleves, annee) {
  const lignes = []
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await supabase
      .from('notes')
      .select('id, eleve_id, matiere_id, periode, note')
      .eq('annee_scolaire', annee)
      .in('eleve_id', idsEleves)
      .order('id')
      .range(debut, debut + 999)
    if (error) throw error
    lignes.push(...data)
    if (data.length < 1000) break
  }
  return lignes
}

function construire(rows, periode) {
  const vals = {}
  const ids = {}
  rows
    .filter((r) => r.periode === periode)
    .forEach((r) => {
      if (!vals[r.eleve_id]) vals[r.eleve_id] = {}
      if (!ids[r.eleve_id]) ids[r.eleve_id] = {}
      vals[r.eleve_id][r.matiere_id] = normaliser(r.note)
      ids[r.eleve_id][r.matiere_id] = r.id
    })
  return { vals, ids }
}

export default function SaisieNotes({ session }) {
  const [matieres, setMatieres] = useState([])
  const [classe, setClasse] = useState('')
  const [periode, setPeriode] = useState(PERIODES[0])
  const [annee, setAnnee] = useState(ANNEE_SCOLAIRE)
  const [eleves, setEleves] = useState([])
  const [rows, setRows] = useState([])
  const [valeurs, setValeurs] = useState({})
  const [initial, setInitial] = useState({})
  const [ids, setIds] = useState({})
  const [version, setVersion] = useState(0)
  const [chargement, setChargement] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [pdfEnCours, setPdfEnCours] = useState(false)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase
      .from('matieres')
      .select('*')
      .order('ordre')
      .then(({ data, error }) => {
        if (error) setErreur(error.message)
        else setMatieres(data)
      })
  }, [])

  const matieresClasse = useMemo(
    () => matieres.filter((m) => m.classe === classe).sort((a, b) => a.ordre - b.ordre),
    [matieres, classe]
  )
  const nbCompte = matieresClasse.filter((m) => m.compte_moyenne).length

  useEffect(() => {
    if (!classe) {
      setEleves([])
      setRows([])
      return
    }
    let actif = true
    setChargement(true)
    ;(async () => {
      try {
        const { data: liste, error } = await supabase
          .from('eleves')
          .select('id, nom, prenom, matricule, date_naissance')
          .eq('classe', classe)
          .eq('statut', 'actif')
          .order('nom')
        if (error) throw error
        const lignes = liste.length ? await chargerNotesEleves(liste.map((e) => e.id), annee) : []
        if (!actif) return
        setErreur('')
        setEleves(liste)
        setRows(lignes)
      } catch (err) {
        if (actif) setErreur(err.message || 'Erreur de chargement.')
      }
      if (actif) setChargement(false)
    })()
    return () => {
      actif = false
    }
  }, [classe, annee, version])

  useEffect(() => {
    const { vals, ids: idsNotes } = construire(rows, periode)
    setValeurs(vals)
    setInitial(vals)
    setIds(idsNotes)
  }, [rows, periode])

  // Calculs en direct (avant enregistrement)
  const notesNum = useMemo(() => {
    const r = {}
    eleves.forEach((e) => {
      r[e.id] = {}
      matieresClasse.forEach((m) => {
        const v = normaliser(valeurs[e.id] ? valeurs[e.id][m.id] : '')
        if (v !== '' && valide(v)) r[e.id][m.id] = Number(v)
      })
    })
    return r
  }, [eleves, matieresClasse, valeurs])

  const moyennes = useMemo(() => {
    const r = {}
    eleves.forEach((e) => {
      r[e.id] = calculerMoyenne(notesNum[e.id], matieresClasse)
    })
    return r
  }, [eleves, matieresClasse, notesNum])

  const { rangs, effectif } = useMemo(() => calculerRangs(moyennes), [moyennes])

  const modifies = useMemo(() => {
    let n = 0
    eleves.forEach((e) =>
      matieresClasse.forEach((m) => {
        const v = normaliser(valeurs[e.id] ? valeurs[e.id][m.id] : '')
        const v0 = initial[e.id] && initial[e.id][m.id] !== undefined ? initial[e.id][m.id] : ''
        if (v !== v0) n++
      })
    )
    return n
  }, [eleves, matieresClasse, valeurs, initial])

  // Données enregistrées (pour les bulletins)
  const stats = useMemo(() => {
    const res = {}
    PERIODES.forEach((p) => {
      const notes = {}
      rows
        .filter((r) => r.periode === p)
        .forEach((r) => {
          if (!notes[r.eleve_id]) notes[r.eleve_id] = {}
          notes[r.eleve_id][r.matiere_id] = Number(r.note)
        })
      const moy = {}
      eleves.forEach((e) => {
        moy[e.id] = calculerMoyenne(notes[e.id], matieresClasse)
      })
      res[p] = { notes, moy }
    })
    return res
  }, [rows, eleves, matieresClasse])

  function donneesBulletin(e) {
    const sp = stats[periode]
    const cl = calculerRangs(sp.moy)
    const valides = Object.values(sp.moy).filter((m) => m !== null)
    const m = sp.moy[e.id]
    const parTrimestre = PERIODES.map((p) => stats[p].moy[e.id])
    return {
      eleve: e,
      classe,
      annee,
      periode,
      lignes: matieresClasse.map((mat) => ({
        matiere: mat.nom,
        coef: Number(mat.coefficient),
        compte: mat.compte_moyenne,
        note: sp.notes[e.id] && sp.notes[e.id][mat.id] !== undefined ? sp.notes[e.id][mat.id] : null,
      })),
      moyenne: m,
      rang: cl.rangs[e.id] || null,
      effectif: cl.effectif,
      appreciation: appreciation(m),
      moyenneClasse: valides.length ? valides.reduce((a, b) => a + b, 0) / valides.length : null,
      plusForte: valides.length ? Math.max(...valides) : null,
      plusFaible: valides.length ? Math.min(...valides) : null,
      moyennesTrimestres: parTrimestre,
      moyenneAnnuelle: moyenneAnnuelle(parTrimestre),
    }
  }

  async function telechargerBulletin(e) {
    setPdfEnCours(true)
    setErreur('')
    try {
      await pdfBulletin(donneesBulletin(e))
    } catch (err) {
      setErreur('Impossible de créer le PDF : ' + err.message)
    }
    setPdfEnCours(false)
  }

  async function telechargerTous() {
    setPdfEnCours(true)
    setErreur('')
    try {
      await pdfBulletinsClasse(eleves.map(donneesBulletin), classe + ' ' + periode)
    } catch (err) {
      setErreur('Impossible de créer le PDF : ' + err.message)
    }
    setPdfEnCours(false)
  }

  async function enregistrer() {
    setErreur('')
    setMessage('')
    const lignes = []
    const aSupprimer = []
    for (const e of eleves) {
      for (const m of matieresClasse) {
        const v = normaliser(valeurs[e.id] ? valeurs[e.id][m.id] : '')
        const v0 = initial[e.id] && initial[e.id][m.id] !== undefined ? initial[e.id][m.id] : ''
        if (v === v0) continue
        if (v === '') {
          const id = ids[e.id] ? ids[e.id][m.id] : null
          if (id) aSupprimer.push(id)
          continue
        }
        if (!valide(v)) {
          setErreur(
            `Note invalide pour ${e.prenom} ${e.nom} en ${m.nom} : entrez un nombre entre 0 et 20.`
          )
          return
        }
        lignes.push({
          eleve_id: e.id,
          matiere_id: m.id,
          periode,
          annee_scolaire: annee,
          note: Number(v),
        })
      }
    }
    if (lignes.length === 0 && aSupprimer.length === 0) {
      setMessage('Aucune modification à enregistrer.')
      return
    }
    setEnvoi(true)
    try {
      if (lignes.length > 0) {
        const { error } = await supabase
          .from('notes')
          .upsert(lignes, { onConflict: 'eleve_id,matiere_id,periode,annee_scolaire' })
        if (error) throw error
      }
      if (aSupprimer.length > 0) {
        const { error } = await supabase.from('notes').delete().in('id', aSupprimer)
        if (error) throw error
      }
      setVersion((n) => n + 1)
      setMessage('Notes enregistrées ✅')
    } catch (err) {
      setErreur(err.message || 'Une erreur est survenue.')
    }
    setEnvoi(false)
  }

  function changerNote(eleveId, matiereId, valeur) {
    setValeurs((prev) => ({
      ...prev,
      [eleveId]: { ...(prev[eleveId] || {}), [matiereId]: valeur },
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header session={session} />

      <main className="max-w-6xl mx-auto p-4">
        <h2 className="text-xl font-bold text-matw-dark mb-3">Notes et bulletins</h2>

        <div className="grid gap-2 sm:grid-cols-3 mb-4">
          <select
            className={champ}
            value={classe}
            onChange={(e) => {
              setClasse(e.target.value)
              setMessage('')
            }}
          >
            <option value="">Choisir la classe...</option>
            {CLASSES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className={champ}
            value={periode}
            onChange={(e) => {
              setPeriode(e.target.value)
              setMessage('')
            }}
          >
            {PERIODES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <input
            className={champ}
            value={annee}
            onChange={(e) => setAnnee(e.target.value)}
            aria-label="Année scolaire"
          />
        </div>

        {erreur && (
          <p className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-3">
            {erreur}
          </p>
        )}
        {chargement && <p className="text-gray-500">Chargement...</p>}

        {classe && !chargement && matieresClasse.length === 0 && (
          <p className="text-gray-500 py-8 text-center">
            Aucune matière n'est définie pour cette classe (voir la table matieres dans Supabase).
          </p>
        )}

        {classe && !chargement && matieresClasse.length > 0 && eleves.length === 0 && (
          <p className="text-gray-500 py-8 text-center">Aucun élève actif dans cette classe.</p>
        )}

        {classe && !chargement && matieresClasse.length > 0 && eleves.length > 0 && (
          <>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-matw-light">
                  <tr>
                    <th className="sticky left-0 z-10 bg-matw-light px-3 py-2 text-left font-semibold text-gray-700 min-w-[150px]">
                      Élève
                    </th>
                    {matieresClasse.map((m) => (
                      <th key={m.id} className="px-2 py-2 text-center font-semibold text-gray-700 min-w-[88px]">
                        <div className="leading-tight">{m.nom}</div>
                        <div className="text-xs font-normal text-gray-500">
                          coef. {Number(m.coefficient)}
                          {m.compte_moyenne ? '' : ' · hors moy.'}
                        </div>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center font-semibold text-matw-dark min-w-[90px]">Moyenne</th>
                    <th className="px-3 py-2 text-center font-semibold text-matw-dark min-w-[80px]">Rang</th>
                    <th className="px-3 py-2 text-center font-semibold text-gray-700 min-w-[110px]">Bulletin</th>
                  </tr>
                </thead>
                <tbody>
                  {eleves.map((e) => {
                    const nbNotes = matieresClasse.filter(
                      (m) => m.compte_moyenne && notesNum[e.id] && notesNum[e.id][m.id] !== undefined
                    ).length
                    const incomplet = nbNotes > 0 && nbNotes < nbCompte
                    return (
                      <tr key={e.id} className="border-t border-gray-100">
                        <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-gray-800 whitespace-nowrap">
                          {e.nom} {e.prenom}
                        </td>
                        {matieresClasse.map((m) => {
                          const v = valeurs[e.id] && valeurs[e.id][m.id] !== undefined ? valeurs[e.id][m.id] : ''
                          const ok = valide(normaliser(v))
                          return (
                            <td key={m.id} className="px-1 py-1.5 text-center">
                              <input
                                inputMode="decimal"
                                placeholder="—"
                                value={v}
                                onChange={(ev) => changerNote(e.id, m.id, ev.target.value)}
                                className={`w-16 text-center rounded-lg border px-1 py-1.5 focus:outline-none focus:ring-2 focus:ring-matw ${
                                  ok ? 'border-gray-300' : 'border-red-400 bg-red-50'
                                }`}
                              />
                            </td>
                          )
                        })}
                        <td className="px-3 py-2 text-center font-semibold text-matw-dark whitespace-nowrap">
                          {formaterNote(moyennes[e.id])}
                          {incomplet && (
                            <span title="Notes manquantes" className="ml-1 text-amber-500">⚠</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-700 whitespace-nowrap">
                          {formaterRang(rangs[e.id], effectif)}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => telechargerBulletin(e)}
                            disabled={modifies > 0 || pdfEnCours || moyennes[e.id] === null}
                            title={modifies > 0 ? "Enregistrez d'abord les notes" : ''}
                            className="border border-matw text-matw-dark hover:bg-matw-light rounded-lg px-3 py-1 text-xs font-semibold disabled:opacity-40"
                          >
                            PDF
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              ⚠ = notes manquantes : la moyenne et le rang ne sont fiables que lorsque toutes les notes
              sont saisies. Les matières « hors moy. » apparaissent sur le bulletin mais ne comptent pas
              dans la moyenne.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
              <p className="text-sm text-gray-600">
                {eleves.length} élève{eleves.length > 1 ? 's' : ''}
                {modifies > 0 ? ` · ${modifies} modification${modifies > 1 ? 's' : ''} non enregistrée${modifies > 1 ? 's' : ''}` : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={telechargerTous}
                  disabled={modifies > 0 || pdfEnCours}
                  title={modifies > 0 ? "Enregistrez d'abord les notes" : ''}
                  className="bg-white border border-matw text-matw-dark hover:bg-matw-light font-semibold rounded-lg px-4 py-2 text-sm disabled:opacity-40"
                >
                  {pdfEnCours ? 'Création du PDF...' : 'Tous les bulletins (PDF)'}
                </button>
                <button
                  onClick={enregistrer}
                  disabled={envoi || modifies === 0}
                  className="bg-matw hover:bg-matw-dark text-white font-semibold rounded-lg px-5 py-2 text-sm disabled:opacity-50"
                >
                  {envoi ? 'Enregistrement...' : modifies > 0 ? `Enregistrer (${modifies})` : 'Enregistrer'}
                </button>
              </div>
            </div>
            {message && <p className="text-green-700 mt-3">{message}</p>}
          </>
        )}
      </main>
    </div>
  )
}
