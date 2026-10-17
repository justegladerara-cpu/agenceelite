import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Building2, MailCheck, UserRound } from 'lucide-react'
import { useApp } from '../lib/contexte'
import { configure, messageErreur, supabase } from '../lib/supabase'
import type { Pays } from '../lib/donnees'

function retourApres(role: string | undefined, retour: string | null) {
  if (retour && retour.startsWith('/') && !retour.startsWith('//')) return retour
  if (role === 'admin') return '/admin'
  if (role === 'entreprise') return '/espace-entreprise'
  return '/espace'
}

export function Connexion() {
  const { session, profil, toast } = useApp()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [mdp, setMdp] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [oubli, setOubli] = useState(false)

  useEffect(() => { if (session && profil) nav(retourApres(profil.role, params.get('retour')), { replace: true }) }, [session, profil, nav, params])

  const valider = async (e: FormEvent) => {
    e.preventDefault()
    setEnvoi(true)
    if (oubli) {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/mot-de-passe` })
      setEnvoi(false)
      if (error) return toast(messageErreur(error), 'erreur')
      toast('Si ce compte existe, un e-mail vient de partir pour choisir un nouveau mot de passe.')
      return setOubli(false)
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: mdp })
    setEnvoi(false)
    if (error) toast(messageErreur(error), 'erreur')
  }

  return (
    <div className="conteneur py-12 md:py-20 max-w-md">
      <h1 className="text-3xl font-extrabold text-marine-800">{oubli ? 'Mot de passe oublié' : 'Se connecter'}</h1>
      <p className="text-slate-500 mt-1">{oubli ? 'Entrez votre e-mail : nous vous envoyons un lien.' : 'Candidats, entreprises et administrateurs.'}</p>
      {!configure && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">La plateforme n’est pas encore reliée à sa base de données.</p>}
      <form onSubmit={valider} className="carte mt-6 p-6 space-y-4">
        <div><label className="etiquette" htmlFor="email">E-mail</label><input id="email" type="email" required autoComplete="email" className="champ" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        {!oubli && <div><label className="etiquette" htmlFor="mdp">Mot de passe</label><input id="mdp" type="password" required autoComplete="current-password" className="champ" value={mdp} onChange={(e) => setMdp(e.target.value)} /></div>}
        <button className="btn-primaire w-full" disabled={envoi}>{envoi ? 'Patientez…' : oubli ? 'Recevoir le lien' : 'Se connecter'}</button>
        <button type="button" onClick={() => setOubli(!oubli)} className="w-full text-sm font-semibold text-slate-500 hover:text-marine-800">{oubli ? 'Retour à la connexion' : 'Mot de passe oublié ?'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">Pas encore de compte ? <Link to="/inscription" className="font-semibold text-bordeaux-600">Créer un compte</Link></p>
    </div>
  )
}

export function Inscription() {
  const { session, profil, toast } = useApp()
  const [params] = useSearchParams()
  const nav = useNavigate()
  const [type, setType] = useState<'candidat' | 'entreprise'>(params.get('type') === 'entreprise' ? 'entreprise' : 'candidat')
  const [f, setF] = useState({ nom: '', email: '', telephone: '', pays: 'CG' as Pays, mdp: '' })
  const [accord, setAccord] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [aConfirmer, setAConfirmer] = useState(false)

  useEffect(() => { if (session && profil) nav(retourApres(profil.role, null), { replace: true }) }, [session, profil, nav])

  const valider = async (e: FormEvent) => {
    e.preventDefault()
    if (!accord) return toast('Merci d’accepter la politique de données personnelles.', 'erreur')
    setEnvoi(true)
    const { data, error } = await supabase.auth.signUp({
      email: f.email.trim(), password: f.mdp,
      options: {
        emailRedirectTo: `${window.location.origin}/connexion`,
        data: { app: 'emploi', role: type, consentement: true, nom: f.nom.trim(), telephone: f.telephone.trim(), pays: f.pays },
      },
    })
    setEnvoi(false)
    if (error) return toast(messageErreur(error), 'erreur')
    if (!data.session) setAConfirmer(true)
    else toast('Bienvenue sur Elite Emploi !')
  }

  if (aConfirmer) return (
    <div className="conteneur py-20 max-w-md text-center">
      <MailCheck size={48} className="mx-auto text-emerald-600" />
      <h1 className="mt-4 text-2xl font-extrabold text-marine-800">Vérifiez votre e-mail</h1>
      <p className="mt-2 text-slate-600">Nous avons envoyé un lien à <b>{f.email}</b>. Cliquez dessus pour activer votre compte, puis connectez-vous.</p>
      <Link to="/connexion" className="btn-primaire mt-6">J’ai confirmé, me connecter</Link>
    </div>
  )

  const champ = (cle: keyof typeof f) => ({ value: f[cle], onChange: (e: { target: { value: string } }) => setF({ ...f, [cle]: e.target.value }) })

  return (
    <div className="conteneur py-12 md:py-16 max-w-lg">
      <h1 className="text-3xl font-extrabold text-marine-800">Créer un compte</h1>
      <div className="mt-6 grid grid-cols-2 gap-2">
        {([['candidat', 'Je cherche un emploi', UserRound], ['entreprise', 'Je recrute', Building2]] as const).map(([v, l, I]) => (
          <button key={v} type="button" onClick={() => setType(v)}
            className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-4 font-semibold transition ${type === v ? 'border-bordeaux-600 bg-bordeaux-50 text-bordeaux-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}>
            <I size={24} />{l}
          </button>
        ))}
      </div>
      <form onSubmit={valider} className="carte mt-4 p-6 space-y-4">
        <div><label className="etiquette" htmlFor="nom">{type === 'candidat' ? 'Prénom et nom' : 'Votre nom (contact)'}</label><input id="nom" required className="champ" {...champ('nom')} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="etiquette" htmlFor="tel">Téléphone / WhatsApp</label><input id="tel" type="tel" className="champ" placeholder="+242 …" {...champ('telephone')} /></div>
          <div><label className="etiquette" htmlFor="pays">Pays</label>
            <select id="pays" className="champ" {...champ('pays')}><option value="CG">🇨🇬 Congo</option><option value="FR">🇫🇷 France</option></select>
          </div>
        </div>
        <div><label className="etiquette" htmlFor="email">E-mail</label><input id="email" type="email" required autoComplete="email" className="champ" {...champ('email')} /></div>
        <div><label className="etiquette" htmlFor="mdp">Mot de passe (8 caractères minimum)</label><input id="mdp" type="password" required minLength={8} autoComplete="new-password" className="champ" {...champ('mdp')} /></div>
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input type="checkbox" className="mt-1" checked={accord} onChange={(e) => setAccord(e.target.checked)} />
          <span>J’accepte qu’Agence Elite conserve mes informations{type === 'candidat' ? ' et mon CV pour me proposer des emplois et les transmettre aux recruteurs' : ''}, comme expliqué dans la <Link to="/confidentialite" className="underline" target="_blank">politique de données</Link>.</span>
        </label>
        <button className="btn-primaire w-full" disabled={envoi}>{envoi ? 'Création…' : 'Créer mon compte'}</button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">Déjà inscrit ? <Link to="/connexion" className="font-semibold text-bordeaux-600">Se connecter</Link></p>
    </div>
  )
}

export function NouveauMotDePasse() {
  const { toast } = useApp()
  const nav = useNavigate()
  const [mdp, setMdp] = useState('')
  const valider = async (e: FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.updateUser({ password: mdp })
    if (error) return toast(messageErreur(error), 'erreur')
    toast('Mot de passe changé.')
    nav('/connexion')
  }
  return (
    <div className="conteneur py-16 max-w-md">
      <h1 className="text-2xl font-extrabold text-marine-800">Nouveau mot de passe</h1>
      <form onSubmit={valider} className="carte mt-6 p-6 space-y-4">
        <input type="password" required minLength={8} className="champ" value={mdp} onChange={(e) => setMdp(e.target.value)} placeholder="8 caractères minimum" />
        <button className="btn-primaire w-full">Enregistrer</button>
      </form>
    </div>
  )
}
