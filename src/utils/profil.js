import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

// profil : undefined = chargement, null = aucun profil/rôle attribué, sinon { role, nom, ... }
export function useProfil(session) {
  const [profil, setProfil] = useState(undefined)
  const [classesEnseignant, setClassesEnseignant] = useState([])

  useEffect(() => {
    if (!session) {
      setProfil(null)
      setClassesEnseignant([])
      return
    }
    let actif = true
    setProfil(undefined)
    ;(async () => {
      const { data, error } = await supabase
        .from('profils')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()
      if (!actif) return
      if (error || !data || !data.role) {
        setProfil(error ? null : data || null)
        setClassesEnseignant([])
        return
      }
      setProfil(data)
      if (data.role === 'enseignant') {
        const { data: classes } = await supabase
          .from('enseignant_classes')
          .select('classe')
          .eq('enseignant_id', session.user.id)
        if (actif) setClassesEnseignant((classes || []).map((c) => c.classe))
      } else {
        setClassesEnseignant([])
      }
    })()
    return () => {
      actif = false
    }
  }, [session])

  return { profil, classesEnseignant }
}
