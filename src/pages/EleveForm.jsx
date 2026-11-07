import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { CLASSES } from '../constantes'
import { redimensionner } from '../utils/image'
import Header from '../components/Header'
import PhotoInput from '../components/PhotoInput'

const VIDE = {
  matricule: '',
  nom: '',
  prenom: '',
  date_naissance: '',
  sexe: '',
  telephone: '',
  adresse: '',
  classe: '',
  annee_scolaire: '2026-2027',
  statut: 'actif',
  allergies: '',
  infos_medicales: '',
}
const TUTEUR_VIDE = { nom: '', lien_parente: '', telephone: '', profession: '' }
const CONTACT_VIDE = { nom: '', lien_parente: '', telephone: '' }

const champ =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-matw'

function propre(v) {
  const t = (v ?? '').toString().trim()
  return t === '' ? null : t
}

function Bloc({ titre, children }) {
  return (
    <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <h3 className="font-bold text-matw-dark mb-3">{titre}</h3>
      {children}
    </section>
  )
}

function Champ({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  )
}

async function envoyerPhoto(fichier, dossier) {
  const blob = await redimensionner(fichier)
  const chemin = `${dossier}/${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage
    .from('photos')
    .upload(chemin, blob, { contentType: 'image/jpeg' })
  if (error) throw error
  return chemin
}

export default function EleveForm({ session }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [form, setForm] = useState(VIDE)
  const [tuteur, setTuteur] = useState(TUTEUR_VIDE)
  const [contacts, setContacts] = useState([{ ...CONTACT_VIDE }])
  const [photoUrl, setPhotoUrl] = useState(null)
  const [photoFamilleUrl, setPhotoFamilleUrl] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [familleFile, setFamilleFile] = useState(null)
  const [chargement, setChargement] = useState(!!id)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    if (!id) return
    supabase
      .from('eleves')
      .select('*, tuteurs(*), contacts_urgence(*)')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          setErreur('Élève introuvable.')
          setChargement(false)
          return
        }
        const f = {}
        Object.keys(VIDE).forEach((c) => (f[c] = data[c] ?? ''))
        setForm(f)
        setPhotoUrl(data.photo_url)
        setPhotoFamilleUrl(data.photo_famille_url)
        const t = data.tuteurs[0]
        if (t) {
          setTuteur({
            nom: t.nom || '',
            lien_parente: t.lien_parente || '',
            telephone: t.telephone || '',
            profession: t.profession || '',
          })
        }
        if (data.contacts_urgence.length > 0) {
          setContacts(
            data.contacts_urgence.map((c) => ({
              nom: c.nom || '',
              lien_parente: c.lien_parente || '',
              telephone: c.telephone || '',
            }))
          )
        }
        setChargement(false)
      })
  }, [id])

  const maj = (nom) => (e) => setForm({ ...form, [nom]: e.target.value })
  const majTuteur = (nom) => (e) => setTuteur({ ...tuteur, [nom]: e.target.value })
  const majContact = (i, nom, valeur) =>
    setContacts(contacts.map((c, j) => (j === i ? { ...c, [nom]: valeur } : c)))

  async function enregistrer(e) {
    e.preventDefault()
    setErreur('')

    // Vérifications avant d'écrire quoi que ce soit
    const contactsRemplis = contacts.filter((c) => c.nom.trim() || c.telephone.trim())
    if (contactsRemplis.length === 0) {
      setErreur("Ajoutez au moins un contact d'urgence.")
      return
    }
    if (contactsRemplis.some((c) => !c.nom.trim() || !c.telephone.trim())) {
      setErreur("Chaque contact d'urgence doit avoir un nom et un téléphone.")
      return
    }
    if (tuteur.telephone.trim() && !tuteur.nom.trim()) {
      setErreur('Indiquez le nom du tuteur.')
      return
    }

    setEnvoi(true)
    try {
      let photo_url = photoUrl
      let photo_famille_url = photoFamilleUrl
      if (photoFile) photo_url = await envoyerPhoto(photoFile, 'eleves')
      if (familleFile) photo_famille_url = await envoyerPhoto(familleFile, 'familles')

      const donnees = {
        matricule: propre(form.matricule),
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        date_naissance: propre(form.date_naissance),
        sexe: propre(form.sexe),
        telephone: propre(form.telephone),
        adresse: propre(form.adresse),
        classe: form.classe,
        annee_scolaire: propre(form.annee_scolaire) || '2026-2027',
        statut: form.statut,
        allergies: propre(form.allergies),
        infos_medicales: propre(form.infos_medicales),
        photo_url,
        photo_famille_url,
      }

      let eleveId = id
      if (id) {
        const { error } = await supabase.from('eleves').update(donnees).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('eleves')
          .insert(donnees)
          .select('id')
          .single()
        if (error) throw error
        eleveId = data.id
      }

      // Tuteur : on remplace l'ancien par le nouveau
      let r = await supabase.from('tuteurs').delete().eq('eleve_id', eleveId)
      if (r.error) throw r.error
      if (tuteur.nom.trim()) {
        r = await supabase.from('tuteurs').insert({
          eleve_id: eleveId,
          nom: tuteur.nom.trim(),
          lien_parente: propre(tuteur.lien_parente),
          telephone: propre(tuteur.telephone),
          profession: propre(tuteur.profession),
        })
        if (r.error) throw r.error
      }

      // Contacts d'urgence : même principe
      r = await supabase.from('contacts_urgence').delete().eq('eleve_id', eleveId)
      if (r.error) throw r.error
      r = await supabase.from('contacts_urgence').insert(
        contactsRemplis.map((c) => ({
          eleve_id: eleveId,
          nom: c.nom.trim(),
          lien_parente: propre(c.lien_parente),
          telephone: c.telephone.trim(),
        }))
      )
      if (r.error) throw r.error

      navigate(`/eleves/${eleveId}`)
    } catch (err) {
      setErreur(
        err.code === '23505'
          ? 'Ce matricule existe déjà. Choisissez-en un autre.'
          : err.message || "Une erreur est survenue."
      )
      setEnvoi(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header session={session} />

      <main className="max-w-3xl mx-auto p-4">
        <Link
          to={id ? `/eleves/${id}` : '/'}
          className="inline-block text-matw-dark hover:underline mb-3"
        >
          ← Annuler
        </Link>
        <h2 className="text-xl font-bold text-matw-dark mb-4">
          {id ? "Modifier l'élève" : 'Nouvel élève'}
        </h2>

        {chargement ? (
          <p className="text-gray-500">Chargement...</p>
        ) : (
          <form onSubmit={enregistrer} className="flex flex-col gap-4">
            <Bloc titre="Photos">
              <div className="grid gap-4 sm:grid-cols-2">
                <PhotoInput
                  label="Photo de l'élève"
                  urlActuelle={photoUrl}
                  fichier={photoFile}
                  onChange={setPhotoFile}
                  rond
                />
                <PhotoInput
                  label="Photo de famille"
                  urlActuelle={photoFamilleUrl}
                  fichier={familleFile}
                  onChange={setFamilleFile}
                />
              </div>
            </Bloc>

            <Bloc titre="Identité">
              <div className="grid gap-3 sm:grid-cols-2">
                <Champ label="Prénom *">
                  <input required className={champ} value={form.prenom} onChange={maj('prenom')} />
                </Champ>
                <Champ label="Nom *">
                  <input required className={champ} value={form.nom} onChange={maj('nom')} />
                </Champ>
                <Champ label="Date de naissance">
                  <input
                    type="date"
                    className={champ}
                    value={form.date_naissance}
                    onChange={maj('date_naissance')}
                  />
                </Champ>
                <Champ label="Sexe">
                  <select className={champ} value={form.sexe} onChange={maj('sexe')}>
                    <option value="">—</option>
                    <option value="M">Garçon</option>
                    <option value="F">Fille</option>
                  </select>
                </Champ>
                <Champ label="Classe *">
                  <select required className={champ} value={form.classe} onChange={maj('classe')}>
                    <option value="">Choisir...</option>
                    {CLASSES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Champ>
                <Champ label="Matricule">
                  <input
                    className={champ}
                    placeholder="ex. MATW-001"
                    value={form.matricule}
                    onChange={maj('matricule')}
                  />
                </Champ>
                <Champ label="Année scolaire">
                  <input
                    className={champ}
                    value={form.annee_scolaire}
                    onChange={maj('annee_scolaire')}
                  />
                </Champ>
                <Champ label="Statut">
                  <select className={champ} value={form.statut} onChange={maj('statut')}>
                    <option value="actif">Actif</option>
                    <option value="inactif">Inactif</option>
                  </select>
                </Champ>
              </div>
            </Bloc>

            <Bloc titre="Coordonnées de l'élève">
              <div className="grid gap-3 sm:grid-cols-2">
                <Champ label="Téléphone">
                  <input
                    type="tel"
                    className={champ}
                    value={form.telephone}
                    onChange={maj('telephone')}
                  />
                </Champ>
                <Champ label="Adresse">
                  <input className={champ} value={form.adresse} onChange={maj('adresse')} />
                </Champ>
              </div>
            </Bloc>

            <Bloc titre="Santé">
              <div className="grid gap-3">
                <Champ label="Allergies">
                  <textarea
                    rows={2}
                    className={champ}
                    value={form.allergies}
                    onChange={maj('allergies')}
                  />
                </Champ>
                <Champ label="Informations médicales importantes">
                  <textarea
                    rows={2}
                    className={champ}
                    value={form.infos_medicales}
                    onChange={maj('infos_medicales')}
                  />
                </Champ>
              </div>
            </Bloc>

            <Bloc titre="Tuteur">
              <div className="grid gap-3 sm:grid-cols-2">
                <Champ label="Nom du tuteur">
                  <input className={champ} value={tuteur.nom} onChange={majTuteur('nom')} />
                </Champ>
                <Champ label="Lien de parenté">
                  <input
                    className={champ}
                    placeholder="Père, mère, oncle..."
                    value={tuteur.lien_parente}
                    onChange={majTuteur('lien_parente')}
                  />
                </Champ>
                <Champ label="Téléphone">
                  <input
                    type="tel"
                    className={champ}
                    value={tuteur.telephone}
                    onChange={majTuteur('telephone')}
                  />
                </Champ>
                <Champ label="Profession">
                  <input
                    className={champ}
                    value={tuteur.profession}
                    onChange={majTuteur('profession')}
                  />
                </Champ>
              </div>
            </Bloc>

            <Bloc titre="Contacts d'urgence *">
              <div className="flex flex-col gap-4">
                {contacts.map((c, i) => (
                  <div key={i} className="rounded-lg border border-gray-200 p-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Champ label="Nom">
                        <input
                          className={champ}
                          value={c.nom}
                          onChange={(e) => majContact(i, 'nom', e.target.value)}
                        />
                      </Champ>
                      <Champ label="Lien de parenté">
                        <input
                          className={champ}
                          value={c.lien_parente}
                          onChange={(e) => majContact(i, 'lien_parente', e.target.value)}
                        />
                      </Champ>
                      <Champ label="Téléphone">
                        <input
                          type="tel"
                          className={champ}
                          value={c.telephone}
                          onChange={(e) => majContact(i, 'telephone', e.target.value)}
                        />
                      </Champ>
                    </div>
                    {contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setContacts(contacts.filter((_, j) => j !== i))}
                        className="mt-2 text-sm text-red-600 hover:underline"
                      >
                        Retirer ce contact
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setContacts([...contacts, { ...CONTACT_VIDE }])}
                  className="self-start text-matw-dark font-medium hover:underline"
                >
                  + Ajouter un contact
                </button>
              </div>
            </Bloc>

            {erreur && (
              <p className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                {erreur}
              </p>
            )}

            <div className="flex gap-3 pb-8">
              <button
                type="submit"
                disabled={envoi}
                className="flex-1 bg-matw hover:bg-matw-dark text-white font-semibold rounded-lg py-3 transition disabled:opacity-60"
              >
                {envoi ? 'Enregistrement...' : 'Enregistrer'}
              </button>
              <Link
                to={id ? `/eleves/${id}` : '/'}
                className="px-5 py-3 rounded-lg border border-gray-300 bg-white text-gray-700 text-center"
              >
                Annuler
              </Link>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}

