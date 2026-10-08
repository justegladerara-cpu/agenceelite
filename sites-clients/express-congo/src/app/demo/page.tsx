import { notFound } from "next/navigation";
import { isDemo } from "@/config";
import { currentActor, demoAccounts, demoMfa } from "@/server/demo-auth";
import { listEntities } from "@/server/operations-repository";
import { Operations } from "@/components/operations";
import { visibleQuotes, recentAudit } from "@/server/backoffice";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Gestion des expéditions — Démonstration",
  robots: { index: false, follow: false },
  manifest: "/gestion.webmanifest",
  appleWebApp: { title: "EC Gestion", capable: true },
};
export default async function Demo() {
  if (!isDemo()) notFound();
  const actor = await currentActor();
  return (
    <Operations
      actor={actor}
      entities={actor ? listEntities(actor) : []}
      accounts={demoAccounts}
      code={demoMfa()}
      quotes={actor ? visibleQuotes(actor) : []}
      audit={actor ? recentAudit(actor) : []}
    />
  );
}
