import { beforeEach, test, expect } from "vitest";
import { Actor } from "@/domain/operations";
import {
  getEntity,
  listEntities,
  operation,
  opsDb,
} from "@/server/operations-repository";
import { seedAccounts } from "@/server/demo-auth";
const admin: Actor = {
    id: "admin-demo",
    role: "admin",
    agency: "paris",
    organization: null,
  },
  client: Actor = {
    id: "client-demo-a",
    role: "client",
    agency: "paris",
    organization: null,
  },
  otherClient: Actor = {
    id: "client-demo-b",
    role: "client",
    agency: "brazzaville",
    organization: null,
  },
  otherAgent: Actor = {
    id: "agent-brazzaville",
    role: "agent",
    agency: "brazzaville",
    organization: null,
  };
const measures = {
  length: "60",
  width: "40",
  height: "40",
  weight: "12",
  quantity: "3",
  unit: "cm",
};
beforeEach(() => {
  seedAccounts();
  opsDb().exec("DELETE FROM assignments; DELETE FROM entities;");
});
const create = () =>
  operation(admin, "newShipment", {
    owner: client.id,
    agency: "paris",
    service: "maritime",
    destination: "Brazzaville",
  }) as ReturnType<typeof getEntity>;
test("clients et agences ne lisent ni ne modifient les dossiers d’autrui", () => {
  const s = create();
  expect(getEntity(client, s.id).id).toBe(s.id);
  for (const actor of [otherClient, otherAgent]) {
    expect(() => getEntity(actor, s.id)).toThrow("ACCESS_DENIED");
    expect(listEntities(actor)).toHaveLength(0);
    expect(() =>
      operation(actor, "event", {
        shipmentId: s.id,
        status: "recu-en-agence",
        location: "Paris",
      }),
    ).toThrow("ACCESS_DENIED");
  }
  expect(() =>
    operation(client, "event", {
      shipmentId: s.id,
      status: "recu-en-agence",
      location: "Paris",
    }),
  ).toThrow("ACCESS_DENIED");
});
test("réception, départ et remise préservent l’historique et une preuve privée", () => {
  const s = create();
  operation(admin, "receiveParcel", {
    shipmentId: s.id,
    declared: measures,
    controlled: measures,
    description: "Cartons fictifs",
  });
  const departure = operation(admin, "newDeparture", {
    agency: "paris",
    mode: "maritime",
    scheduledAt: "2026-12-01T10:00:00Z",
  }) as ReturnType<typeof getEntity>;
  for (const status of ["recu-en-agence", "controle", "en-attente-de-depart"])
    operation(admin, "event", {
      shipmentId: s.id,
      status,
      location: "Agence de démonstration",
    });
  operation(admin, "assignDeparture", {
    shipmentId: s.id,
    departureId: departure.id,
  });
  expect(() =>
    operation(admin, "assignDeparture", {
      shipmentId: s.id,
      departureId: departure.id,
    }),
  ).toThrow("ASSIGNMENT_CONFLICT");
  for (const status of ["expedie", "arrive", "disponible-au-retrait"])
    operation(admin, "event", {
      shipmentId: s.id,
      status,
      location: "Agence de démonstration",
    });
  expect(() =>
    operation(admin, "event", {
      shipmentId: s.id,
      status: "remis",
      location: "Agence",
    }),
  ).toThrow("WITHDRAWAL_PROOF_REQUIRED");
  operation(admin, "event", {
    shipmentId: s.id,
    status: "remis",
    location: "Agence",
    proof: "Preuve fictive",
    entitlementConfirmed: true,
  });
  expect(getEntity(client, s.id).payload.status).toBe("remis");
  const visible = listEntities(client);
  expect(visible.filter((e) => e.kind === "event")).toHaveLength(7);
  expect(visible.find((e) => e.kind === "document")?.payload.public).toBe(
    false,
  );
  expect(listEntities(otherClient)).toHaveLength(0);
});
test("écart de poids bloque l’affectation jusqu’à accord tracé", () => {
  const s = create();
  const parcel = operation(admin, "receiveParcel", {
    shipmentId: s.id,
    declared: measures,
    controlled: { ...measures, weight: "13" },
    description: "Cartons fictifs",
  }) as ReturnType<typeof getEntity>;
  const departure = operation(admin, "newDeparture", {
    agency: "paris",
    mode: "maritime",
    scheduledAt: "2026-12-01T10:00:00Z",
  }) as ReturnType<typeof getEntity>;
  expect(() =>
    operation(admin, "assignDeparture", {
      shipmentId: s.id,
      departureId: departure.id,
    }),
  ).toThrow("REVIEW_REQUIRED");
  operation(admin, "approveMeasures", {
    parcelId: parcel.id,
    reason: "Accord fictif documenté",
  });
  expect(
    operation(admin, "assignDeparture", {
      shipmentId: s.id,
      departureId: departure.id,
    }),
  ).toEqual({ ok: true });
});
test("proposition versionnée, acceptation propriétaire, aucun paiement confirmé", () => {
  const s = create();
  const proposal = operation(admin, "proposal", {
    shipmentId: s.id,
    totalMinor: "12000",
    currency: "EUR",
    exclusions: "Exclusions fictives",
    validUntil: "2099-01-01",
  }) as ReturnType<typeof getEntity>;
  expect(() =>
    operation(otherClient, "acceptProposal", { proposalId: proposal.id }),
  ).toThrow("ACCESS_DENIED");
  expect(
    operation(client, "acceptProposal", { proposalId: proposal.id }),
  ).toEqual({ ok: true, payment: "non-confirme" });
  const revised = operation(admin, "proposal", {
    shipmentId: s.id,
    totalMinor: "14000",
    currency: "EUR",
    exclusions: "Nouvelle version fictive",
    validUntil: "2099-01-01",
  }) as ReturnType<typeof getEntity>;
  expect(revised.payload.version).toBe(2);
  expect(getEntity(client, proposal.id).payload.totalMinor).toBe("12000");
});
test("une correction ajoute un événement sans effacer l’original", () => {
  const s = create();
  const event = operation(admin, "event", {
    shipmentId: s.id,
    status: "recu-en-agence",
    location: "Ancien lieu",
  }) as ReturnType<typeof getEntity>;
  const correction = operation(admin, "correctEvent", {
    eventId: event.id,
    location: "Lieu corrigé",
    reason: "Correction fictive",
  }) as ReturnType<typeof getEntity>;
  expect(getEntity(admin, event.id).payload.location).toBe("Ancien lieu");
  expect(correction.payload.corrects).toBe(event.id);
  expect(listEntities(client).filter((e) => e.kind === "event")).toHaveLength(
    2,
  );
});
