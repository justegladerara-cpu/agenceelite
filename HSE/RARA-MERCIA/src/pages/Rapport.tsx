import { useEffect, useMemo, useState } from 'react'
import { Download, FileBarChart, FileDown } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useApp } from '../lib/contexte'
import { Chargement, Compteur, EnTete, Pastille } from '../components/ui'
import { dansPeriode, periode, periodePrecedente, resume, somme, type Jour } from '../lib/stats'
import { LIBELLE_JOUR, STATUTS_INCIDENT, TYPES_INCIDENT, GRAVITES, optionDe, type Option } from '../lib/modules'
import { MOIS, dateFr, entier, iso, nombre } from '../lib/format'
import { exporterExcel } from '../lib/excel'
import { rapportPdf } from '../lib/pdf'

type Incident = { num: number; titre: string; type: string; gravite: string; statut: string; date_evt: string; lieu: string | null }
type Action = { num: number; titre: string; responsable: string | null; echeance: string | null; statut: string; priorite: string | null }

const lib = (opts: Option[], v: string) => opts.find((o) => o.v === v)?.l ?? v
const LIGNES_ACTIVITE = ['jsa', 'causeries', 'inspections', 'accueils', 'formations', 'reunions_generales', 'reunions_poste', 'exercices', 'permis_chaud', 'permis_froid', 'permis_confine']
const LIGNES_EVENEMENTS = ['presque_accidents', 'dangers', 'premiers_soins', 'soins_medicaux', 'travail_limite', 'accidents_arret', 'deces', 'degats', 'pollutions', 'evacuations', 'visites_infirmerie']

export default function Rapport() {
  const { site, objectifs, toast } = useApp()
  const maintenant = new Date()
  const [annee, setAnnee] = useState(maintenant.getFullYear())
  const [mois, setMois] = useState(maintenant.getMonth())
  const [jours, setJours] = useState<Jour[] | null>(null)
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const p = useMemo(() => periode(annee, mois), [annee, mois])
  const pp = useMemo(() => periodePrecedente(p), [p])

  useEffect(() => {
    setJours(null)
    Promise.all([
      supabase.from('hse_journal').select('*').gte('jour', pp.debut).lte('jour', p.fin),
      supabase.from('hse_incidents').select('num, titre, type, gravite, statut, date_evt, lieu').gte('date_evt', p.debut).lte('date_evt', `${p.fin}T23:59:59`).order('date_evt'),
      supabase.from('hse_actions').select('num, titre, responsable, echeance, statut, priorite').neq('statut', 'terminee').order('echeance', { nullsFirst: false }),
    ]).then(([j, i, a]) => {
      if (j.error) toast(j.error.message, 'erreur')
      setJours((j.data ?? []) as Jour[]); setIncidents((i.data ?? []) as Incident[]); setActions((a.data ?? []) as Action[])
    })
  }, [p, pp, toast])

  const auj = iso(new Date())
  const r = jours ? resume(jours, p, site) : null
  const ra = jours ? resume(jours, pp, site) : null
  const duMois = jours ? dansPeriode(jours, p) : []
  const avant = jours ? dansPeriode(jours, pp) : []
  const retard = actions.filter((a) => a.echeance && a.echeance < auj)
  const objectifsLignes = Object.entries(objectifs).map(([c, obj]) => {
    const fait = somme(duMois, [c])
    return { c, obj, fait, pct: obj ? fait / obj : 0 }
  })

  const analyse = useMemo(() => {
    if (!r || !ra) return []
    const t: string[] = []
    t.push(r.graves === 0 ? 'Aucun accident grave ce mois-ci. Bravo à toute l\'équipe.' : `${r.graves} accident(s) grave(s) ce mois-ci : vérifier que chaque cas a une enquête et des actions.`)
    if (r.heures > 0) t.push(`${entier(r.heures)} heures travaillées, avec en moyenne ${entier(r.personnesMoy)} personnes par jour.`)
    if (r.signalements > 0) t.push(`${entier(r.signalements)} presque-accident(s) ou danger(s) signalé(s) : c'est positif, cela montre que les équipes sont vigilantes.`)
    else t.push('Aucun presque-accident ni danger signalé : encourager les équipes à signaler.')
    if (ra.prevention > 0) {
      const d = (r.prevention - ra.prevention) / ra.prevention
      t.push(`Activités de prévention : ${entier(r.prevention)} contre ${entier(ra.prevention)} l'an dernier au même moment (${d >= 0 ? '+' : ''}${Math.round(d * 100)} %).`)
    }
    const rates = objectifsLignes.filter((o) => o.pct < 1)
    if (rates.length) t.push(`Objectifs non atteints : ${rates.map((o) => `${LIBELLE_JOUR[o.c] ?? o.c} (${o.fait}/${o.obj})`).join(', ')}.`)
    else t.push('Tous les objectifs du mois sont atteints.')
    if (retard.length) t.push(`${retard.length} action(s) corrective(s) en retard à relancer.`)
    if (r.joursEcoules && r.joursSaisis < r.joursEcoules) t.push(`Attention : ${r.joursEcoules - r.joursSaisis} jour(s) sans effectif saisi, les taux peuvent être faussés.`)
    return t
  }, [r, ra, objectifsLignes, retard.length])

  const nomMois = `${MOIS[mois]} ${annee}`
  const tableau = (cles: string[]) => cles.map((c) => [LIBELLE_JOUR[c] ?? c, somme(duMois, [c]), somme(avant, [c])])

  async function pdf() {
    if (!r) return
    await rapportPdf(`Rapport HSE - ${nomMois}`, `${site.entreprise} - ${site.nom} - Client : ${site.client}`, [
      { libelle: 'Accidents graves', valeur: entier(r.graves), couleur: r.graves ? [255, 228, 230] : [209, 250, 229] },
      { libelle: 'Taux d\'accidents (TRIR)', valeur: nombre(r.trir, 2) },
      { libelle: 'Heures travaillées', valeur: entier(r.heures) },
      { libelle: 'Personnes / jour (moyenne)', valeur: entier(r.personnesMoy) },
      { libelle: 'Signalements', valeur: entier(r.signalements) },
      { libelle: 'Activités de prévention', valeur: entier(r.prevention) },
      { libelle: 'Permis de travail', valeur: entier(r.permis) },
      { libelle: 'Actions en retard', valeur: entier(retard.length), couleur: retard.length ? [255, 228, 230] : undefined },
    ], analyse, [
      { titre: 'Activités de prévention', tete: ['Activité', nomMois, `Même mois ${annee - 1}`], lignes: tableau(LIGNES_ACTIVITE) },
      { titre: 'Événements', tete: ['Événement', nomMois, `Même mois ${annee - 1}`], lignes: tableau(LIGNES_EVENEMENTS) },
      { titre: 'Objectifs du mois', tete: ['Activité', 'Objectif', 'Réalisé', 'Atteint ?'], lignes: objectifsLignes.map((o) => [LIBELLE_JOUR[o.c] ?? o.c, o.obj, o.fait, o.pct >= 1 ? 'Oui' : `Non (${Math.round(o.pct * 100)} %)`]) },
      { titre: 'Incidents déclarés', tete: ['N°', 'Date', 'Quoi', 'Type', 'Gravité', 'Statut'], lignes: incidents.map((i) => [`INC-${i.num}`, dateFr(i.date_evt), i.titre, lib(TYPES_INCIDENT, i.type), lib(GRAVITES, i.gravite), lib(STATUTS_INCIDENT, i.statut)]) },
      { titre: 'Actions correctives non terminées', tete: ['N°', 'Action', 'Responsable', 'Échéance', 'En retard ?'], lignes: actions.map((a) => [`ACT-${a.num}`, a.titre, a.responsable ?? '', a.echeance ? dateFr(a.echeance) : '', a.echeance && a.echeance < auj ? 'OUI' : 'Non']) },
    ], site, `Rapport HSE ${site.entreprise} ${nomMois}`)
  }

  async function excel() {
    if (!r) return
    const ent = { site: site.nom, client: site.client, entreprise: site.entreprise }
    const comp = (cles: string[]) => cles.map((c) => { const a = somme(duMois, [c]), b = somme(avant, [c]); return [LIBELLE_JOUR[c] ?? c, a, b, a - b] })
    const colsComp = (t: string) => [{ titre: t, largeur: 34 }, { titre: nomMois, type: 'nombre' as const, largeur: 16, total: true }, { titre: `Même mois ${annee - 1}`, type: 'nombre' as const, largeur: 18, total: true }, { titre: 'Différence', type: 'nombre' as const, largeur: 14, total: true }]
    await exporterExcel(`Rapport HSE ${site.entreprise} ${nomMois}`, [
      { nom: 'Résumé', titre: `Rapport HSE — ${nomMois}`, colonnes: [{ titre: 'Indicateur', largeur: 34 }, { titre: nomMois, type: 'decimal', largeur: 16 }, { titre: `Même mois ${annee - 1}`, type: 'decimal', largeur: 18 }],
        lignes: [
          ['Accidents graves', r.graves, ra!.graves], ['Accidents avec arrêt', r.arrets, ra!.arrets], ['Taux d\'accidents (TRIR)', r.trir, ra!.trir],
          ['Heures travaillées', r.heures, ra!.heures], ['Personnes par jour (moyenne)', r.personnesMoy, ra!.personnesMoy],
          ['Signalements (presque-accidents + dangers)', r.signalements, ra!.signalements], ['Activités de prévention', r.prevention, ra!.prevention],
          ['Permis de travail', r.permis, ra!.permis], ['Actions correctives en retard', retard.length, null],
        ], note: 'TRIR = accidents graves × 200 000 ÷ heures travaillées. Plus il est bas, mieux c\'est.' },
      { nom: 'Ce qu\'il faut retenir', titre: `Ce qu'il faut retenir — ${nomMois}`, colonnes: [{ titre: 'N°', largeur: 6, type: 'nombre' }, { titre: 'Constat', largeur: 110 }], lignes: analyse.map((a, i) => [i + 1, a]) },
      { nom: 'Prévention', titre: `Activités de prévention — ${nomMois}`, colonnes: colsComp('Activité'), lignes: comp(LIGNES_ACTIVITE) },
      { nom: 'Événements', titre: `Événements — ${nomMois}`, colonnes: colsComp('Événement'), lignes: comp(LIGNES_EVENEMENTS) },
      { nom: 'Objectifs', titre: `Objectifs du mois — ${nomMois}`, colonnes: [{ titre: 'Activité', largeur: 30 }, { titre: 'Objectif', type: 'nombre' }, { titre: 'Réalisé', type: 'nombre' }, { titre: '% atteint', type: 'pourcent' }, { titre: 'Atteint ?', couleurs: { Oui: 'vert', Non: 'rouge' } }],
        lignes: objectifsLignes.map((o) => [LIBELLE_JOUR[o.c] ?? o.c, o.obj, o.fait, o.pct, o.pct >= 1 ? 'Oui' : 'Non']) },
      { nom: 'Incidents', titre: `Incidents déclarés — ${nomMois}`, colonnes: [{ titre: 'N°', largeur: 10 }, { titre: 'Date', type: 'dateheure', largeur: 17 }, { titre: 'Quoi', largeur: 40 }, { titre: 'Lieu', largeur: 18 }, { titre: 'Type', largeur: 20 }, { titre: 'Gravité', couleurs: { Critique: 'rouge', Élevée: 'orange', Moyenne: 'jaune', Faible: 'vert' } }, { titre: 'Statut', largeur: 20, couleurs: { Ouvert: 'rouge', 'En cours d’enquête': 'orange', Clôturé: 'vert' } }],
        lignes: incidents.map((i) => [`INC-${i.num}`, i.date_evt, i.titre, i.lieu ?? '', lib(TYPES_INCIDENT, i.type), lib(GRAVITES, i.gravite), lib(STATUTS_INCIDENT, i.statut)]) },
      { nom: 'Actions à suivre', titre: 'Actions correctives non terminées', colonnes: [{ titre: 'N°', largeur: 10 }, { titre: 'Action', largeur: 45 }, { titre: 'Responsable', largeur: 20 }, { titre: 'Échéance', type: 'date', largeur: 13 }, { titre: 'En retard ?', couleurs: { OUI: 'rouge', Non: 'vert' } }],
        lignes: actions.map((a) => [`ACT-${a.num}`, a.titre, a.responsable ?? '', a.echeance, a.echeance && a.echeance < auj ? 'OUI' : 'Non']) },
    ], ent)
  }

  const annees = Array.from({ length: 4 }, (_, i) => maintenant.getFullYear() - i)
  return (
    <div>
      <EnTete titre="Rapport mensuel" sousTitre="Le bilan du mois, prêt à envoyer au client en PDF ou en Excel." icone={<FileBarChart />} couleur="indigo"
        actions={<>
          <button className="btn-clair" onClick={excel} disabled={!r}><Download size={18} />Excel</button>
          <button className="btn-primaire" onClick={pdf} disabled={!r}><FileDown size={18} />Télécharger le PDF</button>
        </>} />
      <div className="carte p-3 mb-5 flex flex-wrap gap-2">
        <select className="champ w-auto" value={mois} onChange={(e) => setMois(Number(e.target.value))}>{MOIS.map((m, i) => <option key={m} value={i}>{m}</option>)}</select>
        <select className="champ w-auto" value={annee} onChange={(e) => setAnnee(Number(e.target.value))}>{annees.map((a) => <option key={a}>{a}</option>)}</select>
      </div>
      {!r || !ra ? <Chargement /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              ['Accidents graves', r.graves, 0, r.graves ? 'text-rose-600' : 'text-emerald-600'],
              ['Taux d\'accidents (TRIR)', r.trir, 2, 'text-marine-800'],
              ['Heures travaillées', r.heures, 0, 'text-marine-800'],
              ['Signalements', r.signalements, 0, 'text-amber-600'],
              ['Activités de prévention', r.prevention, 0, 'text-emerald-600'],
              ['Permis de travail', r.permis, 0, 'text-sky-600'],
              ['Incidents déclarés', incidents.length, 0, 'text-marine-800'],
              ['Actions en retard', retard.length, 0, retard.length ? 'text-rose-600' : 'text-emerald-600'],
            ].map(([l, v, d, c]) => (
              <div key={String(l)} className="carte p-4">
                <div className="text-xs font-semibold text-slate-500">{l}</div>
                <Compteur valeur={Number(v)} decimales={Number(d)} className={`text-3xl font-extrabold ${c}`} />
              </div>
            ))}
          </div>
          <div className="carte p-5">
            <h2 className="font-bold text-marine-800 text-lg mb-3">Ce qu'il faut retenir</h2>
            <ul className="space-y-2">{analyse.map((a) => <li key={a} className="flex gap-2 text-slate-700"><span className="text-marine-500">●</span>{a}</li>)}</ul>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {[['Activités de prévention', LIGNES_ACTIVITE], ['Événements', LIGNES_EVENEMENTS]].map(([t, cles]) => (
              <div key={String(t)} className="carte overflow-hidden">
                <h2 className="font-bold text-marine-800 px-5 pt-4 pb-2">{t}</h2>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-xs"><tr><th className="text-left px-5 py-2">Quoi</th><th className="px-3 py-2">{MOIS[mois]}</th><th className="px-3 py-2">{annee - 1}</th></tr></thead>
                  <tbody>{tableau(cles as string[]).map(([l, a, b]) => (
                    <tr key={String(l)} className="border-t border-slate-100"><td className="px-5 py-2 text-slate-700">{l}</td><td className="text-center font-bold text-marine-800">{entier(Number(a))}</td><td className="text-center text-slate-400">{entier(Number(b))}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            ))}
          </div>
          <div className="carte p-5">
            <h2 className="font-bold text-marine-800 text-lg mb-3">Incidents du mois</h2>
            {!incidents.length ? <p className="text-slate-500">Aucun incident déclaré dans le registre ce mois-ci.</p> : (
              <ul className="divide-y divide-slate-100">{incidents.map((i) => (
                <li key={i.num} className="py-2 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-slate-400">INC-{i.num}</span><span className="font-semibold text-slate-800">{i.titre}</span>
                  <span className="text-sm text-slate-500">{dateFr(i.date_evt)}</span>
                  {(() => { const o = optionDe({ cle: 'statut', libelle: '', type: 'choix', options: STATUTS_INCIDENT }, i.statut); return o && <Pastille couleur={o.c}>{o.l}</Pastille> })()}
                </li>
              ))}</ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
