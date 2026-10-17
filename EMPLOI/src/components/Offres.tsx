import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Briefcase, ClipboardCheck, MapPin, Star, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { CONTRATS, PAYS, depuis, salaire, type OffrePublique } from '../lib/donnees'
import { Pastille } from './ui'

/** Offres publiées (fonction emploi_offres_publiees : le nom des entreprises confidentielles est masqué). */
export function useOffres() {
  const [offres, setOffres] = useState<OffrePublique[] | null>(null)
  const [erreur, setErreur] = useState('')
  useEffect(() => {
    supabase.rpc('emploi_offres_publiees').then(({ data, error }) => {
      if (error) setErreur(error.message)
      setOffres((data as OffrePublique[]) ?? [])
    })
  }, [])
  return { offres, erreur }
}

export function OffreCarte({ o }: { o: OffrePublique }) {
  return (
    <Link to={`/offres/${o.id}`} className="carte group relative block overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:border-rouge-300 hover:shadow-[0_18px_40px_-20px_rgba(11,11,12,.35)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1 origin-top scale-y-0 bg-rouge-500 transition-transform duration-300 group-hover:scale-y-100" />
          <h3 className="font-bold text-lg text-encre-800 leading-snug transition-colors group-hover:text-rouge-600">{o.titre}</h3>
          <p className="text-sm text-slate-500 mt-0.5 truncate">{o.entreprise_nom ?? 'Entreprise confidentielle'}</p>
        </div>
        {o.a_la_une && <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-rouge-100 px-2.5 py-1 text-xs font-bold text-rouge-600"><Star size={12} fill="currentColor" />À la une</span>}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{o.ville}, {PAYS[o.pays].drapeau} {PAYS[o.pays].nom}</span>
        <span className="inline-flex items-center gap-1.5"><Briefcase size={15} />{CONTRATS[o.contrat]}{o.teletravail ? ' · télétravail possible' : ''}</span>
        <span className="inline-flex items-center gap-1.5"><Wallet size={15} />{salaire(o.salaire_min, o.salaire_max, o.devise)}</span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Pastille couleur="slate">{o.metier}</Pastille>
          {o.tests.length > 0 && <Pastille couleur="rouge"><ClipboardCheck size={12} className="mr-1" />{o.tests.length} test{o.tests.length > 1 ? 's' : ''}</Pastille>}
        </div>
        <span className="text-xs text-slate-400 shrink-0">{depuis(o.publiee_le)}</span>
      </div>
    </Link>
  )
}
