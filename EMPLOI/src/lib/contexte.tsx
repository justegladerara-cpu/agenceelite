import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { AnimatePresence, motion } from 'framer-motion'
import { supabase } from './supabase'
import type { Pays, Role } from './donnees'

export type Profil = { id: string; role: Role; nom: string; telephone: string | null; pays: Pays | null; ville: string | null }

type Ctx = {
  session: Session | null
  profil: Profil | null
  chargement: boolean
  /** Le profil a été cherché pour la session en cours (il peut ne pas exister : compte d'une autre application). */
  profilVerifie: boolean
  rechargerProfil: () => Promise<void>
  toast: (texte: string, type?: 'ok' | 'erreur') => void
}
const Contexte = createContext<Ctx | null>(null)
export const useApp = () => useContext(Contexte)!

export function FournisseurApp({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profil, setProfil] = useState<Profil | null>(null)
  const [chargement, setChargement] = useState(true)
  const [profilVerifie, setProfilVerifie] = useState(false)
  const [toasts, setToasts] = useState<{ id: number; texte: string; type: 'ok' | 'erreur' }[]>([])

  const toast = useCallback((texte: string, type: 'ok' | 'erreur' = 'ok') => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, texte, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])

  const rechargerProfil = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser()
    if (!u.user) { setProfil(null); setProfilVerifie(true); return }
    const { data } = await supabase.from('emploi_profils').select('id, role, nom, telephone, pays, ville').eq('id', u.user.id).maybeSingle()
    setProfil((data as Profil) ?? null)
    setProfilVerifie(true)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      if (data.session) await rechargerProfil()
      setChargement(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((evenement, s) => {
      setSession(s)
      if (evenement === 'SIGNED_IN') setProfilVerifie(false)
      if (s) setTimeout(() => { rechargerProfil() }, 0)
      else { setProfil(null); setProfilVerifie(true) }
    })
    return () => sub.subscription.unsubscribe()
  }, [rechargerProfil])

  return (
    <Contexte.Provider value={{ session, profil, chargement, profilVerifie, rechargerProfil, toast }}>
      {children}
      <div className="fixed bottom-4 inset-x-4 md:inset-x-auto md:right-6 md:bottom-6 z-[60] flex flex-col gap-2 items-stretch md:items-end pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
              className={`pointer-events-auto rounded-xl px-4 py-3 text-sm font-medium shadow-lg md:max-w-sm ${t.type === 'ok' ? 'bg-marine-800 text-white' : 'bg-bordeaux-600 text-white'}`}>
              {t.texte}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Contexte.Provider>
  )
}
