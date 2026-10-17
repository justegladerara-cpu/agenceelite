import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BadgeCheck, Building2, ClipboardCheck, FileText, Search, Send, UserRound } from 'lucide-react'
import { OffreCarte, useOffres } from '../components/Offres'
import { Chargement, Compteur } from '../components/ui'
import { Apparait, Cascade, CascadeElement } from '../components/anim'
import { PAYS, type Pays } from '../lib/donnees'

const HAUT = { cache: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } } as const

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
        <motion.img src={`${import.meta.env.BASE_URL}marque-ae-blanc.png`} alt="" aria-hidden="true"
          initial={{ opacity: 0, x: 60, rotate: -4 }} animate={{ opacity: 0.07, x: 0, rotate: 0 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="pointer-events-none absolute -right-16 top-1/2 hidden w-[560px] -translate-y-1/2 md:block" />
        <motion.div aria-hidden="true" className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-rouge-500/20 blur-3xl"
          animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.15, 1] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div aria-hidden="true" className="pointer-events-none absolute right-10 bottom-0 h-56 w-56 rounded-full bg-white/5 blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, -20, 0] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute inset-x-0 bottom-0 h-1 origin-left bg-rouge-500" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} />
        <div className="conteneur relative py-16 md:py-24">
          <motion.div initial="cache" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }} className="max-w-2xl">
            <motion.p variants={HAUT} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white font-semibold"><BadgeCheck size={16} className="text-rouge-400" />Recrutement par Agence Elite</motion.p>
            <motion.h1 variants={HAUT} className="mt-5 text-4xl md:text-6xl font-extrabold leading-[1.05] tracking-tight">Trouvez un emploi au <span className="text-rouge-500">Congo</span> et en <span className="text-rouge-500">France</span></motion.h1>
            <motion.p variants={HAUT} className="mt-5 text-lg text-encre-100/85 max-w-xl">Postulez en un clic, passez nos tests de compétences et faites-vous remarquer par les recruteurs.</motion.p>
          </motion.div>
          <motion.form initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.45, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            onSubmit={chercher} className="mt-8 grid gap-2 rounded-2xl bg-white p-2 shadow-2xl md:grid-cols-[1fr_200px_auto] max-w-3xl">
            <label className="flex items-center gap-2 px-3 text-slate-700">
              <Search size={18} className="text-slate-400 shrink-0" />
              <input value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Métier, poste, mot-clé…" className="w-full py-3 outline-none" />
            </label>
            <select value={pays} onChange={(e) => setPays(e.target.value as '' | Pays)} className="rounded-xl bg-slate-50 px-3 py-3 text-slate-700 outline-none">
              <option value="">Congo et France</option>
              <option value="CG">🇨🇬 Congo</option>
              <option value="FR">🇫🇷 France</option>
            </select>
            <button className="btn-primaire py-3"><Search size={17} />Rechercher</button>
          </motion.form>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            {(['CG', 'FR'] as Pays[]).filter((c) => nb(c) > 0).map((c) => (
              <Link key={c} to={`/offres?pays=${c}`} className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 hover:bg-white/15">{PAYS[c].drapeau} {nb(c)} offre{nb(c) > 1 ? 's' : ''} {c === 'CG' ? 'au' : 'en'} {PAYS[c].nom}</Link>
            ))}
          </div>
        </div>
      </section>

      <section className="conteneur -mt-px">
        <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-b-2xl border border-t-0 border-slate-200 bg-white/90 text-center shadow-carte backdrop-blur">
          {([[13, '', 'tests de compétences'], [2, '', 'pays : Congo et France'], [1, ' clic', 'pour postuler']] as const).map(([n, suite, t], i) => (
            <motion.div key={t} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.1 }} className="px-2 py-4 md:py-5">
              <div className="font-titre text-xl md:text-2xl font-extrabold text-encre-900"><Compteur valeur={n} />{suite}</div><div className="text-xs md:text-sm text-slate-500">{t}</div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="conteneur py-14">
        <Apparait className="flex items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="trait text-2xl md:text-3xl font-extrabold text-encre-900">Dernières offres</h2>
            <p className="mt-2 text-slate-500">Vérifiées par Agence Elite avant publication.</p>
          </div>
          <Link to="/offres" className="btn-clair hidden sm:inline-flex">Toutes les offres</Link>
        </Apparait>
        {!offres ? <Chargement /> : offres.length === 0 ? (
          <div className="carte p-8 text-center text-slate-500">Les premières offres arrivent bientôt. Créez votre compte pour être prêt à postuler.</div>
        ) : (
          <Cascade className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{offres.slice(0, 6).map((o) => <CascadeElement key={o.id}><OffreCarte o={o} /></CascadeElement>)}</Cascade>
        )}
      </section>

      <section className="bg-white/85 backdrop-blur-sm border-y border-slate-100">
        <div className="conteneur py-14 grid gap-10 lg:grid-cols-2">
          <Apparait>
            <h2 className="text-2xl font-extrabold text-encre-800 flex items-center gap-2"><UserRound className="text-rouge-600" />Vous cherchez un emploi</h2>
            <Cascade className="mt-6 space-y-4" pas={0.12}>
              {[
                { i: FileText, t: 'Créez votre profil', d: 'Ajoutez votre CV en PDF ou Word. Il sert pour toutes vos candidatures.' },
                { i: ClipboardCheck, t: 'Passez nos tests', d: 'Excel, français, anglais, vente, comptabilité… Un bon score vous fait passer devant.' },
                { i: Send, t: 'Postulez en un clic', d: 'Suivez chaque candidature depuis votre espace.' },
              ].map(({ i: I, t, d }, n) => (
                <CascadeElement key={t} className="group flex gap-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rouge-50 text-rouge-600 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6"><I size={20} /></span><div><div className="font-bold text-encre-800">{n + 1}. {t}</div><p className="text-slate-600 text-sm">{d}</p></div></CascadeElement>
              ))}
            </Cascade>
            <Link to="/inscription" className="btn-primaire mt-6">Créer mon compte candidat</Link>
          </Apparait>
          <Apparait delai={0.15} className="relative overflow-hidden rounded-3xl bg-encre-900 p-8 text-white">
            <div className="absolute right-0 top-0 h-2 w-40 rounded-bl-xl bg-rouge-500" />
            <h2 className="text-2xl font-extrabold flex items-center gap-2"><Building2 className="text-rouge-400" />Vous recrutez</h2>
            <p className="mt-4 text-encre-100/85">Publiez votre besoin. Agence Elite trie les candidatures, fait passer les tests et vous envoie uniquement des CV qualifiés, avec les résultats.</p>
            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex gap-2"><BadgeCheck size={18} className="text-rouge-400 shrink-0" />Vous ne payez que les profils qualifiés reçus</li>
              <li className="flex gap-2"><BadgeCheck size={18} className="text-rouge-400 shrink-0" />Résultats des tests joints à chaque CV</li>
              <li className="flex gap-2"><BadgeCheck size={18} className="text-rouge-400 shrink-0" />Congo et France</li>
            </ul>
            <Link to="/entreprises" className="btn-blanc mt-6">Recruter avec nous</Link>
          </Apparait>
        </div>
      </section>
    </>
  )
}
