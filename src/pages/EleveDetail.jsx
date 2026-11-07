import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import Header from '../components/Header'
import { useUrlPhoto } from '../utils/photos'

function calculerAge(dateNaissance) {
  if (!dateNaissance) return null
  const naissance = new Date(dateNaissance)
  const now = new Date()
  let age = now.getFullYear() - naissance.getFullYear()
  const m = now.getMonth() - naissance.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < naissance.getDate())) age--
  return age
}

function formaterDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function Section({ titre, children }) {
  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h3 className="font-bold text-matw-dark mb-3">{titre}</h3>
      {children}
    </section>
  )
}

function Ligne({ label, valeur }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="text-gray-800 text-sm text-right">{valeur || '—'}</span>
    </div>
  )
}

function Personne({ nom, detail, telephone }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-gray-50 last:border-0">
      <div className="min-w-0">
        <p className="font-medium text-gray-800 truncate">{nom}</p>
        <p className="text-sm text-gray-500">{detail}</p>
        {telephone && <p className="text-sm text-gray-600">{telephone}</p>}
      </div>
      {telephone && (
        <a
          href={`tel:${telephone}`}
          className="shrink-0 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg px-4 py-2"
        >
          Appeler
        </a>
      )}
    </div>
  )
}

export default function EleveDetail({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()

  async function supprimer() {
    const ok = window.confirm(
      `Supprimer définitivement ${eleve.prenom} ${eleve.nom} ? Cette action est irréversible.`
    )
    if (!ok) return
    const { error } = await supabase.from('eleves').delete().eq('id', id)
    if (error) {
      setErreur(error.message)
      return
    }
    navigate('/')
  }
  const [eleve, setEleve] = useState(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState('')
  const urlPhoto = useUrlPhoto(eleve?.photo_url)
  const urlFamille = useUrlPhoto(eleve?.photo_famille_url)

  useEffect(() => {
    setChargement(true)
    supabase
      .from('eleves')
      .select('*, tuteurs(*), contacts_urgence(*)')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) setErreur('Élève introuvable.')
        else setEleve(data)
        setChargement(false)
      })
  }, [id])

  const initiales = eleve
    ? ((eleve.prenom?.[0] || '') + (eleve.nom?.[0] || '')).toUpperCase()
    : ''
  const age = eleve ? calculerAge(eleve.date_naissance) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Header session={session} />

      <main className="max-w-5xl mx-auto p-4">
        <Link to="/" className="inline-block text-matw-dark hover:underline mb-3">
          ← Retour à la liste
        </Link>

        {chargement && <p className="text-gray-500">Chargement...</p>}

        {eleve && (
          <div className="flex gap-2 mb-3">
            <Link
              to={`/eleves/${id}/modifier`}
              className="bg-matw hover:bg-matw-dark text-white font-semibold rounded-lg px-4 py-2 text-sm"
            >
              Modifier
            </Link>
            <button
              onClick={supprimer}
              className="bg-white border border-red-300 text-red-600 hover:bg-red-50 font-semibold rounded-lg px-4 py-2 text-sm"
            >
              Supprimer
            </button>
          </div>
        )}
        {erreur && <p className="text-red-600">{erreur}</p>}

        {eleve && (
          <div className="flex flex-col gap-4">
            {/* Identité */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row items-center gap-5">
              {eleve.photo_url ? (
                <img
                  src={urlPhoto}
                  alt={eleve.prenom}
                  className="w-28 h-28 rounded-full object-cover"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-matw-light text-matw-dark text-3xl font-bold flex items-center justify-center">
                  {initiales}
                </div>
              )}
              <div className="text-center sm:text-left">
                <h2 className="text-2xl font-bold text-gray-800">
                  {eleve.prenom} {eleve.nom}
                </h2>
                <p className="text-gray-600">
                  {eleve.classe}
                  {age !== null ? ` · ${age} ans` : ''}
                </p>
                <div className="flex gap-2 mt-2 justify-center sm:justify-start">
                  {eleve.matricule && (
                    <span className="text-xs bg-matw-light text-matw-dark rounded-full px-2.5 py-1">
                      {eleve.matricule}
                    </span>
                  )}
                  <span
                    className={`text-xs rounded-full px-2.5 py-1 ${
                      eleve.statut === 'actif'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {eleve.statut === 'actif' ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
            </div>

            {/* Santé */}
            <div
              className={`rounded-xl border p-4 ${
                eleve.allergies || eleve.infos_medicales
                  ? 'bg-red-50 border-red-200'
                  : 'bg-white border-gray-100'
              }`}
            >
              <h3 className="font-bold text-red-700 mb-2">Santé</h3>
              <p className="text-sm text-gray-800">
                <span className="font-medium">Allergies : </span>
                {eleve.allergies || 'Aucune allergie signalée'}
              </p>
              <p className="text-sm text-gray-800 mt-1">
                <span className="font-medium">Infos médicales : </span>
                {eleve.infos_medicales || 'Aucune information'}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Infos personnelles */}
              <Section titre="Informations">
                <Ligne label="Date de naissance" valeur={formaterDate(eleve.date_naissance)} />
                <Ligne
                  label="Sexe"
                  valeur={eleve.sexe === 'M' ? 'Garçon' : eleve.sexe === 'F' ? 'Fille' : ''}
                />
                <Ligne label="Téléphone" valeur={eleve.telephone} />
                <Ligne label="Adresse" valeur={eleve.adresse} />
                <Ligne label="Année scolaire" valeur={eleve.annee_scolaire} />
              </Section>

              {/* Photo de famille */}
              <Section titre="Famille">
                {eleve.photo_famille_url ? (
                  <img
                    src={urlFamille}
                    alt="Famille"
                    className="w-full rounded-lg object-cover max-h-64"
                  />
                ) : (
                  <p className="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded-lg">
                    Aucune photo de famille
                  </p>
                )}
              </Section>

              {/* Tuteur */}
              <Section titre="Tuteur">
                {eleve.tuteurs.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucun tuteur enregistré.</p>
                ) : (
                  eleve.tuteurs.map((t) => (
                    <div key={t.id}>
                      <Personne
                        nom={t.nom}
                        detail={[t.lien_parente, t.profession].filter(Boolean).join(' · ')}
                        telephone={t.telephone}
                      />
                    </div>
                  ))
                )}
              </Section>

              {/* Contacts d'urgence */}
              <Section titre="Contacts d'urgence">
                {eleve.contacts_urgence.length === 0 ? (
                  <p className="text-sm text-gray-400">Aucun contact d'urgence.</p>
                ) : (
                  eleve.contacts_urgence.map((c) => (
                    <Personne
                      key={c.id}
                      nom={c.nom}
                      detail={c.lien_parente}
                      telephone={c.telephone}
                    />
                  ))
                )}
              </Section>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}





