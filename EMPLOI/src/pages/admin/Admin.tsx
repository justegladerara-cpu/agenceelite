import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, Building2, CheckCircle2, ClipboardCheck, Download, Plus, Search, Send, ShieldCheck, Users, Wallet, XCircle } from 'lucide-react'
import { Chargement, Compteur, DetailScore, EnTete, Fenetre, Pastille, PastilleScore, Vide, type Score } from '../../components/ui'
import { FormulaireOffre, type OffreEdition } from '../../components/FormulaireOffre'
import { useApp } from '../../lib/contexte'
import { BUCKET_CV, messageErreur, supabase } from '../../lib/supabase'
import { CONTRATS, PAIEMENTS, DECISIONS, PAYS, PRIX_CV, STATUTS_CANDIDATURE, STATUTS_OFFRE, argent, dateCourte, depuis, type Pays, type Test } from '../../lib/donnees'

type Onglet = 'bord' | 'candidatures' | 'offres' | 'entreprises' | 'ventes' | 'tests'
type EntrepriseA = { id: string; nom: string; secteur: string | null; pays: Pays | null; ville: string | null; site_web: string | null; description: string | null; statut: string; cree_le: string }
type CandidatureA = {
  id: string; cree_le: string; statut: string; note_admin: string | null; message: string | null; offre_id: string; offre_titre: string
  entreprise_id: string | null; entreprise_nom: string | null; candidat_id: string; nom: string; email: string; telephone: string | null
  ville: string | null; pays: string | null; titre: string | null; experience_annees: number | null; competences: string[]
  cv_chemin: string | null; cv_nom: string | null; tests: { titre: string; pourcentage: number; reussi: boolean }[]; envoi_id: string | null
}
type EnvoiA = { id: string; prix: number; devise: string; statut_paiement: string; decision_entreprise: string; envoye_le: string; entreprise: { nom: string } | null; candidature: { candidat: { profil: { nom: string } | null } | null; offre: { titre: string } | null } | null }

const ONGLETS: [Onglet, string, typeof Users][] = [
  ['bord', 'Tableau de bord', ShieldCheck], ['candidatures', 'Candidatures', Users], ['offres', 'Offres', Briefcase],
  ['entreprises', 'Entreprises', Building2], ['ventes', 'CV vendus', Wallet], ['tests', 'Tests', ClipboardCheck],
]

export default function Admin() {
  const [onglet, setOnglet] = useState<Onglet>('bord')
  return (
    <div className="conteneur py-8">
      <EnTete titre="Administration" sousTitre="Elite Emploi" icone={<ShieldCheck />} couleur="rose" />
      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1 mb-6">
        {ONGLETS.map(([k, l, I]) => <button key={k} onClick={() => setOnglet(k)} className={`onglet inline-flex items-center gap-1.5 ${onglet === k ? 'onglet-actif' : 'onglet-inactif'}`}><I size={15} />{l}</button>)}
      </div>
      {onglet === 'bord' && <TableauDeBord aller={setOnglet} />}
      {onglet === 'candidatures' && <Candidatures />}
      {onglet === 'offres' && <OffresAdmin />}
      {onglet === 'entreprises' && <Entreprises />}
      {onglet === 'ventes' && <Ventes />}
      {onglet === 'tests' && <TestsAdmin />}
    </div>
  )
}

const voirCv = async (chemin: string, toast: (t: string, ty?: 'ok' | 'erreur') => void) => {
  const { data, error } = await supabase.storage.from(BUCKET_CV).createSignedUrl(chemin, 120)
  if (error) return toast(messageErreur(error), 'erreur')
  window.open(data.signedUrl, '_blank', 'noopener')
}

function TableauDeBord({ aller }: { aller: (o: Onglet) => void }) {
  const [c, setC] = useState<Record<string, number> | null>(null)
  const [revenus, setRevenus] = useState<{ devise: string; paye: number; attente: number }[]>([])
  useEffect(() => {
    const compter = async (table: string, filtre?: [string, string]) => {
      let q = supabase.from(table).select(table === 'emploi_candidats' ? 'user_id' : 'id', { count: 'exact', head: true })
      if (filtre) q = q.eq(filtre[0], filtre[1])
      return (await q).count ?? 0
    }
    Promise.all([
      compter('emploi_offres', ['statut', 'publiee']), compter('emploi_offres', ['statut', 'en_attente']),
      compter('emploi_entreprises', ['statut', 'en_attente']), compter('emploi_candidatures', ['statut', 'nouvelle']),
      compter('emploi_candidatures'), compter('emploi_candidats'), compter('emploi_resultats'), compter('emploi_envois'),
    ]).then(([publiees, offresAttente, entAttente, nouvelles, candidatures, candidats, tests, envois]) =>
      setC({ publiees, offresAttente, entAttente, nouvelles, candidatures, candidats, tests, envois }))
    supabase.from('emploi_envois').select('prix, devise, statut_paiement').then(({ data }) => {
      const m = new Map<string, { devise: string; paye: number; attente: number }>()
      for (const e of data ?? []) {
        const r = m.get(e.devise) ?? { devise: e.devise, paye: 0, attente: 0 }
        if (e.statut_paiement === 'paye') r.paye += Number(e.prix); else r.attente += Number(e.prix)
        m.set(e.devise, r)
      }
      setRevenus([...m.values()])
    })
  }, [])
  if (!c) return <Chargement />
  const tuiles = [
    { l: 'Candidatures à trier', v: c.nouvelles, o: 'candidatures' as Onglet, alerte: c.nouvelles > 0 },
    { l: 'Offres à valider', v: c.offresAttente, o: 'offres' as Onglet, alerte: c.offresAttente > 0 },
    { l: 'Entreprises à valider', v: c.entAttente, o: 'entreprises' as Onglet, alerte: c.entAttente > 0 },
    { l: 'Offres en ligne', v: c.publiees, o: 'offres' as Onglet },
    { l: 'Candidats inscrits', v: c.candidats, o: 'candidatures' as Onglet },
    { l: 'Candidatures reçues', v: c.candidatures, o: 'candidatures' as Onglet },
    { l: 'Tests passés', v: c.tests, o: 'tests' as Onglet },
    { l: 'CV qualifiés envoyés', v: c.envois, o: 'ventes' as Onglet },
  ]
  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {tuiles.map((t) => (
          <button key={t.l} onClick={() => aller(t.o)} className={`carte p-5 text-left hover:border-rouge-400 ${t.alerte ? 'ring-2 ring-amber-300' : ''}`}>
            <div className="text-3xl font-extrabold text-encre-800"><Compteur valeur={t.v} /></div>
            <div className="text-sm text-slate-500 mt-1">{t.l}</div>
          </button>
        ))}
      </div>
      <div className="carte p-6">
        <h2 className="font-bold text-encre-800 flex items-center gap-2"><Wallet size={18} />Revenus des CV qualifiés</h2>
        {revenus.length === 0 ? <p className="mt-2 text-sm text-slate-500">Aucun CV envoyé pour l’instant. Triez les candidatures, puis cliquez sur « Envoyer à l’entreprise ».</p> : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {revenus.map((r) => (
              <div key={r.devise} className="rounded-xl bg-slate-50 p-4">
                <div className="text-sm text-slate-500">Encaissé</div><div className="text-2xl font-extrabold text-emerald-700">{argent(r.paye, r.devise)}</div>
                <div className="text-sm text-slate-500 mt-2">À encaisser : <b className="text-amber-700">{argent(r.attente, r.devise)}</b></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Candidatures() {
  const { toast } = useApp()
  const [liste, setListe] = useState<CandidatureA[] | null>(null)
  const [statut, setStatut] = useState('')
  const [texte, setTexte] = useState('')
  const [choix, setChoix] = useState<CandidatureA | null>(null)
  const [envoi, setEnvoi] = useState<CandidatureA | null>(null)
  const [scores, setScores] = useState<Record<string, Score>>({})
  const [tri, setTri] = useState<'date' | 'score'>('date')
  const charger = useCallback(() => {
    supabase.rpc('emploi_admin_candidatures').then(({ data, error }) => { if (error) toast(messageErreur(error), 'erreur'); setListe((data as CandidatureA[]) ?? []) })
    supabase.rpc('emploi_scores').then(({ data }) => setScores(Object.fromEntries(((data as Score[]) ?? []).map((x) => [x.candidature_id, x]))))
  }, [toast])
  useEffect(() => { charger() }, [charger])

  const filtrees = useMemo(() => (liste ?? []).filter((c) => (!statut || c.statut === statut)
    && (!texte || `${c.nom} ${c.email} ${c.offre_titre} ${c.titre ?? ''} ${c.competences.join(' ')}`.toLowerCase().includes(texte.toLowerCase())))
    .sort((a, b) => tri === 'score' ? (scores[b.id]?.score ?? -1) - (scores[a.id]?.score ?? -1) : 0), [liste, statut, texte, tri, scores])

  const changer = async (c: CandidatureA, valeurs: { statut?: string; note_admin?: string | null }) => {
    const { error } = await supabase.from('emploi_candidatures').update(valeurs).eq('id', c.id)
    if (error) return toast(messageErreur(error), 'erreur')
    charger()
  }

  if (!liste) return <Chargement />
  return (
    <>
      <div className="carte p-3 mb-4 grid gap-2 md:grid-cols-[1fr_220px_200px]">
        <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3"><Search size={17} className="text-slate-400" /><input className="w-full bg-transparent py-2.5 outline-none" placeholder="Nom, e-mail, offre, compétence…" value={texte} onChange={(e) => setTexte(e.target.value)} /></label>
        <select className="champ" value={statut} onChange={(e) => setStatut(e.target.value)}>
          <option value="">Tous les statuts ({liste.length})</option>
          {Object.entries(STATUTS_CANDIDATURE).map(([k, v]) => <option key={k} value={k}>{v.label} ({liste.filter((c) => c.statut === k).length})</option>)}
        </select>
        <select className="champ" value={tri} onChange={(e) => setTri(e.target.value as 'date' | 'score')}>
          <option value="date">Plus récentes d’abord</option>
          <option value="score">Meilleur score d’abord</option>
        </select>
      </div>
      {filtrees.length === 0 ? <Vide texte="Aucune candidature." /> : (
        <div className="carte divide-y divide-slate-100">
          {filtrees.map((c) => (
            <div key={c.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <button onClick={() => setChoix(c)} className="text-left min-w-0">
                <div className="font-semibold text-encre-800">{c.nom} <span className="font-normal text-slate-500">· {c.titre ?? 'sans titre'}</span></div>
                <div className="text-sm text-slate-500">{c.offre_titre}{c.entreprise_nom ? ` (${c.entreprise_nom})` : ''} · {depuis(c.cree_le)}</div>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <PastilleScore s={scores[c.id]} />
                  {c.tests.map((t, i) => <Pastille key={i} couleur={t.reussi ? 'emerald' : 'amber'}>{t.titre} {t.pourcentage} %</Pastille>)}
                  {!c.cv_chemin && <Pastille couleur="rose">Pas de CV</Pastille>}
                </div>
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <select className="champ py-1.5 w-auto" value={c.statut} onChange={(e) => changer(c, { statut: e.target.value })}>
                  {Object.entries(STATUTS_CANDIDATURE).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                {c.envoi_id ? <Pastille couleur="emerald">Envoyé</Pastille> : <button className="btn-primaire py-1.5" onClick={() => setEnvoi(c)}><Send size={15} />Envoyer</button>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Fenetre ouverte={!!choix} onFermer={() => setChoix(null)} titre={choix?.nom ?? ''}>
        {choix && (
          <div className="space-y-3 text-sm">
            {scores[choix.id] && <div className="rounded-xl border border-slate-200 p-4"><DetailScore s={scores[choix.id]} /></div>}
            <p><b>Poste visé :</b> {choix.offre_titre}</p>
            <p><b>E-mail :</b> <a className="underline" href={`mailto:${choix.email}`}>{choix.email}</a>{choix.telephone && <> · <b>Tél. :</b> <a className="underline" href={`tel:${choix.telephone}`}>{choix.telephone}</a></>}</p>
            <p><b>Lieu :</b> {choix.ville ?? '?'}{choix.pays ? `, ${PAYS[choix.pays as Pays]?.nom}` : ''} · <b>Expérience :</b> {choix.experience_annees ?? '?'} an(s)</p>
            {choix.competences.length > 0 && <div className="flex flex-wrap gap-1.5">{choix.competences.map((x) => <Pastille key={x}>{x}</Pastille>)}</div>}
            {choix.message && <p className="rounded-xl bg-slate-50 p-3 texte-libre">{choix.message}</p>}
            {choix.cv_chemin && <button className="btn-noir" onClick={() => voirCv(choix.cv_chemin!, toast)}><Download size={15} />Ouvrir le CV</button>}
            <div>
              <label className="etiquette">Note interne (jamais visible du candidat)</label>
              <textarea className="champ min-h-[90px]" defaultValue={choix.note_admin ?? ''} onBlur={(e) => { if (e.target.value !== (choix.note_admin ?? '')) changer(choix, { note_admin: e.target.value || null }) }} />
            </div>
          </div>
        )}
      </Fenetre>
      {envoi && <EnvoiCv c={envoi} onFini={() => { setEnvoi(null); charger() }} />}
    </>
  )
}

function EnvoiCv({ c, onFini }: { c: CandidatureA; onFini: () => void }) {
  const { toast } = useApp()
  const [entreprises, setEntreprises] = useState<EntrepriseA[]>([])
  const [entreprise, setEntreprise] = useState(c.entreprise_id ?? '')
  const [devise, setDevise] = useState<'XAF' | 'EUR'>(c.pays === 'FR' ? 'EUR' : 'XAF')
  const [prix, setPrix] = useState<number>(PRIX_CV[c.pays === 'FR' ? 'EUR' : 'XAF'])
  const [commentaire, setCommentaire] = useState('')
  const [encours, setEncours] = useState(false)
  useEffect(() => { supabase.from('emploi_entreprises').select('*').eq('statut', 'validee').order('nom').then(({ data }) => setEntreprises((data as EntrepriseA[]) ?? [])) }, [])
  const envoyer = async () => {
    if (!entreprise) return toast('Choisissez l’entreprise qui reçoit ce CV.', 'erreur')
    setEncours(true)
    const { error } = await supabase.from('emploi_envois').insert({ candidature_id: c.id, entreprise_id: entreprise, prix, devise, commentaire_admin: commentaire.trim() || null })
    if (!error && ['nouvelle', 'a_appeler', 'entretien'].includes(c.statut)) await supabase.from('emploi_candidatures').update({ statut: 'qualifiee' }).eq('id', c.id)
    setEncours(false)
    if (error) return toast(messageErreur(error), 'erreur')
    toast(`Profil de ${c.nom} envoyé. Il apparaît dans l’espace de l’entreprise.`)
    onFini()
  }
  return (
    <Fenetre ouverte onFermer={onFini} titre={`Envoyer le profil de ${c.nom}`}
      pied={<><button className="btn-clair" onClick={onFini}>Annuler</button><button className="btn-primaire" disabled={encours} onClick={envoyer}><Send size={15} />Envoyer le CV qualifié</button></>}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">L’entreprise verra le profil, le CV, les coordonnées et les résultats de tests. L’envoi est compté dans les CV à facturer.</p>
        <div><label className="etiquette">Entreprise</label>
          <select className="champ" value={entreprise} onChange={(e) => setEntreprise(e.target.value)}><option value="">Choisir…</option>{entreprises.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}</select>
          {entreprises.length === 0 && <p className="mt-1 text-xs text-amber-700">Aucune entreprise validée. L’entreprise doit créer son compte et être validée dans l’onglet Entreprises.</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="etiquette">Prix du CV</label><input type="number" min={0} className="champ" value={prix} onChange={(e) => setPrix(Math.max(0, Number(e.target.value)))} /></div>
          <div><label className="etiquette">Devise</label><select className="champ" value={devise} onChange={(e) => { const d = e.target.value as 'XAF' | 'EUR'; setDevise(d); setPrix(PRIX_CV[d]) }}><option value="XAF">FCFA</option><option value="EUR">Euro</option></select></div>
        </div>
        <div><label className="etiquette">Votre avis pour l’entreprise (facultatif)</label><textarea className="champ min-h-[90px]" value={commentaire} onChange={(e) => setCommentaire(e.target.value)} placeholder="Ex. : très bon contact au téléphone, disponible tout de suite." /></div>
      </div>
    </Fenetre>
  )
}

function OffresAdmin() {
  const { toast } = useApp()
  const [offres, setOffres] = useState<(OffreEdition & { entreprise: { nom: string } | null })[] | null>(null)
  const [edition, setEdition] = useState<OffreEdition | null>(null)
  const [entreprises, setEntreprises] = useState<EntrepriseA[]>([])
  const [filtre, setFiltre] = useState('')
  const charger = useCallback(() => {
    supabase.from('emploi_offres').select('*, entreprise:emploi_entreprises(nom), tests:emploi_offre_tests(test_id)').order('cree_le', { ascending: false })
      .then(({ data }) => setOffres(((data ?? []) as (OffreEdition & { entreprise: { nom: string } | null; tests: { test_id: string }[] })[]).map((o) => ({ ...o, test_ids: o.tests.map((t) => t.test_id) }))))
  }, [])
  useEffect(() => { charger(); supabase.from('emploi_entreprises').select('*').eq('statut', 'validee').order('nom').then(({ data }) => setEntreprises((data as EntrepriseA[]) ?? [])) }, [charger])
  const statut = async (id: string, s: string) => {
    const { error } = await supabase.from('emploi_offres').update({ statut: s }).eq('id', id)
    if (error) return toast(messageErreur(error), 'erreur')
    toast(s === 'publiee' ? 'Offre publiée.' : 'Offre mise à jour.'); charger()
  }
  if (!offres) return <Chargement />
  const liste = offres.filter((o) => !filtre || o.statut === filtre)
  return (
    <>
      <div className="mb-4 flex flex-wrap justify-between gap-2">
        <select className="champ w-auto" value={filtre} onChange={(e) => setFiltre(e.target.value)}>
          <option value="">Toutes les offres ({offres.length})</option>
          {Object.entries(STATUTS_OFFRE).map(([k, v]) => <option key={k} value={k}>{v.label} ({offres.filter((o) => o.statut === k).length})</option>)}
        </select>
        <button className="btn-primaire" onClick={() => setEdition({ entreprise_id: null, pays: 'CG', devise: 'XAF' })}><Plus size={16} />Nouvelle offre</button>
      </div>
      {liste.length === 0 ? <Vide texte="Aucune offre." /> : (
        <div className="carte divide-y divide-slate-100">
          {liste.map((o) => (
            <div key={o.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-encre-800">{o.titre} {o.a_la_une && <span className="text-rouge-600">★</span>}</div>
                <div className="text-sm text-slate-500">{o.entreprise?.nom ?? 'Agence Elite'} · {o.ville}, {PAYS[o.pays!]?.nom} · {CONTRATS[o.contrat!]} · {dateCourte(o.cree_le)}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Pastille couleur={STATUTS_OFFRE[o.statut!]?.couleur}>{STATUTS_OFFRE[o.statut!]?.label}</Pastille>
                {o.statut === 'en_attente' && <><button className="btn-primaire py-1.5" onClick={() => statut(o.id!, 'publiee')}><CheckCircle2 size={15} />Publier</button><button className="btn-danger py-1.5" onClick={() => statut(o.id!, 'refusee')}><XCircle size={15} />Refuser</button></>}
                {o.statut === 'publiee' && <button className="btn-clair py-1.5" onClick={() => statut(o.id!, 'fermee')}>Fermer</button>}
                {o.statut === 'publiee' && <Link to={`/offres/${o.id}`} className="btn-clair py-1.5">Voir</Link>}
                <button className="btn-clair py-1.5" onClick={() => setEdition(o)}>Modifier</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Fenetre ouverte={!!edition} onFermer={() => setEdition(null)} titre={edition?.id ? 'Modifier l’offre' : 'Nouvelle offre'} large>
        {edition && (
          <>
            <div className="mb-4"><label className="etiquette">Entreprise</label>
              <select className="champ" value={edition.entreprise_id ?? ''} onChange={(e) => setEdition({ ...edition, entreprise_id: e.target.value || null })}>
                <option value="">Agence Elite (offre gérée par l’agence)</option>
                {entreprises.map((e) => <option key={e.id} value={e.id}>{e.nom}</option>)}
              </select>
            </div>
            <FormulaireOffre key={edition.entreprise_id ?? 'elite'} offre={edition} admin onEnregistre={() => { setEdition(null); charger(); toast('Offre enregistrée.') }} />
          </>
        )}
      </Fenetre>
    </>
  )
}

function Entreprises() {
  const { toast } = useApp()
  const [liste, setListe] = useState<EntrepriseA[] | null>(null)
  const charger = useCallback(() => { supabase.from('emploi_entreprises').select('*').order('cree_le', { ascending: false }).then(({ data }) => setListe((data as EntrepriseA[]) ?? [])) }, [])
  useEffect(() => { charger() }, [charger])
  const statut = async (id: string, s: string) => {
    const { error } = await supabase.from('emploi_entreprises').update({ statut: s }).eq('id', id)
    if (error) return toast(messageErreur(error), 'erreur')
    charger()
  }
  if (!liste) return <Chargement />
  if (liste.length === 0) return <Vide texte="Aucune entreprise inscrite pour l’instant." />
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {liste.map((e) => (
        <div key={e.id} className="carte p-5">
          <div className="flex items-start justify-between gap-2">
            <div><h3 className="font-bold text-encre-800">{e.nom}</h3><p className="text-sm text-slate-500">{e.secteur ?? 'Secteur ?'} · {e.ville ?? '?'}{e.pays ? `, ${PAYS[e.pays].nom}` : ''}</p></div>
            <Pastille couleur={e.statut === 'validee' ? 'emerald' : e.statut === 'refusee' ? 'rose' : 'amber'}>{e.statut === 'validee' ? 'Validée' : e.statut === 'refusee' ? 'Refusée' : 'À valider'}</Pastille>
          </div>
          {e.description && <p className="mt-2 text-sm text-slate-600 line-clamp-3">{e.description}</p>}
          {e.site_web && <a href={e.site_web} target="_blank" rel="noreferrer noopener" className="mt-1 block text-sm text-rouge-600 underline truncate">{e.site_web}</a>}
          <div className="mt-4 flex gap-2">
            {e.statut !== 'validee' && <button className="btn-primaire py-1.5" onClick={() => statut(e.id, 'validee')}><CheckCircle2 size={15} />Valider</button>}
            {e.statut !== 'refusee' && <button className="btn-danger py-1.5" onClick={() => statut(e.id, 'refusee')}><XCircle size={15} />Refuser</button>}
          </div>
        </div>
      ))}
    </div>
  )
}

function Ventes() {
  const { toast } = useApp()
  const [liste, setListe] = useState<EnvoiA[] | null>(null)
  const charger = useCallback(() => {
    supabase.from('emploi_envois').select('id, prix, devise, statut_paiement, decision_entreprise, envoye_le, entreprise:emploi_entreprises(nom), candidature:emploi_candidatures(candidat:emploi_candidats(profil:emploi_profils(nom)), offre:emploi_offres(titre))')
      .order('envoye_le', { ascending: false }).then(({ data }) => setListe((data as unknown as EnvoiA[]) ?? []))
  }, [])
  useEffect(() => { charger() }, [charger])
  const paiement = async (id: string, s: string) => {
    const { error } = await supabase.from('emploi_envois').update({ statut_paiement: s }).eq('id', id)
    if (error) return toast(messageErreur(error), 'erreur')
    charger()
  }
  if (!liste) return <Chargement />
  if (liste.length === 0) return <Vide texte="Aucun CV vendu pour l’instant." />
  return (
    <div className="carte divide-y divide-slate-100">
      {liste.map((v) => (
        <div key={v.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-semibold text-encre-800">{v.candidature?.candidat?.profil?.nom ?? 'Candidat'} → {v.entreprise?.nom}</div>
            <div className="text-sm text-slate-500">{v.candidature?.offre?.titre} · {dateCourte(v.envoye_le)} · décision : {DECISIONS[v.decision_entreprise]?.label}</div>
          </div>
          <div className="flex items-center gap-2">
            <b className="text-encre-800">{argent(Number(v.prix), v.devise)}</b>
            <select className="champ py-1.5 w-auto" value={v.statut_paiement} onChange={(e) => paiement(v.id, e.target.value)}>
              {Object.entries(PAIEMENTS).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
            </select>
          </div>
        </div>
      ))}
    </div>
  )
}

type QuestionA = { id: string; ordre: number; enonce: string; choix: string[] }

function TestsAdmin() {
  const { toast } = useApp()
  const [tests, setTests] = useState<Test[] | null>(null)
  const [ouvert, setOuvert] = useState<Test | null>(null)
  const [questions, setQuestions] = useState<QuestionA[]>([])
  const [bonnes, setBonnes] = useState<Record<string, number>>({})
  const [nouvelle, setNouvelle] = useState({ enonce: '', choix: ['', '', '', ''], bonne: 0 })
  const charger = useCallback(() => { supabase.from('emploi_tests').select('*').order('ordre').then(({ data }) => setTests((data as Test[]) ?? [])) }, [])
  useEffect(() => { charger() }, [charger])
  const ouvrir = async (t: Test) => {
    setOuvert(t)
    const [{ data: qs }, { data: rs }] = await Promise.all([
      supabase.from('emploi_questions').select('id, ordre, enonce, choix').eq('test_id', t.id).order('ordre'),
      supabase.rpc('emploi_admin_reponses', { p_test: t.id }),
    ])
    setQuestions((qs as QuestionA[]) ?? [])
    setBonnes(Object.fromEntries(((rs as { question_id: string; bonne: number }[]) ?? []).map((r) => [r.question_id, r.bonne])))
  }
  const actif = async (t: Test) => {
    const { error } = await supabase.from('emploi_tests').update({ actif: !t.actif }).eq('id', t.id)
    if (error) return toast(messageErreur(error), 'erreur')
    charger()
  }
  const ajouter = async () => {
    if (!ouvert) return
    const choix = nouvelle.choix.map((c) => c.trim()).filter(Boolean)
    if (!nouvelle.enonce.trim() || choix.length < 2) return toast('Écrivez la question et au moins 2 réponses.', 'erreur')
    const bonneTexte = nouvelle.choix[nouvelle.bonne]?.trim()
    const { error } = await supabase.rpc('emploi_admin_question', { p_test: ouvert.id, p_enonce: nouvelle.enonce.trim(), p_choix: choix, p_bonne: choix.indexOf(bonneTexte) })
    if (error) return toast(messageErreur(error), 'erreur')
    setNouvelle({ enonce: '', choix: ['', '', '', ''], bonne: 0 })
    toast('Question ajoutée.'); ouvrir(ouvert)
  }
  const supprimer = async (q: QuestionA) => {
    if (!confirm('Supprimer cette question ?') || !ouvert) return
    const { error } = await supabase.from('emploi_questions').delete().eq('id', q.id)
    if (error) return toast(messageErreur(error), 'erreur')
    ouvrir(ouvert)
  }
  if (!tests) return <Chargement />
  return (
    <>
      <div className="carte divide-y divide-slate-100">
        {tests.map((t) => (
          <div key={t.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
            <div><div className="font-semibold text-encre-800">{t.titre}</div><div className="text-sm text-slate-500">{t.categorie} · {t.duree_minutes} min · réussite à {t.seuil_reussite} %</div></div>
            <div className="flex gap-2">
              <button className="btn-clair py-1.5" onClick={() => actif(t)}>{t.actif ? 'Désactiver' : 'Activer'}</button>
              <button className="btn-noir py-1.5" onClick={() => ouvrir(t)}>Questions</button>
            </div>
          </div>
        ))}
      </div>
      <Fenetre ouverte={!!ouvert} onFermer={() => setOuvert(null)} titre={ouvert?.titre ?? ''} large>
        <ol className="space-y-3">
          {questions.map((q, i) => (
            <li key={q.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex justify-between gap-2"><b className="text-encre-800">{i + 1}. {q.enonce}</b><button className="text-xs text-rose-600" onClick={() => supprimer(q)}>Supprimer</button></div>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2 text-sm">{q.choix.map((c, k) => <li key={k} className={bonnes[q.id] === k ? 'font-semibold text-emerald-700' : 'text-slate-600'}>{bonnes[q.id] === k ? '✓ ' : '· '}{c}</li>)}</ul>
            </li>
          ))}
        </ol>
        <div className="mt-6 rounded-2xl bg-slate-50 p-4 space-y-3">
          <h3 className="font-bold text-encre-800">Ajouter une question</h3>
          <input className="champ" placeholder="La question" value={nouvelle.enonce} onChange={(e) => setNouvelle({ ...nouvelle, enonce: e.target.value })} />
          {nouvelle.choix.map((c, k) => (
            <label key={k} className="flex items-center gap-2">
              <input type="radio" name="bonne" checked={nouvelle.bonne === k} onChange={() => setNouvelle({ ...nouvelle, bonne: k })} aria-label="Bonne réponse" />
              <input className="champ" placeholder={`Réponse ${k + 1}${k > 1 ? ' (facultatif)' : ''}`} value={c} onChange={(e) => setNouvelle({ ...nouvelle, choix: nouvelle.choix.map((x, j) => (j === k ? e.target.value : x)) })} />
            </label>
          ))}
          <p className="text-xs text-slate-500">Cochez le rond de la bonne réponse.</p>
          <button className="btn-primaire" onClick={ajouter}><Plus size={15} />Ajouter</button>
        </div>
      </Fenetre>
    </>
  )
}
