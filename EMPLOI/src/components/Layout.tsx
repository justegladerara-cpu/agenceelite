import { useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, Menu, UserRound, X } from 'lucide-react'
import { useApp } from '../lib/contexte'
import { supabase } from '../lib/supabase'

const LIENS = [
  { to: '/offres', label: 'Offres d’emploi' },
  { to: '/tests', label: 'Tests de compétences' },
  { to: '/entreprises', label: 'Recruter' },
]

export function Logo({ clair }: { clair?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img src={`${import.meta.env.BASE_URL}icone.svg`} alt="" className="h-9 w-9" />
      <span className="leading-none">
        <span className={`block font-titre text-lg font-extrabold ${clair ? 'text-white' : 'text-marine-800'}`}>Elite Emploi</span>
        <span className={`block text-[11px] font-medium ${clair ? 'text-marine-100/70' : 'text-slate-500'}`}>par Agence Elite</span>
      </span>
    </Link>
  )
}

function lienEspace(role?: string) {
  if (role === 'admin') return '/admin'
  if (role === 'entreprise') return '/espace-entreprise'
  return '/espace'
}

export default function Layout({ children }: { children: ReactNode }) {
  const { session, profil } = useApp()
  const [ouvert, setOuvert] = useState(false)
  const loc = useLocation()
  const nav = useNavigate()
  const deconnexion = async () => { await supabase.auth.signOut(); nav('/') }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200/70">
        <div className="conteneur flex h-16 items-center justify-between gap-4">
          <Logo />
          <nav className="hidden md:flex items-center gap-1">
            {LIENS.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `rounded-lg px-3 py-2 text-sm font-semibold ${isActive ? 'text-bordeaux-600' : 'text-slate-600 hover:text-marine-800'}`}>{l.label}</NavLink>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-2">
            {session ? (
              <>
                <Link to={lienEspace(profil?.role)} className="btn-marine"><UserRound size={16} />{profil?.role === 'admin' ? 'Administration' : 'Mon espace'}</Link>
                <button onClick={deconnexion} className="btn-clair" aria-label="Se déconnecter"><LogOut size={16} /></button>
              </>
            ) : (
              <>
                <Link to="/connexion" className="btn-clair">Se connecter</Link>
                <Link to="/inscription" className="btn-primaire">Créer mon compte</Link>
              </>
            )}
          </div>
          <button onClick={() => setOuvert(true)} className="md:hidden p-2 rounded-lg hover:bg-slate-100" aria-label="Menu"><Menu /></button>
        </div>
      </header>

      <AnimatePresence>
        {ouvert && (
          <motion.div className="md:hidden fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/40" onClick={() => setOuvert(false)} />
            <motion.aside className="absolute inset-y-0 right-0 w-[82%] max-w-xs bg-white p-5 flex flex-col gap-2"
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }}>
              <button onClick={() => setOuvert(false)} className="self-end p-2" aria-label="Fermer"><X /></button>
              {LIENS.map((l) => <Link key={l.to} to={l.to} onClick={() => setOuvert(false)} className="rounded-xl px-3 py-3 font-semibold text-marine-800 hover:bg-slate-50">{l.label}</Link>)}
              <div className="mt-4 flex flex-col gap-2">
                {session ? (
                  <>
                    <Link to={lienEspace(profil?.role)} onClick={() => setOuvert(false)} className="btn-marine">{profil?.role === 'admin' ? 'Administration' : 'Mon espace'}</Link>
                    <button onClick={() => { setOuvert(false); deconnexion() }} className="btn-clair">Se déconnecter</button>
                  </>
                ) : (
                  <>
                    <Link to="/inscription" onClick={() => setOuvert(false)} className="btn-primaire">Créer mon compte</Link>
                    <Link to="/connexion" onClick={() => setOuvert(false)} className="btn-clair">Se connecter</Link>
                  </>
                )}
              </div>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1">
        <motion.div key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {children}
        </motion.div>
      </main>

      <footer className="bg-marine-900 text-marine-100/80 mt-16">
        <div className="conteneur py-10 grid gap-8 md:grid-cols-4 text-sm">
          <div className="md:col-span-2 space-y-3">
            <Logo clair />
            <p className="max-w-sm">Offres d’emploi au Congo et en France. Les candidats passent des tests, Agence Elite sélectionne les meilleurs profils et les présente aux entreprises.</p>
          </div>
          <div className="space-y-2">
            <div className="font-semibold text-white">Candidats</div>
            <Link to="/offres" className="block hover:text-white">Voir les offres</Link>
            <Link to="/tests" className="block hover:text-white">Passer un test</Link>
            <Link to="/inscription" className="block hover:text-white">Déposer mon CV</Link>
          </div>
          <div className="space-y-2">
            <div className="font-semibold text-white">Entreprises</div>
            <Link to="/entreprises" className="block hover:text-white">Recruter avec Agence Elite</Link>
            <Link to="/inscription?type=entreprise" className="block hover:text-white">Créer un compte entreprise</Link>
            <a href="https://www.agence-elite.fr" className="block hover:text-white">Agence Elite</a>
            <Link to="/confidentialite" className="block hover:text-white">Données personnelles</Link>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-marine-100/60">© {new Date().getFullYear()} Agence Elite · Pointe-Noire, Congo</div>
      </footer>
    </div>
  )
}
