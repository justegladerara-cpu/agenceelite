import { beforeEach, test, expect } from "vitest";
import { Actor } from "@/domain/operations";
import { getEntity, operation } from "@/server/operations-repository";
import { db } from "@/server/database";
import {
  seedAccounts,
  register,
  verifyEmail,
  requestReset,
  resetPassword,
  people,
} from "@/server/demo-auth";
import { publicTracking, trackingCode } from "@/server/tracking";
import { proposalLines, toMinor } from "@/domain/proposals";

const admin: Actor = {
    id: "admin-demo",
    role: "admin",
    agency: "paris",
    organization: null,
  },
  agentParis: Actor = {
    id: "agent-paris",
    role: "agent",
    agency: "paris",
    organization: null,
  },
  client: Actor = {
    id: "client-demo-a",
    role: "client",
    agency: "paris",
    organization: null,
  };
const measures = {
  length: "60",
  width: "40",
  height: "40",
  weight: "12",
  quantity: "1",
  unit: "cm",
};
const token = (link: string) => link.split("=").pop()!;

beforeEach(async () => {
  await seedAccounts();
  const sql = await db();
  await sql.run("DELETE FROM assignments");
  await sql.run("DELETE FROM entities");
  await sql.run("DELETE FROM auth_tokens");
  await sql.run("DELETE FROM rate_limits");
  await sql.run("DELETE FROM demo_users WHERE id LIKE 'client-%-%-%'");
});

async function shipment(service = "maritime") {
  return (await operation(admin, "newShipment", {
    owner: client.id,
    agency: "paris",
    service,
    destination: "Brazzaville",
  })) as { id: string; payload: Record<string, unknown> };
}

test("montants exacts et lignes de proposition", () => {
  expect(toMinor("125,5", "EUR")).toBe(12550n);
  expect(toMinor("0.07", "EUR")).toBe(7n);
  expect(toMinor("15000", "XAF")).toBe(15000n);
  expect(toMinor("150,5", "XAF")).toBeNull();
  expect(toMinor("1,234", "EUR")).toBeNull();
  const ok = proposalLines(
    [
      { label: "Transport", quantity: 3, unit: "13" },
      { label: "Frais de dossier", quantity: "1", unit: "90,00" },
    ],
    "EUR",
  );
  expect(ok?.totalMinor).toBe("12900");
  expect(ok?.lines[0].totalMinor).toBe("3900");
  expect(proposalLines([], "EUR")).toBeNull();
  expect(
    proposalLines([{ label: "", quantity: 1, unit: "10" }], "EUR"),
  ).toBeNull();
  expect(
    proposalLines([{ label: "X", quantity: 1.5, unit: "10" }], "EUR"),
  ).toBeNull();
  expect(proposalLines("pas du json", "EUR")).toBeNull();
});

test("proposition détaillée : total calculé côté serveur", async () => {
  const s = await shipment();
  const p = (await operation(admin, "proposal", {
    shipmentId: s.id,
    currency: "EUR",
    // Le total saisi est ignoré : seules les lignes comptent.
    totalMinor: "1",
    lines: JSON.stringify([
      { label: "Fret maritime", quantity: 2, unit: "13" },
      { label: "Emballage", quantity: 1, unit: "4,50" },
    ]),
    exclusions: "Proposition fictive",
    validUntil: "2099-01-01",
  })) as { payload: Record<string, unknown> };
  expect(p.payload.totalMinor).toBe("3050");
  expect((p.payload.lines as unknown[]).length).toBe(2);
  await expect(
    operation(admin, "proposal", {
      shipmentId: s.id,
      currency: "EUR",
      lines: "[]",
      exclusions: "x",
      validUntil: "2099-01-01",
    }),
  ).rejects.toThrow("INVALID_LINES");
});

test("inscription, confirmation, connexion et réinitialisation", async () => {
  const mail = await register(
    "Nouveau.Client@example.invalid",
    "MotDePasse2026",
    "brazzaville",
    "http://localhost",
  );
  expect(mail.link).toContain("/demo/?verifier=");
  // Non confirmé : invisible pour l’équipe et impossible à rattacher.
  expect(
    (await people(admin)).some(
      (p) => p.email === "nouveau.client@example.invalid",
    ),
  ).toBe(false);
  await verifyEmail(token(mail.link));
  await expect(verifyEmail(token(mail.link))).rejects.toThrow("INVALID_TOKEN");
  const person = (await people(admin)).find(
    (p) => p.email === "nouveau.client@example.invalid",
  )!;
  expect(person.role).toBe("client");
  expect(person.agency).toBe("brazzaville");
  // Une seconde inscription ne crée pas de doublon ni de jeton.
  const again = await register(
    "nouveau.client@example.invalid",
    "AutreMotDePasse1",
    "paris",
    "http://localhost",
  );
  expect(again.subject).toContain("existe déjà");
  // Réinitialisation : jeton unique, ancien jeton révoqué.
  const first = await requestReset(
    "nouveau.client@example.invalid",
    "http://localhost",
  );
  const second = await requestReset(
    "nouveau.client@example.invalid",
    "http://localhost",
  );
  await expect(
    resetPassword(token(first!.link), "NouveauPasse2026"),
  ).rejects.toThrow("INVALID_TOKEN");
  await expect(resetPassword(token(second!.link), "court")).rejects.toThrow(
    "PASSWORD_TOO_SHORT",
  );
  await resetPassword(token(second!.link), "NouveauPasse2026");
  // Les comptes publics de démonstration ne sont pas réinitialisables.
  expect(
    await requestReset("client-a@example.invalid", "http://localhost"),
  ).toBeNull();
  expect(
    await requestReset("inconnu@example.invalid", "http://localhost"),
  ).toBeNull();
  await expect(
    register("pas-un-email", "MotDePasse2026", "paris", "http://localhost"),
  ).rejects.toThrow("INVALID_EMAIL");
  await expect(
    register("a@example.invalid", "seulementdeslettres", "paris", "x"),
  ).rejects.toThrow("PASSWORD_TOO_WEAK");
  // Un client ne voit que lui-même.
  expect((await people(client)).map((p) => p.id)).toEqual([client.id]);
});

test("suivi public : référence et code exigés, aucune donnée personnelle", async () => {
  const s = await shipment();
  await operation(admin, "receiveParcel", {
    shipmentId: s.id,
    description: "Colis fictif",
    declared: measures,
    controlled: measures,
  });
  await operation(admin, "event", {
    shipmentId: s.id,
    status: "recu-en-agence",
    location: "Agence de Paris",
    reason: "Commentaire interne confidentiel",
  });
  const ref = String(s.payload.reference),
    code = trackingCode(s.id);
  expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  expect(await publicTracking(ref, "AAAA-AAAA")).toBeNull();
  expect(await publicTracking("DEMO-EC-INCONNUE", code)).toBeNull();
  const found = await publicTracking(ref.toLowerCase(), code.replace("-", ""));
  expect(found?.status).toBe("recu-en-agence");
  expect(found?.parcels).toBe(1);
  expect(found?.events.map((e) => e.status)).toEqual([
    "cree",
    "recu-en-agence",
  ]);
  const text = JSON.stringify(found);
  expect(text).not.toContain("confidentiel");
  expect(text).not.toContain(client.id);
  expect(text).not.toContain("example.invalid");
});

test("départ confirmé et transfert d’agence encadré", async () => {
  const d = (await operation(agentParis, "newDeparture", {
    agency: "paris",
    mode: "maritime",
    scheduledAt: "2026-12-01T10:00",
  })) as { id: string };
  await operation(agentParis, "confirmDeparture", {
    departureId: d.id,
    confirmedAt: "2026-12-03T08:00",
  });
  const confirmed = await getEntity(admin, d.id);
  expect(confirmed.payload.status).toBe("confirme");
  expect(confirmed.payload.confirmedAt).toBe("2026-12-03T08:00:00.000Z");
  await expect(
    operation(agentParis, "confirmDeparture", { departureId: d.id }),
  ).rejects.toThrow("INVALID_INPUT");

  const s = await shipment();
  // Un agent ne transfère pas ; un responsable ou un administrateur oui.
  await expect(
    operation(agentParis, "transferShipment", {
      shipmentId: s.id,
      agency: "brazzaville",
      reason: "Arrivée",
    }),
  ).rejects.toThrow("ACCESS_DENIED");
  await operation(admin, "receiveParcel", {
    shipmentId: s.id,
    description: "Colis fictif",
    declared: measures,
    controlled: measures,
  });
  for (const status of ["recu-en-agence", "controle", "en-attente-de-depart"])
    await operation(admin, "event", {
      shipmentId: s.id,
      status,
      location: "Paris",
    });
  await operation(admin, "assignDeparture", {
    shipmentId: s.id,
    departureId: d.id,
  });
  // Parti mais pas arrivé : transfert refusé.
  await expect(
    operation(admin, "transferShipment", {
      shipmentId: s.id,
      agency: "brazzaville",
      reason: "Trop tôt",
    }),
  ).rejects.toThrow("TRANSFER_REFUSED");
  for (const status of ["expedie", "arrive"])
    await operation(admin, "event", {
      shipmentId: s.id,
      status,
      location: "Brazzaville",
    });
  await operation(admin, "transferShipment", {
    shipmentId: s.id,
    agency: "brazzaville",
    reason: "Arrivée au Congo",
  });
  const moved = await getEntity(admin, s.id);
  expect(moved.agency).toBe("brazzaville");
  expect((moved.payload.transfers as unknown[]).length).toBe(1);
  const parcels = (
    await (
      await db()
    ).all<{ agency: string }>(
      "SELECT agency FROM entities WHERE kind IN ('parcel','event') AND json_extract(payload,'$.shipmentId')=?",
      s.id,
    )
  ).map((r) => r.agency);
  expect(new Set(parcels)).toEqual(new Set(["brazzaville"]));
  // L’agent de Paris n’y a plus accès ; le client, toujours.
  await expect(getEntity(agentParis, s.id)).rejects.toThrow("ACCESS_DENIED");
  expect((await getEntity(client, s.id)).agency).toBe("brazzaville");
});
