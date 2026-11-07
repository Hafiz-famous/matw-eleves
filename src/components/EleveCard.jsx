import { Link } from 'react-router-dom'
import { useUrlPhoto } from '../utils/photos'

export default function EleveCard({ eleve }) {
  const urlPhoto = useUrlPhoto(eleve.photo_url)
  const initiales = (
    (eleve.prenom?.[0] || '') + (eleve.nom?.[0] || '')
  ).toUpperCase()

  return (
    <Link
      to={`/eleves/${eleve.id}`}
      className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md p-3 transition"
    >
      {urlPhoto ? (
        <img
          src={urlPhoto}
          alt={eleve.prenom}
          className="w-14 h-14 rounded-full object-cover"
        />
      ) : (
        <div className="w-14 h-14 rounded-full bg-matw-light text-matw-dark font-bold flex items-center justify-center">
          {initiales}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-800 truncate">
          {eleve.prenom} {eleve.nom}
        </p>
        <p className="text-sm text-gray-500">
          {eleve.classe}
          {eleve.matricule ? ` · ${eleve.matricule}` : ''}
        </p>
      </div>

      {eleve.statut === 'inactif' && (
        <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5">
          Inactif
        </span>
      )}
    </Link>
  )
}
