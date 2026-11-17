export const APPRECIATIONS = [
  { min: 16, texte: 'Très bien' },
  { min: 14, texte: 'Bien' },
  { min: 12, texte: 'Assez bien' },
  { min: 10, texte: 'Passable' },
  { min: 0, texte: 'Insuffisant' },
]

export function appreciation(moyenne) {
  if (moyenne === null || moyenne === undefined) return ''
  const a = APPRECIATIONS.find((x) => moyenne >= x.min)
  return a ? a.texte : ''
}

// notes : { matiereId: nombre } ; matieres : matières de la classe
export function calculerMoyenne(notes, matieres) {
  let somme = 0
  let coefs = 0
  for (const m of matieres) {
    if (!m.compte_moyenne) continue
    const n = notes ? notes[m.id] : undefined
    if (n === undefined || n === null || Number.isNaN(n)) continue
    somme += n * Number(m.coefficient)
    coefs += Number(m.coefficient)
  }
  return coefs > 0 ? somme / coefs : null
}

// moyennes : { eleveId: moyenne ou null } -> rangs (ex aequo = même rang)
export function calculerRangs(moyennes) {
  const valides = Object.entries(moyennes).filter(([, m]) => m !== null && m !== undefined)
  const cle = (m) => Math.round(m * 100)
  const rangs = {}
  for (const [id, m] of valides) {
    rangs[id] = 1 + valides.filter(([, autre]) => cle(autre) > cle(m)).length
  }
  return { rangs, effectif: valides.length }
}

export function moyenneAnnuelle(moyennesTrimestres) {
  const v = moyennesTrimestres.filter((m) => m !== null && m !== undefined)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

export function formaterRang(rang, effectif) {
  if (!rang) return '—'
  return (rang === 1 ? '1er' : rang + 'e') + ' / ' + effectif
}

export function formaterNote(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return n.toFixed(2).replace('.', ',')
}
