import { useEffect, useState } from 'react'
import { useUrlPhoto } from '../utils/photos'

export default function PhotoInput({ label, urlActuelle, fichier, onChange, rond }) {
  const [apercu, setApercu] = useState(null)

  useEffect(() => {
    if (!fichier) {
      setApercu(null)
      return
    }
    const url = URL.createObjectURL(fichier)
    setApercu(url)
    return () => URL.revokeObjectURL(url)
  }, [fichier])

  const actuelle = useUrlPhoto(urlActuelle)
  const src = apercu || actuelle

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      {src ? (
        <img
          src={src}
          alt={label}
          className={`object-cover ${rond ? 'w-28 h-28 rounded-full' : 'w-full max-w-xs h-28 rounded-lg'}`}
        />
      ) : (
        <div
          className={`bg-matw-light text-matw-dark text-xs flex items-center justify-center ${
            rond ? 'w-28 h-28 rounded-full' : 'w-full max-w-xs h-28 rounded-lg'
          }`}
        >
          Aucune photo
        </div>
      )}
      <label className="cursor-pointer bg-white border border-gray-300 hover:bg-gray-50 rounded-lg px-3 py-1.5 text-sm">
        {src ? 'Changer la photo' : 'Choisir une photo'}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] || null)}
        />
      </label>
    </div>
  )
}


