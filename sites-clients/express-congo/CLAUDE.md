# Reprise Express Congo

Lis d’abord HANDOFF.md, puis le cahier des charges v2 et TEST_REPORT.md. Ne suppose pas que tous les modules des trois lots sont achevés.

## Carte

- src/app : pages SSR Next.js, API, erreurs, indexation.
- src/components : interface publique, devis progressif, calculateur, gestion locale.
- src/domain : volumes exacts, validation devis, tarification versionnée pure.
- src/server : SQLite transactionnel, idempotence, limitation, sessions locales, opérations et permissions.
- src/content/public.json : propositions éditoriales et données observées.
- assets : sources originales, PDF non validé, empreintes SHA-256.
- public : médias servis, police Inter et licence OFL.
- database : fondation PostgreSQL fermée, non raccordée.
- tests : règles métier et Playwright. docs : exploitation, redirections, captures.

## Commandes

Node 24 LTS. npm install ; npm run dev ; npm run check ; npm run build ; npm run test:e2e. Chrome installé pour les tests navigateur. Aucun compte externe nécessaire aux tests métier. Docker seulement pour PostgreSQL préparatoire.

## Pièges

- APP_ENV vaut demo par défaut, même pour un build Next optimisé. NODE_ENV=production ne signifie pas une publication autorisée.
- Le stockage SQLite est local et interdit en production. Ne pas le déployer dans des fonctions Netlify.
- /demo contient le portail et le noyau opérationnel fictifs, avec rôles et permissions. Les comptes et le second facteur sont publics, disponibles uniquement en démo.
- /admin est un outil de démonstration limité ; ce n’est pas l’administration opérationnelle à rôles du cahier des charges.
- Les tarifs du PDF sont contradictoires et inactifs. Aucun poids volumétrique par défaut.
- Les coordonnées OBSERVÉ restent à confirmer. Ne jamais les promouvoir automatiquement.
- Les pièces sont en quarantaine et aucun téléchargement n’est ouvert.
- La racine Git est deux niveaux au-dessus. Les commandes npm se lancent ici.
- Les trois lots doivent être testés dans l’ordre. Les fichiers de passation doivent décrire la réalité.

AGENTS.md porte les mêmes conventions pour Codex. Pas de données personnelles réelles, secrets ou TODO orphelins.
