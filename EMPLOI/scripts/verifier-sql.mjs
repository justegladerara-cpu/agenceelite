// Vérifie les migrations dans une base Postgres en mémoire (PGlite), avec un faux schéma auth/storage Supabase,
// puis rejoue les parcours candidat / entreprise / admin et contrôle la sécurité.
// Usage : npm i --no-save @electric-sql/pglite && node scripts/verifier-sql.mjs
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ici = dirname(fileURLToPath(import.meta.url))
const lire = (f) => readFileSync(join(ici, '..', 'supabase', f), 'utf8')
const db = new PGlite()

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  grant usage on schema auth, storage, public to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  grant execute on function storage.foldername(text) to anon, authenticated;
  grant select, insert, update, delete on storage.objects to authenticated;
  alter default privileges in schema public grant select, insert, update, delete on tables to anon, authenticated;
`)
await db.exec(lire('001_emploi_schema.sql'))
await db.exec(lire('002_emploi_tests.sql'))
await db.exec(lire('001_emploi_schema.sql')) .catch((e) => { if (!/already exists/.test(e.message)) throw e })
await db.exec(lire('002_emploi_tests.sql'))

let ok = 0
const verif = (cond, msg) => { if (!cond) { console.error('ÉCHEC :', msg); process.exit(1) } ok++; console.log('ok -', msg) }
const commeAdminSql = async (sql, p) => { await db.exec("reset role; select set_config('test.uid', '', false)"); return db.query(sql, p) }
const comme = async (uid, sql, p) => {
  await db.exec(`reset role; select set_config('test.uid', '${uid ?? ''}', false); set role ${uid ? 'authenticated' : 'anon'}`)
  try { return await db.query(sql, p) } finally { await db.exec('reset role') }
}
const echoue = async (uid, sql, p) => { try { await comme(uid, sql, p); return false } catch { return true } }

const ADMIN = '00000000-0000-0000-0000-00000000000a'
const CAND = '00000000-0000-0000-0000-00000000000c'
const CAND2 = '00000000-0000-0000-0000-0000000000c2'
const ENT = '00000000-0000-0000-0000-00000000000e'
const AUTRE = '00000000-0000-0000-0000-0000000000ff'

const nb = (await commeAdminSql('select count(*)::int n from public.emploi_questions')).rows[0].n
verif(nb === 130, `130 questions chargées, rejouables sans doublon (${nb})`)

// Inscriptions
await commeAdminSql(`insert into auth.users (id, email, raw_user_meta_data) values
  ('${ADMIN}', 'admin@x.fr', '{"app":"emploi","role":"candidat","nom":"Admin"}'),
  ('${CAND}', 'c@x.fr', '{"app":"emploi","role":"candidat","nom":"Awa","pays":"CG"}'),
  ('${CAND2}', 'c2@x.fr', '{"app":"emploi","role":"admin","nom":"Pirate"}'),
  ('${ENT}', 'e@x.fr', '{"app":"emploi","role":"entreprise","nom":"Chef"}'),
  ('${AUTRE}', 'crm@x.fr', '{"nom":"Utilisateur CRM"}')`)
const profils = (await commeAdminSql('select id, role from public.emploi_profils order by id')).rows
verif(profils.length === 4, 'profil créé seulement pour les comptes de la plateforme emploi')
verif(profils.find((p) => p.id === CAND2).role === 'candidat', "impossible de s'inscrire directement comme admin")
await commeAdminSql(`update public.emploi_profils set role = 'admin' where id = '${ADMIN}'`)
verif(await echoue(CAND, `update public.emploi_profils set role = 'admin' where id = '${CAND}'`), 'un candidat ne peut pas se donner le rôle admin')

// Entreprise
verif(await echoue(CAND, `insert into public.emploi_entreprises (proprietaire_id, nom) values ('${CAND}', 'X')`), 'un candidat ne peut pas créer une entreprise')
const ent = (await comme(ENT, `insert into public.emploi_entreprises (proprietaire_id, nom, statut) values ('${ENT}', 'Total Démo', 'validee') returning id, statut`)).rows[0]
verif(ent.statut === 'en_attente', "l'entreprise créée attend la validation, même si elle essaie de se valider")
verif(await echoue(ENT, `insert into public.emploi_offres (entreprise_id, titre, metier, description, pays, ville, contrat) values ('${ent.id}', 'Comptable', 'Comptabilité', 'Desc', 'CG', 'Pointe-Noire', 'cdi')`), 'une entreprise non validée ne peut pas publier')
await comme(ADMIN, `update public.emploi_entreprises set statut = 'validee' where id = '${ent.id}'`)
verif(await echoue(ENT, `insert into public.emploi_offres (entreprise_id, titre, metier, description, pays, ville, contrat, statut) values ('${ent.id}', 'Comptable', 'Comptabilité', 'Desc', 'CG', 'Pointe-Noire', 'cdi', 'publiee')`), "une entreprise ne peut pas publier elle-même")
const offre = (await comme(ENT, `insert into public.emploi_offres (entreprise_id, titre, metier, description, pays, ville, contrat) values ('${ent.id}', 'Comptable', 'Comptabilité', 'Desc', 'CG', 'Pointe-Noire', 'cdi') returning id, statut`)).rows[0]
verif(offre.statut === 'en_attente', "l'offre attend la validation de l'admin")
verif((await comme(null, 'select * from public.emploi_offres_publiees()')).rows.length === 0, "l'offre en attente n'est pas visible du public")
await comme(ADMIN, `update public.emploi_offres set statut = 'publiee' where id = '${offre.id}'`)
const test = (await commeAdminSql(`select id from public.emploi_tests where slug = 'comptabilite-base'`)).rows[0].id
await comme(ENT, `insert into public.emploi_offre_tests (offre_id, test_id) values ('${offre.id}', '${test}')`)
const pub = (await comme(null, 'select * from public.emploi_offres_publiees()')).rows
verif(pub.length === 1 && pub[0].entreprise_nom === 'Total Démo' && pub[0].tests.length === 1, "l'offre publiée est visible du public, avec son test")
await comme(ENT, `update public.emploi_offres set description = 'Nouvelle description' where id = '${offre.id}'`)
verif((await commeAdminSql(`select statut from public.emploi_offres where id = '${offre.id}'`)).rows[0].statut === 'en_attente', 'une offre publiée modifiée par l’entreprise repasse en validation')
await comme(ADMIN, `update public.emploi_offres set statut = 'publiee', confidentielle = true where id = '${offre.id}'`)
verif((await comme(null, 'select * from public.emploi_offres_publiees()')).rows[0].entreprise_nom === null, "le nom de l'entreprise est masqué pour une offre confidentielle")

// Tests
verif(await echoue(CAND, 'select * from private.emploi_bonnes_reponses'), 'un candidat ne peut pas lire les bonnes réponses')
verif(await echoue(null, 'select * from public.emploi_questions') || (await comme(null, 'select * from public.emploi_questions')).rows.length === 0, 'les questions ne sont pas visibles sans compte')
const r = (await comme(CAND, `select * from public.emploi_commencer_test('${test}')`)).rows[0]
const r2 = (await comme(CAND, `select * from public.emploi_commencer_test('${test}')`)).rows[0]
verif(r.resultat_id === r2.resultat_id, 'recommencer un test en cours reprend la même tentative (le chrono ne repart pas)')
const bonnes = (await commeAdminSql(`select q.id, b.bonne from public.emploi_questions q join private.emploi_bonnes_reponses b on b.question_id = q.id where q.test_id = '${test}' order by q.ordre`)).rows
const rep = Object.fromEntries(bonnes.map((b, i) => [b.id, i < 7 ? b.bonne : (b.bonne + 1) % 4]))
verif(await echoue(CAND2, `select * from public.emploi_soumettre_test('${r.resultat_id}', $1)`, [JSON.stringify(rep)]), "un autre candidat ne peut pas envoyer les réponses à ma place")
const note = (await comme(CAND, `select * from public.emploi_soumettre_test('${r.resultat_id}', $1)`, [JSON.stringify(rep)])).rows[0]
verif(note.score === 7 && note.total === 10 && note.pourcentage === 70 && note.reussi === true, `note calculée par le serveur : ${note.score}/${note.total}`)
verif(await echoue(CAND, `select * from public.emploi_soumettre_test('${r.resultat_id}', $1)`, [JSON.stringify(rep)]), 'impossible de renvoyer des réponses une 2e fois')
verif(await echoue(CAND, `select * from public.emploi_commencer_test('${test}')`), 'un test se repasse seulement après 30 jours')
verif(await echoue(CAND, `insert into public.emploi_resultats (test_id, candidat_id, score, total, pourcentage, reussi) values ('${test}', '${CAND}', 10, 10, 100, true)`), 'un candidat ne peut pas écrire une note lui-même')

// Candidature et envoi du CV qualifié
verif(await echoue(CAND, `insert into public.emploi_candidatures (offre_id, candidat_id, statut) values ('${offre.id}', '${CAND}', 'retenue')`), 'un candidat ne peut pas choisir le statut de sa candidature')
const cand = (await comme(CAND, `insert into public.emploi_candidatures (offre_id, candidat_id, message) values ('${offre.id}', '${CAND}', 'Bonjour') returning id`)).rows[0]
verif((await comme(ENT, 'select * from public.emploi_candidatures')).rows.length === 0, "l'entreprise ne voit pas les candidatures brutes")
verif((await comme(ENT, 'select * from public.emploi_candidats')).rows.length === 0, "l'entreprise ne voit pas les candidats non transmis")
verif(await echoue(CAND, 'select * from public.emploi_admin_candidatures()'), 'la liste admin est refusée aux candidats')
const liste = (await comme(ADMIN, 'select * from public.emploi_admin_candidatures()')).rows
verif(liste.length === 1 && liste[0].tests.length === 1 && liste[0].email === 'c@x.fr', "l'admin voit la candidature avec le résultat du test")
await comme(ADMIN, `update public.emploi_candidatures set statut = 'qualifiee' where id = '${cand.id}'`)
await comme(ADMIN, `insert into public.emploi_envois (candidature_id, entreprise_id) values ('${cand.id}', '${ent.id}')`)
const recus = (await comme(ENT, 'select * from public.emploi_profils_recus()')).rows
verif(recus.length === 1 && recus[0].nom === 'Awa' && Number(recus[0].prix) === 2500, "l'entreprise reçoit le profil qualifié (2 500 par CV)")
verif((await comme(ENT, 'select * from public.emploi_candidats')).rows.length === 1, "l'entreprise peut lire le candidat transmis")
await comme(ENT, `select public.emploi_decision('${recus[0].envoi_id}', 'entretien')`)
verif((await commeAdminSql('select decision_entreprise from public.emploi_envois')).rows[0].decision_entreprise === 'entretien', "l'entreprise donne sa décision")
verif(await echoue(ENT, `update public.emploi_envois set prix = 0`) || (await commeAdminSql('select prix from public.emploi_envois')).rows[0].prix > 0, "l'entreprise ne peut pas changer le prix")

// Stockage des CV
await commeAdminSql(`insert into storage.objects (bucket_id, name) values ('emploi-cv', '${CAND}/cv.pdf'), ('emploi-cv', '${CAND2}/cv.pdf'), ('site-photos', 'accueil/hero.jpg')`)
verif((await comme(CAND, `select name from storage.objects where bucket_id = 'emploi-cv'`)).rows.length === 1, 'un candidat ne voit que son propre CV')
verif((await comme(ENT, `select name from storage.objects where bucket_id = 'emploi-cv'`)).rows.map((x) => x.name).join() === `${CAND}/cv.pdf`, "l'entreprise voit seulement le CV transmis")
verif((await comme(ADMIN, `select name from storage.objects where bucket_id = 'emploi-cv'`)).rows.length === 2, "l'admin voit tous les CV")
verif(await echoue(CAND, `insert into storage.objects (bucket_id, name) values ('emploi-cv', '${CAND2}/faux.pdf')`), "impossible de déposer un CV dans le dossier d'un autre")
await comme(CAND, `select name from storage.objects`) // les autres dossiers (non uuid) ne provoquent pas d'erreur

// Gestion des tests par l'admin
const qid = (await comme(ADMIN, `select public.emploi_admin_question('${test}', 'Nouvelle ?', array['a','b','c'], 2) as id`)).rows[0].id
verif((await comme(ADMIN, `select * from public.emploi_admin_reponses('${test}')`)).rows.find((x) => x.question_id === qid).bonne === 2, "l'admin ajoute une question avec sa bonne réponse")
verif(await echoue(CAND, `select public.emploi_admin_question('${test}', 'X', array['a','b'], 0)`), 'un candidat ne peut pas ajouter de question')

console.log(`\n${ok} vérifications réussies.`)
