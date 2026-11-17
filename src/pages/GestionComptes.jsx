import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { CLASSES } from '../constantes'
import Header from '../components/Header'

const ROLES = [
  { v: '', label: 'Aucun rôle (en attente)' },
  { v: 'admin', label: 'Administrateur' },
  { v: 'direction', label: 'Direction' },
  { v: 'enseignant', label: 'Enseignant / Formateur' },
]

export default function GestionComptes({ session, profil }) {
  const [comptes, setComptes] = useState([])
  const [classesParCompte, setClassesParCompte] = useState({})
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const [message, setMessage] = useState('')
  const [enCours, setEnCours] = useState('')

  async function charger() {
    setChargement(true)
    setErreur('')
    const { data, error } = await supabase
      .from('profils')
      .select('*, enseignant_classes(classe)')
      .order('created_at')
    if (error) {
      setErreur(error.message)
    } else {
      setComptes(data)
      const m = {}
      data.forEach((c) => {
        m[c.id] = (c.enseignant_classes || []).map((x) => x.classe)
      })
      setClassesParCompte(m)
    }
    setChargement(false)
  }

  useEffect(() => {
    charger()
  }, [])

  async function changerRole(id, role) {
    setEnCours(id)
    setMessage('')
    setErreur('')
    const { error } = await supabase.from('profils').update({ role: role || null }).eq('id', id)
    if (error) setErreur(error.message)
    else {
      setMessage('Rôle mis à jour.')
      charger()
    }
    setEnCours('')
  }

  async function changerActif(id, actif) {
    setEnCours(id)
    setMessage('')
    setErreur('')
    const { error } = await supabase.from('profils').update({ actif }).eq('id', id)
    if (error) setErreur(error.message)
    else {
      setMessage(actif ? 'Compte réactivé.' : 'Compte désactivé.')
      charger()
    }
    setEnCours('')
  }

  async function basculerClasse(id, classe) {
    const actuelles = classesParCompte[id] || []
    const aPresent = actuelles.includes(classe)
    setEnCours(id)
    setMessage('')
    setErreur('')
    const requete = aPresent
      ? supabase.from('enseignant_classes').delete().eq('enseignant_id', id).eq('classe', classe)
      : supabase.from('enseignant_classes').insert({ enseignant_id: id, classe })
    const { error } = await requete
    if (error) setErreur(error.message)
    else charger()
    setEnCours('')
  }

  async function reinitialiserMotDePasse(email) {
    setEnCours(email)
    setMessage('')
    setErreur('')
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) {
      setErreur(error.message)
    } else {
      setMessage(`Email de réinitialisation envoyé à ${email}.`)
      await supabase.rpc('journaliser', {
        p_action: 'reinitialisation_mdp',
        p_details: { email },
      })
    }
    setEnCours('')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header session={session} profil={profil} />
      <main className="max-w-5xl mx-auto p-4">
        <h2 className="text-xl font-bold text-matw-dark mb-2">Gestion des comptes</h2>
        <p className="text-sm text-gray-500 mb-4">
          Pour créer un nouveau compte : Supabase → Authentication → Users → « Add user » ou
          « Invite user ». Il apparaîtra ensuite automatiquement ici pour que vous lui attribuiez
          un rôle.
        </p>

        {erreur && (
          <p className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm mb-3">
            {erreur}
          </p>
        )}
        {message && <p className="text-green-700 mb-3">{message}</p>}
        {chargement && <p className="text-gray-500">Chargement...</p>}

        {!chargement && (
          <div className="flex flex-col gap-3">
            {comptes.map((c) => (
              <div key={c.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {c.prenom || c.nom ? `${c.prenom || ''} ${c.nom || ''}`.trim() : c.email || c.id}
                    </p>
                    <p className="text-sm text-gray-500">{c.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                      value={c.role || ''}
                      disabled={enCours === c.id || c.id === session.user.id}
                      onChange={(e) => changerRole(c.id, e.target.value)}
                    >
                      {ROLES.map((r) => (
                        <option key={r.v} value={r.v}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => changerActif(c.id, !c.actif)}
                      disabled={enCours === c.id || c.id === session.user.id}
                      className={`text-xs font-semibold rounded-lg px-3 py-1.5 border disabled:opacity-40 ${
                        c.actif
                          ? 'border-red-300 text-red-600 hover:bg-red-50'
                          : 'border-green-300 text-green-700 hover:bg-green-50'
                      }`}
                    >
                      {c.actif ? 'Désactiver' : 'Réactiver'}
                    </button>
                    <button
                      onClick={() => reinitialiserMotDePasse(c.email)}
                      disabled={enCours === c.email || !c.email}
                      className="text-xs font-semibold rounded-lg px-3 py-1.5 border border-matw text-matw-dark hover:bg-matw-light disabled:opacity-40"
                    >
                      Réinitialiser mot de passe
                    </button>
                  </div>
                </div>

                {c.role === 'enseignant' && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-700 mb-1.5">Classes attribuées</p>
                    <div className="flex flex-wrap gap-1.5">
                      {CLASSES.map((cl) => {
                        const actif2 = (classesParCompte[c.id] || []).includes(cl)
                        return (
                          <button
                            key={cl}
                            onClick={() => basculerClasse(c.id, cl)}
                            disabled={enCours === c.id}
                            className={`text-xs font-semibold rounded-full px-3 py-1 border disabled:opacity-40 ${
                              actif2
                                ? 'bg-matw text-white border-matw'
                                : 'border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {cl}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {!c.actif && <p className="text-xs text-red-600 mt-2">Compte désactivé — accès bloqué.</p>}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
