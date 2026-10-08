# Passation — état réel au 8 octobre 2026

Le projet n’est **pas une plateforme de production terminée**. Le site public et un noyau opérationnel fonctionnent localement en démonstration. Aucun domaine, WordPress, compte prestataire ou hébergement public n’a été modifié. Cette livraison s’arrête à un état testable pour la reprise demandée au §19 ; ne pas confondre démonstration et raccordement de production.

## État par module

| Lot   | Module                                                   | État réel                                                                                                                                                                                                                                  |
| ----- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | Pages publiques et design responsive                     | Terminé en démonstration : toutes les routes, logo source, médias locaux, FAQ, comparatif et fiches agences                                                                                                                                |
| 1     | Contenus et coordonnées                                  | Proposés/observés, non validés ; juridique et horaires restent à confirmer. Production bloquée                                                                                                                                             |
| 1     | Guide de mesures et calculateur                          | Terminé et testé : fractions exactes, cm/m, virgules, quantité, erreurs, reprise des colis dans le devis, impression navigateur                                                                                                            |
| 1     | Demande de devis                                         | Terminée localement : 5 étapes, référence serveur, idempotence atomique, pièces en quarantaine, aucune notification fictive                                                                                                                |
| 1     | Tarification                                             | Module pur testé, inactif ; instantané, unités mineures, minimum, frais, paliers et arrondi. Aucune grille réelle validée                                                                                                                  |
| 1     | Gestion éditoriale                                       | Partielle : édition d’un complément proposé, compteur de version, audit. Pas de workflow d’approbation ni archivage complet de toutes les versions éditoriales                                                                             |
| 1     | Référencement/redirections                               | Préparés et testés ; non-indexation active ; PDF historique vers /tarifs tant qu’une grille n’est pas validée. Inventaire exhaustif WordPress restant                                                                                      |
| 2     | Authentification et portail                              | Partiels : comptes fictifs prédéfinis, scrypt, sessions opaques et déconnexion ; second facteur simulé admin. Inscription, preuve réelle d’email, récupération, MFA de production et organisations multi-utilisateurs restent à développer |
| 2     | Permissions                                              | Lectures et mutations serveur testées par propriétaire et agence ; rôles admin/manager/agent/sales/finance/client dans le domaine. Pas d’interface complète de gestion des habilitations                                                   |
| 2     | Expéditions et colis                                     | Fonctionnels en démo : création, réception, mesures déclarées/contrôlées conservées, réserves, révision requise, accord tracé, étiquette QR sans données personnelles                                                                      |
| 2     | Propositions                                             | Fonctionnelles en démo : versions indépendantes, acceptation par propriétaire, PDF numéroté simple. Modèle commercial détaillé, lignes tarifaires et rattachement aux demandes invité restant à compléter                                  |
| 2     | Départs                                                  | Partiels : lots, affectation unique, contrôle des écarts de mesures, manifeste privé CSV. Confirmation des dates, opérations groupées avec exceptions et transfert d’agence restant                                                        |
| 2     | Suivi                                                    | Historique manuel privé fonctionnel ; transitions, incidents et corrections append-only testés. Suivi public sécurisé/OTP non réalisé et désactivé                                                                                         |
| 2     | Remise                                                   | Parcours testé : arrivé distinct de disponible et remis ; droit de retrait et preuve privée obligatoires. Procédure métier et mandataire non validés                                                                                       |
| 2     | Documents                                                | PDF privés et preuves protégés par propriétaire/agence. Pièces invité en quarantaine, pas d’antivirus, ni Storage Supabase raccordé                                                                                                        |
| 2     | Assistance                                               | Dossiers et réponses persistés avec contrôle du périmètre ; interface conversationnelle à améliorer                                                                                                                                        |
| 2     | Comptes professionnels, import clients, export financier | Non réalisés                                                                                                                                                                                                                               |
| 3     | Notifications, paiements, rendez-vous, import CSV        | Non commencés. Seulement modèle PostgreSQL et variables prévus ; ne pas annoncer des adaptateurs terminés                                                                                                                                  |
| Cible | PostgreSQL/Supabase/Netlify                              | Schéma préparatoire et documentation ; aucune connexion ni migration PostgreSQL exécutée faute de Docker, aucun déploiement                                                                                                                |

## Reprise par Claude (8 octobre 2026)

Vérification indépendante : check, build, garde-fou production et 12 scénarios navigateur rejoués avec succès. Corrigé : barre finale des URL (anciennes adresses WordPress conservées sans redirection, un seul saut pour l’article de mesures) ; horaires publiés et page Facebook ajoutés en OBSERVÉ, masqués en production. Formatage Prettier global non conforme (262 fichiers) déjà présent, non traité.

## Mise en ligne Cloudflare (Claude, 8 octobre 2026)

- Base D1 `express-congo-demo` créée, schéma appliqué, jeu de démonstration chargé (8 expéditions, 7 colis, 3 départs, 28 événements, 5 propositions, 4 demandes web).
- Code compatible Cloudflare Workers (OpenNext) et toujours compatible Node : 24 tests métier, 13 scénarios navigateur réussis sur les deux moteurs.
- **Reste à faire par le propriétaire du compte** : relier le dépôt GitHub au projet Workers `express-congo` (voir README, « Mise en ligne sur Cloudflare »). Cet environnement n’a pas accès réseau à l’API Cloudflare et le connecteur ne déploie pas de code.
- Next.js figé en 16.3.8 (voir DECISIONS). Ne pas mettre à jour sans vérifier le build OpenNext.

## Refonte visuelle et logiciel de gestion (Claude, 8 octobre 2026)

- Site public : nouveau système visuel, accueil avec tracé France → Congo et accès directs (devis, volume, agence), numéros formatés, étapes de devis lisibles.
- Gestion `/demo` : tableau de bord (À faire, propositions par devise, expéditions par étape, activité 14 jours, prochains départs, dernières demandes web), modules Demandes web (traitement des états), Clients, Rapports (volume et poids par agence, chargement par départ, expéditions par étape), Journal d’activité (administrateur). Fiches latérales avec chronologie et actions préremplies ; filtres, tri, export CSV.
- Applications installables : site client et logiciel de gestion (manifestes + icônes).
- `npm run demo:dataset` remplit la démonstration via les vraies API.
- Reste partiel : la gestion utilise toujours les comptes et le stockage de démonstration ; production bloquée jusqu’à EC-025. Pas de paiement, pas de notifications réelles.

## Dernières vérifications

`npm run check` : types, lint et **23 tests métier/intégration locaux réussis**. `npm run test:e2e` : build optimisé de démonstration et **12 scénarios navigateur réussis**, dont réception → départ → remise, accès inter-clients/inter-agences, PDF, QR et manifeste. Voir TEST_REPORT.md pour les commandes, corrections et limites.

## Prochaines étapes ordonnées

1. EC-025 : repositories PostgreSQL/Supabase, Auth éprouvée avec MFA réelle, stockage privé, migrations et politiques RLS ; tester sur base locale Docker. Ne pas ouvrir RLS globalement.
2. Compléter lot 1 : workflow éditorial approuvé et versions archivées, validation du contenu EC-026, document tarifaire versionné après EC-012, inventaire des redirections EC-028.
3. Compléter lot 2 : inscription/vérification/récupération, rattachement invité par preuve, organisations et habilitations, propositions détaillées, contrôle de toutes les dimensions dans l’UI, gestion des départs groupés/transferts, suivi public limité et OTP, libération documentaire après analyse EC-027.
4. Rejouer les tests du lot 2 et ajouter les scénarios manquants. Ensuite seulement : lot 3, interfaces/adaptateurs démo, notifications anti-doublons/reprise, webhooks de paiement authentifiés et idempotents, imports et rendez-vous.
5. Préproduction hébergée uniquement après validation du stockage et autorisation applicable. Publication publique hors mission.

## Pièges et dette

- SQLite est un adaptateur de démonstration monoprocessus, impropre aux fonctions éphémères Netlify. La limitation globale des essais est locale et ne remplace pas une protection distribuée par appelant.
- Le second facteur de /demo est public et **simulé** ; il ne valide jamais le MFA de production. /admin est un autre outil local d’édition, pas un accès métier réel.
- Le portail principal reste fermé ; /demo donne accès seulement aux dossiers fictifs. Les identifiants de démo sont documentés et interdits en staging/production.
- Les PDF de propositions sont textuels simples, en ASCII, sans validation du modèle juridique/commercial. Ne pas les envoyer comme offres réelles.
- Les champs de mesures contrôlées sont complets côté API ; l’UI de réception ne propose pour l’instant que le poids contrôlé et reprend les dimensions déclarées.
- Les mots de passe d’exemple, données fictives et mots de passe Docker locaux ne sont pas des secrets de production.
- Audit npm : 0 vulnérabilité signalée dans les dépendances de production ; 5 alertes élevées dans la chaîne de lint liée à fast-glob/braces/micromatch, sans correctif compatible proposé. Ne pas rétrograder automatiquement eslint-config-next avec --force. À revoir avant la suite.
- Les captures sont des artefacts documentés, les bases et sauvegardes sont ignorées. Les fichiers .lockfile/.pnpm_modules sont des outils temporaires locaux ignorés, inutiles sur une machine possédant npm standard.
