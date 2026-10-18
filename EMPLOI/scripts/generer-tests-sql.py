"""Transforme supabase/tests.json en supabase/002_emploi_tests.sql.

Usage : python scripts/generer-tests-sql.py
Relancer le SQL remplace les questions des tests listés (les résultats déjà obtenus sont conservés).
"""
import json
import random
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent
tests = json.loads((RACINE / "supabase" / "tests.json").read_text(encoding="utf-8"))


def lit(texte: str) -> str:
    return "'" + texte.replace("'", "''") + "'"


melanges = []
lignes = [
    "-- Généré par scripts/generer-tests-sql.py à partir de supabase/tests.json : ne pas modifier à la main.",
    "-- Tests originaux Agence Elite (aucune question n'est reprise d'un autre éditeur).",
    "",
]
for ordre, t in enumerate(tests, start=1):
    for q in t["questions"]:
        assert 0 <= q["b"] < len(q["c"]), (t["slug"], q["q"])
    lignes.append(
        "insert into public.emploi_tests (slug, titre, categorie, description, duree_minutes, ordre) values "
        f"({lit(t['slug'])}, {lit(t['titre'])}, {lit(t['categorie'])}, {lit(t['description'])}, {int(t['duree_minutes'])}, {ordre}) "
        "on conflict (slug) do update set titre = excluded.titre, categorie = excluded.categorie, "
        "description = excluded.description, duree_minutes = excluded.duree_minutes, ordre = excluded.ordre;"
    )
    melanges.append({k: t[k] for k in ("slug", "titre", "categorie", "description", "duree_minutes")} | {"ordre": ordre, "questions": []})
    lignes.append(
        f"delete from public.emploi_questions where test_id = (select id from public.emploi_tests where slug = {lit(t['slug'])});"
    )
    for i, q in enumerate(t["questions"], start=1):
        # Mélange stable des choix : la bonne réponse n'est pas toujours à la même place.
        ordre_choix = list(range(len(q["c"])))
        random.Random(f"{t['slug']}-{i}").shuffle(ordre_choix)
        melange = [q["c"][k] for k in ordre_choix]
        bonne = ordre_choix.index(q["b"])
        choix = "array[" + ", ".join(lit(c) for c in melange) + "]"
        melanges[-1]["questions"].append({"q": q["q"], "c": melange, "b": bonne})
        lignes.append(
            "with q as (insert into public.emploi_questions (test_id, ordre, enonce, choix) "
            f"select id, {i}, {lit(q['q'])}, {choix} from public.emploi_tests where slug = {lit(t['slug'])} returning id) "
            f"insert into private.emploi_bonnes_reponses (question_id, bonne) select id, {bonne} from q;"
        )
    lignes.append("")

# Même contenu en JSON (choix déjà mélangés), pour un import depuis la base sans copier le SQL.
(RACINE / "supabase" / "tests-melanges.json").write_text(json.dumps(melanges, ensure_ascii=False, indent=1), encoding="utf-8")

sortie = RACINE / "supabase" / "002_emploi_tests.sql"
sortie.write_text("\n".join(lignes), encoding="utf-8")
print(f"{len(tests)} tests, {sum(len(t['questions']) for t in tests)} questions -> {sortie.name}")
