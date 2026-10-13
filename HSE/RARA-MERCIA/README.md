# Plateforme HSE — RARA Mercia (site de Kundji, MKB II)

Application web de pilotage HSE, en français simple, utilisable sur ordinateur et sur téléphone
(elle peut s'installer comme une application).

**Adresse :** https://justegladerara-cpu.github.io/agenceelite/hse-rara-mercia/

## Ce qu'elle contient

- **Tableau de bord** : chiffres clés animés, pyramide de sécurité, TRIR, prévention, permis, objectifs,
  comparaison avec l'année précédente et analyse automatique en phrases simples.
- **Saisie du jour** : boutons + et − pour remplir la journée en deux minutes.
- **Registres** : incidents (avec photos et fiche « Incident Flash » en PDF), actions correctives
  (retards en rouge), permis de travail, inspections, formations, personnel, dotation EPI, documents.
- **Rapport mensuel** en PDF et en Excel, prêt à envoyer au client.
- **Export Excel** sur chaque page : tableau mis en forme (en-tête, filtres, couleurs, totaux).
- **Aide et lexique** : les mots HSE expliqués simplement.

## Première connexion

1. Ouvrir l'adresse ci-dessus et cliquer sur « Créer un compte ».
2. Entrer votre nom et le **code d'accès** HSE (communiqué à part, il n'est pas dans ce dépôt).
3. Pour donner accès à quelqu'un d'autre : il crée un compte, puis entre le code que vous lui donnez.

## Données

Les données sont dans la base Supabase du projet *agence-elite-platform* (tables `hse_…`),
protégées : seules les personnes qui ont entré le code d'accès peuvent les voir.
L'historique du fichier Excel KPI (2025 et 2026) y a été importé.
Le schéma de référence est dans `supabase/001_hse_schema.sql`.

## Pour les développeurs

```bash
cp .env.example .env.local   # puis renseigner l'adresse et la clé publique Supabase
npm install
npm run dev                  # http://localhost:5173/agenceelite/hse-rara-mercia/
npm run build
```

La mise en ligne est automatique à chaque modification de ce dossier sur `main`
(workflow `.github/workflows/hse-rara-mercia.yml`). Il faut activer une seule fois
**Settings → Pages → Source : GitHub Actions** dans le dépôt.

Technologies : React, TypeScript, Vite, Tailwind, Recharts, Framer Motion, ExcelJS, jsPDF, Supabase.
