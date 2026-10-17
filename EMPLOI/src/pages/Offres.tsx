import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, Search, X } from 'lucide-react'
import { OffreCarte, useOffres } from '../components/Offres'
import { Chargement } from '../components/ui'
import { CONTRATS, METIERS, PAYS, VILLES, type Pays } from '../lib/donnees'

const sansAccent = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function Offres() {
  const { offres, erreur } = useOffres()
  const [params, setParams] = useSearchParams()
  const f = { q: params.get('q') ?? '', pays: params.get('pays') ?? '', ville: params.get('ville') ?? '', contrat: params.get('contrat') ?? '', metier: params.get('metier') ?? '' }
  const changer = (cle: keyof typeof f, valeur: string) => {
    const p = new URLSearchParams(params)
    if (valeur) p.set(cle, valeur); else p.delete(cle)
    if (cle === 'pays') p.delete('ville')
    setParams(p, { replace: true })
  }

  const liste = useMemo(() => (offres ?? []).filter((o) => {
    if (f.pays && o.pays !== f.pays) return false
    if (f.ville && o.ville !== f.ville) return false
    if (f.contrat && o.contrat !== f.contrat) return false
    if (f.metier && o.metier !== f.metier) return false
    if (f.q) {
      const t = sansAccent(`${o.titre} ${o.metier} ${o.description} ${o.entreprise_nom ?? ''} ${o.ville}`)
      if (!sansAccent(f.q).split(/\s+/).every((m) => t.includes(m))) return false
    }
    return true
  }), [offres, f.pays, f.ville, f.contrat, f.metier, f.q])

  const villes = f.pays ? VILLES[f.pays as Pays] : [...VILLES.CG, ...VILLES.FR]
  const filtres = Object.values(f).some(Boolean)
  const [plus, setPlus] = useState(false)
  const nbFiltres = [f.pays, f.ville, f.contrat, f.metier].filter(Boolean).length

  return (
    <div className="conteneur py-10">
      <h1 className="text-3xl font-extrabold text-encre-800">Offres d’emploi</h1>
      <p className="text-slate-500 mt-1">{offres ? `${liste.length} offre${liste.length > 1 ? 's' : ''}` : 'Chargement…'}</p>

      <div className="carte mt-6 p-3 grid gap-2 md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr] sticky top-[68px] z-20 md:static">
        <div className="flex gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-xl bg-slate-50 px-3">
            <Search size={17} className="text-slate-400" />
            <input value={f.q} onChange={(e) => changer('q', e.target.value)} placeholder="Mot-clé" className="w-full bg-transparent py-2.5 outline-none" aria-label="Rechercher une offre" />
          </label>
          <button type="button" onClick={() => setPlus(!plus)} className={`md:hidden relative btn-clair px-3 ${plus ? 'ring-2 ring-rouge-500' : ''}`} aria-expanded={plus} aria-label="Filtres">
            <SlidersHorizontal size={17} />{nbFiltres > 0 && <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-rouge-500 text-[10px] font-bold text-white">{nbFiltres}</span>}
          </button>
        </div>
        <div className={`${plus ? 'grid' : 'hidden'} md:contents grid-cols-2 gap-2`}>
        <select className="champ" value={f.pays} onChange={(e) => changer('pays', e.target.value)}>
          <option value="">Tous les pays</option>
          {(Object.keys(PAYS) as Pays[]).map((p) => <option key={p} value={p}>{PAYS[p].drapeau} {PAYS[p].nom}</option>)}
        </select>
        <select className="champ" value={f.ville} onChange={(e) => changer('ville', e.target.value)}>
          <option value="">Toutes les villes</option>
          {villes.map((v) => <option key={v}>{v}</option>)}
        </select>
        <select className="champ" value={f.contrat} onChange={(e) => changer('contrat', e.target.value)}>
          <option value="">Tous les contrats</option>
          {Object.entries(CONTRATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="champ" value={f.metier} onChange={(e) => changer('metier', e.target.value)}>
          <option value="">Tous les métiers</option>
          {METIERS.map((m) => <option key={m}>{m}</option>)}
        </select>
        </div>
      </div>
      {filtres && <button onClick={() => setParams({}, { replace: true })} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-rouge-600"><X size={15} />Effacer les filtres</button>}

      <div className="mt-6">
        {erreur && <p className="text-rouge-600">Les offres n’ont pas pu être chargées. Réessayez dans un instant.</p>}
        {!offres ? <Chargement /> : liste.length === 0 ? (
          <div className="carte p-10 text-center text-slate-500">Aucune offre ne correspond. Essayez avec moins de filtres.</div>
        ) : (
          <motion.div layout className="grid gap-4 md:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {liste.map((o, i) => (
                <motion.div key={o.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { delay: Math.min(i, 8) * 0.04 } }} exit={{ opacity: 0, scale: 0.96 }}>
                  <OffreCarte o={o} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}
