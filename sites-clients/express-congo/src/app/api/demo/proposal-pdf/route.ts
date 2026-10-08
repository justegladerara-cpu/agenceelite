import { currentActor } from "@/server/demo-auth";
import { getEntity } from "@/server/operations-repository";
import { textPdf } from "@/server/pdf";
export async function GET(request: Request) {
  const actor = await currentActor();
  if (!actor) return new Response(null, { status: 401 });
  try {
    const item = await getEntity(
      actor,
      new URL(request.url).searchParams.get("id") || "",
    );
    if (item.kind !== "proposal") return new Response(null, { status: 404 });
    const bytes = textPdf([
      "EXPRESS CONGO - DEMONSTRATION - NON VALABLE POUR UN ENVOI REEL",
      "Proposition " + item.payload.number,
      "Version " + item.payload.version,
      "Total unites mineures: " +
        item.payload.totalMinor +
        " " +
        item.payload.currency,
      "Exclusions et detail: " + item.payload.exclusions,
      "Validite: " + item.payload.validUntil,
      "Etat: " + item.payload.status,
      "Une acceptation ne confirme aucun paiement.",
    ]);
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="proposition-demo.pdf"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 403 });
  }
}
