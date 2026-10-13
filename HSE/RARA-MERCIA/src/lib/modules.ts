import {
  AlertTriangle, ClipboardCheck, FileText, Flame, GraduationCap, HardHat, ListChecks, Users,
  type LucideIcon,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Saisie du jour : colonnes de la table hse_journal, rangées par groupes.
// ---------------------------------------------------------------------------
export type ChampJour = { cle: string; libelle: string; aide: string; unite?: string }
export type GroupeJour = { titre: string; couleur: string; champs: ChampJour[]; facultatif?: boolean }

export const GROUPES_JOUR: GroupeJour[] = [
  {
    titre: 'Personnel', couleur: 'sky', champs: [
      { cle: 'personnes', libelle: 'Personnes présentes', aide: "Nombre de personnes qui ont travaillé aujourd'hui" },
    ],
  },
  {
    titre: "Ce qui a été fait aujourd'hui", couleur: 'emerald', champs: [
      { cle: 'jsa', libelle: 'Analyses de risques (JSA)', aide: 'Analyses des dangers faites avant une tâche' },
      { cle: 'causeries', libelle: 'Causeries sécurité', aide: 'Courtes réunions sécurité avec les équipes' },
      { cle: 'permis_chaud', libelle: 'Permis à chaud', aide: 'Soudure, meulage, flamme…' },
      { cle: 'permis_froid', libelle: 'Permis à froid', aide: 'Autres travaux à risque' },
      { cle: 'inspections', libelle: 'Inspections / audits', aide: 'Contrôles sécurité réalisés' },
      { cle: 'accueils', libelle: 'Accueils sécurité', aide: 'Nouveaux arrivants accueillis' },
      { cle: 'visites_infirmerie', libelle: 'Visites infirmerie', aide: 'Maladie non liée au travail' },
    ],
  },
  {
    titre: "Ce qui est arrivé aujourd'hui", couleur: 'rose', champs: [
      { cle: 'presque_accidents', libelle: 'Presque-accidents', aide: "Il a failli y avoir un accident, personne n'est blessé" },
      { cle: 'dangers', libelle: 'Dangers signalés', aide: 'Situation dangereuse repérée et signalée' },
      { cle: 'premiers_soins', libelle: 'Premiers soins', aide: 'Petite blessure soignée sur place' },
      { cle: 'soins_medicaux', libelle: 'Soins médicaux', aide: 'Blessé vu par un médecin, il continue à travailler' },
      { cle: 'travail_limite', libelle: 'Travail limité', aide: 'Blessé qui ne peut pas faire tout son travail' },
      { cle: 'accidents_arret', libelle: 'Accidents avec arrêt', aide: 'Blessé qui ne peut pas travailler le lendemain' },
      { cle: 'deces', libelle: 'Décès', aide: 'Personne décédée à cause du travail' },
      { cle: 'degats', libelle: 'Dégâts matériels', aide: 'Équipement ou véhicule abîmé' },
      { cle: 'pollutions', libelle: 'Pollutions', aide: 'Déversement d’huile, gasoil, produit chimique…' },
    ],
  },
  {
    titre: 'Autres (facultatif)', couleur: 'slate', facultatif: true, champs: [
      { cle: 'heures_reelles', libelle: 'Heures réelles', aide: 'Si vide : personnes × heures par jour', unite: 'h' },
      { cle: 'formations', libelle: 'Formations', aide: 'Séances de formation' },
      { cle: 'reunions_generales', libelle: 'Réunions générales', aide: 'Grande réunion avec tout le personnel' },
      { cle: 'reunions_poste', libelle: 'Réunions début de poste', aide: 'Au changement d’équipe' },
      { cle: 'exercices', libelle: "Exercices d'urgence", aide: 'Incendie, évacuation…' },
      { cle: 'cartes_zero', libelle: 'Cartes « Zéro accident »', aide: 'Cartes d’observation reçues' },
      { cle: 'actions_cloturees', libelle: 'Actions clôturées', aide: 'Actions correctives terminées' },
      { cle: 'permis_confine', libelle: 'Permis espace confiné', aide: 'Cuve, fosse, regard…' },
      { cle: 'evacuations', libelle: 'Évacuations', aide: 'Personne transportée hors du site' },
      { cle: 'evenements_info', libelle: 'Événements pour info', aide: 'À signaler, mais pas un accident' },
      { cle: 'dechets_produits_kg', libelle: 'Déchets produits', aide: 'Poids en kg', unite: 'kg' },
      { cle: 'dechets_evacues_kg', libelle: 'Déchets évacués', aide: 'Poids en kg', unite: 'kg' },
    ],
  },
]
export const CHAMPS_JOUR = GROUPES_JOUR.flatMap((g) => g.champs)
export const LIBELLE_JOUR: Record<string, string> = Object.fromEntries(CHAMPS_JOUR.map((c) => [c.cle, c.libelle]))

// ---------------------------------------------------------------------------
// Modules « registre » : une table, une liste, un formulaire, un export Excel.
// ---------------------------------------------------------------------------
export type Option = { v: string; l: string; c?: string }
export type Champ = {
  cle: string
  libelle: string
  type: 'texte' | 'long' | 'date' | 'dateheure' | 'nombre' | 'choix' | 'ouinon' | 'photos' | 'fichier' | 'lien' | 'personne'
  options?: Option[]
  requis?: boolean
  liste?: boolean // affiché dans la liste
  aide?: string
  largeur?: 'demi' | 'plein'
  defaut?: string // valeur proposée à la création
}
export type Module = {
  id: string
  table: string
  titre: string
  singulier: string
  description: string
  icone: LucideIcon
  couleur: string // classe Tailwind de base, ex. 'rose'
  champs: Champ[]
  tri: string
  titreLigne: (r: Record<string, unknown>) => string
  prefixe?: string // numéro affiché, ex. INC-12
  statut?: string // champ utilisé pour les filtres rapides
  dateChamp?: string
}

const C = (v: string, l: string, c?: string): Option => ({ v, l, c })
export const STATUTS_INCIDENT = [C('ouvert', 'Ouvert', 'rose'), C('en_cours', 'En cours d’enquête', 'amber'), C('clos', 'Clôturé', 'emerald')]
export const TYPES_INCIDENT = [
  C('deces', 'Décès', 'rose'), C('accident_arret', 'Accident avec arrêt', 'rose'), C('travail_limite', 'Travail limité', 'rose'),
  C('soins_medicaux', 'Soins médicaux', 'orange'), C('premiers_soins', 'Premiers soins', 'amber'),
  C('presque_accident', 'Presque-accident', 'yellow'), C('danger', 'Danger signalé', 'yellow'),
  C('degat', 'Dégât matériel', 'slate'), C('pollution', 'Pollution', 'lime'), C('evacuation', 'Évacuation', 'sky'),
  C('surete', 'Sûreté (vol, intrusion)', 'violet'), C('autre', 'Autre', 'slate'),
]
export const GRAVITES = [C('faible', 'Faible', 'emerald'), C('moyenne', 'Moyenne', 'amber'), C('elevee', 'Élevée', 'orange'), C('critique', 'Critique', 'rose')]

export const MODULES: Module[] = [
  {
    id: 'incidents', table: 'hse_incidents', titre: 'Incidents', singulier: 'incident', prefixe: 'INC',
    description: 'Déclarer et suivre les accidents, presque-accidents et dangers.',
    icone: AlertTriangle, couleur: 'rose', tri: 'date_evt', statut: 'statut', dateChamp: 'date_evt',
    titreLigne: (r) => String(r.titre ?? ''),
    champs: [
      { cle: 'titre', libelle: 'Que s’est-il passé ? (en quelques mots)', type: 'texte', requis: true, liste: true, largeur: 'plein' },
      { cle: 'date_evt', libelle: 'Date et heure', type: 'dateheure', requis: true, liste: true },
      { cle: 'type', libelle: 'Type d’événement', type: 'choix', options: TYPES_INCIDENT, requis: true, liste: true, defaut: 'presque_accident' },
      { cle: 'gravite', libelle: 'Gravité', type: 'choix', options: GRAVITES, requis: true, liste: true },
      { cle: 'lieu', libelle: 'Lieu', type: 'texte', liste: true },
      { cle: 'description', libelle: 'Description détaillée', type: 'long', largeur: 'plein' },
      { cle: 'personnes', libelle: 'Personnes concernées', type: 'long' },
      { cle: 'causes', libelle: 'Causes probables', type: 'long' },
      { cle: 'actions_immediates', libelle: 'Actions immédiates prises', type: 'long', largeur: 'plein' },
      { cle: 'declare_par', libelle: 'Déclaré par', type: 'texte' },
      { cle: 'statut', libelle: 'Statut', type: 'choix', options: STATUTS_INCIDENT, requis: true, liste: true },
      { cle: 'photos', libelle: 'Photos', type: 'photos', largeur: 'plein' },
    ],
  },
  {
    id: 'actions', table: 'hse_actions', titre: 'Actions correctives', singulier: 'action', prefixe: 'ACT',
    description: 'Qui fait quoi, pour quand. Les retards apparaissent en rouge.',
    icone: ListChecks, couleur: 'amber', tri: 'echeance', statut: 'statut', dateChamp: 'echeance',
    titreLigne: (r) => String(r.titre ?? ''),
    champs: [
      { cle: 'titre', libelle: 'Action à faire', type: 'texte', requis: true, liste: true, largeur: 'plein' },
      { cle: 'responsable', libelle: 'Responsable', type: 'texte', liste: true },
      { cle: 'echeance', libelle: 'À faire pour le', type: 'date', liste: true },
      {
        cle: 'priorite', libelle: 'Priorité', type: 'choix', liste: true, requis: true,
        options: [C('basse', 'Basse', 'slate'), C('normale', 'Normale', 'sky'), C('haute', 'Haute', 'rose')],
      },
      {
        cle: 'origine', libelle: 'Origine', type: 'choix', requis: true,
        options: [C('incident', 'Incident'), C('inspection', 'Inspection'), C('audit', 'Audit'), C('reunion', 'Réunion'), C('client', 'Demande du client'), C('autre', 'Autre')],
      },
      {
        cle: 'statut', libelle: 'Statut', type: 'choix', liste: true, requis: true,
        options: [C('a_faire', 'À faire', 'rose'), C('en_cours', 'En cours', 'amber'), C('terminee', 'Terminée', 'emerald')],
      },
      { cle: 'cloture_le', libelle: 'Terminée le', type: 'date' },
      { cle: 'description', libelle: 'Détails', type: 'long', largeur: 'plein' },
    ],
  },
  {
    id: 'permis', table: 'hse_permis', titre: 'Permis de travail', singulier: 'permis', prefixe: 'PT',
    description: 'Registre des permis à chaud, à froid, espace confiné, hauteur…',
    icone: Flame, couleur: 'orange', tri: 'date_debut', statut: 'statut', dateChamp: 'date_debut',
    titreLigne: (r) => String(r.travaux ?? 'Permis'),
    champs: [
      {
        cle: 'type', libelle: 'Type de permis', type: 'choix', requis: true, liste: true,
        options: [C('chaud', 'À chaud', 'orange'), C('froid', 'À froid', 'sky'), C('espace_confine', 'Espace confiné', 'violet'), C('hauteur', 'Travail en hauteur', 'amber'), C('electrique', 'Électrique', 'yellow'), C('fouille', 'Fouille / excavation', 'lime')],
      },
      { cle: 'travaux', libelle: 'Travaux réalisés', type: 'texte', requis: true, liste: true, largeur: 'plein' },
      { cle: 'date_debut', libelle: 'Date de début', type: 'date', requis: true, liste: true },
      { cle: 'date_fin', libelle: 'Date de fin', type: 'date' },
      { cle: 'zone', libelle: 'Zone', type: 'texte', liste: true },
      { cle: 'entreprise', libelle: 'Entreprise', type: 'texte', liste: true },
      { cle: 'demandeur', libelle: 'Demandeur', type: 'texte' },
      { cle: 'autorise_par', libelle: 'Autorisé par', type: 'texte' },
      {
        cle: 'statut', libelle: 'Statut', type: 'choix', requis: true, liste: true,
        options: [C('ouvert', 'Ouvert', 'amber'), C('suspendu', 'Suspendu', 'rose'), C('clos', 'Clôturé', 'emerald')],
      },
      { cle: 'remarques', libelle: 'Remarques', type: 'long', largeur: 'plein' },
    ],
  },
  {
    id: 'inspections', table: 'hse_inspections', titre: 'Inspections', singulier: 'inspection',
    description: 'Extincteurs, véhicules, EPI, boîtes de secours, zones de travail…',
    icone: ClipboardCheck, couleur: 'sky', tri: 'date_insp', statut: 'resultat', dateChamp: 'date_insp',
    titreLigne: (r) => `${TYPES_INSPECTION.find((o) => o.v === r.type)?.l ?? 'Inspection'}${r.zone ? ` — ${r.zone}` : ''}`,
    champs: [
      { cle: 'date_insp', libelle: 'Date', type: 'date', requis: true, liste: true },
      { cle: 'type', libelle: 'Type', type: 'choix', requis: true, liste: true, options: [] },
      { cle: 'zone', libelle: 'Zone / équipement', type: 'texte', liste: true },
      { cle: 'inspecteur', libelle: 'Inspecteur', type: 'texte', liste: true },
      {
        cle: 'resultat', libelle: 'Résultat', type: 'choix', requis: true, liste: true,
        options: [C('conforme', 'Conforme', 'emerald'), C('a_surveiller', 'À surveiller', 'amber'), C('non_conforme', 'Non conforme', 'rose')],
      },
      { cle: 'points_ok', libelle: 'Points conformes', type: 'nombre' },
      { cle: 'points_nok', libelle: 'Points non conformes', type: 'nombre' },
      { cle: 'observations', libelle: 'Observations', type: 'long', largeur: 'plein' },
      { cle: 'photos', libelle: 'Photos', type: 'photos', largeur: 'plein' },
    ],
  },
  {
    id: 'formations', table: 'hse_formations', titre: 'Formations', singulier: 'formation',
    description: 'Formations, accueils sécurité, causeries et exercices.',
    icone: GraduationCap, couleur: 'violet', tri: 'date_form', statut: 'type', dateChamp: 'date_form',
    titreLigne: (r) => String(r.theme ?? ''),
    champs: [
      { cle: 'theme', libelle: 'Thème', type: 'texte', requis: true, liste: true, largeur: 'plein' },
      { cle: 'date_form', libelle: 'Date', type: 'date', requis: true, liste: true },
      {
        cle: 'type', libelle: 'Type', type: 'choix', requis: true, liste: true,
        options: [C('formation', 'Formation', 'violet'), C('accueil', 'Accueil sécurité', 'sky'), C('causerie', 'Causerie', 'emerald'), C('exercice', "Exercice d'urgence", 'orange')],
      },
      { cle: 'formateur', libelle: 'Formateur', type: 'texte', liste: true },
      { cle: 'participants', libelle: 'Nombre de participants', type: 'nombre', liste: true },
      { cle: 'duree_h', libelle: 'Durée (heures)', type: 'nombre' },
      { cle: 'liste_presence', libelle: 'Liste de présence (noms)', type: 'long', largeur: 'plein' },
      { cle: 'remarques', libelle: 'Remarques', type: 'long', largeur: 'plein' },
    ],
  },
  {
    id: 'personnel', table: 'hse_personnel', titre: 'Personnel', singulier: 'personne',
    description: 'Liste du personnel, tailles d’EPI, accueil sécurité et visite médicale.',
    icone: Users, couleur: 'teal', tri: 'nom', statut: 'actif',
    titreLigne: (r) => String(r.nom ?? ''),
    champs: [
      { cle: 'nom', libelle: 'Nom et prénom', type: 'texte', requis: true, liste: true, largeur: 'plein' },
      { cle: 'poste', libelle: 'Poste', type: 'texte', liste: true },
      { cle: 'entreprise', libelle: 'Entreprise', type: 'texte', liste: true },
      { cle: 'telephone', libelle: 'Téléphone', type: 'texte' },
      { cle: 'date_arrivee', libelle: "Date d'arrivée", type: 'date' },
      { cle: 'induction_le', libelle: 'Accueil sécurité le', type: 'date', liste: true },
      { cle: 'visite_medicale_le', libelle: 'Visite médicale le', type: 'date', liste: true },
      { cle: 'taille_combinaison', libelle: 'Taille combinaison', type: 'texte' },
      { cle: 'pointure', libelle: 'Pointure', type: 'texte' },
      { cle: 'taille_casque', libelle: 'Taille casque', type: 'texte' },
      { cle: 'actif', libelle: 'Toujours sur le site', type: 'ouinon', liste: true, options: [C('true', 'Oui', 'emerald'), C('false', 'Non', 'slate')] },
    ],
  },
  {
    id: 'epi', table: 'hse_epi', titre: 'Dotation EPI', singulier: 'remise d’EPI',
    description: 'Casques, chaussures, combinaisons, gants… remis au personnel.',
    icone: HardHat, couleur: 'yellow', tri: 'date_remise', statut: 'article', dateChamp: 'date_remise',
    titreLigne: (r) => `${ARTICLES_EPI.find((o) => o.v === r.article)?.l ?? r.article} × ${r.quantite ?? 1}`,
    champs: [
      { cle: 'personnel_id', libelle: 'Remis à', type: 'personne', liste: true, largeur: 'plein' },
      { cle: 'date_remise', libelle: 'Date', type: 'date', requis: true, liste: true },
      { cle: 'article', libelle: 'Article', type: 'choix', requis: true, liste: true, options: [] },
      { cle: 'quantite', libelle: 'Quantité', type: 'nombre', requis: true, liste: true },
      { cle: 'taille', libelle: 'Taille', type: 'texte', liste: true },
      { cle: 'remarques', libelle: 'Remarques', type: 'long', largeur: 'plein' },
    ],
  },
  {
    id: 'documents', table: 'hse_documents', titre: 'Documents', singulier: 'document',
    description: 'Procédures, analyses de risques, comptes rendus, hand-over, rapports.',
    icone: FileText, couleur: 'indigo', tri: 'date_doc', statut: 'categorie', dateChamp: 'date_doc',
    titreLigne: (r) => String(r.titre ?? ''),
    champs: [
      { cle: 'titre', libelle: 'Titre', type: 'texte', requis: true, liste: true, largeur: 'plein' },
      {
        cle: 'categorie', libelle: 'Catégorie', type: 'choix', requis: true, liste: true,
        options: [C('procedure', 'Procédure', 'indigo'), C('aro', 'Analyse de risques', 'orange'), C('rapport', 'Rapport', 'sky'), C('compte_rendu', 'Compte rendu', 'emerald'), C('handover', 'Hand-over', 'violet'), C('formation', 'Support de formation', 'teal'), C('autre', 'Autre', 'slate')],
      },
      { cle: 'date_doc', libelle: 'Date', type: 'date', liste: true },
      { cle: 'fichier', libelle: 'Fichier', type: 'fichier', largeur: 'plein' },
      { cle: 'lien', libelle: 'Ou lien internet', type: 'lien', largeur: 'plein' },
      { cle: 'description', libelle: 'Description', type: 'long', largeur: 'plein' },
    ],
  },
]

export const TYPES_INSPECTION: Option[] = [
  C('extincteurs', 'Extincteurs', 'rose'), C('vehicules', 'Véhicules', 'sky'), C('epi', 'EPI', 'yellow'),
  C('boite_secours', 'Boîte de secours', 'emerald'), C('zone', 'Zone de travail', 'violet'), C('echafaudage', 'Échafaudage', 'orange'),
  C('levage', 'Engins de levage', 'amber'), C('electrique', 'Électrique', 'yellow'), C('base_vie', 'Base vie / cuisine', 'teal'), C('autre', 'Autre', 'slate'),
]
export const ARTICLES_EPI: Option[] = [
  C('casque', 'Casque'), C('chaussures', 'Chaussures de sécurité'), C('combinaison', 'Combinaison'), C('gants', 'Gants'),
  C('lunettes', 'Lunettes'), C('harnais', 'Harnais'), C('bouchons', 'Bouchons d’oreilles'), C('gilet', 'Gilet haute visibilité'),
  C('imper', 'Tenue de pluie'), C('masque', 'Masque'), C('autre', 'Autre'),
]
MODULES.find((m) => m.id === 'inspections')!.champs.find((c) => c.cle === 'type')!.options = TYPES_INSPECTION
MODULES.find((m) => m.id === 'epi')!.champs.find((c) => c.cle === 'article')!.options = ARTICLES_EPI

export const moduleParId = (id: string) => MODULES.find((m) => m.id === id)
export const optionDe = (champ: Champ | undefined, v: unknown) => champ?.options?.find((o) => o.v === String(v))
