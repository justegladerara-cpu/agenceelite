import { NextResponse } from "next/server";
import { editorSession, sameOrigin } from "@/server/security";
import { db } from "@/server/database";
import { localQuotes } from "@/server/quote-repository";
import { publicPaths } from "@/content";
export async function GET() {
  if (!(await editorSession()))
    return NextResponse.json({ message: "Accès refusé." }, { status: 401 });
  return NextResponse.json(
    {
      quotes: localQuotes.list(),
      contents: db().prepare("SELECT * FROM editorial").all(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  if (!sameOrigin(request) || !(await editorSession()))
    return NextResponse.json({ message: "Accès refusé." }, { status: 403 });
  const input = await request.json().catch(() => ({}));
  if (
    !publicPaths.includes(input.slug) ||
    typeof input.title !== "string" ||
    input.title.length > 160 ||
    typeof input.body !== "string" ||
    input.body.length > 10000
  )
    return NextResponse.json({ message: "Contenu invalide." }, { status: 422 });
  const database = db(),
    date = new Date().toISOString();
  database.exec("BEGIN IMMEDIATE");
  try {
    database
      .prepare(
        "INSERT INTO editorial(slug,title,body,updated_at) VALUES(?,?,?,?) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,body=excluded.body,truth_status='PROPOSÉ',version=version+1,updated_at=excluded.updated_at",
      )
      .run(input.slug, input.title, input.body, date);
    database
      .prepare(
        "INSERT INTO audit(actor,action,object_id,detail,created_at) VALUES(?,?,?,?,?)",
      )
      .run("demo-editor", "content.saved", input.slug, "{}", date);
    database.exec("COMMIT");
  } catch {
    database.exec("ROLLBACK");
    return NextResponse.json(
      { message: "Enregistrement impossible." },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
