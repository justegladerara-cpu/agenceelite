import { NextResponse } from "next/server";
import { isDemo } from "@/config";
import { sameOrigin } from "@/server/security";
import { rateLimit } from "@/server/database";
import {
  demoAccounts,
  demoMfa,
  signIn,
  signOut,
  currentActor,
} from "@/server/demo-auth";
export async function GET() {
  if (!isDemo()) return new Response(null, { status: 404 });
  return NextResponse.json(
    {
      actor: await currentActor(),
      accounts: demoAccounts,
      secondStep: demoMfa(),
      password: "DemoExpress!2026",
      mode: "demo",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
export async function POST(request: Request) {
  if (!isDemo() || !sameOrigin(request))
    return new Response(null, { status: 403 });
  if (!(await rateLimit("demo-signin", 100, 600)))
    return new Response(null, { status: 429 });
  const input = await request.json().catch(() => ({}));
  if (
    typeof input.email !== "string" ||
    typeof input.password !== "string" ||
    input.password.length > 200
  )
    return new Response(null, { status: 400 });
  try {
    return NextResponse.json({
      actor: await signIn(
        input.email,
        input.password,
        String(input.code || ""),
      ),
    });
  } catch {
    return NextResponse.json({ message: "Accès refusé." }, { status: 401 });
  }
}
export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  await signOut();
  return new Response(null, { status: 204 });
}
