import { useState } from 'react'
import { motion } from 'framer-motion'
import { KeyRound, LogIn, ShieldCheck, UserPlus } from 'lucide-react'
import { messageErreur, supabase } from '../lib/supabase'
import { useApp } from '../lib/contexte'

function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-marine-800 via-marine-700 to-marine-900 p-12 text-white relative overflow-hidden">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/5" />
        <div className="absolute -left-10 bottom-10 h-72 w-72 rounded-full bg-emerald-400/10" />
        <div className="flex items-center gap-3 text-xl font-extrabold"><img src="icone.svg" className="h-12 w-12" alt="" />HSE RARA Mercia</div>
        <div>
          <h1 className="text-5xl font-extrabold leading-tight">Zéro accident,<br />c'est l'affaire<br />de tous.</h1>
          <p className="mt-6 text-marine-100 text-lg max-w-md">Suivez la sécurité du site de Kundji en temps réel : saisie du jour, incidents, actions, permis, inspections et tableau de bord.</p>
        </div>
        <div className="flex gap-6 text-sm text-marine-100/80">
          <span className="flex items-center gap-2"><ShieldCheck size={18} />Données protégées</span>
          <span>Trident OGX • MKB II</span>
        </div>
      </div>
      <div className="flex items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 text-xl font-extrabold text-marine-800"><img src="icone.svg" className="h-12 w-12" alt="" />HSE RARA Mercia</div>
          {children}
        </motion.div>
      </div>
    </div>
  )
}

export function Connexion() {
  const [mode, setMode] = useState<'connexion' | 'inscription'>('connexion')
  const [email, setEmail] = useState('')
  const [mdp, setMdp] = useState('')
  const [nom, setNom] = useState('')
  const [erreur, setErreur] = useState('')
  const [info, setInfo] = useState('')
  const [occupe, setOccupe] = useState(false)

  async function envoyer(e: React.FormEvent) {
    e.preventDefault()
    setErreur(''); setInfo(''); setOccupe(true)
    try {
      if (mode === 'connexion') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: mdp })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password: mdp, options: { data: { nom } } })
        if (error) throw error
        if (!data.session) setInfo('Compte créé. Ouvrez le lien reçu par e-mail pour le confirmer, puis connectez-vous.')
      }
    } catch (err) { setErreur(messageErreur(err)) } finally { setOccupe(false) }
  }

  return (
    <Cadre>
      <h2 className="text-3xl font-extrabold text-marine-800">{mode === 'connexion' ? 'Bonjour 👋' : 'Créer mon compte'}</h2>
      <p className="text-slate-500 mt-1 mb-8">{mode === 'connexion' ? 'Connectez-vous pour accéder à la plateforme HSE.' : 'Remplissez ces 3 cases, puis vous entrerez votre code d’accès.'}</p>
      <form onSubmit={envoyer} className="space-y-4">
        {mode === 'inscription' && (
          <div><label className="etiquette">Nom et prénom</label><input className="champ" value={nom} onChange={(e) => setNom(e.target.value)} required /></div>
        )}
        <div><label className="etiquette">Adresse e-mail</label><input className="champ" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div><label className="etiquette">Mot de passe</label><input className="champ" type="password" autoComplete={mode === 'connexion' ? 'current-password' : 'new-password'} value={mdp} onChange={(e) => setMdp(e.target.value)} required minLength={6} /></div>
        {erreur && <p className="rounded-xl bg-rose-50 text-rose-700 px-4 py-3 text-sm">{erreur}</p>}
        {info && <p className="rounded-xl bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">{info}</p>}
        <button className="btn-primaire w-full py-3 text-base" disabled={occupe}>
          {mode === 'connexion' ? <><LogIn size={18} />Se connecter</> : <><UserPlus size={18} />Créer mon compte</>}
        </button>
      </form>
      <button className="mt-6 text-sm text-marine-600 font-semibold hover:underline" onClick={() => { setMode(mode === 'connexion' ? 'inscription' : 'connexion'); setErreur(''); setInfo('') }}>
        {mode === 'connexion' ? 'Pas encore de compte ? Créer un compte' : "J'ai déjà un compte : me connecter"}
      </button>
    </Cadre>
  )
}

export function CodeAcces() {
  const { rechargerMembre, session } = useApp()
  const [code, setCode] = useState('')
  const [nom, setNom] = useState((session?.user.user_metadata?.nom as string) ?? '')
  const [erreur, setErreur] = useState('')
  const [occupe, setOccupe] = useState(false)
  async function envoyer(e: React.FormEvent) {
    e.preventDefault(); setErreur(''); setOccupe(true)
    const { error } = await supabase.rpc('hse_rejoindre', { p_code: code, p_nom: nom })
    setOccupe(false)
    if (error) setErreur(messageErreur(error))
    else await rechargerMembre()
  }
  return (
    <Cadre>
      <div className="h-14 w-14 rounded-2xl bg-amber-100 text-amber-700 grid place-items-center mb-5"><KeyRound /></div>
      <h2 className="text-3xl font-extrabold text-marine-800">Code d'accès</h2>
      <p className="text-slate-500 mt-1 mb-8">Vous êtes connecté avec {session?.user.email}. Entrez le code d'accès HSE reçu de votre responsable (une seule fois).</p>
      <form onSubmit={envoyer} className="space-y-4">
        <div><label className="etiquette">Votre nom</label><input className="champ" value={nom} onChange={(e) => setNom(e.target.value)} /></div>
        <div><label className="etiquette">Code d'accès</label><input className="champ uppercase tracking-widest font-mono" placeholder="HSE-XXXX-XXXX" value={code} onChange={(e) => setCode(e.target.value)} required /></div>
        {erreur && <p className="rounded-xl bg-rose-50 text-rose-700 px-4 py-3 text-sm">{erreur}</p>}
        <button className="btn-primaire w-full py-3 text-base" disabled={occupe}>Valider</button>
      </form>
      <button className="mt-6 text-sm text-slate-500 hover:underline" onClick={() => supabase.auth.signOut()}>Se déconnecter</button>
    </Cadre>
  )
}
