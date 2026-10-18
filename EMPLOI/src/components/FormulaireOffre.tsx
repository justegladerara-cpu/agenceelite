import { useEffect, useState } from 'react'
import { useApp } from '../lib/contexte'
import { messageErreur, supabase } from '../lib/supabase'
import { CONTRATS, METIERS, VILLES, type Contrat, type Pays, type Test } from '../lib/donnees'

export type OffreEdition = {
  id?: string; entreprise_id?: string | null; titre?: string; metier?: string; description?: string; missions?: string | null; profil?: string | null
  pays?: Pays; ville?: string; contrat?: Contrat; teletravail?: boolean; salaire_min?: number | null; salaire_max?: number | null; devise?: 'XAF' | 'EUR'
  confidentielle?: boolean; statut?: string; a_la_une?: boolean; expire_le?: string | null; cree_le?: string; test_ids?: string[]
}

/** Formulaire d'offre, utilisé par les entreprises (envoi en validation) et par l'admin (publication directe possible). */
export function FormulaireOffre({ offre, onEnregistre, admin }: { offre: OffreEdition; onEnregistre: () => void; admin?: boolean }) {
  const { toast } = useApp()
  const [o, setO] = useState<OffreEdition>({ contrat: 'cdi', teletravail: false, confidentielle: false, test_ids: [], ...offre })
  const [tests, setTests] = useState<Test[]>([])
  const [envoi, setEnvoi] = useState(false)
  useEffect(() => { supabase.from('emploi_tests').select('*').eq('actif', true).order('ordre').then(({ data }) => setTests((data as Test[]) ?? [])) }, [])
  const maj = (v: Partial<OffreEdition>) => setO({ ...o, ...v })
  const nombre = (s: string) => (s === '' ? null : Math.max(0, Number(s)))

  const enregistrer = async (statut: string) => {
    if (!o.titre?.trim() || !o.metier || !o.description?.trim() || !o.ville?.trim()) return toast('Remplissez le titre, le métier, la ville et la description.', 'erreur')
    if (o.salaire_min != null && o.salaire_max != null && o.salaire_min > o.salaire_max) return toast('Le salaire minimum dépasse le maximum.', 'erreur')
    setEnvoi(true)
    const valeurs = {
      entreprise_id: o.entreprise_id ?? null, titre: o.titre.trim(), metier: o.metier, description: o.description.trim(), missions: o.missions?.trim() || null,
      profil: o.profil?.trim() || null, pays: o.pays ?? 'CG', ville: o.ville.trim(), contrat: o.contrat, teletravail: !!o.teletravail,
      salaire_min: o.salaire_min ?? null, salaire_max: o.salaire_max ?? null, devise: o.devise ?? 'XAF', confidentielle: !!o.confidentielle,
      expire_le: o.expire_le || null, statut, ...(admin ? { a_la_une: !!o.a_la_une } : {}),
    }
    const res = o.id
      ? await supabase.from('emploi_offres').update(valeurs).eq('id', o.id).select('id').single()
      : await supabase.from('emploi_offres').insert(valeurs).select('id').single()
    if (res.error) { setEnvoi(false); return toast(messageErreur(res.error), 'erreur') }
    const id = res.data.id as string
    await supabase.from('emploi_offre_tests').delete().eq('offre_id', id)
    if (o.test_ids?.length) {
      const { error } = await supabase.from('emploi_offre_tests').insert(o.test_ids.map((test_id) => ({ offre_id: id, test_id })))
      if (error) { setEnvoi(false); return toast(messageErreur(error), 'erreur') }
    }
    setEnvoi(false)
    onEnregistre()
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="etiquette">Intitulé du poste</label><input className="champ" value={o.titre ?? ''} onChange={(e) => maj({ titre: e.target.value })} placeholder="Ex. : Comptable confirmé" /></div>
        <div><label className="etiquette">Métier</label><select className="champ" value={o.metier ?? ''} onChange={(e) => maj({ metier: e.target.value })}><option value="">Choisir…</option>{METIERS.map((m) => <option key={m}>{m}</option>)}</select></div>
        <div><label className="etiquette">Contrat</label><select className="champ" value={o.contrat} onChange={(e) => maj({ contrat: e.target.value as Contrat })}>{Object.entries(CONTRATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
        <div><label className="etiquette">Pays</label><select className="champ" value={o.pays} onChange={(e) => { const p = e.target.value as Pays; maj({ pays: p, devise: p === 'FR' ? 'EUR' : 'XAF' }) }}><option value="CG">🇨🇬 Congo</option><option value="FR">🇫🇷 France</option></select></div>
        <div><label className="etiquette">Ville</label><input className="champ" list="villes-offre" value={o.ville ?? ''} onChange={(e) => maj({ ville: e.target.value })} /><datalist id="villes-offre">{VILLES[o.pays ?? 'CG'].map((v) => <option key={v} value={v} />)}</datalist></div>
        <div><label className="etiquette">Salaire mensuel minimum ({o.devise === 'EUR' ? '€' : 'FCFA'})</label><input type="number" min={0} className="champ" value={o.salaire_min ?? ''} onChange={(e) => maj({ salaire_min: nombre(e.target.value) })} /></div>
        <div><label className="etiquette">Salaire mensuel maximum ({o.devise === 'EUR' ? '€' : 'FCFA'})</label><input type="number" min={0} className="champ" value={o.salaire_max ?? ''} onChange={(e) => maj({ salaire_max: nombre(e.target.value) })} /></div>
        <div className="sm:col-span-2"><label className="etiquette">Description du poste</label><textarea className="champ min-h-[110px]" maxLength={5000} value={o.description ?? ''} onChange={(e) => maj({ description: e.target.value })} /></div>
        <div><label className="etiquette">Missions</label><textarea className="champ min-h-[100px]" maxLength={4000} value={o.missions ?? ''} onChange={(e) => maj({ missions: e.target.value })} placeholder="Une mission par ligne" /></div>
        <div><label className="etiquette">Profil recherché</label><textarea className="champ min-h-[100px]" maxLength={4000} value={o.profil ?? ''} onChange={(e) => maj({ profil: e.target.value })} placeholder="Diplôme, expérience, qualités…" /></div>
        <div><label className="etiquette">Date limite (facultatif)</label><input type="date" className="champ" value={o.expire_le ?? ''} onChange={(e) => maj({ expire_le: e.target.value || null })} /></div>
        <div className="space-y-2 pt-6">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={!!o.teletravail} onChange={(e) => maj({ teletravail: e.target.checked })} />Télétravail possible</label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={!!o.confidentielle} onChange={(e) => maj({ confidentielle: e.target.checked })} />Cacher le nom de l’entreprise</label>
          {admin && <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={!!o.a_la_une} onChange={(e) => maj({ a_la_une: e.target.checked })} />Mettre à la une</label>}
        </div>
      </div>
      <div>
        <label className="etiquette">Tests demandés aux candidats</label>
        <div className="grid gap-2 sm:grid-cols-2">
          {tests.map((t) => (
            <label key={t.id} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm">
              <input type="checkbox" checked={o.test_ids?.includes(t.id) ?? false} onChange={(e) => maj({ test_ids: e.target.checked ? [...(o.test_ids ?? []), t.id] : (o.test_ids ?? []).filter((x) => x !== t.id) })} />
              {t.titre}
            </label>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2 pt-2">
        {admin ? (
          <>
            <button className="btn-clair" disabled={envoi} onClick={() => enregistrer('brouillon')}>Brouillon</button>
            <button className="btn-primaire" disabled={envoi} onClick={() => enregistrer('publiee')}>{envoi ? 'Enregistrement…' : 'Publier'}</button>
          </>
        ) : (
          <>
            <button className="btn-clair" disabled={envoi} onClick={() => enregistrer('brouillon')}>Garder en brouillon</button>
            <button className="btn-primaire" disabled={envoi} onClick={() => enregistrer(o.statut === 'publiee' ? 'publiee' : 'en_attente')}>{envoi ? 'Envoi…' : 'Envoyer pour publication'}</button>
          </>
        )}
      </div>
    </div>
  )
}
