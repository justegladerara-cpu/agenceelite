import { useEffect, useState } from 'react'
import { Building2, Save, Settings, Target, Users } from 'lucide-react'
import { supabase, messageErreur } from '../lib/supabase'
import { useApp, OBJECTIFS_DEFAUT } from '../lib/contexte'
import { EnTete, Pastille } from '../components/ui'
import { LIBELLE_JOUR } from '../lib/modules'
import type { Objectifs, Site } from '../lib/stats'

type Membre = { user_id: string; nom: string | null; role: string; cree_le?: string }
const ROLES: Record<string, [string, string]> = { admin: ['Administrateur', 'indigo'], membre: ['Peut saisir', 'emerald'], lecture: ['Lecture seule', 'slate'] }

export default function Parametres() {
  const { site, objectifs, peutEcrire, rechargerParametres, toast } = useApp()
  const [s, setS] = useState<Site>(site)
  const [o, setO] = useState<Objectifs>(objectifs)
  const [membres, setMembres] = useState<Membre[]>([])
  const [occupe, setOccupe] = useState(false)
  useEffect(() => setS(site), [site])
  useEffect(() => setO(objectifs), [objectifs])
  useEffect(() => { supabase.from('hse_membres').select('*').then(({ data }) => setMembres((data ?? []) as Membre[])) }, [])

  async function enregistrer() {
    setOccupe(true)
    const { error } = await supabase.from('hse_parametres').upsert([
      { cle: 'site', valeur: { ...s, heures_par_jour: Number(s.heures_par_jour) || 12, objectif_trir: Number(s.objectif_trir) || 0 } },
      { cle: 'objectifs', valeur: Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Number(v) || 0])) },
    ])
    setOccupe(false)
    if (error) return toast(messageErreur(error), 'erreur')
    await rechargerParametres(); toast('Paramètres enregistrés')
  }

  const champ = (cle: keyof Site, libelle: string, type = 'text', aide?: string) => (
    <div>
      <label className="etiquette">{libelle}</label>
      <input className="champ" type={type} step="any" disabled={!peutEcrire} value={String(s[cle] ?? '')} onChange={(e) => setS({ ...s, [cle]: e.target.value } as Site)} />
      {aide && <p className="text-xs text-slate-500 mt-1">{aide}</p>}
    </div>
  )

  return (
    <div className="max-w-4xl">
      <EnTete titre="Paramètres" sousTitre="Les informations du site et les objectifs mensuels." icone={<Settings />} couleur="slate"
        actions={peutEcrire && <button className="btn-primaire" onClick={enregistrer} disabled={occupe}><Save size={18} />{occupe ? 'Patientez…' : 'Enregistrer'}</button>} />

      <section className="carte p-5 mb-5">
        <h2 className="flex items-center gap-2 font-bold text-marine-800 text-lg mb-4"><Building2 size={20} />Le site</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {champ('nom', 'Nom du site')}
          {champ('client', 'Client')}
          {champ('entreprise', 'Entreprise')}
          {champ('heures_par_jour', 'Heures de travail par personne et par jour', 'number', 'Sert à calculer les heures quand vous ne saisissez que le nombre de personnes.')}
          {champ('dernier_arret', 'Date du dernier accident avec arrêt (avant la plateforme)', 'date', 'La plateforme prend ensuite automatiquement la date la plus récente saisie.')}
          {champ('dernier_incident', 'Date du dernier incident (avant la plateforme)', 'date')}
          {champ('objectif_trir', 'Objectif de taux d\'accidents (TRIR) à ne pas dépasser', 'number', 'Exemple : 0,5. Proposition à valider avec le client.')}
        </div>
      </section>

      <section className="carte p-5 mb-5">
        <h2 className="flex items-center gap-2 font-bold text-marine-800 text-lg mb-1"><Target size={20} />Objectifs par mois</h2>
        <p className="text-sm text-slate-500 mb-4">Combien de fois chaque activité doit être faite chaque mois. Ce sont des propositions : ajustez-les avec votre client.</p>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Object.keys({ ...OBJECTIFS_DEFAUT, ...o }).map((k) => (
            <div key={k}>
              <label className="etiquette">{LIBELLE_JOUR[k] ?? k}</label>
              <input className="champ" type="number" min={0} disabled={!peutEcrire} value={o[k] ?? 0} onChange={(e) => setO({ ...o, [k]: Number(e.target.value) })} />
            </div>
          ))}
        </div>
      </section>

      <section className="carte p-5">
        <h2 className="flex items-center gap-2 font-bold text-marine-800 text-lg mb-1"><Users size={20} />Personnes qui ont accès</h2>
        <p className="text-sm text-slate-500 mb-4">Pour donner accès à quelqu'un : il crée un compte, puis entre le code d'accès que vous lui donnez.</p>
        <ul className="divide-y divide-slate-100">
          {membres.map((m) => (
            <li key={m.user_id} className="py-3 flex items-center justify-between">
              <span className="font-semibold text-slate-800">{m.nom || 'Sans nom'}</span>
              <Pastille couleur={ROLES[m.role]?.[1]}>{ROLES[m.role]?.[0] ?? m.role}</Pastille>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
