// Listes et libellés partagés par toutes les pages.

export type Pays = 'CG' | 'FR'
export type Role = 'candidat' | 'entreprise' | 'admin'
export type Contrat = 'cdi' | 'cdd' | 'stage' | 'interim' | 'freelance' | 'alternance'

export const PAYS: Record<Pays, { nom: string; drapeau: string; devise: 'XAF' | 'EUR' }> = {
  CG: { nom: 'Congo', drapeau: '🇨🇬', devise: 'XAF' },
  FR: { nom: 'France', drapeau: '🇫🇷', devise: 'EUR' },
}

export const VILLES: Record<Pays, string[]> = {
  CG: ['Pointe-Noire', 'Brazzaville', 'Dolisie', 'Nkayi', 'Ouesso', 'Owando', 'Impfondo', 'Madingou'],
  FR: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Bordeaux', 'Lille', 'Nantes', 'Strasbourg', 'Nice', 'Montpellier'],
}

export const CONTRATS: Record<Contrat, string> = {
  cdi: 'CDI', cdd: 'CDD', stage: 'Stage', interim: 'Intérim', freelance: 'Freelance', alternance: 'Alternance',
}

export const METIERS = [
  'Administration et secrétariat', 'Comptabilité et finance', 'Commerce et vente', 'Relation client',
  'Logistique et transport', 'Pétrole, gaz et énergie', 'BTP et construction', 'Maintenance et technique',
  'Sécurité et HSE', 'Informatique et digital', 'Ressources humaines', 'Hôtellerie et restauration',
  'Santé', 'Enseignement et formation', 'Marketing et communication', 'Juridique', 'Autre',
]

export const NIVEAUX = ['Sans diplôme', 'BEPC / Brevet', 'CAP / BEP', 'Bac', 'Bac +2 (BTS, DUT)', 'Licence (Bac +3)', 'Master (Bac +5)', 'Doctorat']

export const STATUTS_CANDIDATURE: Record<string, { label: string; couleur: string; pourCandidat: string }> = {
  nouvelle: { label: 'Nouvelle', couleur: 'sky', pourCandidat: 'Envoyée' },
  a_appeler: { label: 'À appeler', couleur: 'amber', pourCandidat: 'En cours d’étude' },
  entretien: { label: 'Entretien', couleur: 'violet', pourCandidat: 'Entretien prévu' },
  qualifiee: { label: 'Qualifiée', couleur: 'emerald', pourCandidat: 'Profil retenu par Agence Elite' },
  retenue: { label: 'Retenue', couleur: 'emerald', pourCandidat: 'Retenue' },
  refusee: { label: 'Refusée', couleur: 'rose', pourCandidat: 'Non retenue' },
}

export const STATUTS_OFFRE: Record<string, { label: string; couleur: string }> = {
  brouillon: { label: 'Brouillon', couleur: 'slate' },
  en_attente: { label: 'En attente de validation', couleur: 'amber' },
  publiee: { label: 'Publiée', couleur: 'emerald' },
  fermee: { label: 'Fermée', couleur: 'slate' },
  refusee: { label: 'Refusée', couleur: 'rose' },
}

export const DECISIONS: Record<string, { label: string; couleur: string }> = {
  en_attente: { label: 'À étudier', couleur: 'slate' },
  entretien: { label: 'Entretien', couleur: 'violet' },
  retenu: { label: 'Recruté', couleur: 'emerald' },
  refuse: { label: 'Pas retenu', couleur: 'rose' },
}

export const PAIEMENTS: Record<string, { label: string; couleur: string }> = {
  a_facturer: { label: 'À facturer', couleur: 'amber' },
  facture: { label: 'Facturé', couleur: 'sky' },
  paye: { label: 'Payé', couleur: 'emerald' },
}

/** Prix d'un CV qualifié par défaut (modifiable à chaque envoi). */
export const PRIX_CV = { XAF: 2500, EUR: 4 }

export function argent(montant: number | null | undefined, devise: string) {
  if (montant == null) return ''
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: devise, maximumFractionDigits: 0 }).format(montant)
}

export function salaire(min: number | null, max: number | null, devise: string) {
  if (min == null && max == null) return 'Salaire à discuter'
  if (min != null && max != null && min !== max) return `${argent(min, devise)} à ${argent(max, devise)} / mois`
  return `${argent(min ?? max, devise)} / mois`
}

export function dateCourte(d: string | null | undefined) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function depuis(d: string | null | undefined) {
  if (!d) return ''
  const jours = Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
  if (jours <= 0) return "Aujourd'hui"
  if (jours === 1) return 'Hier'
  if (jours < 30) return `Il y a ${jours} jours`
  return dateCourte(d)
}

export type OffrePublique = {
  id: string; titre: string; metier: string; description: string; missions: string | null; profil: string | null
  pays: Pays; ville: string; contrat: Contrat; teletravail: boolean; salaire_min: number | null; salaire_max: number | null
  devise: 'XAF' | 'EUR'; a_la_une: boolean; publiee_le: string | null; expire_le: string | null
  entreprise_nom: string | null; entreprise_secteur: string | null; tests: { id: string; slug: string; titre: string }[]
}

export type Test = { id: string; slug: string; titre: string; categorie: string; description: string; duree_minutes: number; seuil_reussite: number; actif: boolean; ordre: number }
