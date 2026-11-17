import { formaterNote, formaterRang } from './calculs'

const BLEU = [26, 159, 214]
const BLEU_FONCE = [15, 127, 176]
const GRIS = [100, 100, 100]

async function outils() {
  const [pdfMod, tableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const jsPDF = pdfMod.jsPDF || pdfMod.default
  const autoTable = tableMod.default || tableMod.autoTable
  return { jsPDF, autoTable }
}

function blobVersJpeg(blob, max = 300) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio)
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve({ data: canvas.toDataURL('image/jpeg', 0.85), w: canvas.width, h: canvas.height })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

async function logo() {
  try {
    const rep = await fetch('/logo.jpg')
    if (!rep.ok) return null
    return blobVersJpeg(await rep.blob())
  } catch {
    return null
  }
}

function dateCourte(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR')
}

function nomFichier(texte) {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function placerImage(doc, img, x, y, boiteL, boiteH) {
  const ratio = Math.min(boiteL / img.w, boiteH / img.h)
  const w = img.w * ratio
  const h = img.h * ratio
  doc.addImage(img.data, 'JPEG', x + (boiteL - w) / 2, y + (boiteH - h) / 2, w, h)
}

function dessiner(doc, autoTable, logoImg, d) {
  const L = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()

  // Bandeau
  doc.setFillColor(...BLEU)
  doc.rect(0, 0, L, 26, 'F')
  if (logoImg) {
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(6.5, 3, 19, 18, 2, 2, 'F')
    placerImage(doc, logoImg, 7.5, 4, 17, 16)
  }
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Bulletin de notes', 30, 11)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('MATW-PROJECT · Année scolaire ' + d.annee + ' · ' + d.periode, 30, 18)
  doc.setTextColor(0, 0, 0)

  // Identité
  let y = 33
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.roundedRect(14, y, L - 28, 24, 2, 2)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(d.eleve.prenom + ' ' + d.eleve.nom, 18, y + 8)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...GRIS)
  doc.text('Classe : ' + d.classe, 18, y + 15)
  doc.text('Matricule : ' + (d.eleve.matricule || '—'), 18, y + 20.5)
  doc.text('Né(e) le : ' + dateCourte(d.eleve.date_naissance), L / 2 + 5, y + 15)
  doc.text('Élèves classés : ' + (d.effectif || '—'), L / 2 + 5, y + 20.5)
  doc.setTextColor(0, 0, 0)

  // Tableau des notes
  const comptes = d.lignes.filter((l) => l.compte && l.note !== null)
  const totalCoef = comptes.reduce((a, l) => a + l.coef, 0)
  const totalPoints = comptes.reduce((a, l) => a + l.note * l.coef, 0)

  autoTable(doc, {
    startY: y + 30,
    margin: { left: 14, right: 14 },
    head: [['Matière', 'Coef.', 'Note /20', 'Note × coef.']],
    body: d.lignes.map((l) => [
      l.matiere + (l.compte ? '' : ' (hors moyenne)'),
      String(l.coef).replace('.', ','),
      formaterNote(l.note),
      l.compte && l.note !== null ? formaterNote(l.note * l.coef) : '—',
    ]),
    foot: [[
      'Total (matières comptées)',
      comptes.length ? String(totalCoef).replace('.', ',') : '—',
      '',
      comptes.length ? formaterNote(totalPoints) : '—',
    ]],
    headStyles: { fillColor: BLEU, halign: 'center' },
    footStyles: { fillColor: [230, 245, 251], textColor: BLEU_FONCE, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 9, cellPadding: 1.5, halign: 'center' },
    columnStyles: { 0: { halign: 'left' } },
    didParseCell: (h) => {
      if (h.section === 'body' && d.lignes[h.row.index] && !d.lignes[h.row.index].compte) {
        h.cell.styles.textColor = [130, 130, 130]
      }
      if (h.section === 'foot' && h.column.index === 0) h.cell.styles.halign = 'left'
    },
  })
  y = doc.lastAutoTable.finalY + 7

  // Résultats
  const boites = [
    ['Moyenne du trimestre', d.moyenne !== null ? formaterNote(d.moyenne) + ' / 20' : '—'],
    ['Rang', formaterRang(d.rang, d.effectif)],
    ['Appréciation', d.appreciation || '—'],
    ['Moyenne de la classe', formaterNote(d.moyenneClasse)],
  ]
  const w = (L - 28 - 3 * 4) / 4
  boites.forEach(([lib, val], i) => {
    const x = 14 + i * (w + 4)
    doc.setFillColor(230, 245, 251)
    doc.roundedRect(x, y, w, 17, 2, 2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...GRIS)
    doc.text(lib, x + w / 2, y + 5.5, { align: 'center' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.setTextColor(...BLEU_FONCE)
    doc.text(val, x + w / 2, y + 13, { align: 'center' })
  })
  y += 22
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...GRIS)
  doc.text(
    'Plus forte moyenne : ' + formaterNote(d.plusForte) + '   ·   Plus faible moyenne : ' + formaterNote(d.plusFaible),
    14,
    y
  )
  doc.setTextColor(0, 0, 0)

  // Récapitulatif annuel
  autoTable(doc, {
    startY: y + 4,
    margin: { left: 14, right: 14 },
    head: [['Trimestre 1', 'Trimestre 2', 'Trimestre 3', 'Moyenne annuelle']],
    body: [[
      formaterNote(d.moyennesTrimestres[0]),
      formaterNote(d.moyennesTrimestres[1]),
      formaterNote(d.moyennesTrimestres[2]),
      formaterNote(d.moyenneAnnuelle),
    ]],
    headStyles: { fillColor: BLEU_FONCE, halign: 'center' },
    styles: { fontSize: 9, cellPadding: 1.5, halign: 'center' },
  })
  y = doc.lastAutoTable.finalY + 4
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7.5)
  doc.setTextColor(...GRIS)
  doc.text('La moyenne annuelle est la moyenne des trimestres disponibles.', 14, y)
  doc.setTextColor(0, 0, 0)

  // Observations et signatures
  y += 6
  doc.setDrawColor(200, 200, 200)
  doc.roundedRect(14, y, L - 28, 22, 2, 2)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  doc.text('Observations du conseil de classe', 17, y + 5)
  y += 27
  const ws = (L - 28 - 6) / 2
  ;['Le Directeur', 'Le Parent / Tuteur'].forEach((titre, i) => {
    const x = 14 + i * (ws + 6)
    doc.roundedRect(x, y, ws, 22, 2, 2)
    doc.text(titre, x + 3, y + 5)
  })

  // Pied de page
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...GRIS)
  doc.text(
    'Document confidentiel — MATW-PROJECT — édité le ' + new Date().toLocaleDateString('fr-FR'),
    14,
    H - 8
  )
  doc.setTextColor(0, 0, 0)
}

export async function pdfBulletin(d) {
  const { jsPDF, autoTable } = await outils()
  const logoImg = await logo()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  dessiner(doc, autoTable, logoImg, d)
  doc.save('bulletin-' + nomFichier(d.eleve.nom + ' ' + d.eleve.prenom) + '-' + nomFichier(d.periode) + '.pdf')
}

export async function pdfBulletinsClasse(liste, titre) {
  const { jsPDF, autoTable } = await outils()
  const logoImg = await logo()
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  liste.forEach((d, i) => {
    if (i > 0) doc.addPage()
    dessiner(doc, autoTable, logoImg, d)
  })
  doc.save('bulletins-' + nomFichier(titre) + '.pdf')
}
