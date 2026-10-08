import { notFound } from "next/navigation";
import { isDemo } from "@/config";
import { currentActor, demoAccounts, demoMfa } from "@/server/demo-auth";
import { listEntities } from "@/server/operations-repository";
import { Operations } from "@/components/operations";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Portail et opérations — Démonstration",
  robots: { index: false, follow: false },
};
export default async function Demo() {
  if (!isDemo()) notFound();
  const actor = await currentActor();
  return (
    <div className="container section">
      <span className="eyebrow">Démonstration — dossiers fictifs</span>
      <h1>Portail et gestion des expéditions</h1>
      <Operations
        actor={actor}
        entities={actor ? listEntities(actor) : []}
        accounts={demoAccounts}
        code={demoMfa()}
      />
    </div>
  );
}
