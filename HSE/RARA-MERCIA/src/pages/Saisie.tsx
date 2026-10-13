import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarCheck, ChevronDown, ChevronLeft, ChevronRight, Download, Minus, Plus, Save, Table2 } from 'lucide-react'
import { CHAMPS_JOUR, GROUPES_JOUR } from '../lib/modules'
import { messageErreur, supabase } from '../lib/supabase'
import { useApp } from '../lib/contexte'
import { EnTete, Fenetre, useMemoire } from '../components/ui'
import { dateFr, dateLongue, deIso, iso, MOIS, entier } from '../lib/format'
import { heures, type Jour } from '../lib/stats'
import { exporterExcel } from '../lib/excel'

const ACCENT: Record<string, { bord: string; titre: string; fond: string }> = {
  sky: { bord: 'border-t-sky-500', titre: 'text-sky-700', fond: 'bg-sky-50' },
  emerald: { bord: 'border-t-emerald-500', titre: 'text-emerald-700', fond: 'bg-emerald-50' },
  rose: { bord: 'border-t-rose-500', titre: 'text-rose-700', fond: 'bg-rose-50' },
  slate: { bord: 'border-t-slate-400', titre: 'text-slate-600', fond: 'bg-slate-50' },
}

type Valeurs = Record<string, string>

function Stepper({ valeur, onChange, alerte }: { valeur: string; onChange: (v: string) => void; alerte?: boolean }) {
  const n = valeur === '' ? 0 : Number(valeur)
  const rouge = alerte && n > 0
  return (
    <div className={`flex items-center rounded-xl border ${rouge ? 'border-rose-300 bg-rose-50' : 'border-slate-200 bg-white'} overflow-hidden`}>
      <button type="button" className="h-11 w-11 grid place-items-center text-slate-500 hover:bg-slate-100 active:bg-slate-200" onClick={() => onChange(n > 0 ? String(n - 1) : '')} aria-label="Moins"><Minus size={18} /></button>
      <input inputMode="decimal" className={`w-16 h-11 text-center text-lg font-bold outline-none bg-transparent ${rouge ? 'text-rose-700' : 'text-marine-800'}`}
        value={valeur} placeholder="0" onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))} />
      <button type="button" className="h-11 w-11 grid place-items-center text-slate-500 hover:bg-slate-100 active:bg-slate-200" onClick={() => onChange(String(n + 1))} aria-label="Plus"><Plus size={18} /></button>
    </div>
  )
}

export default function Saisie() {
  const { site, toast, peutEcrire } = useApp()
  const [jour, setJour] = useState(iso(new Date()))
  const [vals, setVals] = useState<Valeurs>({})
  const [commentaire, setCommentaire] = useState('')
  const [existe, setExiste] = useState(false)
  const [modifie, setModifie] = useState(false)
  const [occupe, setOccupe] = useState(false)
  const [recents, setRecents] = useState<Set<string>>(new Set())
  const [autresOuvert, setAutresOuvert] = useMemoire('saisie-autres', false)
  const [histo, setHisto] = useState(false)

  const charger = useCallback(async (d: string) => {
    const { data } = await supabase.from('hse_journal').select('*').eq('jour', d).maybeSingle()
    const v: Valeurs = {}
    for (const c of CHAMPS_JOUR) v[c.cle] = data?.[c.cle] == null ? '' : String(data[c.cle])
    setVals(v); setCommentaire(data?.commentaire ?? ''); setExiste(!!data); setModifie(false)
  }, [])

  const chargerRecents = useCallback(async () => {
    const debut = new Date(); debut.setDate(debut.getDate() - 20)
    const { data } = await supabase.from('hse_journal').select('jour').gte('jour', iso(debut))
    setRecents(new Set((data ?? []).map((r) => r.jour as string)))
  }, [])

  useEffect(() => { charger(jour) }, [jour, charger])
  useEffect(() => { chargerRecents() }, [chargerRecents])

  const changerJour = (delta: number) => {
    if (modifie && !confirm('Vous avez des changements non enregistrés. Changer de jour quand même ?')) return
    const d = deIso(jour); d.setDate(d.getDate() + delta); setJour(iso(d))
  }

  async function enregistrer() {
    setOccupe(true)
    const ligne: Record<string, unknown> = { jour, commentaire: commentaire.trim() || null, modifie_le: new Date().toISOString() }
    for (const c of CHAMPS_JOUR) ligne[c.cle] = vals[c.cle] === '' || vals[c.cle] == null ? null : Number(vals[c.cle])
    const { error } = await supabase.from('hse_journal').upsert(ligne)
    setOccupe(false)
    if (error) return toast(messageErreur(error), 'erreur')
    toast(`Journée du ${dateFr(jour)} enregistrée`)
    setExiste(true); setModifie(false); chargerRecents()
  }

  const set = (cle: string, v: string) => { setVals((x) => ({ ...x, [cle]: v })); setModifie(true) }
  const h = heures({ jour, personnes: vals.personnes || null, heures_reelles: vals.heures_reelles || null } as Jour, site)
  const bande = useMemo(() => {
    const res: string[] = []
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); res.push(iso(d)) }
    return res
  }, [])
  const evenementsDuJour = ['premiers_soins', 'soins_medicaux', 'travail_limite', 'accidents_arret', 'deces', 'degats', 'pollutions']
    .reduce((t, c) => t + (Number(vals[c]) || 0), 0)

  return (
    <div>
      <EnTete titre="Saisie du jour" sousTitre="Écrivez les nombres de la journée. Rien à signaler ? Laissez 0." icone={<CalendarCheck />} couleur="emerald"
        actions={<button className="btn-clair" onClick={() => setHisto(true)}><Table2 size={18} />Historique et export Excel</button>} />

      {/* Choix du jour */}
      <div className="carte p-4 md:p-5 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div className="flex items-center gap-2">
            <button className="btn-clair px-3" onClick={() => changerJour(-1)} aria-label="Jour précédent"><ChevronLeft size={20} /></button>
            <div className="text-center min-w-[230px]">
              <div className="text-xl font-extrabold text-marine-800 capitalize">{dateLongue(jour)}</div>
              <div className={`text-sm font-semibold ${existe ? 'text-emerald-600' : 'text-amber-600'}`}>{existe ? '✔ Déjà rempli — vous pouvez modifier' : '○ Pas encore rempli'}</div>
            </div>
            <button className="btn-clair px-3" onClick={() => changerJour(1)} aria-label="Jour suivant"><ChevronRight size={20} /></button>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" className="champ w-auto" value={jour} onChange={(e) => e.target.value && setJour(e.target.value)} />
            {jour !== iso(new Date()) && <button className="btn-clair" onClick={() => setJour(iso(new Date()))}>Aujourd'hui</button>}
          </div>
        </div>
        <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
          {bande.map((d) => {
            const ok = recents.has(d)
            const actif = d === jour
            return (
              <button key={d} onClick={() => setJour(d)} title={dateFr(d)}
                className={`shrink-0 w-11 rounded-xl py-1.5 text-center text-xs font-semibold transition ${actif ? 'bg-marine-700 text-white' : ok ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                <div className="opacity-70">{['D', 'L', 'M', 'M', 'J', 'V', 'S'][deIso(d).getDay()]}</div>
                <div className="text-sm">{deIso(d).getDate()}</div>
                <div className="text-[10px]">{ok ? '✔' : '•'}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {GROUPES_JOUR.map((g) => {
          const a = ACCENT[g.couleur]
          const replie = g.facultatif && !autresOuvert
          return (
            <motion.section key={g.titre} layout className={`carte border-t-4 ${a.bord} ${g.couleur === 'emerald' || g.couleur === 'rose' ? 'lg:row-span-2' : ''}`}>
              <button type="button" disabled={!g.facultatif} onClick={() => setAutresOuvert(!autresOuvert)}
                className="w-full flex items-center justify-between px-5 pt-4 pb-3 text-left">
                <h2 className={`font-bold ${a.titre}`}>{g.titre}</h2>
                {g.facultatif && <ChevronDown className={`transition ${autresOuvert ? 'rotate-180' : ''}`} size={20} />}
              </button>
              {!replie && (
                <div className="px-5 pb-5 divide-y divide-slate-100">
                  {g.champs.map((c) => (
                    <div key={c.cle} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-800">{c.libelle}{c.unite && <span className="text-slate-400 font-normal"> ({c.unite})</span>}</div>
                        <div className="text-xs text-slate-500">{c.aide}</div>
                      </div>
                      <Stepper valeur={vals[c.cle] ?? ''} onChange={(v) => set(c.cle, v)} alerte={g.couleur === 'rose' && !['presque_accidents', 'dangers'].includes(c.cle)} />
                    </div>
                  ))}
                  {g.couleur === 'sky' && (
                    <div className={`mt-3 rounded-xl ${a.fond} px-4 py-3 text-sm text-sky-800`}>
                      Heures travaillées calculées : <b>{entier(h)} h</b>{!vals.heures_reelles && <> ({vals.personnes || 0} × {site.heures_par_jour} h)</>}
                    </div>
                  )}
                </div>
              )}
            </motion.section>
          )
        })}
        <section className="carte border-t-4 border-t-slate-400 p-5">
          <h2 className="font-bold text-slate-600 mb-3">Commentaire</h2>
          <textarea className="champ min-h-[110px]" placeholder="Quelques mots sur ce qui s'est passé (facultatif)" value={commentaire}
            onChange={(e) => { setCommentaire(e.target.value); setModifie(true) }} />
          {evenementsDuJour > 0 && (
            <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
              Un événement a été noté aujourd'hui : pensez aussi à le déclarer dans <b>Incidents</b> (avec photos) pour garder une trace complète.
            </p>
          )}
        </section>
      </div>

      {peutEcrire && (
        <div className="sticky bottom-20 md:bottom-6 mt-6 flex justify-end z-20">
          <motion.button whileTap={{ scale: 0.97 }} className={`btn-vert text-base px-7 py-3.5 shadow-xl ${modifie ? 'ring-4 ring-emerald-200' : ''}`} onClick={enregistrer} disabled={occupe}>
            <Save size={20} />{occupe ? 'Enregistrement…' : 'Enregistrer la journée'}
          </motion.button>
        </div>
      )}
      <Historique ouvert={histo} onFermer={() => setHisto(false)} onChoisir={(d) => { setHisto(false); setJour(d) }} />
    </div>
  )
}

function Historique({ ouvert, onFermer, onChoisir }: { ouvert: boolean; onFermer: () => void; onChoisir: (d: string) => void }) {
  const { site } = useApp()
  const now = new Date()
  const [annee, setAnnee] = useState(now.getFullYear())
  const [mois, setMois] = useState<number | 'tout'>(now.getMonth())
  const [lignes, setLignes] = useState<Jour[]>([])
  useEffect(() => {
    if (!ouvert) return
    const debut = mois === 'tout' ? `${annee}-01-01` : iso(new Date(annee, mois, 1))
    const fin = mois === 'tout' ? `${annee}-12-31` : iso(new Date(annee, mois + 1, 0))
    supabase.from('hse_journal').select('*').gte('jour', debut).lte('jour', fin).order('jour').then(({ data }) => setLignes((data ?? []) as Jour[]))
  }, [ouvert, annee, mois])
  const colonnes = ['personnes', 'jsa', 'causeries', 'permis_chaud', 'permis_froid', 'inspections', 'presque_accidents', 'dangers', 'premiers_soins']
  async function exporter() {
    const champs = CHAMPS_JOUR
    await exporterExcel(`Journal HSE ${mois === 'tout' ? annee : `${MOIS[mois]} ${annee}`}`, [{
      nom: 'Journal', titre: `Journal HSE — ${mois === 'tout' ? `Année ${annee}` : `${MOIS[mois]} ${annee}`}`,
      colonnes: [
        { titre: 'Date', type: 'date', largeur: 12 },
        { titre: 'Heures travaillées', type: 'nombre', total: true, largeur: 12 },
        ...champs.map((c) => ({ titre: c.libelle, type: 'nombre' as const, total: true, largeur: 12 })),
        { titre: 'Commentaire', type: 'texte' as const, largeur: 45 },
      ],
      lignes: lignes.map((l) => [l.jour, heures(l, site), ...champs.map((c) => (l[c.cle] as number | null) ?? null), (l.commentaire as string) ?? null]),
      note: `Heures travaillées : heures réelles si saisies, sinon personnes × ${site.heures_par_jour} h.`,
    }], { site: site.nom, client: site.client, entreprise: site.entreprise })
  }
  return (
    <Fenetre ouverte={ouvert} onFermer={onFermer} titre="Historique des journées" large
      pied={<><button className="btn-clair" onClick={onFermer}>Fermer</button><button className="btn-vert" onClick={exporter} disabled={!lignes.length}><Download size={18} />Exporter en Excel</button></>}>
      <div className="flex gap-2 mb-4">
        <select className="champ w-auto" value={annee} onChange={(e) => setAnnee(Number(e.target.value))}>
          {[now.getFullYear() + 1, now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((y) => <option key={y}>{y}</option>)}
        </select>
        <select className="champ w-auto" value={mois} onChange={(e) => setMois(e.target.value === 'tout' ? 'tout' : Number(e.target.value))}>
          <option value="tout">Toute l'année</option>
          {MOIS.map((m, i) => <option key={m} value={i}>{m}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr><th className="text-left px-3 py-2">Date</th>{colonnes.map((c) => <th key={c} className="px-2 py-2 font-semibold text-xs">{CHAMPS_JOUR.find((x) => x.cle === c)?.libelle}</th>)}</tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={l.jour} className="border-t border-slate-100 hover:bg-marine-50 cursor-pointer" onClick={() => onChoisir(l.jour)}>
                <td className="px-3 py-2 font-semibold whitespace-nowrap">{dateFr(l.jour)}</td>
                {colonnes.map((c) => <td key={c} className="px-2 py-2 text-center tabular-nums">{(l[c] as number | null) ?? ''}</td>)}
              </tr>
            ))}
            {!lignes.length && <tr><td colSpan={colonnes.length + 1} className="px-3 py-8 text-center text-slate-400">Aucune journée enregistrée sur cette période.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">Cliquez sur une ligne pour ouvrir la journée.</p>
    </Fenetre>
  )
}
