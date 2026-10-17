import { useCallback, useEffect, useState } from 'react'
import { Building2, ClipboardCheck, Download, FileText, Mail, Phone, Plus } from 'lucide-react'
import { Chargement, EnTete, Fenetre, Pastille, Vide } from '../../components/ui'
import { FormulaireOffre, type OffreEdition } from '../../components/FormulaireOffre'
import { useApp } from '../../lib/contexte'
import { BUCKET_CV, messageErreur, supabase } from '../../lib/supabase'
import { CONTRATS, DECISIONS, METIERS, PAIEMENTS, STATUTS_OFFRE, argent, dateCourte, type Pays } from '../../lib/donnees'

type Entreprise = { id: string; nom: string; secteur: string | null; pays: Pays | null; ville: string | null; site_web: string | null; description: string | null; statut: string }
type ProfilRecu = {
  envoi_id: string; envoye_le: string; decision_entreprise: string; prix: number; devise: string; statut_paiement: string; commentaire_admin: string | null
  offre_titre: string; nom: string; telephone: string | null; email: string; ville: string | null; pays: string | null; titre: string | null; resume: string | null
  competences: string[]; langues: string[]; experience_annees: number | null; niveau_etudes: string | null; cv_chemin: string | null; cv_nom: string | null
  tests: { titre: string; pourcentage: number; reussi: boolean }[]
}

export default function EspaceEntreprise() {
  const { profil } = useApp()
  const [entreprise, setEntreprise] = useState<Entreprise | null | undefined>(undefined)
  const [onglet, setOnglet] = useState<'profils' | 'offres' | 'entreprise'>('profils')
  const charger = useCallback(async () => {
    if (!profil) return
    const { data } = await supabase.from('emploi_entreprises').select('*').eq('proprietaire_id', profil.id).maybeSingle()
    setEntreprise((data as Entreprise) ?? null)
  }, [profil])
  useEffect(() => { charger() }, [charger])

  if (entreprise === undefined) return <Chargement />
  if (entreprise === null) return <div className="conteneur py-8 max-w-2xl"><EnTete titre="Présentez votre entreprise" sousTitre="Agence Elite la vérifie avant que vous puissiez publier." icone={<Building2 />} couleur="amber" /><FicheEntreprise entreprise={null} onEnregistre={charger} /></div>

  return (
    <div className="conteneur py-8">
      <EnTete titre={entreprise.nom} sousTitre="Espace recruteur" icone={<Building2 />} couleur="amber"
        actions={entreprise.statut !== 'validee' ? <Pastille couleur={entreprise.statut === 'refusee' ? 'rose' : 'amber'}>{entreprise.statut === 'refusee' ? 'Compte refusé' : 'En cours de vérification'}</Pastille> : undefined} />
      {entreprise.statut === 'en_attente' && <p className="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Agence Elite vérifie votre entreprise. Vous pourrez publier des offres dès qu’elle sera validée. Pour aller plus vite, contactez-nous au +242 05 522 29 68 (WhatsApp).</p>}
      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1 mb-6">
        {([['profils', 'Profils reçus'], ['offres', 'Mes offres'], ['entreprise', 'Mon entreprise']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setOnglet(k)} className={`onglet ${onglet === k ? 'onglet-actif' : 'onglet-inactif'}`}>{l}</button>
        ))}
      </div>
      {onglet === 'profils' && <ProfilsRecus />}
      {onglet === 'offres' && <MesOffres entreprise={entreprise} />}
      {onglet === 'entreprise' && <FicheEntreprise entreprise={entreprise} onEnregistre={charger} />}
    </div>
  )
}

function FicheEntreprise({ entreprise, onEnregistre }: { entreprise: Entreprise | null; onEnregistre: () => void }) {
  const { profil, toast } = useApp()
  const [f, setF] = useState({ nom: entreprise?.nom ?? '', secteur: entreprise?.secteur ?? '', pays: entreprise?.pays ?? profil?.pays ?? 'CG', ville: entreprise?.ville ?? '', site_web: entreprise?.site_web ?? '', description: entreprise?.description ?? '' })
  const [envoi, setEnvoi] = useState(false)
  const enregistrer = async () => {
    if (!profil || !f.nom.trim()) return toast('Indiquez le nom de l’entreprise.', 'erreur')
    setEnvoi(true)
    const valeurs = { nom: f.nom.trim(), secteur: f.secteur || null, pays: f.pays, ville: f.ville.trim() || null, site_web: f.site_web.trim() || null, description: f.description.trim() || null }
    const { error } = entreprise
      ? await supabase.from('emploi_entreprises').update(valeurs).eq('id', entreprise.id)
      : await supabase.from('emploi_entreprises').insert({ ...valeurs, proprietaire_id: profil.id })
    setEnvoi(false)
    if (error) return toast(messageErreur(error), 'erreur')
    toast(entreprise ? 'Informations enregistrées.' : 'Merci ! Agence Elite va vérifier votre entreprise.')
    onEnregistre()
  }
  return (
    <div className="carte p-6 space-y-4 max-w-2xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><label className="etiquette">Nom de l’entreprise</label><input className="champ" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} /></div>
        <div><label className="etiquette">Secteur</label><select className="champ" value={f.secteur} onChange={(e) => setF({ ...f, secteur: e.target.value })}><option value="">Choisir…</option>{METIERS.map((m) => <option key={m}>{m}</option>)}</select></div>
        <div><label className="etiquette">Site internet</label><input className="champ" placeholder="https://…" value={f.site_web} onChange={(e) => setF({ ...f, site_web: e.target.value })} /></div>
        <div><label className="etiquette">Pays</label><select className="champ" value={f.pays} onChange={(e) => setF({ ...f, pays: e.target.value as Pays })}><option value="CG">🇨🇬 Congo</option><option value="FR">🇫🇷 France</option></select></div>
        <div><label className="etiquette">Ville</label><input className="champ" value={f.ville} onChange={(e) => setF({ ...f, ville: e.target.value })} /></div>
        <div className="sm:col-span-2"><label className="etiquette">Présentation</label><textarea className="champ min-h-[110px]" maxLength={3000} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
      </div>
      <button className="btn-primaire" disabled={envoi} onClick={enregistrer}>{envoi ? 'Enregistrement…' : entreprise ? 'Enregistrer' : 'Envoyer pour vérification'}</button>
    </div>
  )
}

function MesOffres({ entreprise }: { entreprise: Entreprise }) {
  const { toast } = useApp()
  const [offres, setOffres] = useState<OffreEdition[] | null>(null)
  const [edition, setEdition] = useState<OffreEdition | null>(null)
  const charger = useCallback(() => {
    supabase.from('emploi_offres').select('*, tests:emploi_offre_tests(test_id)').eq('entreprise_id', entreprise.id).order('cree_le', { ascending: false })
      .then(({ data }) => setOffres(((data ?? []) as (OffreEdition & { tests: { test_id: string }[] })[]).map((o) => ({ ...o, test_ids: o.tests.map((t) => t.test_id) }))))
  }, [entreprise.id])
  useEffect(() => { charger() }, [charger])

  const fermer = async (o: OffreEdition) => {
    if (!confirm('Fermer cette offre ? Elle ne sera plus visible.')) return
    const { error } = await supabase.from('emploi_offres').update({ statut: 'fermee' }).eq('id', o.id!)
    if (error) return toast(messageErreur(error), 'erreur')
    charger()
  }

  if (!offres) return <Chargement />
  return (
    <>
      <div className="mb-4 flex justify-end">
        <button className="btn-primaire" disabled={entreprise.statut !== 'validee'} onClick={() => setEdition({ entreprise_id: entreprise.id, pays: entreprise.pays ?? 'CG', devise: entreprise.pays === 'FR' ? 'EUR' : 'XAF' })}><Plus size={16} />Nouvelle offre</button>
      </div>
      {offres.length === 0 ? <Vide texte="Aucune offre pour l’instant. Décrivez votre besoin : Agence Elite la publie et vous envoie les meilleurs profils." /> : (
        <div className="carte divide-y divide-slate-100">
          {offres.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div><div className="font-semibold text-encre-800">{o.titre}</div><p className="text-sm text-slate-500">{o.ville} · {CONTRATS[o.contrat!]} · créée le {dateCourte(o.cree_le)}</p></div>
              <div className="flex items-center gap-2">
                <Pastille couleur={STATUTS_OFFRE[o.statut!]?.couleur}>{STATUTS_OFFRE[o.statut!]?.label}</Pastille>
                {o.statut !== 'fermee' && <button className="btn-clair py-1.5" onClick={() => setEdition(o)}>Modifier</button>}
                {o.statut === 'publiee' && <button className="btn-clair py-1.5" onClick={() => fermer(o)}>Fermer</button>}
              </div>
            </div>
          ))}
        </div>
      )}
      <Fenetre ouverte={!!edition} onFermer={() => setEdition(null)} titre={edition?.id ? 'Modifier l’offre' : 'Nouvelle offre'} large>
        {edition && <FormulaireOffre offre={edition} onEnregistre={() => { setEdition(null); charger(); toast('Offre envoyée : Agence Elite la vérifie avant publication.') }} />}
      </Fenetre>
    </>
  )
}

function ProfilsRecus() {
  const { toast } = useApp()
  const [liste, setListe] = useState<ProfilRecu[] | null>(null)
  const charger = useCallback(() => { supabase.rpc('emploi_profils_recus').then(({ data }) => setListe((data as ProfilRecu[]) ?? [])) }, [])
  useEffect(() => { charger() }, [charger])

  const decision = async (id: string, d: string) => {
    const { error } = await supabase.rpc('emploi_decision', { p_envoi: id, p_decision: d })
    if (error) return toast(messageErreur(error), 'erreur')
    charger()
  }
  const telecharger = async (chemin: string) => {
    const { data, error } = await supabase.storage.from(BUCKET_CV).createSignedUrl(chemin, 120)
    if (error) return toast(messageErreur(error), 'erreur')
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  if (!liste) return <Chargement />
  if (liste.length === 0) return <Vide texte="Aucun profil reçu pour l’instant. Dès qu’Agence Elite aura sélectionné des candidats pour vos offres, ils apparaîtront ici avec leur CV et leurs résultats de tests." />
  const total = liste.reduce((s, p) => s + Number(p.prix), 0)
  return (
    <>
      <p className="mb-4 text-sm text-slate-600">{liste.length} profil{liste.length > 1 ? 's' : ''} qualifié{liste.length > 1 ? 's' : ''} reçu{liste.length > 1 ? 's' : ''} · {argent(total, liste[0].devise)}</p>
      <div className="grid gap-4 lg:grid-cols-2">
        {liste.map((p) => (
          <div key={p.envoi_id} className="carte p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-lg text-encre-800">{p.nom}</h3>
                <p className="text-sm text-slate-500">{p.titre ?? 'Candidat'}{p.experience_annees != null ? ` · ${p.experience_annees} an${p.experience_annees > 1 ? 's' : ''} d’expérience` : ''}</p>
                <p className="text-xs text-slate-400 mt-0.5">Pour : {p.offre_titre} · reçu le {dateCourte(p.envoye_le)}</p>
              </div>
              <Pastille couleur={PAIEMENTS[p.statut_paiement]?.couleur}>{argent(Number(p.prix), p.devise)} · {PAIEMENTS[p.statut_paiement]?.label}</Pastille>
            </div>
            {p.commentaire_admin && <p className="mt-3 rounded-xl bg-rouge-100/60 p-3 text-sm text-encre-800"><b>L’avis d’Agence Elite :</b> {p.commentaire_admin}</p>}
            {p.resume && <p className="mt-3 text-sm text-slate-700 line-clamp-4 texte-libre">{p.resume}</p>}
            {p.competences.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{p.competences.map((c) => <Pastille key={c}>{c}</Pastille>)}</div>}
            {p.tests.length > 0 && (
              <div className="mt-3 space-y-1">
                {p.tests.map((t, i) => <div key={i} className="flex items-center justify-between text-sm"><span className="inline-flex items-center gap-1.5"><ClipboardCheck size={14} className="text-rouge-600" />{t.titre}</span><b className={t.reussi ? 'text-emerald-600' : 'text-amber-600'}>{t.pourcentage} %</b></div>)}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <a href={`mailto:${p.email}`} className="btn-clair py-1.5"><Mail size={15} />E-mail</a>
              {p.telephone && <a href={`tel:${p.telephone}`} className="btn-clair py-1.5"><Phone size={15} />Appeler</a>}
              {p.cv_chemin && <button onClick={() => telecharger(p.cv_chemin!)} className="btn-noir py-1.5"><Download size={15} />{p.cv_nom ? 'CV' : 'CV'}</button>}
              {!p.cv_chemin && <span className="inline-flex items-center gap-1 text-slate-400"><FileText size={15} />Pas de CV joint</span>}
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-600">Votre décision :</span>
              <select className="champ py-1.5 w-auto" value={p.decision_entreprise} onChange={(e) => decision(p.envoi_id, e.target.value)}>
                {Object.entries(DECISIONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
