import { useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ClipboardCheck, Home, LogIn, LogOut, Menu, Search, UserRound, X } from 'lucide-react'
import { BarreLecture, RetourHaut, useDefile } from './anim'
import { useApp } from '../lib/contexte'
import { supabase } from '../lib/supabase'

const LIENS = [
  { to: '/offres', label: 'Offres d’emploi' },
  { to: '/tests', label: 'Tests de compétences' },
  { to: '/entreprises', label: 'Recruter' },
]

const BASE = import.meta.env.BASE_URL

export function Logo({ clair }: { clair?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label="Elite Emploi, accueil">
      <img src={`${BASE}${clair ? 'logo-agence-elite-blanc.png' : 'logo-agence-elite.png'}`} alt="Agence Elite" width={1000} height={139}
        className="h-8 w-auto sm:h-9" />
      <span className={`hidden sm:block border-l pl-3 font-titre text-sm font-extrabold uppercase tracking-wide leading-tight ${clair ? 'border-white/20 text-white' : 'border-slate-200 text-encre-800'}`}>
        Emploi<span className="block text-[10px] font-semibold normal-case tracking-normal text-rouge-600">Congo · France</span>
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
  const defile = useDefile()
  // Barre d'onglets en bas sur téléphone, sauf pendant un test ou sur une offre (qui a son bouton « Postuler »)
  const barreBas = !/^\/(offres|tests)\/./.test(loc.pathname)
  const ONGLETS = [
    { to: '/', label: 'Accueil', icone: Home, fin: true },
    { to: '/offres', label: 'Offres', icone: Search },
    { to: '/tests', label: 'Tests', icone: ClipboardCheck },
    session ? { to: lienEspace(profil?.role), label: profil?.role === 'admin' ? 'Admin' : 'Mon espace', icone: UserRound } : { to: '/connexion', label: 'Connexion', icone: LogIn },
  ]

  return (
    <div className="relative min-h-screen flex flex-col">
      <BarreLecture />
      <div className="filigrane" aria-hidden="true" />
      <header className={`sticky top-0 z-40 bg-white/90 backdrop-blur border-b transition-shadow duration-300 ${defile ? 'border-slate-200 shadow-[0_8px_24px_-16px_rgba(11,11,12,.35)]' : 'border-slate-200/70'}`}>
        <div className="conteneur flex h-16 items-center justify-between gap-4">
          <Logo />
          <nav className="hidden md:flex items-center gap-1">
            {LIENS.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `relative rounded-lg px-3 py-2 text-sm font-semibold transition ${isActive ? 'text-rouge-600' : 'text-slate-600 hover:text-encre-900'}`}>
                {({ isActive }) => <>{l.label}{isActive && <motion.span layoutId="lien-actif" className="absolute inset-x-3 -bottom-[13px] h-[3px] rounded-full bg-rouge-500" />}</>}
              </NavLink>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-2">
            {session ? (
              <>
                <Link to={lienEspace(profil?.role)} className="btn-noir"><UserRound size={16} />{profil?.role === 'admin' ? 'Administration' : 'Mon espace'}</Link>
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
              {LIENS.map((l) => <Link key={l.to} to={l.to} onClick={() => setOuvert(false)} className="rounded-xl px-3 py-3 font-semibold text-encre-800 hover:bg-slate-50">{l.label}</Link>)}
              <div className="mt-4 flex flex-col gap-2">
                {session ? (
                  <>
                    <Link to={lienEspace(profil?.role)} onClick={() => setOuvert(false)} className="btn-noir">{profil?.role === 'admin' ? 'Administration' : 'Mon espace'}</Link>
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

      <main className={`relative z-10 flex-1 ${barreBas ? 'pb-16 md:pb-0' : ''}`}>
        <motion.div key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          {children}
        </motion.div>
      </main>

      <footer className="relative z-10 bg-encre-900 text-encre-100/80 mt-16 border-t-4 border-rouge-500">
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
          </div>
        </div>
        <div className="conteneur pb-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-encre-100/70">
          <Link to="/cgu" className="hover:text-white">Conditions d’utilisation</Link>
          <Link to="/confidentialite" className="hover:text-white">Protection des données</Link>
          <Link to="/conditions-recruteurs" className="hover:text-white">Conditions recruteurs</Link>
          <Link to="/reglement-tests" className="hover:text-white">Règlement des tests et points</Link>
          <Link to="/non-discrimination" className="hover:text-white">Non-discrimination</Link>
          <a href="https://www.agence-elite.fr/mentions-legales" className="hover:text-white">Mentions légales</a>
        </div>
        <div className={`border-t border-white/10 py-4 text-center text-xs text-encre-100/60 ${barreBas ? 'pb-20 md:pb-4' : ''}`}>© {new Date().getFullYear()} Agence Elite · L’innovation au service de votre succès · Pointe-Noire, Congo</div>
      </footer>
      <RetourHaut bas={barreBas} />
      {barreBas && (
        <nav aria-label="Navigation principale" className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          <div className="grid grid-cols-4">
            {ONGLETS.map(({ to, label, icone: I, fin }) => (
              <NavLink key={label} to={to} end={fin} className={({ isActive }) => `relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition-colors ${isActive ? 'text-rouge-600' : 'text-slate-500'}`}>
                {({ isActive }) => <>
                  {isActive && <motion.span layoutId="onglet-bas" className="absolute top-0 h-[3px] w-10 rounded-b-full bg-rouge-500" />}
                  <motion.span animate={{ y: isActive ? -1 : 0, scale: isActive ? 1.08 : 1 }}><I size={21} /></motion.span>{label}
                </>}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
