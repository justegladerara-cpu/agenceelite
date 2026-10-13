import type { Workbook, Worksheet } from 'exceljs'
import { deIso } from './format'

export type ColonneExcel = {
  titre: string
  largeur?: number
  type?: 'texte' | 'nombre' | 'decimal' | 'date' | 'dateheure' | 'pourcent'
  total?: boolean // ligne TOTAL en bas
  couleurs?: Record<string, string> // valeur affichée -> couleur de fond (ex. « Clôturé » -> vert)
}
export type FeuilleExcel = {
  nom: string
  titre: string
  colonnes: ColonneExcel[]
  lignes: (string | number | null | undefined)[][]
  note?: string
}

const MARINE = 'FF0F2A4A'
const BLEU_CLAIR = 'FFEEF3FA'
const BORD = { style: 'thin' as const, color: { argb: 'FFD0D7E2' } }
const FOND: Record<string, string> = {
  vert: 'FFD1FAE5', rouge: 'FFFFE4E6', orange: 'FFFFEDD5', jaune: 'FFFEF9C3', gris: 'FFF1F5F9', bleu: 'FFE0F2FE',
}

function remplir(ws: Worksheet, f: FeuilleExcel, entete: { site: string; client: string; entreprise: string }) {
  const nb = f.colonnes.length
  ws.properties.defaultRowHeight = 18
  ws.views = [{ state: 'frozen', ySplit: 4, showGridLines: false }]

  ws.mergeCells(1, 1, 1, nb)
  const t = ws.getCell(1, 1)
  t.value = f.titre
  t.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } }
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MARINE } }
  t.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(1).height = 30

  ws.mergeCells(2, 1, 2, nb)
  const s = ws.getCell(2, 1)
  const maintenant = new Date().toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
  s.value = `${entete.site}  •  ${entete.client}  •  ${entete.entreprise}  •  Exporté le ${maintenant}`
  s.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF475569' } }
  s.alignment = { indent: 1 }

  const h = ws.getRow(4)
  f.colonnes.forEach((c, i) => {
    const cell = h.getCell(i + 1)
    cell.value = c.titre
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C5D97' } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = { top: BORD, bottom: BORD, left: BORD, right: BORD }
    ws.getColumn(i + 1).width = c.largeur ?? Math.max(12, Math.min(45, c.titre.length + 4))
  })
  h.height = 34

  f.lignes.forEach((ligne, li) => {
    const row = ws.getRow(5 + li)
    ligne.forEach((v, ci) => {
      const col = f.colonnes[ci]
      const cell = row.getCell(ci + 1)
      if (v == null || v === '') cell.value = null
      else if ((col.type === 'date') && typeof v === 'string') cell.value = deIso(v)
      else if (col.type === 'dateheure' && typeof v === 'string') cell.value = new Date(v)
      else cell.value = v as string | number
      cell.font = { name: 'Arial', size: 10 }
      cell.border = { top: BORD, bottom: BORD, left: BORD, right: BORD }
      cell.alignment = { vertical: 'top', wrapText: col.type === 'texte' || !col.type, horizontal: col.type && col.type !== 'texte' ? 'center' : 'left' }
      if (col.type === 'date') cell.numFmt = 'dd/mm/yyyy'
      if (col.type === 'dateheure') cell.numFmt = 'dd/mm/yyyy hh:mm'
      if (col.type === 'nombre') cell.numFmt = '#,##0'
      if (col.type === 'decimal') cell.numFmt = '#,##0.00'
      if (col.type === 'pourcent') cell.numFmt = '0%'
      const fond = col.couleurs && typeof v === 'string' ? col.couleurs[v] : undefined
      if (fond) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: FOND[fond] ?? fond } }
        cell.font = { name: 'Arial', size: 10, bold: true }
      } else if (li % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLEU_CLAIR } }
      }
    })
  })

  const fin = 4 + f.lignes.length
  if (f.lignes.length) ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: fin, column: nb } }

  if (f.colonnes.some((c) => c.total) && f.lignes.length) {
    const row = ws.getRow(fin + 1)
    f.colonnes.forEach((c, i) => {
      const cell = row.getCell(i + 1)
      const lettre = ws.getColumn(i + 1).letter
      if (i === 0) cell.value = 'TOTAL'
      else if (c.total) cell.value = { formula: `SUBTOTAL(9,${lettre}5:${lettre}${fin})` }
      cell.font = { name: 'Arial', size: 10, bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6E2F2' } }
      cell.border = { top: { style: 'medium', color: { argb: MARINE } }, bottom: BORD, left: BORD, right: BORD }
      cell.alignment = { horizontal: i === 0 ? 'left' : 'center' }
      if (c.type === 'decimal') cell.numFmt = '#,##0.00'
      else if (c.total) cell.numFmt = '#,##0'
    })
  }
  if (f.note) {
    const r = fin + (f.colonnes.some((c) => c.total) ? 3 : 2)
    ws.mergeCells(r, 1, r, nb)
    const c = ws.getCell(r, 1)
    c.value = f.note
    c.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } }
  }
  ws.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 }
  ws.headerFooter = { oddFooter: `&L${entete.entreprise} — HSE&RPage &P / &N` }
}

export async function exporterExcel(nomFichier: string, feuilles: FeuilleExcel[], entete: { site: string; client: string; entreprise: string }) {
  const ExcelJS = (await import('exceljs')).default
  const wb: Workbook = new ExcelJS.Workbook()
  wb.creator = 'HSE RARA Mercia'
  wb.created = new Date()
  for (const f of feuilles) remplir(wb.addWorksheet(f.nom.slice(0, 31)), f, entete)
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${nomFichier}.xlsx`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 2000)
}
