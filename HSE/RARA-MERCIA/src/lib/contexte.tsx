import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { SITE_DEFAUT, type Objectifs, type Site } from './stats'

type Membre = { user_id: string; nom: string | null; role: 'admin' | 'membre' | 'lecture' }
type Ctx = {
  session: Session | null
  membre: Membre | null
  chargement: boolean
  site: Site
  objectifs: Objectifs
  peutEcrire: boolean
  rechargerMembre: () => Promise<void>
  rechargerParametres: () => Promise<void>
  toast: (texte: string, type?: 'ok' | 'erreur') => void
}
const Contexte = createContext<Ctx | null>(null)
export const useApp = () => useContext(Contexte)!

export const OBJECTIFS_DEFAUT: Objectifs = { inspections: 20, causeries: 20, jsa: 20, formations: 2, reunions_generales: 1, exercices: 1 }

export function FournisseurApp({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [membre, setMembre] = useState<Membre | null>(null)
  const [chargement, setChargement] = useState(true)
  const [site, setSite] = useState<Site>(SITE_DEFAUT)
  const [objectifs, setObjectifs] = useState<Objectifs>(OBJECTIFS_DEFAUT)
  const [toasts, setToasts] = useState<{ id: number; texte: string; type: 'ok' | 'erreur' }[]>([])

  const toast = useCallback((texte: string, type: 'ok' | 'erreur' = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, texte, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])

  const rechargerMembre = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser()
    if (!u.user) { setMembre(null); return }
    const { data } = await supabase.from('hse_membres').select('user_id, nom, role').eq('user_id', u.user.id).maybeSingle()
    setMembre((data as Membre) ?? null)
  }, [])

  const rechargerParametres = useCallback(async () => {
    const { data } = await supabase.from('hse_parametres').select('cle, valeur')
    for (const p of data ?? []) {
      if (p.cle === 'site') setSite({ ...SITE_DEFAUT, ...(p.valeur as Partial<Site>) })
      if (p.cle === 'objectifs') setObjectifs({ ...OBJECTIFS_DEFAUT, ...(p.valeur as Objectifs) })
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session) await rechargerMembre()
      setChargement(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      if (!s) setMembre(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [rechargerMembre])

  useEffect(() => { if (membre) rechargerParametres() }, [membre, rechargerParametres])

  return (
    <Contexte.Provider value={{
      session, membre, chargement, site, objectifs, peutEcrire: membre?.role === 'admin' || membre?.role === 'membre',
      rechargerMembre, rechargerParametres, toast,
    }}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto z-[60] flex flex-col gap-2 items-end pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto rounded-xl px-4 py-3 text-sm font-semibold shadow-lg text-white animate-[entree_.25s_ease-out] ${t.type === 'ok' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
            {t.type === 'ok' ? '✔ ' : '✘ '}{t.texte}
          </div>
        ))}
      </div>
    </Contexte.Provider>
  )
}
