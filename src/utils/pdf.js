import { supabase } from '../supabase'
import { Capacitor } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

const BLEU = [26, 159, 214]
const BLEU_FONCE = [15, 127, 176]
const GRIS = [100, 100, 100]

// Empêche un appel réseau ou une image de bloquer le PDF pour toujours :
// au-delà du délai, on abandonne cette étape (sans faire échouer tout le PDF).
function avecDelai(promesse, ms, valeurParDefaut = null) {
  return new Promise((resolve) => {
    const minuteur = setTimeout(() => resolve(valeurParDefaut), ms)
    promesse.then(
      (v) => {
        clearTimeout(minuteur)
        resolve(v)
      },
      () => {
        clearTimeout(minuteur)
        resolve(valeurParDefaut)
      }
    )
  })
}

async function outils() {
  const [pdfMod, tableMod] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const jsPDF = pdfMod.jsPDF || pdfMod.default
  const autoTable = tableMod.default || tableMod.autoTable
  return { jsPDF, autoTable }
}

function blobVersJpeg(blob, max = 600) {
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
      resolve({ data: canvas.toDataURL('image/jpeg', 0.8), w: canvas.width, h: canvas.height })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

async function photoStockee(chemin) {
  if (!chemin) return null
  const { data, error } = await avecDelai(
    supabase.storage.from('photos').download(chemin),
    8000,
    { data: null, error: true }
  )
  if (error || !data) return null
  return avecDelai(blobVersJpeg(data), 5000, null)
}

async function logo() {
  try {
    const rep = await avecDelai(fetch('/logo.jpg'), 5000, null)
    if (!rep || !rep.ok) return null
    return avecDelai(blobVersJpeg(await rep.blob(), 300), 5000, null)
  } catch {
    return null
  }
}

function dateLongue(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00')
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    .replace(/\s/g, ' ')
}

function dateCourte(d) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('fr-FR')
}

function calculerAge(d) {
  if (!d) return null
  const n = new Date(d + 'T12:00:00')
  const now = new Date()
  let age = now.getFullYear() - n.getFullYear()
  const m = now.getMonth() - n.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < n.getDate())) age--
  return age
}

function nomFichier(texte) {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
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

function entete(doc, logoImg, titre, sousTitre) {
  const L = doc.internal.pageSize.getWidth()
  doc.setFillColor(...BLEU)
  doc.rect(0, 0, L, 24, 'F')
  if (logoImg) {
    doc.setFillColor(255, 255, 255)
    doc.roundedRect(6.5, 3, 19, 18, 2, 2, 'F')
    placerImage(doc, logoImg, 7.5, 4, 17, 16)
  }
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text(titre, 30, 11)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(sousTitre, 30, 17.5)
  doc.setTextColor(0, 0, 0)
}

function pied(doc) {
  const n = doc.getNumberOfPages()
  const L = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const date = new Date().toLocaleDateString('fr-FR')
  for (let i = 1; i <= n; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRIS)
    doc.text('Document confidentiel — MATW-PROJECT — édité le ' + date, 10, H - 6)
    doc.text('Page ' + i + ' / ' + n, L - 10, H - 6, { align: 'right' })
  }
}

function titreSection(doc, texte, y) {
  const L = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  if (y > H - 45) {
    doc.addPage()
    y = 20
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...BLEU_FONCE)
  doc.text(texte, 14, y)
  doc.setDrawColor(...BLEU)
  doc.setLineWidth(0.4)
  doc.line(14, y + 1.8, L - 14, y + 1.8)
  doc.setTextColor(0, 0, 0)
  return y + 5
}

function tableau(doc, autoTable, y, options) {
  let fin = null
  autoTable(doc, {
    startY: y,
    margin: { left: 14, right: 14, bottom: 16 },
    ...options,
    didDrawPage: (d) => {
      if (d.cursor) fin = d.cursor.y
    },
  })
  return (doc.lastAutoTable && doc.lastAutoTable.finalY) || fin || y + 25
}

function texteVide(doc, texte, y) {
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(10)
  doc.setTextColor(...GRIS)
  doc.text(texte, 14, y + 4)
  doc.setTextColor(0, 0, 0)
  return y + 12
}

// Sauvegarde le PDF : sur le web, comportement classique (téléchargement
// navigateur). Sur Android/iOS (app Capacitor), on écrit le fichier dans le
// cache de l'app puis on ouvre la boîte de partage native, car un simple
// lien "download" ne fonctionne pas dans une WebView.
async function sauvegarderPdf(doc, fichier) {
  if (Capacitor.isNativePlatform()) {
    const base64 = doc.output('datauristring').split(',')[1]
    const resultat = await Filesystem.writeFile({
      path: fichier,
      data: base64,
      directory: Directory.Cache,
    })
    await Share.share({
      title: fichier,
      url: resultat.uri,
      dialogTitle: 'Enregistrer ou partager la fiche',
    })
  } else {
    doc.save(fichier)
  }
}

export async function pdfFicheEleve(eleve) {
  const { jsPDF, autoTable } = await outils()
  const [logoImg, photo, famille] = await Promise.all([
    logo(),
    photoStockee(eleve.photo_url),
    photoStockee(eleve.photo_famille_url),
  ])

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const L = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  entete(doc, logoImg, 'Fiche élève', 'MATW-PROJECT · Muslims Around The World Project')

  let y = 32
  if (photo) {
    placerImage(doc, photo, 14, y, 34, 42)
  } else {
    doc.setFillColor(230, 245, 251)
    doc.roundedRect(14, y, 34, 42, 3, 3, 'F')
    doc.setTextColor(...BLEU_FONCE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    const ini = ((eleve.prenom?.[0] || '') + (eleve.nom?.[0] || '')).toUpperCase()
    doc.text(ini, 31, y + 25, { align: 'center' })
  }

  const age = calculerAge(eleve.date_naissance)
  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text(eleve.prenom + ' ' + eleve.nom, 54, y + 10)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(eleve.classe + (age !== null ? ' · ' + age + ' ans' : ''), 54, y + 18)
  doc.setFontSize(10)
  doc.setTextColor(...GRIS)
  doc.text('Matricule : ' + (eleve.matricule || '—'), 54, y + 25)
  doc.text(
    'Statut : ' + (eleve.statut === 'actif' ? 'Actif' : 'Inactif') +
      ' · Année scolaire : ' + (eleve.annee_scolaire || '—'),
    54,
    y + 31
  )
  doc.setTextColor(0, 0, 0)
  y += 52

  // Santé
  y = titreSection(doc, 'Santé', y)
  const alerte = !!(eleve.allergies || eleve.infos_medicales)
  y =
    tableau(doc, autoTable, y, {
      theme: 'plain',
      body: [
        ['Allergies', eleve.allergies || 'Aucune allergie signalée'],
        ['Infos médicales', eleve.infos_medicales || 'Aucune information'],
      ],
      styles: {
        fontSize: 10,
        cellPadding: 2.5,
        fillColor: alerte ? [254, 242, 242] : [249, 250, 251],
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 40, textColor: alerte ? [185, 28, 28] : [55, 65, 81] },
      },
    }) + 8

  // Informations
  y = titreSection(doc, 'Informations', y)
  y =
    tableau(doc, autoTable, y, {
      theme: 'plain',
      body: [
        ['Date de naissance', dateLongue(eleve.date_naissance)],
        ['Sexe', eleve.sexe === 'M' ? 'Garçon' : eleve.sexe === 'F' ? 'Fille' : '—'],
        ['Téléphone', eleve.telephone || '—'],
        ['Adresse', eleve.adresse || '—'],
      ],
      styles: { fontSize: 10, cellPadding: 1.8 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40, textColor: GRIS } },
    }) + 8

  // Tuteur
  y = titreSection(doc, 'Tuteur', y)
  const tuteurs = eleve.tuteurs || []
  if (tuteurs.length) {
    y =
      tableau(doc, autoTable, y, {
        head: [['Nom', 'Lien de parenté', 'Téléphone', 'Profession']],
        body: tuteurs.map((t) => [
          t.nom,
          t.lien_parente || '—',
          t.telephone || '—',
          t.profession || '—',
        ]),
        headStyles: { fillColor: BLEU },
        styles: { fontSize: 10 },
      }) + 8
  } else {
    y = texteVide(doc, 'Aucun tuteur enregistré.', y)
  }

  // Contacts d'urgence
  y = titreSection(doc, 'Contacts d’urgence', y)
  const contacts = eleve.contacts_urgence || []
  if (contacts.length) {
    y =
      tableau(doc, autoTable, y, {
        head: [['Nom', 'Lien de parenté', 'Téléphone']],
        body: contacts.map((c) => [c.nom, c.lien_parente || '—', c.telephone]),
        headStyles: { fillColor: [185, 28, 28] },
        styles: { fontSize: 10 },
      }) + 8
  } else {
    y = texteVide(doc, 'Aucun contact d’urgence.', y)
  }

  // Photo de famille
  if (famille) {
    if (y + 85 > H - 15) {
      doc.addPage()
      y = 20
    }
    y = titreSection(doc, 'Photo de famille', y)
    placerImage(doc, famille, 14, y, L - 28, 70)
  }

  pied(doc)
  await sauvegarderPdf(doc, 'fiche-' + nomFichier(eleve.nom + ' ' + eleve.prenom) + '.pdf')
}

export async function pdfListeClasse(eleves, titre) {
  const { jsPDF, autoTable } = await outils()
  const logoImg = await logo()

  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' })
  entete(
    doc,
    logoImg,
    'Liste des élèves — ' + titre,
    eleves.length + ' élève' + (eleves.length > 1 ? 's' : '') + ' · MATW-PROJECT'
  )

  const lignes = eleves.map((e, i) => {
    const t = (e.tuteurs || [])[0]
    const urgences = e.contacts_urgence || []
    return [
      i + 1,
      e.nom + ' ' + e.prenom,
      e.classe,
      dateCourte(e.date_naissance),
      t ? t.nom + (t.telephone ? '\n' + t.telephone : '') : '—',
      urgences.length
        ? urgences
            .map((c) => c.nom + (c.lien_parente ? ' (' + c.lien_parente + ')' : '') + ' : ' + c.telephone)
            .join('\n')
        : '—',
      [e.allergies, e.infos_medicales].filter(Boolean).join(' / ') || '—',
    ]
  })

  autoTable(doc, {
    startY: 30,
    margin: { left: 10, right: 10, bottom: 16 },
    head: [['N°', 'Élève', 'Classe', 'Naissance', 'Tuteur', 'Contacts d’urgence', 'Allergies / santé']],
    body: lignes,
    styles: { fontSize: 8.5, cellPadding: 2, valign: 'top' },
    headStyles: { fillColor: BLEU },
    alternateRowStyles: { fillColor: [245, 250, 253] },
    columnStyles: { 0: { cellWidth: 10 } },
  })

  pied(doc)
  await sauvegarderPdf(doc, 'liste-' + nomFichier(titre) + '.pdf')
}
