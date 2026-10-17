import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, animate } from 'framer-motion'
import { X } from 'lucide-react'

/** Couleurs des pastilles (classes complètes pour que Tailwind les garde). */
export const PASTILLE: Record<string, string> = {
  rose: 'bg-rose-100 text-rose-700 ring-rose-200', orange: 'bg-orange-100 text-orange-700 ring-orange-200',
  amber: 'bg-amber-100 text-amber-800 ring-amber-200', yellow: 'bg-yellow-100 text-yellow-800 ring-yellow-200',
  lime: 'bg-lime-100 text-lime-800 ring-lime-200', emerald: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  teal: 'bg-teal-100 text-teal-700 ring-teal-200', sky: 'bg-sky-100 text-sky-700 ring-sky-200',
  indigo: 'bg-indigo-100 text-indigo-700 ring-indigo-200', violet: 'bg-violet-100 text-violet-700 ring-violet-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200', rouge: 'bg-rouge-50 text-rouge-700 ring-rouge-200',
}

export function Pastille({ couleur = 'slate', children }: { couleur?: string; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${PASTILLE[couleur] ?? PASTILLE.slate}`}>{children}</span>
}

export function Compteur({ valeur, decimales = 0, className = '' }: { valeur: number; decimales?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const avant = useRef(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const fmt = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
    const ctl = animate(avant.current, valeur, {
      duration: 1.1, ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => { el.textContent = fmt.format(v) },
    })
    avant.current = valeur
    return () => ctl.stop()
  }, [valeur, decimales])
  return <span ref={ref} className={`tabular-nums ${className}`}>0</span>
}

export function Fenetre({ ouverte, onFermer, titre, children, pied, large }: {
  ouverte: boolean; onFermer: () => void; titre: string; children: ReactNode; pied?: ReactNode; large?: boolean
}) {
  useEffect(() => {
    if (!ouverte) return
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onFermer()
    window.addEventListener('keydown', f)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', f); document.body.style.overflow = '' }
  }, [ouverte, onFermer])
  return (
    <AnimatePresence>
      {ouverte && (
        <motion.div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-encre-900/50 backdrop-blur-sm" onClick={onFermer} />
          <motion.div
            className={`relative w-full ${large ? 'md:max-w-4xl' : 'md:max-w-2xl'} max-h-[92vh] flex flex-col bg-white rounded-t-3xl md:rounded-3xl shadow-2xl`}
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}>
            <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-encre-800">{titre}</h2>
              <button onClick={onFermer} className="p-2 -mr-2 rounded-xl hover:bg-slate-100" aria-label="Fermer"><X size={20} /></button>
            </div>
            <div className="overflow-y-auto px-5 md:px-6 py-5">{children}</div>
            {pied && <div className="px-5 md:px-6 py-4 border-t border-slate-100 flex flex-wrap gap-2 justify-end">{pied}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function EnTete({ titre, sousTitre, icone, couleur = 'indigo', actions }: {
  titre: string; sousTitre?: string; icone?: ReactNode; couleur?: string; actions?: ReactNode
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between mb-6">
      <div className="flex items-center gap-4">
        {icone && <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl grid place-items-center bg-encre-900 text-white shadow-lg" data-couleur={couleur}>{icone}<span className="absolute inset-x-0 bottom-0 h-1 bg-rouge-500" /></div>}
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-encre-900 tracking-tight">{titre}</h1>
          {sousTitre && <p className="text-slate-500 mt-0.5">{sousTitre}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Vide({ texte, action }: { texte: string; action?: ReactNode }) {
  return (
    <div className="carte p-10 text-center">
      <img src={`${import.meta.env.BASE_URL}marque-ae.png`} alt="" aria-hidden="true" className="mx-auto mb-4 h-10 w-auto opacity-25" />
      <p className="text-slate-500 mb-4">{texte}</p>
      {action}
    </div>
  )
}

export function Chargement({ texte = 'Chargement…' }: { texte?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <span className="h-5 w-5 rounded-full border-2 border-rouge-600 border-t-transparent animate-spin" />{texte}
    </div>
  )
}

export function useMemoire<T>(cle: string, defaut: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try { const s = localStorage.getItem(cle); return s ? (JSON.parse(s) as T) : defaut } catch { return defaut }
  })
  const set = (x: T) => { setV(x); try { localStorage.setItem(cle, JSON.stringify(x)) } catch { /* stockage indisponible */ } }
  return [v, set]
}

// ───────── Système de points (score sur 100 calculé par le serveur) ─────────
export type Score = { candidature_id: string; score: number; niveau: string; detail: { tests: number; profil: number; message: number; tests_requis: number } }
const COULEUR_NIVEAU: Record<string, string> = { Excellent: 'emerald', Bon: 'sky', 'À renforcer': 'amber', Insuffisant: 'rose' }
const TRAIT_NIVEAU: Record<string, string> = { Excellent: '#059669', Bon: '#0284c7', 'À renforcer': '#d97706', Insuffisant: '#e11d48' }

export function PastilleScore({ s }: { s?: Score }) {
  if (!s) return null
  return <Pastille couleur={COULEUR_NIVEAU[s.niveau] ?? 'slate'}>{s.score}/100 · {s.niveau}</Pastille>
}

export function JaugeScore({ s, taille = 92 }: { s: Score; taille?: number }) {
  const r = 40, c = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: taille, height: taille }}>
      <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#e2e8f0" strokeWidth="9" />
        <motion.circle cx="50" cy="50" r={r} fill="none" stroke={TRAIT_NIVEAU[s.niveau] ?? '#fb0000'} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - s.score / 100) }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        <div><Compteur valeur={s.score} className="text-2xl font-extrabold text-encre-900" /><div className="text-[10px] text-slate-500 mt-0.5">/ 100</div></div>
      </div>
    </div>
  )
}

export function DetailScore({ s }: { s: Score }) {
  const lignes = [
    { label: s.detail.tests_requis > 0 ? `Tests demandés (${s.detail.tests_requis})` : 'Tests passés', v: s.detail.tests, max: 70 },
    { label: 'Profil complet (CV, téléphone, ville)', v: s.detail.profil, max: 20 },
    { label: 'Message de motivation', v: s.detail.message, max: 10 },
  ]
  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      <JaugeScore s={s} />
      <div className="w-full space-y-2.5">
        <div className="flex items-center gap-2"><span className="font-bold text-encre-800">Score</span><PastilleScore s={s} /></div>
        {lignes.map((l) => (
          <div key={l.label}>
            <div className="flex justify-between text-xs text-slate-600"><span>{l.label}</span><b>{l.v} / {l.max}</b></div>
            <div className="mt-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <motion.div className="h-full rounded-full bg-rouge-500" initial={{ width: 0 }} animate={{ width: `${(l.v / l.max) * 100}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
