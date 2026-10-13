import type { jsPDF } from 'jspdf'
import { BUCKET, supabase } from './supabase'
import { GRAVITES, STATUTS_INCIDENT, TYPES_INCIDENT, type Option } from './modules'
import { dateFr, heureFr, iso } from './format'
import type { Site } from './stats'

const MARINE: [number, number, number] = [15, 42, 74]
const BLEU: [number, number, number] = [44, 93, 151]
const GRIS: [number, number, number] = [100, 116, 139]

/** Les polices standard de jsPDF ne connaissent que le Latin-1 : on remplace le reste. */
export const propre = (s: unknown) => String(s ?? '')
  .replace(/[\u202f\u2009]/g, ' ').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/•/g, '-')
  .replace(/[^\x00-\xFF]/g, '')

const libelle = (opts: Option[], v: unknown) => opts.find((o) => o.v === String(v))?.l ?? String(v ?? '')

async function charger() {
  const [{ jsPDF }, autoTable] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  return { doc: new jsPDF({ unit: 'mm', format: 'a4' }), autoTable: autoTable.default }
}

function bandeau(doc: jsPDF, titre: string, sous: string, couleur: [number, number, number] = MARINE) {
  const w = doc.internal.pageSize.getWidth()
  doc.setFillColor(...couleur); doc.rect(0, 0, w, 30, 'F')
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(18)
  doc.text(propre(titre), 14, 14)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10)
  doc.text(propre(sous), 14, 22)
  doc.setTextColor(0, 0, 0)
}

function piedDePage(doc: jsPDF, site: Site) {
  const n = doc.getNumberOfPages()
  const w = doc.internal.pageSize.getWidth(), h = doc.internal.pageSize.getHeight()
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(...GRIS)
    doc.text(propre(`${site.entreprise} - HSE - ${site.nom} - édité le ${dateFr(iso(new Date()))}`), 14, h - 8)
    doc.text(`Page ${i} / ${n}`, w - 14, h - 8, { align: 'right' })
  }
}

async function imageDataUrl(chemin: string): Promise<{ data: string; w: number; h: number } | null> {
  const { data } = await supabase.storage.from(BUCKET).download(chemin)
  if (!data) return null
  const url = URL.createObjectURL(data)
  try {
    const img = await new Promise<HTMLImageElement>((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url })
    const max = 1200, r = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas'); c.width = img.width * r; c.height = img.height * r
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return { data: c.toDataURL('image/jpeg', 0.82), w: c.width, h: c.height }
  } catch { return null } finally { URL.revokeObjectURL(url) }
}

/** Fiche « Incident Flash » : une page claire à partager juste après l'événement. */
export async function ficheIncidentPdf(l: Record<string, unknown>, site: Site) {
  const { doc, autoTable } = await charger()
  const grave = ['critique', 'elevee'].includes(String(l.gravite))
  bandeau(doc, 'INCIDENT FLASH', `${site.entreprise} - ${site.nom} - Client : ${site.client}`, grave ? [190, 18, 60] : MARINE)
  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(...MARINE)
  const titre = doc.splitTextToSize(propre(`INC-${l.num} : ${l.titre ?? ''}`), 180)
  doc.text(titre, 14, 42)
  let y = 42 + titre.length * 6 + 2
  autoTable(doc, {
    startY: y, theme: 'grid', styles: { fontSize: 10, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: [238, 243, 250], cellWidth: 45 } },
    body: [
      ['Date et heure', propre(`${dateFr(String(l.date_evt))} à ${heureFr(String(l.date_evt))}`)],
      ['Type', propre(libelle(TYPES_INCIDENT, l.type))],
      ['Gravité', propre(libelle(GRAVITES, l.gravite))],
      ['Lieu', propre(l.lieu || '-')],
      ['Statut', propre(libelle(STATUTS_INCIDENT, l.statut))],
      ['Déclaré par', propre(l.declare_par || '-')],
    ],
  })
  // @ts-expect-error propriété ajoutée par jspdf-autotable
  y = doc.lastAutoTable.finalY + 6
  const blocs: [string, unknown][] = [
    ['Ce qui s\'est passé', l.description], ['Personnes concernées', l.personnes],
    ['Causes probables', l.causes], ['Actions immédiates prises', l.actions_immediates],
  ]
  for (const [t, v] of blocs) {
    if (!v) continue
    autoTable(doc, {
      startY: y, theme: 'plain', styles: { fontSize: 10, cellPadding: 2.5 },
      head: [[propre(t)]], headStyles: { fillColor: BLEU, textColor: 255, fontStyle: 'bold' },
      body: [[propre(v)]], bodyStyles: { fillColor: [248, 250, 252] },
    })
    // @ts-expect-error propriété ajoutée par jspdf-autotable
    y = doc.lastAutoTable.finalY + 5
  }
  const photos = Array.isArray(l.photos) ? (l.photos as string[]).slice(0, 4) : []
  if (photos.length) {
    if (y > 200) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...MARINE); doc.text('Photos', 14, y + 4); y += 8
    let x = 14
    for (const p of photos) {
      const img = await imageDataUrl(p)
      if (!img) continue
      const w = 88, h = Math.min(66, (img.h / img.w) * w)
      if (y + h > 280) { doc.addPage(); y = 20; x = 14 }
      doc.addImage(img.data, 'JPEG', x, y, w, h)
      if (x > 14) { x = 14; y += h + 4 } else x = 106
    }
  }
  piedDePage(doc, site)
  doc.save(propre(`Incident Flash INC-${l.num}.pdf`))
}

export type SectionPdf = { titre: string; tete: string[]; lignes: (string | number)[][]; note?: string }

/** Rapport mensuel : chiffres clés + tableaux. */
export async function rapportPdf(titre: string, sousTitre: string, cles: { libelle: string; valeur: string; couleur?: [number, number, number] }[], analyse: string[], sections: SectionPdf[], site: Site, nomFichier: string) {
  const { doc, autoTable } = await charger()
  bandeau(doc, titre, sousTitre)
  // Tuiles de chiffres clés : 4 par ligne
  let y = 38
  const lw = 43.5, lh = 22
  cles.forEach((c, i) => {
    const x = 14 + (i % 4) * (lw + 2)
    if (i && i % 4 === 0) y += lh + 3
    doc.setFillColor(...(c.couleur ?? [238, 243, 250])); doc.roundedRect(x, y, lw, lh, 2, 2, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...MARINE)
    doc.text(propre(c.valeur), x + lw / 2, y + 10, { align: 'center' })
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GRIS)
    doc.text(doc.splitTextToSize(propre(c.libelle), lw - 4), x + lw / 2, y + 15.5, { align: 'center' })
  })
  y += lh + 8
  if (analyse.length) {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...MARINE); doc.text('Ce qu\'il faut retenir', 14, y); y += 6
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(30, 41, 59)
    for (const a of analyse) {
      const t = doc.splitTextToSize(propre(`- ${a}`), 180)
      if (y + t.length * 5 > 280) { doc.addPage(); y = 20 }
      doc.text(t, 14, y); y += t.length * 5 + 1
    }
    y += 4
  }
  for (const s of sections) {
    if (y > 250) { doc.addPage(); y = 20 }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...MARINE); doc.text(propre(s.titre), 14, y)
    autoTable(doc, {
      startY: y + 3, theme: 'striped', styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: BLEU, textColor: 255 }, alternateRowStyles: { fillColor: [238, 243, 250] },
      head: [s.tete.map(propre)], body: s.lignes.length ? s.lignes.map((r) => r.map(propre)) : [[{ content: 'Rien à signaler', colSpan: s.tete.length, styles: { textColor: GRIS, fontStyle: 'italic' } }]] as never,
    })
    // @ts-expect-error propriété ajoutée par jspdf-autotable
    y = doc.lastAutoTable.finalY + (s.note ? 4 : 9)
    if (s.note) { doc.setFontSize(8); doc.setTextColor(...GRIS); doc.text(propre(s.note), 14, y); y += 7 }
  }
  piedDePage(doc, site)
  doc.save(propre(`${nomFichier}.pdf`))
}
