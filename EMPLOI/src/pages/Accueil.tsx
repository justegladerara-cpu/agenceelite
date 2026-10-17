import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BadgeCheck, Building2, ClipboardCheck, FileText, Search, Send, UserRound } from 'lucide-react'
import { OffreCarte, useOffres } from '../components/Offres'
import { Chargement } from '../components/ui'
import { PAYS, type Pays } from '../lib/donnees'

export default function Accueil() {
  const { offres } = useOffres()
  const nav = useNavigate()
  const [texte, setTexte] = useState('')
  const [pays, setPays] = useState<'' | Pays>('')

  const chercher = (e: FormEvent) => {
    e.preventDefault()
    const p = new URLSearchParams()
    if (texte.trim()) p.set('q', texte.trim())
    if (pays) p.set('pays', pays)
    nav(`/offres?${p}`)
  }
  const nb = (code: Pays) => offres?.filter((o) => o.pays === code).length ?? 0

  return (
    <>
      <section className="relative overflow-hidden bg-encre-900 text-white">
        <img src={`${import.meta.env.BASE_URL}marque-ae-blanc.png`} alt="" aria-hidden="true"
          className="pointer-events-none absolute -right-16 top-1/2 hidden w-[560px] -translate-y-1/2 opacity-[.07] md:block" />
        <div className="absolute inset-x-0 bottom-0 h-1 bg-rouge-500" />
        <div className="conteneur relative py-16 md:py-24">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white font-semibold"><BadgeCheck size={16} className="text-rouge-400" />Recrutement par Agence Elite</p>
            <h1 className="mt-5 text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight">Trouvez un emploi au <span className="text-rouge-500">Congo</span> et en <span className="text-rouge-500">France</span></h1>
            <p className="mt-5 text-lg text-encre-100/85 max-w-xl">Postulez en un clic, passez nos tests de compétences et faites-vous remarquer par les recruteurs.</p>
          </motion.div>
          <form onSubmit={chercher} className="mt-8 grid gap-2 rounded-2xl bg-white p-2 shadow-2xl md:grid-cols-[1fr_200px_auto] max-w-3xl">
            <label className="flex items-center gap-2 px-3 text-slate-700">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Métier, poste, mot-clé…" className="w-full py-3 outline-none" />
            </label>
            <select value={pays} onChange={(e) => setPays(e.target.value as '' | Pays)} className="rounded-xl bg-slate-50 px-3 py-3 text-slate-700 outline-none">
              <option value="">Congo et France</option>
              <option value="CG">🇨🇬 Congo</option>
              <option value="FR">🇫🇷 France</option>
            </select>
            <button className="btn-primaire py-3">Rechercher</button>
          </form>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            {(['CG', 'FR'] as Pays[]).filter((c) => nb(c) > 0).map((c) => (
              <Link key={c} to={`/offres?pays=${c}`} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 hover:bg-white/15">{PAYS[c].drapeau} {nb(c)} offre{nb(c) > 1 ? 's' : ''} {c === 'CG' ? 'au' : 'en'} {PAYS[c].nom}</Link>
            ))}
          </div>
        </div>
      </section>

      <section className="conteneur -mt-px">
        <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-b-2xl border border-t-0 border-slate-200 bg-white/90 text-center shadow-carte backdrop-blur">
          {[['13', 'tests de compétences'], ['2', 'pays : Congo et France'], ['1 clic', 'pour postuler']].map(([n, t]) => (
            <div key={t} className="px-2 py-4 md:py-5"><div className="font-titre text-xl md:text-2xl font-extrabold text-encre-900">{n}</div><div className="text-xs md:text-sm text-slate-500">{t}</div></div>
          ))}
        </div>
      </section>

      <section className="conteneur py-14">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="trait text-2xl md:text-3xl font-extrabold text-encre-900">Dernières offres</h2>
            <p className="mt-2 text-slate-500">Vérifiées par Agence Elite avant publication.</p>
          </div>
          <Link to="/offres" className="btn-clair hidden sm:inline-flex">Toutes les offres</Link>
        </div>
        {!offres ? <Chargement /> : offres.length === 0 ? (
          <div className="carte p-8 text-center text-slate-500">Les premières offres arrivent bientôt. Créez votre compte pour être prêt à postuler.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{offres.slice(0, 6).map((o) => <OffreCarte key={o.id} o={o} />)}</div>
        )}
      </section>

      <section className="bg-white/85 backdrop-blur-sm border-y border-slate-100">
        <div className="conteneur py-14 grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-extrabold text-encre-800 flex items-center gap-2"><UserRound className="text-rouge-600" />Vous cherchez un emploi</h2>
            <ol className="mt-6 space-y-4">
              {[
                { i: FileText, t: 'Créez votre profil', d: 'Ajoutez votre CV en PDF ou Word. Il sert pour toutes vos candidatures.' },
                { i: ClipboardCheck, t: 'Passez nos tests', d: 'Excel, français, anglais, vente, comptabilité… Un bon score vous fait passer devant.' },
                { i: Send, t: 'Postulez en un clic', d: 'Suivez chaque candidature depuis votre espace.' },
              ].map(({ i: I, t, d }, n) => (
                <li key={t} className="flex gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rouge-50 text-rouge-600"><I size={20} /></span><div><div className="font-bold text-encre-800">{n + 1}. {t}</div><p className="text-slate-600 text-sm">{d}</p></div></li>
              ))}
            </ol>
            <Link to="/inscription" className="btn-primaire mt-6">Créer mon compte candidat</Link>
          </div>
          <div className="relative overflow-hidden rounded-3xl bg-encre-900 p-8 text-white">
            <div className="absolute right-0 top-0 h-2 w-40 rounded-bl-xl bg-rouge-500" />
            <h2 className="text-2xl font-extrabold flex items-center gap-2"><Building2 className="text-rouge-400" />Vous recrutez</h2>
            <p className="mt-4 text-encre-100/85">Publiez votre besoin. Agence Elite trie les candidatures, fait passer les tests et vous envoie uniquement des CV qualifiés, avec les résultats.</p>
            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex gap-2"><BadgeCheck size={18} className="text-rouge-400 shrink-0" />Vous ne payez que les profils qualifiés reçus</li>
              <li className="flex gap-2"><BadgeCheck size={18} className="text-rouge-400 shrink-0" />Résultats des tests joints à chaque CV</li>
              <li className="flex gap-2"><BadgeCheck size={18} className="text-rouge-400 shrink-0" />Congo et France</li>
            </ul>
            <Link to="/entreprises" className="btn-blanc mt-6">Recruter avec nous</Link>
          </div>
        </div>
      </section>
    </>
  )
}
