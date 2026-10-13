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
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
}
export const ICONE_FOND: Record<string, string> = {
  rose: 'bg-rose-500', orange: 'bg-orange-500', amber: 'bg-amber-500', yellow: 'bg-yellow-500', lime: 'bg-lime-500',
  emerald: 'bg-emerald-500', teal: 'bg-teal-500', sky: 'bg-sky-500', indigo: 'bg-indigo-500', violet: 'bg-violet-500', slate: 'bg-slate-500',
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
          <div className="absolute inset-0 bg-marine-900/50 backdrop-blur-sm" onClick={onFermer} />
          <motion.div
            className={`relative w-full ${large ? 'md:max-w-4xl' : 'md:max-w-2xl'} max-h-[92vh] flex flex-col bg-white rounded-t-3xl md:rounded-3xl shadow-2xl`}
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}>
            <div className="flex items-center justify-between px-5 md:px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-marine-800">{titre}</h2>
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
        {icone && <div className={`h-12 w-12 shrink-0 rounded-2xl grid place-items-center text-white shadow-lg ${ICONE_FOND[couleur] ?? 'bg-marine-600'}`}>{icone}</div>}
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-marine-800 tracking-tight">{titre}</h1>
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
      <div className="mx-auto mb-3 h-14 w-14 rounded-full bg-slate-100 grid place-items-center text-2xl">📋</div>
      <p className="text-slate-500 mb-4">{texte}</p>
      {action}
    </div>
  )
}

export function Chargement({ texte = 'Chargement…' }: { texte?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <span className="h-5 w-5 rounded-full border-2 border-marine-500 border-t-transparent animate-spin" />{texte}
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
