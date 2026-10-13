import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ReferenceLine,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarCheck, Download, LayoutDashboard, Minus as Egal } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/contexte'
import { Compteur, EnTete, Pastille, useMemoire } from '../components/ui'
import { dateFr, deIso, iso, joursEntre, MOIS, MOIS_COURT, nombre, entier } from '../lib/format'
import {
  dansPeriode, EVENEMENTS, GRAVES, heures, moisEcoules, parMois, periode, periodePrecedente, resume, somme,
  type Jour, type Mois,
} from '../lib/stats'
import { exporterExcel } from '../lib/excel'
import { LIBELLE_JOUR, TYPES_INCIDENT } from '../lib/modules'

const COUL = {
  rouge: '#e11d48', orange: '#f97316', ambre: '#f59e0b', jaune: '#eab308', vert: '#16a34a', vertClair: '#86efac',
  bleu: '#2563eb', bleuClair: '#93c5fd', marine: '#0f2a4a', gris: '#94a3b8', violet: '#7c3aed', teal: '#0d9488',
}
const axe = { fontSize: 12, fill: '#64748b' }
const grille = <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
const infobulle = { contentStyle: { borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 8px 24px -12px rgba(15,42,74,.3)', fontSize: 13 } }

function Bloc({ titre, sousTitre, children, className = '', action }: { titre: string; sousTitre?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-40px' }} transition={{ duration: 0.45 }}
      className={`carte p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-marine-800">{titre}</h3>
          {sousTitre && <p className="text-xs text-slate-500 mt-0.5">{sousTitre}</p>}
        </div>
        {action}
      </div>
      {children}
    </motion.section>
  )
}

type Tuile = { titre: string; valeur: number; dec?: number; sous: string; etat?: 'bon' | 'mauvais' | 'neutre'; avant?: number; mieuxSiMoins?: boolean; aide: string }

function Evolution({ v, avant, mieuxSiMoins }: { v: number; avant?: number; mieuxSiMoins?: boolean }) {
  if (avant == null) return null
  if (avant === 0 && v === 0) return <span className="inline-flex items-center gap-0.5 text-xs text-slate-400"><Egal size={14} />stable</span>
  const hausse = v > avant
  const bon = mieuxSiMoins ? !hausse : hausse
  const pct = avant === 0 ? null : Math.round(((v - avant) / avant) * 100)
  if (v === avant) return <span className="inline-flex items-center gap-0.5 text-xs text-slate-400"><Egal size={14} />stable</span>
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-bold ${bon ? 'text-emerald-600' : 'text-rose-600'}`}>
      {hausse ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}{pct == null ? 'nouveau' : `${pct > 0 ? '+' : ''}${pct} %`}
    </span>
  )
}

function CarteTuile({ t, i }: { t: Tuile; i: number }) {
  const fond = t.etat === 'bon' ? 'from-emerald-50 to-white ring-emerald-100' : t.etat === 'mauvais' ? 'from-rose-50 to-white ring-rose-100' : 'from-white to-white ring-slate-100'
  const texte = t.etat === 'bon' ? 'text-emerald-700' : t.etat === 'mauvais' ? 'text-rose-700' : 'text-marine-800'
  return (
    <motion.div initial={{ opacity: 0, y: 14, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: i * 0.05, duration: 0.4 }}
      title={t.aide} className={`rounded-2xl bg-gradient-to-b ${fond} ring-1 shadow-carte p-4 flex flex-col`}>
      <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 leading-tight min-h-[28px]">{t.titre}</div>
      <div className={`text-3xl md:text-[34px] font-extrabold mt-1 ${texte}`}><Compteur valeur={t.valeur} decimales={t.dec ?? 0} /></div>
      <div className="mt-auto pt-1 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-500 truncate">{t.sous}</span>
        <Evolution v={t.valeur} avant={t.avant} mieuxSiMoins={t.mieuxSiMoins} />
      </div>
    </motion.div>
  )
}

export default function TableauDeBord() {
  const { site, objectifs } = useApp()
  const now = new Date()
  const [annee, setAnnee] = useMemoire('tdb-annee', now.getFullYear())
  const [mois, setMois] = useMemoire<number | null>('tdb-mois', null)
  const [rows, setRows] = useState<Jour[]>([])
  const [dernierArret, setDernierArret] = useState(site.dernier_arret)
  const [dernierIncident, setDernierIncident] = useState(site.dernier_incident)
  const [incidents, setIncidents] = useState<Record<string, unknown>[]>([])
  const [actions, setActions] = useState<Record<string, unknown>[]>([])
  const [charge, setCharge] = useState(false)

  useEffect(() => {
    setCharge(false)
    Promise.all([
      supabase.from('hse_journal').select('*').gte('jour', `${annee - 1}-01-01`).lte('jour', `${annee}-12-31`).order('jour'),
      supabase.from('hse_journal').select('jour').gt('accidents_arret', 0).order('jour', { ascending: false }).limit(1),
      supabase.from('hse_journal').select('jour').or(EVENEMENTS.map((c) => `${c}.gt.0`).join(',')).order('jour', { ascending: false }).limit(1),
      supabase.from('hse_incidents').select('id, num, titre, type, gravite, statut, date_evt').order('date_evt', { ascending: false }).limit(200),
      supabase.from('hse_actions').select('id, num, titre, responsable, echeance, statut, priorite').limit(500),
    ]).then(([j, a, e, inc, act]) => {
      setRows((j.data ?? []) as Jour[])
      const da = (a.data?.[0]?.jour as string | undefined) ?? ''
      const de = (e.data?.[0]?.jour as string | undefined) ?? ''
      setDernierArret(da > site.dernier_arret ? da : site.dernier_arret)
      setDernierIncident(de > site.dernier_incident ? de : site.dernier_incident)
      setIncidents(inc.data ?? []); setActions(act.data ?? [])
      setCharge(true)
    })
  }, [annee, site.dernier_arret, site.dernier_incident])

  const p = periode(annee, mois)
  const pp = periodePrecedente(p)
  const r = useMemo(() => resume(rows, p, site), [rows, p.debut, p.fin, site])
  const rp = useMemo(() => resume(rows, pp, site), [rows, pp.debut, pp.fin, site])
  const mensuel = useMemo(() => parMois(rows, annee, site).map((m) => ({ ...m, nom: MOIS_COURT[m.mois] }) as Mois & { nom: string }), [rows, annee, site])
  // Pour les courbes : on ne trace pas les mois à venir (sinon la courbe tombe à zéro).
  const mensuelCourbe = useMemo(() => {
    const now = new Date()
    return mensuel.map((m) => annee > now.getFullYear() || (annee === now.getFullYear() && m.mois > now.getMonth())
      ? { ...m, prevention: undefined, trir: undefined, trirCumul: undefined } : m)
  }, [mensuel, annee])
  const dansP = useMemo(() => dansPeriode(rows, p), [rows, p.debut, p.fin])
  const auj = new Date()
  const jSansArret = joursEntre(deIso(dernierArret), auj)
  const jSansIncident = joursEntre(deIso(dernierIncident), auj)
  const nbMois = moisEcoules(annee, mois)

  const tuilesReactives: Tuile[] = [
    { titre: 'Jours sans accident avec arrêt', valeur: jSansArret, sous: `depuis le ${dateFr(dernierArret)}`, etat: jSansArret >= 30 ? 'bon' : 'mauvais', aide: 'Nombre de jours depuis le dernier accident avec arrêt de travail' },
    { titre: 'Jours sans incident', valeur: jSansIncident, sous: `depuis le ${dateFr(dernierIncident)}`, etat: jSansIncident >= 30 ? 'bon' : 'neutre', aide: 'Jours depuis le dernier accident ou dégât' },
    { titre: 'Accidents graves', valeur: r.graves, sous: 'sur la période', etat: r.graves === 0 ? 'bon' : 'mauvais', avant: rp.graves, mieuxSiMoins: true, aide: 'Décès + arrêts + travail limité + soins médicaux' },
    { titre: 'TRIR', valeur: r.trir, dec: 2, sous: `objectif ≤ ${nombre(site.objectif_trir, 2)}`, etat: r.trir <= site.objectif_trir ? 'bon' : 'mauvais', avant: rp.trir, mieuxSiMoins: true, aide: 'Accidents graves × 200 000 ÷ heures travaillées' },
    { titre: 'Taux de fréquence', valeur: r.tf, dec: 2, sous: 'arrêts / million h', etat: r.tf === 0 ? 'bon' : 'mauvais', avant: rp.tf, mieuxSiMoins: true, aide: 'Accidents avec arrêt × 1 000 000 ÷ heures travaillées' },
  ]
  const tuilesProactives: Tuile[] = [
    { titre: 'Presque-accidents et dangers signalés', valeur: r.signalements, sous: 'plus = mieux', avant: rp.signalements, aide: 'Signaler permet d’éviter les accidents' },
    { titre: 'Activités de prévention', valeur: r.prevention, sous: 'JSA, causeries, inspections…', avant: rp.prevention, aide: 'Inspections + causeries + JSA + formations + exercices + réunions' },
    { titre: 'Permis de travail', valeur: r.permis, sous: 'délivrés', avant: rp.permis, etat: 'neutre', aide: 'À chaud + à froid + espace confiné' },
    { titre: 'Heures travaillées', valeur: r.heures, sous: 'sur la période', avant: rp.heures, etat: 'neutre', aide: 'Heures réelles, sinon personnes × heures par jour' },
    { titre: 'Personnes par jour', valeur: r.personnesMoy, sous: 'en moyenne', avant: rp.personnesMoy, etat: 'neutre', aide: 'Moyenne des jours où le personnel est saisi' },
  ]

  // Objectifs de prévention
  const objectifsLignes = [
    ['inspections', 'Inspections / audits'], ['causeries', 'Causeries sécurité'], ['jsa', 'Analyses de risques (JSA)'],
    ['formations', 'Formations'], ['reunions_generales', 'Réunions générales'], ['exercices', "Exercices d'urgence"],
  ].map(([cle, libelle]) => {
    const obj = (objectifs[cle] ?? 0) * nbMois
    const fait = somme(dansP, [cle])
    return { cle, libelle, obj, fait, taux: obj > 0 ? fait / obj : 1 }
  })
  const objOk = objectifsLignes.filter((o) => o.obj > 0 && o.fait >= o.obj).length
  const objTotal = objectifsLignes.filter((o) => o.obj > 0).length

  // Pyramide et répartition
  const pyramide = [
    { nom: 'Décès', v: somme(dansP, ['deces']), c: '#7f1d1d' },
    { nom: 'Accidents avec arrêt', v: somme(dansP, ['accidents_arret']), c: COUL.rouge },
    { nom: 'Travail limité + soins', v: somme(dansP, ['travail_limite', 'soins_medicaux']), c: COUL.orange },
    { nom: 'Premiers soins', v: somme(dansP, ['premiers_soins']), c: COUL.ambre },
    { nom: 'Presque-accidents', v: somme(dansP, ['presque_accidents']), c: COUL.jaune },
    { nom: 'Dangers signalés', v: somme(dansP, ['dangers']), c: '#facc15' },
  ]
  const repartition = [
    { nom: 'Accidents graves', v: somme(dansP, GRAVES), c: COUL.rouge },
    { nom: 'Premiers soins', v: somme(dansP, ['premiers_soins']), c: COUL.ambre },
    { nom: 'Dégâts matériels', v: somme(dansP, ['degats']), c: COUL.gris },
    { nom: 'Pollutions', v: somme(dansP, ['pollutions']), c: COUL.teal },
    { nom: 'Presque-accidents', v: somme(dansP, ['presque_accidents']), c: COUL.jaune },
    { nom: 'Dangers signalés', v: somme(dansP, ['dangers']), c: COUL.orange },
  ].filter((x) => x.v > 0)

  // Actions
  const aujIso = iso(auj)
  const ouvertes = actions.filter((a) => a.statut !== 'terminee')
  const enRetard = ouvertes.filter((a) => a.echeance && (a.echeance as string) < aujIso)
  const incPeriode = incidents.filter((i) => { const d = String(i.date_evt).slice(0, 10); return d >= p.debut && d <= p.fin })
  const incOuverts = incidents.filter((i) => i.statut !== 'clos')

  // Analyse automatique
  const phrases: { t: 'ok' | 'alerte' | 'danger' | 'info'; texte: string }[] = []
  phrases.push(r.graves === 0
    ? { t: 'ok', texte: 'Aucun accident grave sur la période : l’objectif zéro accident est respecté.' }
    : { t: 'danger', texte: `${r.graves} accident(s) grave(s) sur la période : vérifiez que l’enquête et les actions correctives sont faites.` })
  phrases.push({ t: jSansArret >= 30 ? 'ok' : 'alerte', texte: `${entier(jSansArret)} jours sans accident avec arrêt (dernier le ${dateFr(dernierArret)}).` })
  if (r.heures === 0) phrases.push({ t: 'info', texte: 'Aucune heure saisie sur la période : le TRIR ne peut pas être calculé.' })
  else phrases.push(r.trir <= site.objectif_trir
    ? { t: 'ok', texte: `TRIR de ${nombre(r.trir, 2)} : sous l’objectif de ${nombre(site.objectif_trir, 2)}.` }
    : { t: 'danger', texte: `TRIR de ${nombre(r.trir, 2)} : au-dessus de l’objectif de ${nombre(site.objectif_trir, 2)}. Renforcez la prévention.` })
  phrases.push(r.signalements === 0
    ? { t: 'alerte', texte: 'Aucun presque-accident ni danger signalé. Un site sûr signale beaucoup : encouragez le personnel à remonter les risques.' }
    : { t: 'ok', texte: `${r.signalements} presque-accident(s) et danger(s) signalé(s) : le personnel remonte les risques, c’est un bon signe.` })
  if (rp.prevention > 0) {
    const pct = Math.round(Math.abs(r.prevention - rp.prevention) / rp.prevention * 100)
    phrases.push(r.prevention >= rp.prevention
      ? { t: 'ok', texte: `Activités de prévention en hausse de ${pct} % par rapport à la même période de l’année précédente (${entier(r.prevention)} contre ${entier(rp.prevention)}).` }
      : { t: 'alerte', texte: `Activités de prévention en baisse de ${pct} % par rapport à la même période de l’année précédente (${entier(r.prevention)} contre ${entier(rp.prevention)}).` })
  }
  if (objTotal) phrases.push(objOk === objTotal
    ? { t: 'ok', texte: `Tous les objectifs de prévention sont atteints (${objOk} sur ${objTotal}).` }
    : { t: 'alerte', texte: `${objOk} objectif(s) de prévention atteint(s) sur ${objTotal}. Voir « Objectifs de prévention » plus bas.` })
  if (enRetard.length) phrases.push({ t: 'danger', texte: `${enRetard.length} action(s) corrective(s) en retard : relancez les responsables.` })
  if (r.joursEcoules > 0 && r.joursSaisis < r.joursEcoules)
    phrases.push({ t: 'alerte', texte: `Personnel non saisi pour ${r.joursEcoules - r.joursSaisis} jour(s) sur ${r.joursEcoules} : les heures et le TRIR ne sont pas fiables. Pensez à remplir « Personnes présentes ».` })
  else if (r.joursEcoules > 0) phrases.push({ t: 'ok', texte: 'Personnel saisi tous les jours : les taux sont fiables.' })

  const STYLE_PHRASE = {
    ok: { i: '✔', c: 'bg-emerald-50 text-emerald-900 border-emerald-200' },
    alerte: { i: '⚠', c: 'bg-amber-50 text-amber-900 border-amber-200' },
    danger: { i: '✘', c: 'bg-rose-50 text-rose-900 border-rose-200' },
    info: { i: 'ℹ', c: 'bg-sky-50 text-sky-900 border-sky-200' },
  }

  // Calendrier de saisie (année choisie)
  const remplis = useMemo(() => new Set(rows.filter((x) => x.jour.startsWith(String(annee)) && heures(x, site) > 0).map((x) => x.jour)), [rows, annee, site])
  const saisis = useMemo(() => new Set(rows.filter((x) => x.jour.startsWith(String(annee))).map((x) => x.jour)), [rows, annee])

  async function exporter() {
    const lib = mois == null ? `Année ${annee}` : `${MOIS[mois]} ${annee}`
    const champs = ['deces', 'accidents_arret', 'travail_limite', 'soins_medicaux', 'premiers_soins', 'presque_accidents', 'dangers', 'degats', 'pollutions', 'evacuations',
      'inspections', 'causeries', 'jsa', 'formations', 'reunions_generales', 'exercices', 'accueils', 'cartes_zero', 'actions_cloturees', 'permis_chaud', 'permis_froid', 'permis_confine', 'visites_infirmerie']
    const avant = dansPeriode(rows, pp)
    await exporterExcel(`Tableau de bord HSE ${lib}`, [
      {
        nom: 'Résumé', titre: `Tableau de bord HSE — ${lib}`,
        colonnes: [{ titre: 'Indicateur', largeur: 40 }, { titre: 'Période choisie', type: 'decimal', largeur: 16 }, { titre: 'Année précédente', type: 'decimal', largeur: 16 }, { titre: 'Explication', largeur: 60 }],
        lignes: [
          ['Jours sans accident avec arrêt', jSansArret, null, `Dernier : ${dateFr(dernierArret)}`],
          ['Jours sans incident', jSansIncident, null, `Dernier : ${dateFr(dernierIncident)}`],
          ['Accidents graves', r.graves, rp.graves, 'Décès + arrêts + travail limité + soins médicaux'],
          ['TRIR', r.trir, rp.trir, `Accidents graves × 200 000 ÷ heures. Objectif ≤ ${site.objectif_trir}`],
          ['Taux de fréquence', r.tf, rp.tf, 'Accidents avec arrêt × 1 000 000 ÷ heures'],
          ['Heures travaillées', r.heures, rp.heures, ''],
          ['Personnes par jour (moyenne)', r.personnesMoy, rp.personnesMoy, ''],
          ['Signalements (presque-accidents + dangers)', r.signalements, rp.signalements, 'Plus = mieux'],
          ['Activités de prévention', r.prevention, rp.prevention, 'Inspections, causeries, JSA, formations, exercices, réunions'],
          ['Permis de travail', r.permis, rp.permis, ''],
          ...champs.map((c) => [LIBELLE_JOUR[c], somme(dansP, [c]), somme(avant, [c]), ''] as (string | number)[]),
        ],
        note: `Période : du ${dateFr(p.debut)} au ${dateFr(p.fin)}. Comparaison : du ${dateFr(pp.debut)} au ${dateFr(pp.fin)}.`,
      },
      {
        nom: 'Mois par mois', titre: `Évolution mois par mois — ${annee}`,
        colonnes: [
          { titre: 'Mois', largeur: 12 }, { titre: 'Accidents graves', type: 'nombre', total: true }, { titre: 'Premiers soins', type: 'nombre', total: true },
          { titre: 'Presque-accidents', type: 'nombre', total: true }, { titre: 'Dangers signalés', type: 'nombre', total: true }, { titre: 'Dégâts matériels', type: 'nombre', total: true },
          { titre: 'Heures travaillées', type: 'nombre', total: true }, { titre: 'Personnes / jour', type: 'nombre' }, { titre: 'TRIR du mois', type: 'decimal' },
          { titre: 'TRIR cumulé', type: 'decimal' }, { titre: 'Inspections', type: 'nombre', total: true }, { titre: 'Causeries', type: 'nombre', total: true },
          { titre: 'JSA', type: 'nombre', total: true }, { titre: 'Formations', type: 'nombre', total: true }, { titre: 'Permis à chaud', type: 'nombre', total: true },
          { titre: 'Permis à froid', type: 'nombre', total: true }, { titre: 'Prévention', type: 'nombre', total: true }, { titre: 'Prévention année préc.', type: 'nombre', total: true },
        ],
        lignes: mensuel.map((m) => [MOIS[m.mois], m.graves, m.premiers_soins, m.presque_accidents, m.dangers, m.degats, m.heures, m.personnes, m.trir, m.trirCumul,
          m.inspections, m.causeries, m.jsa, m.formations, m.permis_chaud, m.permis_froid, m.prevention, m.preventionAvant]),
      },
      {
        nom: 'Objectifs', titre: `Objectifs de prévention — ${lib}`,
        colonnes: [{ titre: 'Activité', largeur: 32 }, { titre: 'Réalisé', type: 'nombre' }, { titre: 'Objectif', type: 'nombre' }, { titre: 'Taux', type: 'pourcent' },
          { titre: 'Statut', largeur: 16, couleurs: { 'Atteint': 'vert', 'Insuffisant': 'orange' } }],
        lignes: objectifsLignes.filter((o) => o.obj > 0).map((o) => [o.libelle, o.fait, o.obj, o.taux, o.fait >= o.obj ? 'Atteint' : 'Insuffisant']),
      },
      {
        nom: 'Analyse', titre: `Analyse automatique — ${lib}`,
        colonnes: [{ titre: 'Niveau', largeur: 14, couleurs: { 'Bien': 'vert', 'À surveiller': 'orange', 'À corriger': 'rouge', 'Info': 'bleu' } }, { titre: 'Ce qu’il faut retenir', largeur: 110 }],
        lignes: phrases.map((ph) => [{ ok: 'Bien', alerte: 'À surveiller', danger: 'À corriger', info: 'Info' }[ph.t], ph.texte]),
      },
    ], { site: site.nom, client: site.client, entreprise: site.entreprise })
  }

  const annees = [now.getFullYear() + 1, now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2]

  return (
    <div>
      <EnTete titre="Tableau de bord HSE" sousTitre={`${site.nom} • ${site.client} • ${site.entreprise}`} icone={<LayoutDashboard />} couleur="indigo"
        actions={<>
          <Link to="/saisie" className="btn-vert"><CalendarCheck size={18} />Remplir la journée</Link>
          <button className="btn-clair" onClick={exporter} disabled={!charge}><Download size={18} />Exporter en Excel</button>
        </>} />

      {/* Filtres */}
      <div className="carte p-3 md:p-4 mb-6 flex flex-wrap items-center gap-2 sticky top-[60px] md:top-3 z-20 backdrop-blur bg-white/90">
        <select className="champ w-auto font-semibold" value={annee} onChange={(e) => setAnnee(Number(e.target.value))}>
          {annees.map((y) => <option key={y}>{y}</option>)}
        </select>
        <div className="flex gap-1 overflow-x-auto">
          <button onClick={() => setMois(null)} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${mois == null ? 'bg-marine-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>Année</button>
          {MOIS_COURT.map((m, i) => (
            <button key={m} onClick={() => setMois(i)} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${mois === i ? 'bg-marine-700 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{m}</button>
          ))}
        </div>
        <div className="text-xs text-slate-500 md:ml-auto">Du {dateFr(p.debut)} au {dateFr(p.fin)} • comparé au {dateFr(pp.debut)} – {dateFr(pp.fin)}</div>
      </div>

      {/* Tuiles */}
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-rose-700"><span className="h-2 w-2 rounded-full bg-rose-500" />Ce qui est arrivé — objectif zéro</div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">{tuilesReactives.map((t, i) => <CarteTuile key={t.titre} t={t} i={i} />)}</div>
      <div className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Ce que l’on fait pour prévenir — plus = mieux</div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-6">{tuilesProactives.map((t, i) => <CarteTuile key={t.titre} t={t} i={i + 5} />)}</div>

      {/* Analyse + actions */}
      <div className="grid gap-6 xl:grid-cols-3 mb-6">
        <Bloc titre="Analyse automatique" sousTitre="Ce qu’il faut retenir, en quelques phrases" className="xl:col-span-2">
          <ul className="space-y-2">
            {phrases.map((ph, i) => (
              <motion.li key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.05 }}
                className={`flex gap-3 rounded-xl border px-4 py-2.5 text-sm ${STYLE_PHRASE[ph.t].c}`}>
                <span className="font-bold">{STYLE_PHRASE[ph.t].i}</span><span>{ph.texte}</span>
              </motion.li>
            ))}
          </ul>
        </Bloc>
        <Bloc titre="À suivre maintenant" sousTitre="Incidents et actions en cours">
          <div className="grid grid-cols-3 gap-2 mb-4 text-center">
            <Link to="/m/incidents" className="rounded-xl bg-rose-50 p-3"><div className="text-2xl font-extrabold text-rose-700">{incOuverts.length}</div><div className="text-[11px] font-semibold text-rose-700">incidents ouverts</div></Link>
            <Link to="/m/actions" className="rounded-xl bg-amber-50 p-3"><div className="text-2xl font-extrabold text-amber-700">{ouvertes.length}</div><div className="text-[11px] font-semibold text-amber-700">actions en cours</div></Link>
            <Link to="/m/actions" className={`rounded-xl p-3 ${enRetard.length ? 'bg-rose-600 text-white' : 'bg-emerald-50 text-emerald-700'}`}><div className="text-2xl font-extrabold">{enRetard.length}</div><div className="text-[11px] font-semibold">en retard</div></Link>
          </div>
          <div className="space-y-2">
            {enRetard.slice(0, 4).map((a) => (
              <div key={String(a.id)} className="flex items-center justify-between gap-2 rounded-lg border border-rose-100 px-3 py-2 text-sm">
                <span className="truncate font-medium">{String(a.titre)}</span><span className="shrink-0 text-xs text-rose-600 font-semibold">{dateFr(a.echeance as string)}</span>
              </div>
            ))}
            {incPeriode.slice(0, 3).map((i) => (
              <div key={String(i.id)} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <span className="truncate"><AlertTriangle size={14} className="inline mr-1 text-rose-500" />{String(i.titre)}</span>
                <Pastille couleur={TYPES_INCIDENT.find((t) => t.v === i.type)?.c}>{TYPES_INCIDENT.find((t) => t.v === i.type)?.l}</Pastille>
              </div>
            ))}
            {!enRetard.length && !incPeriode.length && <p className="text-sm text-slate-500 text-center py-3">Rien d’urgent. 👍</p>}
          </div>
        </Bloc>
      </div>

      {/* Graphiques */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Bloc titre="Pyramide de sécurité" sousTitre="Pour 1 accident grave, beaucoup de petits événements avant : traitez-les tôt">
          <div className="space-y-1.5 py-2">
            {pyramide.map((x, i) => (
              <div key={x.nom} className="flex items-center gap-3">
                <div className="w-40 shrink-0 text-right text-xs font-semibold text-slate-600">{x.nom}</div>
                <div className="flex-1 flex justify-center">
                  <motion.div initial={{ width: 0 }} whileInView={{ width: `${30 + i * 14}%` }} viewport={{ once: true }} transition={{ duration: 0.6, delay: i * 0.08 }}
                    className="h-9 rounded-md grid place-items-center text-white font-extrabold shadow-sm" style={{ background: x.c }}>{x.v}</motion.div>
                </div>
              </div>
            ))}
          </div>
        </Bloc>

        <Bloc titre="Répartition des événements" sousTitre="Sur la période choisie">
          {repartition.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={repartition} dataKey="v" nameKey="nom" innerRadius={62} outerRadius={100} paddingAngle={2} label={({ v }) => v}>
                  {repartition.map((x) => <Cell key={x.nom} fill={x.c} />)}
                </Pie>
                <Tooltip {...infobulle} />
                <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <div className="h-[260px] grid place-items-center text-center text-slate-500"><div><div className="text-5xl mb-2">🛡️</div>Aucun événement sur la période.</div></div>}
        </Bloc>

        <Bloc titre="Accidents et incidents par mois" sousTitre={`Année ${annee}`}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mensuel}>
              {grille}<XAxis dataKey="nom" tick={axe} /><YAxis allowDecimals={false} tick={axe} width={30} /><Tooltip {...infobulle} /><Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              <Bar dataKey="graves" name="Accidents graves" stackId="a" fill={COUL.rouge} />
              <Bar dataKey="premiers_soins" name="Premiers soins" stackId="a" fill={COUL.ambre} />
              <Bar dataKey="degats" name="Dégâts matériels" stackId="a" fill={COUL.gris} />
              <Bar dataKey="pollutions" name="Pollutions" stackId="a" fill={COUL.teal} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Bloc>

        <Bloc titre="TRIR : mois, cumul de l’année et objectif" sousTitre="Plus c’est bas, mieux c’est">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={mensuelCourbe}>
              {grille}<XAxis dataKey="nom" tick={axe} /><YAxis tick={axe} width={36} /><Tooltip {...infobulle} formatter={(v: number) => nombre(v, 2)} /><Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              <ReferenceLine y={site.objectif_trir} stroke={COUL.rouge} strokeDasharray="6 4" label={{ value: 'Objectif', fill: COUL.rouge, fontSize: 11, position: 'insideTopRight' }} />
              <Line type="monotone" dataKey="trir" name="TRIR du mois" stroke={COUL.bleuClair} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="trirCumul" name="TRIR cumulé" stroke={COUL.marine} strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Bloc>

        <Bloc titre="Activités de prévention par mois" sousTitre={`Année ${annee}`}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={mensuel}>
              {grille}<XAxis dataKey="nom" tick={axe} /><YAxis tick={axe} width={36} /><Tooltip {...infobulle} /><Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              <Bar dataKey="jsa" name="JSA" fill={COUL.vert} radius={[3, 3, 0, 0]} />
              <Bar dataKey="causeries" name="Causeries" fill={COUL.vertClair} radius={[3, 3, 0, 0]} />
              <Bar dataKey="inspections" name="Inspections" fill={COUL.bleu} radius={[3, 3, 0, 0]} />
              <Bar dataKey="formations" name="Formations" fill={COUL.violet} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Bloc>

        <Bloc titre="Prévention : cette année contre l’année précédente" sousTitre={`${annee} comparé à ${annee - 1}`}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={mensuelCourbe}>
              <defs>
                <linearGradient id="gPrev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COUL.vert} stopOpacity={0.35} /><stop offset="100%" stopColor={COUL.vert} stopOpacity={0} /></linearGradient>
              </defs>
              {grille}<XAxis dataKey="nom" tick={axe} /><YAxis tick={axe} width={36} /><Tooltip {...infobulle} /><Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              <Area type="monotone" dataKey="preventionAvant" name={String(annee - 1)} stroke={COUL.gris} fill="transparent" strokeDasharray="5 4" strokeWidth={2} />
              <Area type="monotone" dataKey="prevention" name={String(annee)} stroke={COUL.vert} fill="url(#gPrev)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </Bloc>

        <Bloc titre="Objectifs de prévention" sousTitre={`${objOk} atteint(s) sur ${objTotal} • objectif mensuel × ${nbMois} mois`}>
          <div className="space-y-3.5 py-1">
            {objectifsLignes.filter((o) => o.obj > 0).map((o, i) => {
              const ok = o.fait >= o.obj
              return (
                <div key={o.cle}>
                  <div className="flex justify-between text-sm mb-1"><span className="font-semibold text-slate-700">{o.libelle}</span>
                    <span className={`font-bold ${ok ? 'text-emerald-600' : 'text-amber-600'}`}>{entier(o.fait)} / {entier(o.obj)}</span></div>
                  <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                    <motion.div initial={{ width: 0 }} whileInView={{ width: `${Math.min(100, o.taux * 100)}%` }} viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.06 }}
                      className={`h-full rounded-full ${ok ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-amber-300 to-amber-500'}`} />
                  </div>
                </div>
              )
            })}
          </div>
        </Bloc>

        <Bloc titre="Signalements : presque-accidents et dangers" sousTitre="Un bon site signale beaucoup">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={mensuel}>
              {grille}<XAxis dataKey="nom" tick={axe} /><YAxis allowDecimals={false} tick={axe} width={30} /><Tooltip {...infobulle} /><Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              <Bar dataKey="presque_accidents" name="Presque-accidents" fill={COUL.jaune} radius={[3, 3, 0, 0]} />
              <Bar dataKey="dangers" name="Dangers signalés" fill={COUL.orange} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Bloc>

        <Bloc titre="Permis de travail par mois" sousTitre={`Année ${annee}`}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={mensuel}>
              {grille}<XAxis dataKey="nom" tick={axe} /><YAxis tick={axe} width={36} /><Tooltip {...infobulle} /><Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              <Bar dataKey="permis_chaud" name="À chaud" stackId="p" fill={COUL.orange} />
              <Bar dataKey="permis_froid" name="À froid" stackId="p" fill={COUL.bleu} />
              <Bar dataKey="permis_confine" name="Espace confiné" stackId="p" fill={COUL.violet} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Bloc>

        <Bloc titre="Heures travaillées et effectif" sousTitre="Heures par mois et personnes présentes en moyenne">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={mensuel}>
              {grille}<XAxis dataKey="nom" tick={axe} /><YAxis yAxisId="h" tick={axe} width={46} /><YAxis yAxisId="p" orientation="right" tick={axe} width={30} />
              <Tooltip {...infobulle} formatter={(v: number) => entier(v)} /><Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" />
              <Bar yAxisId="h" dataKey="heures" name="Heures travaillées" fill={COUL.marine} radius={[4, 4, 0, 0]} />
              <Bar yAxisId="p" dataKey="personnes" name="Personnes / jour" fill={COUL.bleuClair} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Bloc>

        <Bloc titre={`Calendrier de saisie ${annee}`} sousTitre="Vert = personnel saisi • Jaune = journée saisie sans personnel • Gris = rien" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <div className="grid gap-1 min-w-[720px]" style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))' }}>
              {MOIS_COURT.map((m, mi) => {
                const nb = new Date(annee, mi + 1, 0).getDate()
                return (
                  <div key={m}>
                    <div className="text-[11px] font-bold text-slate-500 mb-1">{m}</div>
                    <div className="grid grid-cols-7 gap-[3px]">
                      {Array.from({ length: nb }, (_, d) => {
                        const k = iso(new Date(annee, mi, d + 1))
                        const futur = k > aujIso
                        const c = futur ? 'bg-slate-50' : remplis.has(k) ? 'bg-emerald-500' : saisis.has(k) ? 'bg-amber-300' : 'bg-slate-200'
                        return <div key={k} title={dateFr(k)} className={`aspect-square rounded-[3px] ${c}`} />
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Bloc>
      </div>
    </div>
  )
}
