import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Award, CheckCircle2, ClipboardCheck, Clock, Lock, XCircle } from 'lucide-react'
import { Chargement, Pastille } from '../components/ui'
import { Cascade, CascadeElement } from '../components/anim'
import { useApp } from '../lib/contexte'
import { messageErreur, supabase } from '../lib/supabase'
import type { Test } from '../lib/donnees'

type Resultat = { test_id: string; pourcentage: number | null; reussi: boolean | null; termine_le: string | null }

function useTests() {
  const [tests, setTests] = useState<Test[] | null>(null)
  useEffect(() => {
    supabase.from('emploi_tests').select('*').eq('actif', true).order('ordre').then(({ data }) => setTests((data as Test[]) ?? []))
  }, [])
  return tests
}

export function useMesResultats() {
  const { profil } = useApp()
  const [resultats, setResultats] = useState<Resultat[]>([])
  useEffect(() => {
    if (profil?.role !== 'candidat') return
    supabase.from('emploi_resultats').select('test_id, pourcentage, reussi, termine_le').eq('candidat_id', profil.id)
      .not('termine_le', 'is', null).order('termine_le', { ascending: false })
      .then(({ data }) => setResultats((data as Resultat[]) ?? []))
  }, [profil])
  return resultats
}

export function Tests() {
  const tests = useTests()
  const resultats = useMesResultats()
  const parCategorie = useMemo(() => {
    const m = new Map<string, Test[]>()
    for (const t of tests ?? []) m.set(t.categorie, [...(m.get(t.categorie) ?? []), t])
    return [...m.entries()]
  }, [tests])

  return (
    <div className="conteneur py-10">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-extrabold text-encre-800">Tests de compétences</h1>
        <p className="mt-2 text-slate-600">Montrez ce que vous savez faire. Vos résultats sont joints à votre profil et envoyés aux recruteurs avec votre CV. Chaque test se passe une fois par mois.</p>
      </div>
      {!tests ? <Chargement /> : parCategorie.map(([cat, liste]) => (
        <section key={cat} className="mt-10">
          <h2 className="text-xl font-bold text-encre-800 mb-4">{cat}</h2>
          <Cascade className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {liste.map((t) => {
              const r = resultats.find((x) => x.test_id === t.id)
              return (
                <CascadeElement key={t.id}><Link to={`/tests/${t.slug}`} className="carte group h-full p-5 transition duration-300 hover:-translate-y-1 hover:border-rouge-300 hover:shadow-[0_18px_40px_-20px_rgba(11,11,12,.35)] flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-encre-900 text-white transition-colors duration-300 group-hover:bg-rouge-600"><ClipboardCheck size={20} /></span>
                    {r && <Pastille couleur={r.reussi ? 'emerald' : 'amber'}>{r.pourcentage} %</Pastille>}
                  </div>
                  <h3 className="mt-3 font-bold text-encre-800">{t.titre}</h3>
                  <p className="mt-1 text-sm text-slate-500 flex-1">{t.description}</p>
                  <p className="mt-3 text-xs text-slate-400 inline-flex items-center gap-1"><Clock size={13} />{t.duree_minutes} min · réussite à {t.seuil_reussite} %</p>
                </Link></CascadeElement>
              )
            })}
          </Cascade>
        </section>
      ))}
    </div>
  )
}

type Question = { id: string; ordre: number; enonce: string; choix: string[] }
type Etat = 'accueil' | 'en_cours' | 'fini'

export function PasserTest() {
  const { slug } = useParams()
  const { session, profil, toast } = useApp()
  const nav = useNavigate()
  const [test, setTest] = useState<Test | null | undefined>(undefined)
  const [questions, setQuestions] = useState<Question[]>([])
  const [etat, setEtat] = useState<Etat>('accueil')
  const [resultatId, setResultatId] = useState('')
  const [fin, setFin] = useState(0)
  const [reste, setReste] = useState(0)
  const [index, setIndex] = useState(0)
  const [reponses, setReponses] = useState<Record<string, number>>({})
  const [note, setNote] = useState<{ score: number; total: number; pourcentage: number; reussi: boolean } | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const envoye = useRef(false)

  useEffect(() => {
    supabase.from('emploi_tests').select('*').eq('slug', slug ?? '').maybeSingle().then(({ data }) => setTest((data as Test) ?? null))
  }, [slug])

  const terminer = useCallback(async () => {
    if (envoye.current) return
    envoye.current = true
    setEnvoi(true)
    const { data, error } = await supabase.rpc('emploi_soumettre_test', { p_resultat: resultatId, p_reponses: reponses })
    setEnvoi(false)
    if (error) { envoye.current = false; return toast(messageErreur(error), 'erreur') }
    setNote((data as typeof note[])[0])
    setEtat('fini')
  }, [resultatId, reponses, toast])

  useEffect(() => {
    if (etat !== 'en_cours') return
    const t = setInterval(() => {
      const s = Math.max(0, Math.round((fin - Date.now()) / 1000))
      setReste(s)
      if (s === 0) { clearInterval(t); terminer() }
    }, 500)
    return () => clearInterval(t)
  }, [etat, fin, terminer])

  // Ordre d'affichage des choix mélangé pour chaque candidat ; on renvoie toujours l'index d'origine.
  const ordres = useMemo(() => Object.fromEntries(questions.map((q) => {
    const o = q.choix.map((_, i) => i)
    for (let i = o.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [o[i], o[j]] = [o[j], o[i]] }
    return [q.id, o]
  })), [questions])

  const commencer = async () => {
    if (!test) return
    const { data, error } = await supabase.rpc('emploi_commencer_test', { p_test: test.id })
    if (error) return toast(messageErreur(error), 'erreur')
    const r = (data as { resultat_id: string; debut_le: string; duree_minutes: number }[])[0]
    const { data: qs, error: e2 } = await supabase.from('emploi_questions').select('id, ordre, enonce, choix').eq('test_id', test.id).order('ordre')
    if (e2) return toast(messageErreur(e2), 'erreur')
    setQuestions((qs as Question[]) ?? [])
    setResultatId(r.resultat_id)
    setFin(new Date(r.debut_le).getTime() + r.duree_minutes * 60000)
    setReste(r.duree_minutes * 60)
    setEtat('en_cours')
  }

  if (test === undefined) return <Chargement />
  if (test === null) return <div className="conteneur py-16 text-center"><h1 className="text-2xl font-bold">Test introuvable</h1><Link to="/tests" className="btn-primaire mt-4">Voir les tests</Link></div>

  if (etat === 'fini' && note) return (
    <div className="conteneur py-16 max-w-lg text-center">
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        {note.reussi ? <Award size={64} className="mx-auto text-rouge-400" /> : <XCircle size={64} className="mx-auto text-slate-400" />}
      </motion.div>
      <h1 className="mt-4 text-3xl font-extrabold text-encre-800">{note.pourcentage} %</h1>
      <p className="mt-1 text-slate-600">{note.score} bonnes réponses sur {note.total}</p>
      <p className="mt-4 text-lg font-semibold">{note.reussi ? 'Bravo, test réussi ! Le résultat est ajouté à votre profil.' : `Pas cette fois. Il fallait ${test.seuil_reussite} %. Vous pourrez le repasser dans 30 jours.`}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link to="/tests" className="btn-clair">Autres tests</Link>
        <Link to="/offres" className="btn-primaire">Voir les offres</Link>
      </div>
    </div>
  )

  if (etat === 'en_cours') {
    const q = questions[index]
    const repondu = Object.keys(reponses).length
    const mm = String(Math.floor(reste / 60)).padStart(2, '0'), ss = String(reste % 60).padStart(2, '0')
    if (!q) return <Chargement />
    return (
      <div className="conteneur py-8 max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-bold text-encre-800">{test.titre}</h1>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono font-bold ${reste < 60 ? 'bg-rose-100 text-rose-700' : 'bg-encre-50 text-encre-800'}`}><Clock size={16} />{mm}:{ss}</span>
        </div>
        <div className="mt-4 h-2 rounded-full bg-slate-200 overflow-hidden"><div className="h-full bg-rouge-600 transition-all" style={{ width: `${(repondu / questions.length) * 100}%` }} /></div>
        <AnimatePresence mode="wait">
          <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="carte mt-6 p-6">
            <p className="text-sm font-semibold text-slate-400">Question {index + 1} sur {questions.length}</p>
            <h2 className="mt-2 text-xl font-bold text-encre-800 font-sans">{q.enonce}</h2>
            <div className="mt-5 space-y-2">
              {ordres[q.id]?.map((i) => (
                <button key={i} onClick={() => setReponses({ ...reponses, [q.id]: i })}
                  className={`w-full text-left rounded-xl border-2 px-4 py-3 transition ${reponses[q.id] === i ? 'border-rouge-600 bg-rouge-50 font-semibold' : 'border-slate-200 hover:border-slate-300'}`}>
                  {q.choix[i]}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
        <div className="mt-5 flex justify-between gap-2">
          <button className="btn-clair" disabled={index === 0} onClick={() => setIndex(index - 1)}>Précédente</button>
          {index < questions.length - 1
            ? <button className="btn-noir" onClick={() => setIndex(index + 1)}>Suivante</button>
            : <button className="btn-primaire" disabled={envoi} onClick={() => { if (repondu < questions.length && !confirm(`Vous avez répondu à ${repondu} questions sur ${questions.length}. Terminer quand même ?`)) return; terminer() }}>{envoi ? 'Correction…' : 'Terminer le test'}</button>}
        </div>
        <div className="mt-6 flex flex-wrap gap-1.5 justify-center">
          {questions.map((x, i) => (
            <button key={x.id} onClick={() => setIndex(i)} aria-label={`Question ${i + 1}`}
              className={`h-8 w-8 rounded-lg text-xs font-bold ${i === index ? 'bg-encre-800 text-white' : reponses[x.id] !== undefined ? 'bg-emerald-100 text-emerald-700' : 'bg-white border border-slate-200 text-slate-500'}`}>{i + 1}</button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="conteneur py-12 max-w-xl">
      <div className="carte p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-encre-900 text-white"><ClipboardCheck /></span>
        <p className="mt-4 text-sm font-semibold text-rouge-600">{test.categorie}</p>
        <h1 className="text-2xl font-extrabold text-encre-800">{test.titre}</h1>
        <p className="mt-2 text-slate-600">{test.description}</p>
        <ul className="mt-5 space-y-2 text-sm text-slate-700">
          <li className="flex gap-2"><Clock size={18} className="text-slate-400" />{test.duree_minutes} minutes. Le chrono continue même si vous fermez la page.</li>
          <li className="flex gap-2"><CheckCircle2 size={18} className="text-slate-400" />Une seule bonne réponse par question. Réussite à partir de {test.seuil_reussite} %.</li>
          <li className="flex gap-2"><Lock size={18} className="text-slate-400" />Un seul essai par mois : installez-vous au calme avant de commencer.</li>
        </ul>
        <div className="mt-8">
          {!session ? <button className="btn-primaire w-full" onClick={() => nav(`/connexion?retour=/tests/${test.slug}`)}>Se connecter pour passer le test</button>
            : profil?.role !== 'candidat' ? <p className="text-sm text-slate-500">Les tests se passent avec un compte candidat.</p>
              : <button className="btn-primaire w-full" onClick={commencer}>Commencer le test</button>}
        </div>
      </div>
    </div>
  )
}
