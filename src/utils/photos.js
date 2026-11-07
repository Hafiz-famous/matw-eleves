import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const cache = new Map()

export function useUrlPhoto(chemin) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    let actif = true
    if (!chemin) {
      setUrl(null)
      return
    }
    const c = cache.get(chemin)
    if (c && c.expire > Date.now()) {
      setUrl(c.url)
      return
    }
    supabase.storage
      .from('photos')
      .createSignedUrl(chemin, 3600)
      .then(({ data }) => {
        if (!actif || !data) return
        cache.set(chemin, { url: data.signedUrl, expire: Date.now() + 50 * 60 * 1000 })
        setUrl(data.signedUrl)
      })
    return () => {
      actif = false
    }
  }, [chemin])

  return url
}
