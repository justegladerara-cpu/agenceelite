import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, ChevronDown, Search } from 'lucide-react'
import { EnTete } from '../components/ui'

const ETAPES = [
  { t: 'Chaque soir : la saisie du jour', d: 'Ouvrez « Saisie du jour », touchez + ou − pour chaque ligne, puis « Enregistrer la journée ». Deux minutes suffisent. Les cases vides comptent comme zéro.' },
  { t: 'Quand il se passe quelque chose : un incident', d: 'Ouvrez « Incidents », puis « Ajouter ». Décrivez en quelques mots, prenez une photo avec le téléphone. Vous pouvez ensuite télécharger la fiche « Incident Flash » en PDF pour l\'envoyer au client.' },
  { t: 'Pour corriger : les actions', d: 'Dans « Actions correctives », notez quoi faire, qui le fait et pour quand. Les actions en retard passent en rouge automatiquement.' },
  { t: 'Les registres', d: 'Permis de travail, inspections, formations, personnel, EPI et documents : chaque registre a sa liste, sa recherche, et un bouton « Exporter en Excel ».' },
  { t: 'Chaque mois : le rapport', d: 'Ouvrez « Rapport mensuel », choisissez le mois, puis « Télécharger le PDF » ou « Excel ». Le rapport est prêt à envoyer.' },
  { t: 'Le tableau de bord', d: 'Tous les chiffres et graphiques se calculent tout seuls à partir de vos saisies. Choisissez l\'année ou un mois en haut de la page.' },
]

const LEXIQUE: [string, string][] = [
  ['Accident grave (enregistrable)', 'Tout accident qui a demandé plus que des premiers soins : soins médicaux, travail limité, arrêt de travail ou décès.'],
  ['Accident avec arrêt', 'La personne blessée ne peut pas revenir travailler le lendemain.'],
  ['Travail limité', 'La personne blessée revient, mais ne peut pas faire tout son travail habituel.'],
  ['Soins médicaux', 'La personne est soignée par un médecin (points de suture, médicaments sur ordonnance…) et continue à travailler.'],
  ['Premiers soins', 'Petite blessure soignée sur place (pansement, nettoyage). Ce n\'est pas un accident grave.'],
  ['Presque-accident', 'Il a failli y avoir un accident, mais personne n\'a été blessé. Les signaler est très positif : cela évite le prochain accident.'],
  ['Danger signalé', 'Une situation dangereuse repérée avant qu\'il n\'arrive quelque chose (câble au sol, garde-corps manquant…).'],
  ['TRIR (taux d\'accidents)', 'Nombre d\'accidents graves pour 200 000 heures travaillées (environ 100 personnes pendant un an). Calcul : accidents graves × 200 000 ÷ heures. Plus il est bas, mieux c\'est.'],
  ['Taux de fréquence (TF)', 'Nombre d\'accidents avec arrêt pour 1 million d\'heures travaillées.'],
  ['Pyramide de sécurité', 'Pour un accident grave, il y a beaucoup de petits événements et de presque-accidents. Agir sur la base de la pyramide évite les accidents graves.'],
  ['JSA (analyse de risques)', 'Avant une tâche, l\'équipe liste les dangers et les protections à mettre en place.'],
  ['Causerie sécurité', 'Courte réunion (5 à 15 minutes) avec l\'équipe sur un thème de sécurité.'],
  ['Permis de travail', 'Autorisation écrite pour un travail à risque. « À chaud » : soudure, meulage, flamme. « À froid » : autres travaux à risque. « Espace confiné » : cuve, fosse, regard.'],
  ['Accueil sécurité (induction)', 'Présentation des règles de sécurité du site à toute personne qui arrive.'],
  ['EPI', 'Équipements de protection individuelle : casque, chaussures de sécurité, gants, lunettes, combinaison…'],
  ['Action corrective', 'Ce qu\'on fait pour qu\'un problème ne se reproduise pas. Elle a un responsable et une date limite.'],
  ['Exercice d\'urgence', 'Simulation d\'incendie, d\'évacuation ou de secours pour s\'entraîner.'],
  ['QHSE / HSE', 'Qualité, Hygiène, Sécurité, Environnement.'],
]

export default function Aide() {
  const [q, setQ] = useState('')
  const [ouvert, setOuvert] = useState<number | null>(0)
  const mots = LEXIQUE.filter(([m, d]) => (m + d).toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="max-w-4xl">
      <EnTete titre="Aide et lexique" sousTitre="Comment utiliser la plateforme, et les mots HSE expliqués simplement." icone={<BookOpen />} couleur="teal" />
      <section className="mb-8">
        <h2 className="font-bold text-marine-800 text-lg mb-3">Comment ça marche</h2>
        <div className="space-y-2">
          {ETAPES.map((e, i) => (
            <div key={e.t} className="carte overflow-hidden">
              <button className="w-full flex items-center gap-3 px-5 py-4 text-left" onClick={() => setOuvert(ouvert === i ? null : i)}>
                <span className="h-8 w-8 shrink-0 rounded-full bg-marine-700 text-white grid place-items-center font-bold text-sm">{i + 1}</span>
                <span className="font-semibold text-slate-800 flex-1">{e.t}</span>
                <ChevronDown size={18} className={`text-slate-400 transition ${ouvert === i ? 'rotate-180' : ''}`} />
              </button>
              {ouvert === i && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="px-5 pb-4 pl-16 text-slate-600">{e.d}</motion.p>}
            </div>
          ))}
        </div>
      </section>
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h2 className="font-bold text-marine-800 text-lg">Lexique</h2>
          <div className="relative sm:w-72">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="champ pl-10" placeholder="Chercher un mot…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <dl className="grid md:grid-cols-2 gap-3">
          {mots.map(([m, d]) => (
            <div key={m} className="carte p-4">
              <dt className="font-bold text-marine-800">{m}</dt>
              <dd className="text-sm text-slate-600 mt-1">{d}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
