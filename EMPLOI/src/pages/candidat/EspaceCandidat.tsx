import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardCheck, FileText, Send, Trash2, Upload, UserRound } from 'lucide-react'
import { Chargement, EnTete, Pastille, Vide } from '../../components/ui'
import { useApp } from '../../lib/contexte'
import { BUCKET_CV, messageErreur, supabase } from '../../lib/supabase'
import { METIERS, NIVEAUX, STATUTS_CANDIDATURE, VILLES, dateCourte, type Pays } from '../../lib/donnees'

type Candidat = {
  user_id: string; titre: string | null; resume: string | null; metier: string | null; competences: string[]; langues: string[]
  experience_annees: number | null; niveau_etudes: string | null; disponible: boolean; cv_chemin: string | null; cv_nom: string | null
}
type MaCandidature = { id: string; cree_le: string; statut: string; offre: { id: string; titre: string; ville: string } | null }
type MonResultat = { id: string; pourcentage: number | null; reussi: boolean | null; termine_le: string; test: { titre: string; slug: string } | null }

export default function EspaceCandidat() {
  const [onglet, setOnglet] = useState<'profil' | 'candidatures' | 'tests'>('profil')
  const { profil } = useApp()
  return (
    <div className="conteneur py-8">
      <EnTete titre={`Bonjour ${profil?.nom?.split(' ')[0] ?? ''}`} sousTitre="Votre espace candidat" icone={<UserRound />} couleur="indigo" />
      <div className="flex gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1 mb-6">
        {([['profil', 'Mon profil et CV'], ['candidatures', 'Mes candidatures'], ['tests', 'Mes tests']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setOnglet(k)} className={`onglet ${onglet === k ? 'onglet-actif' : 'onglet-inactif'}`}>{l}</button>
        ))}
      </div>
      {onglet === 'profil' && <MonProfil />}
      {onglet === 'candidatures' && <MesCandidatures />}
      {onglet === 'tests' && <MesTests />}
    </div>
  )
}

function MonProfil() {
  const { profil, rechargerProfil, toast } = useApp()
  const [c, setC] = useState<Candidat | null>(null)
  const [p, setP] = useState({ nom: '', telephone: '', pays: 'CG' as Pays, ville: '' })
  const [competences, setCompetences] = useState('')
  const [langues, setLangues] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [upload, setUpload] = useState(false)

  useEffect(() => {
    if (!profil) return
    setP({ nom: profil.nom, telephone: profil.telephone ?? '', pays: profil.pays ?? 'CG', ville: profil.ville ?? '' })
    supabase.from('emploi_candidats').select('*').eq('user_id', profil.id).maybeSingle().then(({ data }) => {
      const d = (data as Candidat) ?? { user_id: profil.id, titre: '', resume: '', metier: '', competences: [], langues: [], experience_annees: null, niveau_etudes: '', disponible: true, cv_chemin: null, cv_nom: null }
      setC(d); setCompetences(d.competences.join(', ')); setLangues(d.langues.join(', '))
    })
  }, [profil])

  if (!c || !profil) return <Chargement />
  const liste = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 30)

  const enregistrer = async () => {
    setEnvoi(true)
    const r1 = await supabase.from('emploi_profils').update({ nom: p.nom.trim(), telephone: p.telephone.trim() || null, pays: p.pays, ville: p.ville || null }).eq('id', profil.id)
    const r2 = await supabase.from('emploi_candidats').upsert({
      user_id: profil.id, titre: c.titre || null, resume: c.resume || null, metier: c.metier || null, competences: liste(competences), langues: liste(langues),
      experience_annees: c.experience_annees, niveau_etudes: c.niveau_etudes || null, disponible: c.disponible, maj_le: new Date().toISOString(),
    })
    setEnvoi(false)
    const e = r1.error ?? r2.error
    if (e) return toast(messageErreur(e), 'erreur')
    await rechargerProfil()
    toast('Profil enregistré.')
  }

  const envoyerCv = async (f: File) => {
    if (f.size > 5 * 1024 * 1024) return toast('Le fichier dépasse 5 Mo.', 'erreur')
    setUpload(true)
    const ext = f.name.split('.').pop()?.toLowerCase() ?? 'pdf'
    const chemin = `${profil.id}/cv-${Date.now()}.${ext}`
    const { error } = await supabase.storage.from(BUCKET_CV).upload(chemin, f, { contentType: f.type })
    if (error) { setUpload(false); return toast(messageErreur(error), 'erreur') }
    if (c.cv_chemin) await supabase.storage.from(BUCKET_CV).remove([c.cv_chemin])
    const r = await supabase.from('emploi_candidats').upsert({ user_id: profil.id, cv_chemin: chemin, cv_nom: f.name })
    setUpload(false)
    if (r.error) return toast(messageErreur(r.error), 'erreur')
    setC({ ...c, cv_chemin: chemin, cv_nom: f.name })
    toast('CV enregistré.')
  }

  const voirCv = async () => {
    if (!c.cv_chemin) return
    const { data, error } = await supabase.storage.from(BUCKET_CV).createSignedUrl(c.cv_chemin, 120)
    if (error) return toast(messageErreur(error), 'erreur')
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="carte p-6 space-y-5">
        <h2 className="text-lg font-bold text-marine-800">Mes informations</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="etiquette">Prénom et nom</label><input className="champ" value={p.nom} onChange={(e) => setP({ ...p, nom: e.target.value })} /></div>
          <div><label className="etiquette">Téléphone / WhatsApp</label><input className="champ" value={p.telephone} onChange={(e) => setP({ ...p, telephone: e.target.value })} /></div>
          <div><label className="etiquette">Pays</label><select className="champ" value={p.pays} onChange={(e) => setP({ ...p, pays: e.target.value as Pays, ville: '' })}><option value="CG">🇨🇬 Congo</option><option value="FR">🇫🇷 France</option></select></div>
          <div><label className="etiquette">Ville</label><input className="champ" list="villes" value={p.ville} onChange={(e) => setP({ ...p, ville: e.target.value })} /><datalist id="villes">{VILLES[p.pays].map((v) => <option key={v} value={v} />)}</datalist></div>
        </div>
        <hr className="border-slate-100" />
        <h2 className="text-lg font-bold text-marine-800">Mon profil professionnel</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><label className="etiquette">Poste recherché</label><input className="champ" placeholder="Ex. : Assistante de direction" value={c.titre ?? ''} onChange={(e) => setC({ ...c, titre: e.target.value })} /></div>
          <div><label className="etiquette">Métier</label><select className="champ" value={c.metier ?? ''} onChange={(e) => setC({ ...c, metier: e.target.value })}><option value="">Choisir…</option>{METIERS.map((m) => <option key={m}>{m}</option>)}</select></div>
          <div><label className="etiquette">Années d’expérience</label><input type="number" min={0} max={60} className="champ" value={c.experience_annees ?? ''} onChange={(e) => setC({ ...c, experience_annees: e.target.value === '' ? null : Math.max(0, Math.min(60, Number(e.target.value))) })} /></div>
          <div><label className="etiquette">Niveau d’études</label><select className="champ" value={c.niveau_etudes ?? ''} onChange={(e) => setC({ ...c, niveau_etudes: e.target.value })}><option value="">Choisir…</option>{NIVEAUX.map((n) => <option key={n}>{n}</option>)}</select></div>
          <div><label className="etiquette">Langues (séparées par des virgules)</label><input className="champ" placeholder="Français, Anglais, Lingala" value={langues} onChange={(e) => setLangues(e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="etiquette">Compétences (séparées par des virgules)</label><input className="champ" placeholder="Excel, Accueil, Permis B…" value={competences} onChange={(e) => setCompetences(e.target.value)} /></div>
          <div className="sm:col-span-2"><label className="etiquette">Présentation</label><textarea className="champ min-h-[110px]" maxLength={2000} value={c.resume ?? ''} onChange={(e) => setC({ ...c, resume: e.target.value })} placeholder="Votre parcours en quelques lignes…" /></div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700"><input type="checkbox" checked={c.disponible} onChange={(e) => setC({ ...c, disponible: e.target.checked })} />Disponible maintenant</label>
        </div>
        <button className="btn-primaire" disabled={envoi} onClick={enregistrer}>{envoi ? 'Enregistrement…' : 'Enregistrer mon profil'}</button>
      </div>

      <div className="space-y-4">
        <div className="carte p-6">
          <h2 className="text-lg font-bold text-marine-800 flex items-center gap-2"><FileText size={20} />Mon CV</h2>
          {c.cv_chemin ? (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-emerald-50 p-3">
              <button onClick={voirCv} className="truncate text-sm font-semibold text-emerald-800 underline">{c.cv_nom ?? 'Mon CV'}</button>
            </div>
          ) : <p className="mt-2 text-sm text-amber-700">Pas encore de CV : ajoutez-le pour que les recruteurs vous voient.</p>}
          <label className={`btn-marine mt-4 w-full cursor-pointer ${upload ? 'opacity-50 pointer-events-none' : ''}`}>
            <Upload size={16} />{upload ? 'Envoi…' : c.cv_chemin ? 'Remplacer mon CV' : 'Ajouter mon CV'}
            <input type="file" className="hidden" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) envoyerCv(f); e.target.value = '' }} />
          </label>
          <p className="mt-2 text-xs text-slate-400">PDF ou Word, 5 Mo au plus.</p>
        </div>
        <div className="carte p-6">
          <h2 className="font-bold text-marine-800 flex items-center gap-2"><ClipboardCheck size={18} className="text-violet-600" />Démarquez-vous</h2>
          <p className="mt-1 text-sm text-slate-600">Les candidats qui ont réussi des tests sont présentés en premier aux entreprises.</p>
          <Link to="/tests" className="btn-clair mt-3 w-full">Passer un test</Link>
        </div>
      </div>
    </div>
  )
}

function MesCandidatures() {
  const { toast } = useApp()
  const [liste, setListe] = useState<MaCandidature[] | null>(null)
  const charger = () => supabase.from('emploi_candidatures').select('id, cree_le, statut, offre:emploi_offres(id, titre, ville)').order('cree_le', { ascending: false })
    .then(({ data }) => setListe((data as unknown as MaCandidature[]) ?? []))
  useEffect(() => { charger() }, [])
  const retirer = async (id: string) => {
    if (!confirm('Retirer cette candidature ?')) return
    const { error } = await supabase.from('emploi_candidatures').delete().eq('id', id)
    if (error) return toast(messageErreur(error), 'erreur')
    toast('Candidature retirée.'); charger()
  }
  if (!liste) return <Chargement />
  if (liste.length === 0) return <Vide texte="Vous n’avez pas encore postulé." action={<Link to="/offres" className="btn-primaire"><Send size={16} />Voir les offres</Link>} />
  return (
    <div className="carte divide-y divide-slate-100">
      {liste.map((c) => {
        const s = STATUTS_CANDIDATURE[c.statut] ?? STATUTS_CANDIDATURE.nouvelle
        return (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              {c.offre ? <Link to={`/offres/${c.offre.id}`} className="font-semibold text-marine-800 hover:underline">{c.offre.titre}</Link> : <span className="font-semibold text-slate-400">Offre retirée</span>}
              <p className="text-sm text-slate-500">{c.offre?.ville} · envoyée le {dateCourte(c.cree_le)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Pastille couleur={s.couleur}>{s.pourCandidat}</Pastille>
              {c.statut === 'nouvelle' && <button onClick={() => retirer(c.id)} className="p-2 text-slate-400 hover:text-rose-600" aria-label="Retirer"><Trash2 size={16} /></button>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MesTests() {
  const [liste, setListe] = useState<MonResultat[] | null>(null)
  useEffect(() => {
    supabase.from('emploi_resultats').select('id, pourcentage, reussi, termine_le, test:emploi_tests(titre, slug)').not('termine_le', 'is', null).order('termine_le', { ascending: false })
      .then(({ data }) => setListe((data as unknown as MonResultat[]) ?? []))
  }, [])
  if (!liste) return <Chargement />
  if (liste.length === 0) return <Vide texte="Vous n’avez pas encore passé de test." action={<Link to="/tests" className="btn-primaire">Voir les tests</Link>} />
  return (
    <div className="carte divide-y divide-slate-100">
      {liste.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-3 p-4">
          <div><div className="font-semibold text-marine-800">{r.test?.titre}</div><p className="text-sm text-slate-500">Passé le {dateCourte(r.termine_le)}</p></div>
          <Pastille couleur={r.reussi ? 'emerald' : 'amber'}>{r.pourcentage} % · {r.reussi ? 'Réussi' : 'Non réussi'}</Pastille>
        </div>
      ))}
    </div>
  )
}
