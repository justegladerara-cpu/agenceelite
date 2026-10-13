import { useState, type ReactNode } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, CalendarCheck, LayoutDashboard, LogOut, Menu, Settings, FileBarChart, X } from 'lucide-react'
import { MODULES } from '../lib/modules'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/contexte'

const PRINCIPAL = [
  { to: '/', label: 'Tableau de bord', icone: LayoutDashboard },
  { to: '/saisie', label: 'Saisie du jour', icone: CalendarCheck },
]
const BAS = [
  { to: '/rapport', label: 'Rapport mensuel', icone: FileBarChart },
  { to: '/aide', label: 'Aide et lexique', icone: BookOpen },
  { to: '/parametres', label: 'Paramètres', icone: Settings },
]

function Lien({ to, label, icone: Icone, onClick }: { to: string; label: string; icone: typeof Menu; onClick?: () => void }) {
  return (
    <NavLink to={to} end={to === '/'} onClick={onClick}
      className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${isActive ? 'bg-white/15 text-white shadow-inner' : 'text-marine-100/80 hover:bg-white/10 hover:text-white'}`}>
      <Icone size={19} strokeWidth={2} />{label}
    </NavLink>
  )
}

function Navigation({ onClick }: { onClick?: () => void }) {
  const { site, membre } = useApp()
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-2 pb-6">
        <img src="icone.svg" alt="" className="h-11 w-11" />
        <div className="leading-tight">
          <div className="text-white font-extrabold text-lg">HSE {site.entreprise}</div>
          <div className="text-marine-100/70 text-xs">{site.nom}</div>
        </div>
      </div>
      <nav className="space-y-1">
        {PRINCIPAL.map((l) => <Lien key={l.to} {...l} onClick={onClick} />)}
      </nav>
      <div className="mt-6 mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-marine-100/50">Registres</div>
      <nav className="space-y-1">
        {MODULES.map((m) => <Lien key={m.id} to={`/m/${m.id}`} label={m.titre} icone={m.icone} onClick={onClick} />)}
      </nav>
      <div className="mt-6 mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-marine-100/50">Outils</div>
      <nav className="space-y-1">
        {BAS.map((l) => <Lien key={l.to} {...l} onClick={onClick} />)}
      </nav>
      <div className="mt-auto pt-6">
        <div className="rounded-xl bg-white/10 px-3 py-3 text-sm text-marine-50">
          <div className="font-semibold truncate">{membre?.nom || 'Mon compte'}</div>
          <div className="text-marine-100/70 text-xs mb-2">{membre?.role === 'admin' ? 'Administrateur' : membre?.role === 'lecture' ? 'Lecture seule' : 'Membre'}</div>
          <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 text-marine-100 hover:text-white text-sm">
            <LogOut size={16} />Se déconnecter
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const [ouvert, setOuvert] = useState(false)
  const loc = useLocation()
  return (
    <div className="min-h-screen md:pl-72">
      <aside className="hidden md:block fixed inset-y-0 left-0 w-72 bg-gradient-to-b from-marine-800 via-marine-800 to-marine-900 p-5 overflow-y-auto">
        <Navigation />
      </aside>

      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between bg-marine-800 px-4 py-3 text-white shadow">
        <div className="flex items-center gap-2 font-bold"><img src="icone.svg" alt="" className="h-8 w-8" />HSE Mercia</div>
        <button onClick={() => setOuvert(true)} className="p-2 rounded-lg hover:bg-white/10" aria-label="Menu"><Menu /></button>
      </header>
      <AnimatePresence>
        {ouvert && (
          <motion.div className="md:hidden fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setOuvert(false)} />
            <motion.aside className="absolute inset-y-0 left-0 w-[82%] max-w-xs bg-marine-800 p-5 overflow-y-auto"
              initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
              <button onClick={() => setOuvert(false)} className="absolute right-3 top-3 p-2 text-white/80" aria-label="Fermer"><X /></button>
              <Navigation onClick={() => setOuvert(false)} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="px-4 md:px-8 py-6 md:py-8 pb-28 md:pb-10 max-w-[1400px] mx-auto">
        <motion.div key={loc.pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {children}
        </motion.div>
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-4 bg-white border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
        {[{ to: '/', l: 'Accueil', i: LayoutDashboard }, { to: '/saisie', l: 'Saisie', i: CalendarCheck }, { to: '/m/incidents', l: 'Incidents', i: MODULES[0].icone }, { to: '/m/actions', l: 'Actions', i: MODULES[1].icone }].map(({ to, l, i: I }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold ${isActive ? 'text-marine-700' : 'text-slate-400'}`}>
            <I size={21} />{l}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
