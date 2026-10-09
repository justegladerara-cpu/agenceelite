import { randomUUID, randomBytes } from "node:crypto";
import { db } from "./database";
import {
  Actor,
  Entity,
  canRead,
  canWrite,
  shipmentTransition,
} from "@/domain/operations";
import { ParcelInput, validateParcel } from "@/domain/measurements";
import { proposalLines } from "@/domain/proposals";
type Row = {
  id: string;
  kind: string;
  owner: string;
  agency: string;
  revision: number;
  payload: string;
  created_at: string;
};
const decode = (row: Row): Entity => ({
  ...row,
  payload: JSON.parse(row.payload),
  createdAt: row.created_at,
});
export async function listEntities(actor: Actor) {
  return (
    await (
      await db()
    ).all<Row>("SELECT * FROM entities ORDER BY created_at DESC")
  )
    .map(decode)
    .filter((item) => canRead(actor, item));
}
export async function getEntity(actor: Actor, id: string): Promise<Entity> {
  const row = await (
    await db()
  ).get<Row>("SELECT * FROM entities WHERE id=?", id);
  if (!row || !canRead(actor, row)) throw new Error("ACCESS_DENIED");
  return decode(row);
}
const AUDIT =
  "INSERT INTO audit(actor,action,object_id,detail,created_at) VALUES(?,?,?,?,?)";
const auditParams = (
  actor: Actor,
  action: string,
  id: string,
  detail: unknown,
) => [actor.id, action, id, JSON.stringify(detail), new Date().toISOString()];
async function audit(
  actor: Actor,
  action: string,
  id: string,
  detail: unknown,
) {
  await (await db()).run(AUDIT, ...auditParams(actor, action, id, detail));
}
async function put(
  actor: Actor,
  kind: string,
  owner: string,
  agency: string,
  payload: Record<string, unknown>,
) {
  if (
    !canWrite(actor, kind) ||
    (actor.role !== "admin" &&
      actor.role !== "client" &&
      agency !== actor.agency) ||
    (actor.role === "client" && owner !== actor.id)
  )
    throw new Error("ACCESS_DENIED");
  const id = randomUUID(),
    date = new Date().toISOString();
  // Dossier et ligne de journal enregistrés ensemble, d’un seul bloc.
  await (
    await db()
  ).batch([
    [
      "INSERT INTO entities VALUES(?,?,?,?,1,?,?)",
      [id, kind, owner, agency, JSON.stringify(payload), date],
    ],
    [AUDIT, auditParams(actor, kind + ".created", id, { kind })],
  ]);
  return getEntity(actor, id);
}
async function replace(
  actor: Actor,
  item: Entity,
  payload: Record<string, unknown>,
) {
  if (!canRead(actor, item) || !canWrite(actor, item.kind))
    throw new Error("ACCESS_DENIED");
  // Verrou optimiste : refusé si le dossier a changé depuis sa lecture.
  const result = await (
    await db()
  ).run(
    "UPDATE entities SET payload=?,revision=revision+1 WHERE id=? AND revision=?",
    JSON.stringify(payload),
    item.id,
    item.revision,
  );
  if (!result.changes) throw new Error("CONFLICT");
  await audit(actor, item.kind + ".updated", item.id, {
    revision: item.revision + 1,
  });
}
/**
 * Commande métier. D1 n’offre pas de transaction interactive : chaque
 * écriture est protégée par contrainte, lot atomique ou verrou de révision.
 */
export async function operation(
  actor: Actor,
  command: string,
  input: Record<string, unknown>,
) {
  return perform(actor, command, input);
}
function text(value: unknown, max = 2000) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error("INVALID_INPUT");
  return value.trim();
}
async function perform(
  actor: Actor,
  command: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  const domains: Record<string, string> = {
    newShipment: "shipment",
    receiveParcel: "parcel",
    newDeparture: "departure",
    assignDeparture: "shipment",
    approveMeasures: "parcel",
    event: "event",
    correctEvent: "event",
    proposal: "proposal",
    ticket: "ticket",
    replyTicket: "ticket",
    confirmDeparture: "departure",
    transferShipment: "shipment",
  };
  if (domains[command] && !canWrite(actor, domains[command]))
    throw new Error("ACCESS_DENIED");
  if (command === "newShipment") {
    if (
      actor.role === "client" ||
      actor.role === "finance" ||
      actor.role === "sales"
    )
      throw new Error("ACCESS_DENIED");
    const owner = text(input.owner, 100),
      agency = text(input.agency, 50);
    if (
      !(await (
        await db()
      ).get(
        "SELECT id FROM demo_users WHERE id=? AND verified=1 AND role='client'",
        owner,
      ))
    )
      throw new Error("INVALID_OWNER");
    if (
      !["paris", "brazzaville", "pointe-noire"].includes(agency) ||
      !["aerien", "maritime", "conteneur"].includes(String(input.service)) ||
      !["Brazzaville", "Pointe-Noire"].includes(String(input.destination))
    )
      throw new Error("INVALID_INPUT");
    return await put(actor, "shipment", owner, agency, {
      service: input.service,
      route: "FR-CG",
      destination: text(input.destination, 100),
      status: "cree",
      reference: "DEMO-EC-" + randomBytes(12).toString("hex"),
      departure: null,
    });
  }
  if (command === "receiveParcel") {
    const shipment = await getEntity(actor, text(input.shipmentId, 100));
    if (shipment.kind !== "shipment") throw new Error("INVALID_INPUT");
    const declared = input.declared as ParcelInput,
      controlled = input.controlled as ParcelInput;
    if (
      !declared ||
      !controlled ||
      Object.keys(validateParcel(declared)).length ||
      Object.keys(validateParcel(controlled)).length
    )
      throw new Error("INVALID_MEASUREMENTS");
    const parcel = await put(actor, "parcel", shipment.owner, shipment.agency, {
      reference: "DEMO-P-" + randomBytes(10).toString("hex"),
      shipmentId: shipment.id,
      description: text(input.description),
      declared,
      controlled,
      reserves: String(input.reserves || "").slice(0, 2000),
      priceReviewRequired:
        JSON.stringify(declared) !== JSON.stringify(controlled),
      priceReviewApproved: false,
    });
    await (
      await db()
    ).run("INSERT INTO assignments VALUES(?,?)", parcel.id, shipment.id);
    return parcel;
  }
  if (command === "newDeparture") {
    if (
      !["aerien", "maritime"].includes(String(input.mode)) ||
      !/^\d{4}-\d{2}-\d{2}T/.test(String(input.scheduledAt)) ||
      !Number.isFinite(Date.parse(String(input.scheduledAt)))
    )
      throw new Error("INVALID_INPUT");
    return await put(actor, "departure", "", text(input.agency, 50), {
      mode: input.mode,
      scheduledAt: new Date(
        /(?:Z|[+-]\d{2}:\d{2})$/.test(String(input.scheduledAt))
          ? String(input.scheduledAt)
          : String(input.scheduledAt) + "Z",
      ).toISOString(),
      confirmedAt: null,
      status: "previsionnel",
      shipments: [],
    });
  }
  if (command === "assignDeparture") {
    const departure = await getEntity(actor, text(input.departureId, 100)),
      shipment = await getEntity(actor, text(input.shipmentId, 100));
    if (
      departure.kind !== "departure" ||
      shipment.kind !== "shipment" ||
      departure.agency !== shipment.agency ||
      departure.payload.mode !== shipment.payload.service ||
      shipment.payload.departure
    )
      throw new Error("ASSIGNMENT_CONFLICT");
    const rows = await (
      await db()
    ).all<{ payload: string }>(
      "SELECT payload FROM entities WHERE kind='parcel'",
    );
    const parcels = rows
      .map((r) => JSON.parse(r.payload))
      .filter((p) => p.shipmentId === shipment.id);
    if (
      !parcels.length ||
      parcels.some((p) => p.priceReviewRequired && !p.priceReviewApproved)
    )
      throw new Error("REVIEW_REQUIRED");
    await replace(actor, shipment, {
      ...shipment.payload,
      departure: departure.id,
    });
    await replace(actor, departure, {
      ...departure.payload,
      shipments: [...(departure.payload.shipments as string[]), shipment.id],
    });
    return { ok: true };
  }
  if (command === "approveMeasures") {
    if (!["admin", "manager"].includes(actor.role))
      throw new Error("ACCESS_DENIED");
    const parcel = await getEntity(actor, text(input.parcelId, 100));
    if (parcel.kind !== "parcel") throw new Error("INVALID_INPUT");
    await replace(actor, parcel, {
      ...parcel.payload,
      priceReviewApproved: true,
      approvalReason: text(input.reason),
      approvedBy: actor.id,
    });
    return { ok: true };
  }
  if (command === "event") {
    const shipment = await getEntity(actor, text(input.shipmentId, 100)),
      status = text(input.status, 60);
    if (
      shipment.kind !== "shipment" ||
      !shipmentTransition(String(shipment.payload.status), status)
    )
      throw new Error("INVALID_TRANSITION");
    if (status === "remis" && (!input.proof || !input.entitlementConfirmed))
      throw new Error("WITHDRAWAL_PROOF_REQUIRED");
    const event = await put(actor, "event", shipment.owner, shipment.agency, {
      shipmentId: shipment.id,
      status,
      location: text(input.location, 200),
      occurredAt: new Date().toISOString(),
      author: actor.id,
      source: "manual-demo",
      public: true,
      reason: String(input.reason || "").slice(0, 2000),
      corrects: null,
    });
    if (status === "remis")
      await put(actor, "document", shipment.owner, shipment.agency, {
        shipmentId: shipment.id,
        type: "proof-of-handover",
        body: text(input.proof),
        public: false,
      });
    await replace(actor, shipment, { ...shipment.payload, status });
    return event;
  }
  if (command === "correctEvent") {
    if (!["admin", "manager"].includes(actor.role))
      throw new Error("ACCESS_DENIED");
    const original = await getEntity(actor, text(input.eventId, 100));
    if (original.kind !== "event") throw new Error("INVALID_INPUT");
    return await put(actor, "event", original.owner, original.agency, {
      ...original.payload,
      occurredAt: new Date().toISOString(),
      reason: text(input.reason),
      location: text(input.location, 200),
      author: actor.id,
      corrects: original.id,
    });
  }
  if (command === "proposal") {
    const shipment = await getEntity(actor, text(input.shipmentId, 100));
    const currency = String(input.currency);
    // Lignes détaillées si fournies ; sinon montant global (compatibilité).
    const detailed =
      input.lines !== undefined && input.lines !== ""
        ? proposalLines(input.lines, currency)
        : undefined;
    if (detailed === null) throw new Error("INVALID_LINES");
    const totalMinor = detailed?.totalMinor ?? String(input.totalMinor);
    if (
      shipment.kind !== "shipment" ||
      !/^\d{1,12}$/.test(totalMinor) ||
      BigInt(totalMinor) <= 0n ||
      !["EUR", "XAF"].includes(currency) ||
      !Number.isFinite(Date.parse(String(input.validUntil)))
    )
      throw new Error("INVALID_INPUT");
    const previous = (await listEntities(actor)).filter(
      (e) => e.kind === "proposal" && e.payload.shipmentId === shipment.id,
    );
    const version = previous.length + 1;
    return await put(actor, "proposal", shipment.owner, shipment.agency, {
      shipmentId: shipment.id,
      version,
      number: "DEMO-DEV-" + randomBytes(8).toString("hex"),
      totalMinor,
      currency,
      lines: detailed?.lines ?? [],
      exclusions: text(input.exclusions),
      status: "proposition-envoyee",
      validUntil: text(input.validUntil, 40),
      tariffSnapshot: null,
    });
  }
  if (command === "acceptProposal") {
    const proposal = await getEntity(actor, text(input.proposalId, 100));
    if (
      actor.role !== "client" ||
      proposal.owner !== actor.id ||
      proposal.kind !== "proposal" ||
      proposal.payload.status !== "proposition-envoyee" ||
      Date.parse(String(proposal.payload.validUntil)) < Date.now()
    )
      throw new Error("ACCESS_DENIED");
    const result = await (
      await db()
    ).run(
      "UPDATE entities SET payload=?,revision=revision+1 WHERE id=? AND revision=?",
      JSON.stringify({
        ...proposal.payload,
        status: "acceptee",
        acceptedAt: new Date().toISOString(),
      }),
      proposal.id,
      proposal.revision,
    );
    if (!result.changes) throw new Error("CONFLICT");
    await audit(actor, "proposal.accepted", proposal.id, {});
    return { ok: true, payment: "non-confirme" };
  }
  if (command === "confirmDeparture") {
    if (!["admin", "manager", "agent"].includes(actor.role))
      throw new Error("ACCESS_DENIED");
    const departure = await getEntity(actor, text(input.departureId, 100)),
      when = String(input.confirmedAt || departure.payload.scheduledAt);
    if (
      departure.kind !== "departure" ||
      departure.payload.status === "confirme" ||
      !Number.isFinite(Date.parse(when))
    )
      throw new Error("INVALID_INPUT");
    await replace(actor, departure, {
      ...departure.payload,
      confirmedAt: new Date(
        /(?:Z|[+-]\d{2}:\d{2})$/.test(when) ? when : when + "Z",
      ).toISOString(),
      confirmedBy: actor.id,
      status: "confirme",
    });
    return { ok: true };
  }
  if (command === "transferShipment") {
    if (!["admin", "manager"].includes(actor.role))
      throw new Error("ACCESS_DENIED");
    const shipment = await getEntity(actor, text(input.shipmentId, 100)),
      agency = text(input.agency, 50),
      reason = text(input.reason);
    const status = String(shipment.payload.status);
    const arrived = [
      "arrive",
      "formalites-en-cours",
      "disponible-au-retrait",
      "incident",
      "en-attente-information",
    ].includes(status);
    if (
      shipment.kind !== "shipment" ||
      !["paris", "brazzaville", "pointe-noire"].includes(agency) ||
      agency === shipment.agency ||
      ["remis", "annule"].includes(status) ||
      // Un dossier affecté à un départ ne change d’agence qu’à l’arrivée.
      (shipment.payload.departure && !arrived)
    )
      throw new Error("TRANSFER_REFUSED");
    // Dossier, colis, événements et documents changent d’agence d’un bloc ;
    // le verrou de révision refuse le lot si le dossier a changé entre-temps.
    const related = (await listEntities(actor)).filter(
      (e) =>
        e.payload.shipmentId === shipment.id &&
        ["parcel", "event", "document"].includes(e.kind),
    );
    const before = shipment.agency;
    const result = await (
      await db()
    ).run(
      "UPDATE entities SET agency=?,revision=revision+1,payload=? WHERE id=? AND revision=?",
      agency,
      JSON.stringify({
        ...shipment.payload,
        transfers: [
          ...((shipment.payload.transfers as unknown[]) || []),
          {
            from: before,
            to: agency,
            reason,
            by: actor.id,
            at: new Date().toISOString(),
          },
        ],
      }),
      shipment.id,
      shipment.revision,
    );
    if (!result.changes) throw new Error("CONFLICT");
    await (
      await db()
    ).batch([
      ...related.map(
        (e) =>
          ["UPDATE entities SET agency=? WHERE id=?", [agency, e.id]] as [
            string,
            unknown[],
          ],
      ),
      [
        AUDIT,
        auditParams(actor, "shipment.transferred", shipment.id, {
          from: before,
          to: agency,
        }),
      ],
    ]);
    return { ok: true };
  }
  if (command === "ticket")
    return await put(actor, "ticket", actor.id, actor.agency, {
      subject: text(input.subject, 160),
      body: text(input.body),
      status: "nouveau",
    });
  if (command === "replyTicket") {
    const ticket = await getEntity(actor, text(input.ticketId, 100));
    if (ticket.kind !== "ticket" || !canWrite(actor, "ticket"))
      throw new Error("ACCESS_DENIED");
    await replace(actor, ticket, {
      ...ticket.payload,
      replies: [
        ...((ticket.payload.replies as unknown[]) || []),
        {
          body: text(input.body),
          actor: actor.id,
          at: new Date().toISOString(),
        },
      ],
    });
    return { ok: true };
  }
  throw new Error("UNKNOWN_COMMAND");
}
