import { deIso, iso, joursEntre } from './format'

export type Jour = Record<string, number | string | null> & { jour: string }
export type Site = {
  nom: string; client: string; entreprise: string; heures_par_jour: number
  dernier_arret: string; dernier_incident: string; objectif_trir: number
}
export type Objectifs = Record<string, number>

export const SITE_DEFAUT: Site = {
  nom: 'Site de Kundji (MKB II)', client: 'Trident OGX', entreprise: 'RARA Mercia', heures_par_jour: 12,
  dernier_arret: '2024-02-28', dernier_incident: '2024-12-28', objectif_trir: 0.5,
}

export const GRAVES = ['deces', 'accidents_arret', 'travail_limite', 'soins_medicaux']
export const EVENEMENTS = [...GRAVES, 'premiers_soins', 'degats', 'pollutions', 'evacuations']
export const PREVENTION = ['inspections', 'causeries', 'jsa', 'formations', 'exercices', 'reunions_generales', 'reunions_poste']
export const SIGNALEMENTS = ['presque_accidents', 'dangers']
export const PERMIS = ['permis_chaud', 'permis_froid', 'permis_confine']

const n = (v: unknown) => (typeof v === 'number' ? v : v == null || v === '' ? 0 : Number(v) || 0)

export function heures(j: Jour, site: Site): number {
  const hr = j.heures_reelles
  if (hr != null && hr !== '') return n(hr)
  return n(j.personnes) * site.heures_par_jour
}

export type Periode = { debut: string; fin: string }
export function periode(annee: number, mois: number | null): Periode {
  if (mois == null) return { debut: `${annee}-01-01`, fin: `${annee}-12-31` }
  return { debut: iso(new Date(annee, mois, 1)), fin: iso(new Date(annee, mois + 1, 0)) }
}
/** Même période l'année précédente, limitée à aujourd'hui pour une comparaison juste. */
export function periodePrecedente(p: Periode): Periode {
  const auj = iso(new Date())
  const fin = p.debut <= auj && p.fin > auj ? auj : p.fin
  const recule = (s: string) => { const d = deIso(s); d.setFullYear(d.getFullYear() - 1); return iso(d) }
  return { debut: recule(p.debut), fin: recule(fin) }
}

export function dansPeriode(rows: Jour[], p: Periode) {
  return rows.filter((r) => r.jour >= p.debut && r.jour <= p.fin)
}
export function somme(rows: Jour[], cles: string[]): number {
  let t = 0
  for (const r of rows) for (const c of cles) t += n(r[c])
  return t
}

export type Resume = {
  graves: number; arrets: number; heures: number; trir: number; tf: number; signalements: number
  prevention: number; permis: number; personnesMoy: number; evenements: number
  joursSaisis: number; joursEcoules: number
}
export function resume(rows: Jour[], p: Periode, site: Site): Resume {
  const r = dansPeriode(rows, p)
  const h = r.reduce((t, j) => t + heures(j, site), 0)
  const graves = somme(r, GRAVES)
  const arrets = somme(r, ['accidents_arret'])
  const pers = r.filter((j) => n(j.personnes) > 0)
  const auj = iso(new Date())
  const finEcoulee = p.fin < auj ? p.fin : auj
  const joursEcoules = finEcoulee < p.debut ? 0 : joursEntre(deIso(p.debut), deIso(finEcoulee)) + 1
  return {
    graves, arrets, heures: h,
    trir: h > 0 ? (graves * 200000) / h : 0,
    tf: h > 0 ? (arrets * 1000000) / h : 0,
    signalements: somme(r, SIGNALEMENTS),
    prevention: somme(r, PREVENTION),
    permis: somme(r, PERMIS),
    personnesMoy: pers.length ? pers.reduce((t, j) => t + n(j.personnes), 0) / pers.length : 0,
    evenements: somme(r, EVENEMENTS),
    joursSaisis: r.filter((j) => j.jour <= finEcoulee && heures(j, site) > 0).length,
    joursEcoules,
  }
}

export function dernierJourAvec(rows: Jour[], cles: string[], avant: string): string {
  let d = avant
  for (const r of rows) if (somme([r], cles) > 0 && r.jour > d) d = r.jour
  return d
}

export type Mois = { mois: number } & Record<string, number>
export function parMois(rows: Jour[], annee: number, site: Site): Mois[] {
  const res: Mois[] = []
  let cumG = 0, cumH = 0
  for (let m = 0; m < 12; m++) {
    const r = dansPeriode(rows, periode(annee, m))
    const rp = dansPeriode(rows, periode(annee - 1, m))
    const h = r.reduce((t, j) => t + heures(j, site), 0)
    const g = somme(r, GRAVES)
    cumG += g; cumH += h
    const pers = r.filter((j) => n(j.personnes) > 0)
    const ligne: Mois = {
      mois: m, graves: g, heures: h,
      trir: h > 0 ? (g * 200000) / h : 0,
      trirCumul: cumH > 0 ? (cumG * 200000) / cumH : 0,
      objectifTrir: site.objectif_trir,
      prevention: somme(r, PREVENTION), preventionAvant: somme(rp, PREVENTION),
      personnes: pers.length ? Math.round(pers.reduce((t, j) => t + n(j.personnes), 0) / pers.length) : 0,
    }
    for (const c of ['premiers_soins', 'presque_accidents', 'dangers', 'degats', 'pollutions', 'inspections', 'causeries', 'jsa', 'formations', 'exercices', 'permis_chaud', 'permis_froid', 'permis_confine'])
      ligne[c] = somme(r, [c])
    res.push(ligne)
  }
  return res
}

/** Nombre de mois écoulés dans la période (pour multiplier les objectifs mensuels). */
export function moisEcoules(annee: number, mois: number | null): number {
  if (mois != null) return 1
  const now = new Date()
  if (annee < now.getFullYear()) return 12
  if (annee > now.getFullYear()) return 1
  return now.getMonth() + 1
}
