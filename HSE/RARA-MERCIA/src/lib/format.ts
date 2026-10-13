export const MOIS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
export const MOIS_COURT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
export const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

const nf = new Intl.NumberFormat('fr-FR')
export const nombre = (n: number | null | undefined, dec = 0) =>
  n == null || Number.isNaN(n) ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: dec, minimumFractionDigits: dec }).format(n)
export const entier = (n: number | null | undefined) => (n == null ? '—' : nf.format(Math.round(n)))

/** Date locale au format AAAA-MM-JJ (sans décalage de fuseau). */
export function iso(d: Date): string {
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
export function deIso(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}
export function dateFr(s: string | null | undefined): string {
  if (!s) return '—'
  const d = s.length > 10 ? new Date(s) : deIso(s)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
export function dateLongue(s: string): string {
  return deIso(s).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
export function heureFr(s: string | null | undefined): string {
  if (!s) return ''
  return new Date(s).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}
export const joursEntre = (a: Date, b: Date) => Math.floor((b.getTime() - a.getTime()) / 86400000)
export const pourcent = (x: number) => `${x >= 0 ? '+' : ''}${Math.round(x * 100)} %`
