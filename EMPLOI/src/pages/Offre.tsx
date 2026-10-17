import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Briefcase, CheckCircle2, ClipboardCheck, MapPin, Wallet } from 'lucide-react'
import { useOffres } from '../components/Offres'
import { Chargement, Fenetre } from '../components/ui'
import { useApp } from '../lib/contexte'
import { messageErreur, supabase } from '../lib/supabase'
import { CONTRATS, PAYS, dateCourte, salaire } from '../lib/donnees'

export default function Offre() {
  const { id } = useParams()
  const { offres } = useOffres()
  const { session, profil, toast } = useApp()
  const nav = useNavigate()
  const [ouvert, setOuvert] = useState(false)
  const [message, setMessage] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [dejaPostule, setDejaPostule] = useState(false)
  const [aUnCv, setAUnCv] = useState(true)
  const [testsFaits, setTestsFaits] = useState<string[]>([])

  useEffect(() => {
    if (profil?.role !== 'candidat' || !id) return
    supabase.from('emploi_candidatures').select('id').eq('offre_id', id).maybeSingle().then(({ data }) => setDejaPostule(Boolean(data)))
    supabase.from('emploi_candidats').select('cv_chemin').eq('user_id', profil.id).maybeSingle().then(({ data }) => setAUnCv(Boolean(data?.cv_chemin)))
    supabase.from('emploi_resultats').select('test_id').not('termine_le', 'is', null).then(({ data }) => setTestsFaits((data ?? []).map((r) => r.test_id)))
  }, [id, profil])

  if (!offres) return <Chargement />
  const o = offres.find((x) => x.id === id)
  if (!o) return (
    <div className="conteneur py-16 text-center">
      <h1 className="text-2xl font-bold text-marine-800">Cette offre n’est plus disponible</h1>
      <Link to="/offres" className="btn-primaire mt-6">Voir les autres offres</Link>
    </div>
  )

  const postuler = async () => {
    if (!profil) return
    setEnvoi(true)
    const { error } = await supabase.from('emploi_candidatures').insert({ offre_id: o.id, candidat_id: profil.id, message: message.trim() || null })
    setEnvoi(false)
    if (error) return toast(messageErreur(error), 'erreur')
    setOuvert(false); setDejaPostule(true)
    toast('Candidature envoyée ! Suivez-la dans votre espace.')
  }

  const bouton = () => {
    if (!session) return (
      <div className="space-y-2">
        <Link to={`/inscription?retour=/offres/${o.id}`} className="btn-primaire w-full">Postuler : créer mon compte</Link>
        <Link to={`/connexion?retour=/offres/${o.id}`} className="btn-clair w-full">J’ai déjà un compte</Link>
      </div>
    )
    if (profil && profil.role !== 'candidat') return <p className="text-sm text-slate-500">Connectez-vous avec un compte candidat pour postuler.</p>
    if (dejaPostule) return <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-emerald-700 font-semibold"><CheckCircle2 size={18} />Vous avez postulé</div>
    return <button onClick={() => setOuvert(true)} className="btn-primaire w-full">Postuler</button>
  }

  return (
    <div className="conteneur py-8">
      <button onClick={() => nav(-1)} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-marine-800"><ArrowLeft size={16} />Retour</button>
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
        <article className="carte p-6 md:p-8">
          <p className="text-sm font-semibold text-bordeaux-600">{o.metier}</p>
          <h1 className="mt-1 text-3xl font-extrabold text-marine-800">{o.titre}</h1>
          <p className="mt-1 text-slate-500">{o.entreprise_nom ?? 'Entreprise confidentielle'}{o.entreprise_secteur ? ` · ${o.entreprise_secteur}` : ''}</p>
          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-slate-600">
            <span className="inline-flex items-center gap-1.5"><MapPin size={16} />{o.ville}, {PAYS[o.pays].nom}</span>
            <span className="inline-flex items-center gap-1.5"><Briefcase size={16} />{CONTRATS[o.contrat]}{o.teletravail ? ' · télétravail possible' : ''}</span>
            <span className="inline-flex items-center gap-1.5"><Wallet size={16} />{salaire(o.salaire_min, o.salaire_max, o.devise)}</span>
          </div>
          <h2 className="mt-8 text-lg font-bold text-marine-800">Le poste</h2>
          <p className="mt-2 text-slate-700 texte-libre">{o.description}</p>
          {o.missions && <><h2 className="mt-6 text-lg font-bold text-marine-800">Vos missions</h2><p className="mt-2 text-slate-700 texte-libre">{o.missions}</p></>}
          {o.profil && <><h2 className="mt-6 text-lg font-bold text-marine-800">Profil recherché</h2><p className="mt-2 text-slate-700 texte-libre">{o.profil}</p></>}
          <p className="mt-8 text-xs text-slate-400">Publiée le {dateCourte(o.publiee_le)}{o.expire_le ? ` · jusqu’au ${dateCourte(o.expire_le)}` : ''}</p>
        </article>
        <aside className="space-y-4 lg:sticky lg:top-24 self-start">
          <div className="carte p-5 space-y-3">{bouton()}{profil?.role === 'candidat' && !aUnCv && !dejaPostule && <p className="text-xs text-amber-700">Conseil : ajoutez votre CV dans <Link to="/espace" className="underline">votre espace</Link> avant de postuler.</p>}</div>
          {o.tests.length > 0 && (
            <div className="carte p-5">
              <h3 className="font-bold text-marine-800 flex items-center gap-2"><ClipboardCheck size={18} className="text-violet-600" />Tests demandés</h3>
              <p className="text-sm text-slate-500 mt-1">Passez-les pour que votre candidature soit étudiée en priorité.</p>
              <ul className="mt-3 space-y-2">
                {o.tests.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>{t.titre}</span>
                    {testsFaits.includes(t.id) ? <span className="text-emerald-600 font-semibold inline-flex items-center gap-1"><CheckCircle2 size={15} />Fait</span>
                      : <Link to={`/tests/${t.slug}`} className="font-semibold text-bordeaux-600">Passer</Link>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      <Fenetre ouverte={ouvert} onFermer={() => setOuvert(false)} titre={`Postuler : ${o.titre}`}
        pied={<><button className="btn-clair" onClick={() => setOuvert(false)}>Annuler</button><button className="btn-primaire" disabled={envoi} onClick={postuler}>{envoi ? 'Envoi…' : 'Envoyer ma candidature'}</button></>}>
        <p className="text-sm text-slate-600 mb-4">Votre profil et votre CV sont envoyés à Agence Elite, qui étudie votre candidature avant de la présenter à l’entreprise.</p>
        <label className="etiquette" htmlFor="msg">Message (facultatif)</label>
        <textarea id="msg" className="champ min-h-[120px]" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} placeholder="Quelques mots sur votre motivation…" />
      </Fenetre>
    </div>
  )
}
