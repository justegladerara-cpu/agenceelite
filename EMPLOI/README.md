# Elite Emploi : plateforme de recrutement d'Agence Elite

Site d'emploi pour le Congo et la France, avec tests de compétences et vente de CV qualifiés.

**Adresse prévue :** https://recrutement.agence-elite.fr

## Ce qu'elle contient

- **Public** : offres d'emploi avec recherche (mot-clé, pays, ville, contrat, métier), fiche de chaque offre, page « Recruter » pour les entreprises, catalogue de tests.
- **Candidats** : compte, profil, CV (PDF ou Word, 5 Mo, rangé dans un espace privé), candidature en un clic, suivi des candidatures, tests chronométrés avec note immédiate.
- **Entreprises** : compte vérifié par Agence Elite, dépôt d'offres (publiées après validation), choix des tests demandés, réception des **CV qualifiés** avec coordonnées, résultats de tests et avis d'Agence Elite, décision sur chaque profil.
- **Administration** : tableau de bord, tri des candidatures (à appeler, entretien, qualifiée…), notes internes, envoi d'un profil à une entreprise (2 500 FCFA par CV par défaut, modifiable), suivi des paiements, validation des entreprises et des offres, gestion des tests et des questions.

### Les tests

13 tests originaux, 130 questions, écrits pour Agence Elite (aucune question n'est copiée d'un autre éditeur) :
Excel, Word et courrier, informatique et internet, français, anglais, calcul, logique, accueil et secrétariat,
vente et relation client, comptabilité (SYSCOHADA), logistique et magasin, sécurité HSE, savoir-être.

- La note est calculée **par le serveur** : les bonnes réponses ne sont jamais envoyées au navigateur.
- Le chrono est enregistré au démarrage : recharger la page ne le remet pas à zéro.
- Un test se repasse au bout de 30 jours. L'ordre des réponses change à chaque candidat.
- Pour ajouter un test : l'écrire dans `supabase/tests.json`, lancer `npm run tests-sql`, puis exécuter `supabase/002_emploi_tests.sql`.
  Pour ajouter une question à un test existant, l'administrateur peut aussi le faire depuis l'onglet **Tests**.

## Données

Tables `emploi_…` dans une base Supabase, protégées par des règles d'accès :

- une entreprise ne voit jamais les candidatures brutes, seulement les profils qu'Agence Elite lui envoie ;
- un candidat ne voit que ses propres données ; personne ne peut se donner le rôle d'administrateur ;
- seules les personnes inscrites depuis la plateforme reçoivent un profil emploi : les autres applications de la même base ne sont pas touchées.

Schéma : `supabase/001_emploi_schema.sql`, puis `supabase/002_emploi_tests.sql` (tests).
Vérification complète (36 contrôles de sécurité et de parcours, dans une base en mémoire) : `npm run verifier-sql`.

**Premier administrateur** : créer un compte candidat sur le site, puis exécuter dans Supabase :

```sql
update public.emploi_profils set role = 'admin'
where id = (select id from auth.users where email = 'VOTRE-EMAIL');
```

## Mise en ligne (Cloudflare Pages)

1. Cloudflare › Workers et Pages › Créer › Pages › **Connecter à Git** › dépôt `agenceelite`.
2. Réglages : branche `main`, dossier racine **`EMPLOI`**, commande `npm run build`, dossier de sortie `dist`.
3. Variables d'environnement : `VITE_SUPABASE_URL` et `VITE_SUPABASE_KEY` (clé publique *publishable*).
4. Domaines personnalisés › ajouter `recrutement.agence-elite.fr`. Cloudflare crée la ligne DNS, qui passe avant la ligne générique `*.agence-elite.fr`.
5. Supabase › Authentication › URL Configuration : ajouter `https://recrutement.agence-elite.fr/**` aux adresses de redirection (liens de confirmation et de mot de passe oublié).

## Pour les développeurs

```bash
cp .env.example .env.local   # puis renseigner l'adresse et la clé publique Supabase
npm install
npm run dev                  # http://localhost:5173
npm run build
npm run verifier-sql         # contrôle des migrations et de la sécurité
```

Technologies : React, TypeScript, Vite, Tailwind, Framer Motion, Supabase. Charte Agence Elite : noir, rouge et blanc, logo en filigrane (fichiers dans `public/`).
