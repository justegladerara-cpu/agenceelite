import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Camera, Download, ExternalLink, FileDown, Paperclip, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { moduleParId, optionDe, type Champ, type Module } from '../lib/modules'
import { BUCKET, messageErreur, supabase } from '../lib/supabase'
import { useApp } from '../lib/contexte'
import { Chargement, EnTete, Fenetre, Pastille, Vide } from '../components/ui'
import { dateFr, heureFr, iso } from '../lib/format'
import { exporterExcel, type ColonneExcel } from '../lib/excel'
import { ficheIncidentPdf } from '../lib/pdf'

type Ligne = Record<string, unknown> & { id: string }

const COULEUR_EXCEL: Record<string, string> = { emerald: 'vert', rose: 'rouge', amber: 'orange', orange: 'orange', yellow: 'jaune', sky: 'bleu', slate: 'gris' }

export function valeurAffichee(c: Champ, v: unknown, personnes?: Record<string, string>): string {
  if (v == null || v === '') return ''
  if (c.type === 'date') return dateFr(String(v))
  if (c.type === 'dateheure') return `${dateFr(String(v))} ${heureFr(String(v))}`
  if (c.type === 'choix' || c.type === 'ouinon') return optionDe(c, v)?.l ?? String(v)
  if (c.type === 'personne') return personnes?.[String(v)] ?? ''
  if (c.type === 'photos') return Array.isArray(v) ? `${v.length} photo(s)` : ''
  if (c.type === 'fichier') return String(v).split('/').pop() ?? ''
  return String(v)
}

function versInput(c: Champ, v: unknown): string {
  if (v == null) return ''
  if (c.type === 'dateheure') { const d = new Date(String(v)); return `${iso(d)}T${heureFr(String(v))}` }
  return String(v)
}

function Photo({ chemin, onSupprimer }: { chemin: string; onSupprimer?: () => void }) {
  const [url, setUrl] = useState('')
  useEffect(() => { supabase.storage.from(BUCKET).createSignedUrl(chemin, 3600).then(({ data }) => setUrl(data?.signedUrl ?? '')) }, [chemin])
  return (
    <div className="relative group h-24 w-24 rounded-xl overflow-hidden bg-slate-100">
      {url && <a href={url} target="_blank" rel="noreferrer"><img src={url} className="h-full w-full object-cover" alt="" /></a>}
      {onSupprimer && <button type="button" onClick={onSupprimer} className="absolute top-1 right-1 rounded-lg bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>}
    </div>
  )
}

async function televerser(fichier: File, dossier: string): Promise<string> {
  const ext = fichier.name.split('.').pop() || 'bin'
  const chemin = `${dossier}/${iso(new Date())}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(chemin, fichier, { contentType: fichier.type })
  if (error) throw error
  return chemin
}

function Formulaire({ m, ligne, onFermer, onEnregistre, personnes }: {
  m: Module; ligne: Ligne | 'nouveau' | null; onFermer: () => void; onEnregistre: () => void; personnes: Record<string, string>
}) {
  const { toast } = useApp()
  const [v, setV] = useState<Record<string, unknown>>({})
  const [occupe, setOccupe] = useState(false)
  useEffect(() => {
    if (!ligne) return
    if (ligne === 'nouveau') {
      const d: Record<string, unknown> = {}
      for (const c of m.champs) {
        if (c.type === 'date' && c.requis) d[c.cle] = iso(new Date())
        if (c.type === 'dateheure') d[c.cle] = `${iso(new Date())}T${new Date().toTimeString().slice(0, 5)}`
        if (c.type === 'choix' && c.requis && c.options?.length) d[c.cle] = c.options[0].v
        if (c.type === 'ouinon') d[c.cle] = 'true'
        if (c.type === 'photos') d[c.cle] = []
        if (c.cle === 'quantite') d[c.cle] = '1'
        if (c.defaut) d[c.cle] = c.defaut
      }
      setV(d)
    } else {
      const d: Record<string, unknown> = {}
      for (const c of m.champs) d[c.cle] = c.type === 'photos' ? (ligne[c.cle] ?? []) : versInput(c, ligne[c.cle])
      setV(d)
    }
  }, [ligne, m])

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault(); setOccupe(true)
    const donnees: Record<string, unknown> = {}
    for (const c of m.champs) {
      const x = v[c.cle]
      if (c.type === 'photos') donnees[c.cle] = x ?? []
      else if (x === '' || x == null) donnees[c.cle] = null
      else if (c.type === 'nombre') donnees[c.cle] = Number(String(x).replace(',', '.'))
      else if (c.type === 'ouinon') donnees[c.cle] = x === 'true'
      else if (c.type === 'dateheure') donnees[c.cle] = new Date(String(x)).toISOString()
      else donnees[c.cle] = x
    }
    if (m.id === 'actions' && donnees.statut === 'terminee' && !donnees.cloture_le) donnees.cloture_le = iso(new Date())
    const req = ligne === 'nouveau' ? supabase.from(m.table).insert(donnees) : supabase.from(m.table).update(donnees).eq('id', (ligne as Ligne).id)
    const { error } = await req
    setOccupe(false)
    if (error) return toast(messageErreur(error), 'erreur')
    toast(ligne === 'nouveau' ? `${m.singulier.charAt(0).toUpperCase() + m.singulier.slice(1)} ajouté(e)` : 'Modifications enregistrées')
    onEnregistre()
  }

  async function ajouterPhotos(cle: string, fichiers: FileList | null) {
    if (!fichiers?.length) return
    setOccupe(true)
    try {
      const chemins: string[] = []
      for (const f of Array.from(fichiers)) chemins.push(await televerser(f, m.id))
      setV((x) => ({ ...x, [cle]: [...((x[cle] as string[]) ?? []), ...chemins] }))
    } catch (err) { toast(messageErreur(err), 'erreur') } finally { setOccupe(false) }
  }
  async function ajouterFichier(cle: string, fichiers: FileList | null) {
    if (!fichiers?.length) return
    setOccupe(true)
    try { const ch = await televerser(fichiers[0], m.id); setV((x) => ({ ...x, [cle]: ch })) }
    catch (err) { toast(messageErreur(err), 'erreur') } finally { setOccupe(false) }
  }

  const set = (cle: string, x: unknown) => setV((o) => ({ ...o, [cle]: x }))
  return (
    <Fenetre ouverte={!!ligne} onFermer={onFermer} titre={ligne === 'nouveau' ? `Ajouter : ${m.singulier}` : `Modifier : ${m.singulier}`}
      pied={<><button type="button" className="btn-clair" onClick={onFermer}>Annuler</button><button form="form-module" className="btn-primaire" disabled={occupe}>{occupe ? 'Patientez…' : 'Enregistrer'}</button></>}>
      <form id="form-module" onSubmit={enregistrer} className="grid gap-4 md:grid-cols-2">
        {m.champs.map((c) => (
          <div key={c.cle} className={c.largeur === 'plein' || c.type === 'long' && c.largeur !== 'demi' ? 'md:col-span-2' : ''}>
            <label className="etiquette">{c.libelle}{c.requis && <span className="text-rose-500"> *</span>}</label>
            {c.type === 'texte' && <input className="champ" value={String(v[c.cle] ?? '')} onChange={(e) => set(c.cle, e.target.value)} required={c.requis} />}
            {c.type === 'lien' && <input className="champ" type="url" placeholder="https://…" value={String(v[c.cle] ?? '')} onChange={(e) => set(c.cle, e.target.value)} />}
            {c.type === 'long' && <textarea className="champ min-h-[90px]" value={String(v[c.cle] ?? '')} onChange={(e) => set(c.cle, e.target.value)} required={c.requis} />}
            {c.type === 'date' && <input className="champ" type="date" value={String(v[c.cle] ?? '')} onChange={(e) => set(c.cle, e.target.value)} required={c.requis} />}
            {c.type === 'dateheure' && <input className="champ" type="datetime-local" value={String(v[c.cle] ?? '')} onChange={(e) => set(c.cle, e.target.value)} required={c.requis} />}
            {c.type === 'nombre' && <input className="champ" inputMode="decimal" value={String(v[c.cle] ?? '')} onChange={(e) => set(c.cle, e.target.value.replace(/[^0-9.,]/g, ''))} required={c.requis} />}
            {(c.type === 'choix' || c.type === 'ouinon') && (
              <div className="flex flex-wrap gap-2">
                {c.options!.map((o) => (
                  <button type="button" key={o.v} onClick={() => set(c.cle, o.v)}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold border transition ${String(v[c.cle]) === o.v ? 'bg-marine-700 text-white border-marine-700' : 'bg-white border-slate-200 text-slate-600 hover:border-marine-300'}`}>{o.l}</button>
                ))}
              </div>
            )}
            {c.type === 'personne' && (
              <select className="champ" value={String(v[c.cle] ?? '')} onChange={(e) => set(c.cle, e.target.value)}>
                <option value="">— Choisir une personne —</option>
                {Object.entries(personnes).sort((a, b) => a[1].localeCompare(b[1])).map(([id, nom]) => <option key={id} value={id}>{nom}</option>)}
              </select>
            )}
            {c.type === 'photos' && (
              <div className="flex flex-wrap gap-2">
                {((v[c.cle] as string[]) ?? []).map((p) => <Photo key={p} chemin={p} onSupprimer={() => set(c.cle, ((v[c.cle] as string[]) ?? []).filter((x) => x !== p))} />)}
                <label className="h-24 w-24 rounded-xl border-2 border-dashed border-slate-300 grid place-items-center text-slate-500 cursor-pointer hover:border-marine-400 hover:text-marine-600 text-xs text-center">
                  <span><Camera className="mx-auto mb-1" size={22} />Ajouter</span>
                  <input type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => ajouterPhotos(c.cle, e.target.files)} />
                </label>
              </div>
            )}
            {c.type === 'fichier' && (
              <div className="flex items-center gap-3">
                <label className="btn-clair cursor-pointer"><Paperclip size={16} />{v[c.cle] ? 'Remplacer le fichier' : 'Choisir un fichier'}
                  <input type="file" className="hidden" onChange={(e) => ajouterFichier(c.cle, e.target.files)} />
                </label>
                {!!v[c.cle] && <span className="text-sm text-slate-600 truncate">{String(v[c.cle]).split('/').pop()}</span>}
              </div>
            )}
            {c.aide && <p className="text-xs text-slate-500 mt-1">{c.aide}</p>}
          </div>
        ))}
      </form>
    </Fenetre>
  )
}

export default function ModulePage() {
  const { id = '' } = useParams()
  const m = moduleParId(id)
  if (!m) return <Navigate to="/" replace />
  return <Registre key={m.id} m={m} />
}

function Registre({ m }: { m: Module }) {
  const { site, toast, peutEcrire } = useApp()
  const [lignes, setLignes] = useState<Ligne[] | null>(null)
  const [recherche, setRecherche] = useState('')
  const [filtre, setFiltre] = useState<string>('tout')
  const [edition, setEdition] = useState<Ligne | 'nouveau' | null>(null)
  const [detail, setDetail] = useState<Ligne | null>(null)
  const [personnes, setPersonnes] = useState<Record<string, string>>({})
  const champStatut = m.champs.find((c) => c.cle === m.statut)
  const aujourdhui = iso(new Date())

  const charger = useCallback(async () => {
    const { data, error } = await supabase.from(m.table).select('*').order(m.tri, { ascending: m.tri === 'nom' || m.tri === 'echeance', nullsFirst: false }).limit(2000)
    if (error) toast(messageErreur(error), 'erreur')
    setLignes((data ?? []) as Ligne[])
  }, [m, toast])
  useEffect(() => { charger() }, [charger])
  useEffect(() => {
    if (m.champs.some((c) => c.type === 'personne'))
      supabase.from('hse_personnel').select('id, nom').then(({ data }) => setPersonnes(Object.fromEntries((data ?? []).map((p) => [p.id, p.nom]))))
  }, [m])

  const enRetard = (l: Ligne) => m.id === 'actions' && l.statut !== 'terminee' && !!l.echeance && String(l.echeance) < aujourdhui
  const filtrees = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return (lignes ?? []).filter((l) => {
      if (filtre === 'retard' && !enRetard(l)) return false
      if (filtre !== 'tout' && filtre !== 'retard' && String(l[m.statut!]) !== filtre) return false
      if (!q) return true
      return m.champs.some((c) => valeurAffichee(c, l[c.cle], personnes).toLowerCase().includes(q))
    })
  }, [lignes, recherche, filtre, personnes])

  async function supprimer(l: Ligne) {
    if (!confirm(`Supprimer définitivement « ${m.titreLigne(l)} » ?`)) return
    const { error } = await supabase.from(m.table).delete().eq('id', l.id)
    if (error) return toast(messageErreur(error), 'erreur')
    toast('Supprimé'); setDetail(null); charger()
  }
  async function ouvrirFichier(chemin: string) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(chemin, 600)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function exporter() {
    const champs = m.champs.filter((c) => c.type !== 'photos')
    const colonnes: ColonneExcel[] = [
      ...(m.prefixe ? [{ titre: 'N°', largeur: 10 } as ColonneExcel] : []),
      ...champs.map((c): ColonneExcel => ({
        titre: c.libelle.replace(/ \(.*\)$/, ''),
        type: c.type === 'date' ? 'date' : c.type === 'dateheure' ? 'dateheure' : c.type === 'nombre' ? 'nombre' : 'texte',
        largeur: c.type === 'long' ? 40 : c.type === 'date' ? 12 : c.type === 'dateheure' ? 17 : c.cle === 'titre' || c.cle === 'theme' || c.cle === 'travaux' ? 38 : undefined,
        total: c.type === 'nombre' && ['participants', 'quantite', 'points_ok', 'points_nok', 'duree_h'].includes(c.cle),
        couleurs: c.options ? Object.fromEntries(c.options.filter((o) => o.c && COULEUR_EXCEL[o.c]).map((o) => [o.l, COULEUR_EXCEL[o.c!]])) : undefined,
      })),
      ...(m.id === 'actions' ? [{ titre: 'En retard ?', largeur: 12, couleurs: { 'Oui': 'rouge' } } as ColonneExcel] : []),
    ]
    const donnees = filtrees.map((l) => [
      ...(m.prefixe ? [`${m.prefixe}-${l.num}`] : []),
      ...champs.map((c) => {
        const x = l[c.cle]
        if (x == null || x === '') return null
        if (c.type === 'date' || c.type === 'dateheure') return String(x)
        if (c.type === 'nombre') return Number(x)
        return valeurAffichee(c, x, personnes)
      }),
      ...(m.id === 'actions' ? [enRetard(l) ? 'Oui' : 'Non'] : []),
    ])
    await exporterExcel(`${m.titre} ${site.entreprise} ${iso(new Date())}`, [{
      nom: m.titre, titre: `${m.titre} — ${site.nom}`, colonnes, lignes: donnees,
      note: `${donnees.length} ligne(s)${filtre !== 'tout' || recherche ? ' (liste filtrée)' : ''}.`,
    }], { site: site.nom, client: site.client, entreprise: site.entreprise })
  }

  const colonnesListe = m.champs.filter((c) => c.liste)
  const compte = (v: string) => (lignes ?? []).filter((l) => String(l[m.statut!]) === v).length
  const Icone = m.icone

  return (
    <div>
      <EnTete titre={m.titre} sousTitre={m.description} icone={<Icone />} couleur={m.couleur}
        actions={<>
          <button className="btn-clair" onClick={exporter} disabled={!filtrees.length}><Download size={18} />Exporter en Excel</button>
          {peutEcrire && <button className="btn-primaire" onClick={() => setEdition('nouveau')}><Plus size={18} />Ajouter</button>}
        </>} />

      <div className="carte p-3 mb-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="champ pl-10" placeholder="Rechercher…" value={recherche} onChange={(e) => setRecherche(e.target.value)} />
        </div>
        {champStatut?.options && (
          <div className="flex gap-1.5 overflow-x-auto">
            <button onClick={() => setFiltre('tout')} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${filtre === 'tout' ? 'bg-marine-700 text-white' : 'bg-slate-100 text-slate-600'}`}>Tout ({lignes?.length ?? 0})</button>
            {champStatut.options.map((o) => (
              <button key={o.v} onClick={() => setFiltre(o.v)} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${filtre === o.v ? 'bg-marine-700 text-white' : 'bg-slate-100 text-slate-600'}`}>{o.l} ({compte(o.v)})</button>
            ))}
            {m.id === 'actions' && <button onClick={() => setFiltre('retard')} className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${filtre === 'retard' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700'}`}>En retard ({(lignes ?? []).filter(enRetard).length})</button>}
          </div>
        )}
      </div>

      {lignes == null ? <Chargement /> : !filtrees.length ? (
        <Vide texte={lignes.length ? 'Aucun résultat pour cette recherche.' : `Aucun(e) ${m.singulier} pour le moment.`}
          action={peutEcrire && !lignes.length ? <button className="btn-primaire" onClick={() => setEdition('nouveau')}><Plus size={18} />Ajouter le premier</button> : undefined} />
      ) : (
        <>
          {/* Bureau : tableau */}
          <div className="hidden md:block carte overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  {m.prefixe && <th className="text-left px-4 py-3">N°</th>}
                  {colonnesListe.map((c) => <th key={c.cle} className="text-left px-4 py-3">{c.libelle.replace(/ \(.*\)$/, '')}</th>)}
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtrees.map((l, i) => (
                  <motion.tr key={l.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 20) * 0.015 }}
                    className={`border-t border-slate-100 hover:bg-marine-50/50 cursor-pointer ${enRetard(l) ? 'bg-rose-50/60' : ''}`} onClick={() => setDetail(l)}>
                    {m.prefixe && <td className="px-4 py-3 font-mono text-xs text-slate-500">{m.prefixe}-{String(l.num)}</td>}
                    {colonnesListe.map((c) => {
                      const o = optionDe(c, l[c.cle])
                      return (
                        <td key={c.cle} className={`px-4 py-3 ${c.cle === colonnesListe[0].cle ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                          {o?.c ? <Pastille couleur={o.c}>{o.l}</Pastille> : valeurAffichee(c, l[c.cle], personnes)}
                          {c.cle === 'echeance' && enRetard(l) && <span className="ml-2 text-xs font-bold text-rose-600">en retard</span>}
                        </td>
                      )
                    })}
                    <td className="px-3 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      {peutEcrire && <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500" onClick={() => setEdition(l)} title="Modifier"><Pencil size={16} /></button>}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile : cartes */}
          <div className="md:hidden space-y-3">
            {filtrees.map((l) => (
              <button key={l.id} onClick={() => setDetail(l)} className={`carte w-full text-left p-4 ${enRetard(l) ? 'ring-2 ring-rose-200' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-slate-800">{m.titreLigne(l)}</div>
                  {champStatut && optionDe(champStatut, l[m.statut!])?.c && <Pastille couleur={optionDe(champStatut, l[m.statut!])!.c}>{optionDe(champStatut, l[m.statut!])!.l}</Pastille>}
                </div>
                <div className="mt-1.5 text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                  {m.prefixe && <span className="font-mono">{m.prefixe}-{String(l.num)}</span>}
                  {colonnesListe.slice(1).filter((c) => c.cle !== m.statut).map((c) => {
                    const t = valeurAffichee(c, l[c.cle], personnes)
                    return t ? <span key={c.cle}>{t}</span> : null
                  })}
                  {enRetard(l) && <span className="font-bold text-rose-600">en retard</span>}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Détail */}
      <Fenetre ouverte={!!detail} onFermer={() => setDetail(null)} titre={detail ? `${m.prefixe ? `${m.prefixe}-${detail.num} • ` : ''}${m.titreLigne(detail)}` : ''}
        pied={detail && <>
          {peutEcrire && <button className="btn-danger mr-auto" onClick={() => supprimer(detail)}><Trash2 size={16} />Supprimer</button>}
          {m.id === 'incidents' && <button className="btn-clair" onClick={() => ficheIncidentPdf(detail, site)}><FileDown size={16} />Fiche Incident Flash (PDF)</button>}
          {peutEcrire && <button className="btn-primaire" onClick={() => { setEdition(detail); setDetail(null) }}><Pencil size={16} />Modifier</button>}
        </>}>
        {detail && (
          <dl className="grid gap-4 md:grid-cols-2">
            {m.champs.map((c) => {
              const x = detail[c.cle]
              if (c.type === 'photos') return Array.isArray(x) && x.length ? (
                <div key={c.cle} className="md:col-span-2"><dt className="text-xs font-bold uppercase text-slate-400 mb-1">{c.libelle}</dt>
                  <dd className="flex flex-wrap gap-2">{(x as string[]).map((p) => <Photo key={p} chemin={p} />)}</dd></div>
              ) : null
              const t = valeurAffichee(c, x, personnes)
              if (!t) return null
              const o = optionDe(c, x)
              return (
                <div key={c.cle} className={c.type === 'long' || c.largeur === 'plein' ? 'md:col-span-2' : ''}>
                  <dt className="text-xs font-bold uppercase text-slate-400 mb-1">{c.libelle}</dt>
                  <dd className="text-slate-800 whitespace-pre-wrap">
                    {o?.c ? <Pastille couleur={o.c}>{o.l}</Pastille>
                      : c.type === 'fichier' ? <button className="btn-clair" onClick={() => ouvrirFichier(String(x))}><Paperclip size={16} />Ouvrir {t}</button>
                        : c.type === 'lien' ? <a className="text-marine-600 font-semibold inline-flex items-center gap-1 hover:underline" href={String(x)} target="_blank" rel="noreferrer">Ouvrir le lien <ExternalLink size={14} /></a>
                          : t}
                  </dd>
                </div>
              )
            })}
          </dl>
        )}
      </Fenetre>

      <Formulaire m={m} ligne={edition} personnes={personnes} onFermer={() => setEdition(null)} onEnregistre={() => { setEdition(null); charger() }} />
    </div>
  )
}
