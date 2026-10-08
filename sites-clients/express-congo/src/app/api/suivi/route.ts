import { NextResponse } from "next/server";
import { feature, production } from "@/config";
import { rateLimit } from "@/server/database";
export async function POST() {
  if (!feature("TRACKING") || production())
    return NextResponse.json(
      { message: "Le suivi en ligne n’est pas activé." },
      { status: 503 },
    );
  if (!rateLimit("tracking-global", 10, 600))
    return NextResponse.json(
      { message: "Réessayez plus tard." },
      { status: 429 },
    );
  return NextResponse.json(
    {
      message:
        "Aucune information accessible pour cette demande. Vérifiez votre référence auprès de l’agence.",
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
