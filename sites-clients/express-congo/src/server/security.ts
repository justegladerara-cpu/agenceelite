import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./database";
import { isDemo, siteUrl } from "@/config";
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin === new URL(siteUrl()).origin;
}
export function safeEqual(a: string, b: string) {
  const ah = createHash("sha256").update(a).digest(),
    bh = createHash("sha256").update(b).digest();
  return timingSafeEqual(ah, bh);
}
const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function editorSession() {
  if (!isDemo()) return false;
  const token = (await cookies()).get("ec-demo-editor")?.value;
  if (!token) return false;
  const session = db()
    .prepare("SELECT expires_at FROM sessions WHERE token_hash=?")
    .get(hash(token)) as { expires_at: number } | undefined;
  return !!session && session.expires_at > Date.now();
}
export async function createEditorSession() {
  const token = randomBytes(32).toString("hex");
  db()
    .prepare("INSERT INTO sessions VALUES(?,?)")
    .run(hash(token), Date.now() + 3600000);
  (await cookies()).set("ec-demo-editor", token, {
    httpOnly: true,
    secure: siteUrl().startsWith("https:"),
    sameSite: "strict",
    maxAge: 3600,
    path: "/",
  });
}
export async function logout() {
  const jar = await cookies();
  const token = jar.get("ec-demo-editor")?.value;
  if (token)
    db().prepare("DELETE FROM sessions WHERE token_hash=?").run(hash(token));
  jar.delete("ec-demo-editor");
}
