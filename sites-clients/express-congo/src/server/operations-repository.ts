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
export function opsDb() {
  const database = db();
  database.exec(`
CREATE TABLE IF NOT EXISTS entities(id TEXT PRIMARY KEY,kind TEXT NOT NULL,owner TEXT NOT NULL,agency TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,payload TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS demo_users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,salt TEXT NOT NULL,role TEXT NOT NULL,agency TEXT NOT NULL,organization TEXT,verified INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS user_sessions(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES demo_users(id),expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS auth_tokens(hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES demo_users(id),purpose TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS assignments(parcel_id TEXT PRIMARY KEY REFERENCES entities(id),shipment_id TEXT NOT NULL REFERENCES entities(id));
`);
  return database;
}
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
export function listEntities(actor: Actor) {
  return (
    opsDb()
      .prepare("SELECT * FROM entities ORDER BY created_at DESC")
      .all() as Row[]
  )
    .map(decode)
    .filter((item) => canRead(actor, item));
}
export function getEntity(actor: Actor, id: string): Entity {
  const row = opsDb().prepare("SELECT * FROM entities WHERE id=?").get(id) as
    Row | undefined;
  if (!row || !canRead(actor, row)) throw new Error("ACCESS_DENIED");
  return decode(row);
}
function audit(actor: Actor, action: string, id: string, detail: unknown) {
  opsDb()
    .prepare(
      "INSERT INTO audit(actor,action,object_id,detail,created_at) VALUES(?,?,?,?,?)",
    )
    .run(
      actor.id,
      action,
      id,
      JSON.stringify(detail),
      new Date().toISOString(),
    );
}
function put(
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
  opsDb()
    .prepare("INSERT INTO entities VALUES(?,?,?,?,1,?,?)")
    .run(id, kind, owner, agency, JSON.stringify(payload), date);
  audit(actor, kind + ".created", id, { kind });
  return getEntity(actor, id);
}
function replace(actor: Actor, item: Entity, payload: Record<string, unknown>) {
  if (!canRead(actor, item) || !canWrite(actor, item.kind))
    throw new Error("ACCESS_DENIED");
  const result = opsDb()
    .prepare(
      "UPDATE entities SET payload=?,revision=revision+1 WHERE id=? AND revision=?",
    )
    .run(JSON.stringify(payload), item.id, item.revision);
  if (!result.changes) throw new Error("CONFLICT");
  audit(actor, item.kind + ".updated", item.id, {
    revision: item.revision + 1,
  });
}
export function operation(
  actor: Actor,
  command: string,
  input: Record<string, unknown>,
) {
  const database = opsDb();
  database.exec("BEGIN IMMEDIATE");
  try {
    const result = perform(actor, command, input);
    database.exec("COMMIT");
    return result;
  } catch (e) {
    database.exec("ROLLBACK");
    throw e;
  }
}
function text(value: unknown, max = 2000) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new Error("INVALID_INPUT");
  return value.trim();
}
function perform(
  actor: Actor,
  command: string,
  input: Record<string, unknown>,
): unknown {
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
      !opsDb()
        .prepare(
          "SELECT id FROM demo_users WHERE id=? AND verified=1 AND role='client'",
        )
        .get(owner)
    )
      throw new Error("INVALID_OWNER");
    if (
      !["paris", "brazzaville", "pointe-noire"].includes(agency) ||
      !["aerien", "maritime", "conteneur"].includes(String(input.service)) ||
      !["Brazzaville", "Pointe-Noire"].includes(String(input.destination))
    )
      throw new Error("INVALID_INPUT");
    return put(actor, "shipment", owner, agency, {
      service: input.service,
      route: "FR-CG",
      destination: text(input.destination, 100),
      status: "cree",
      reference: "DEMO-EC-" + randomBytes(12).toString("hex"),
      departure: null,
    });
  }
  if (command === "receiveParcel") {
    const shipment = getEntity(actor, text(input.shipmentId, 100));
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
    const parcel = put(actor, "parcel", shipment.owner, shipment.agency, {
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
    opsDb()
      .prepare("INSERT INTO assignments VALUES(?,?)")
      .run(parcel.id, shipment.id);
    return parcel;
  }
  if (command === "newDeparture") {
    if (
      !["aerien", "maritime"].includes(String(input.mode)) ||
      !/^\d{4}-\d{2}-\d{2}T/.test(String(input.scheduledAt)) ||
      !Number.isFinite(Date.parse(String(input.scheduledAt)))
    )
      throw new Error("INVALID_INPUT");
    return put(actor, "departure", "", text(input.agency, 50), {
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
    const departure = getEntity(actor, text(input.departureId, 100)),
      shipment = getEntity(actor, text(input.shipmentId, 100));
    if (
      departure.kind !== "departure" ||
      shipment.kind !== "shipment" ||
      departure.agency !== shipment.agency ||
      departure.payload.mode !== shipment.payload.service ||
      shipment.payload.departure
    )
      throw new Error("ASSIGNMENT_CONFLICT");
    const rows = opsDb()
      .prepare("SELECT payload FROM entities WHERE kind='parcel'")
      .all() as { payload: string }[];
    const parcels = rows
      .map((r) => JSON.parse(r.payload))
      .filter((p) => p.shipmentId === shipment.id);
    if (
      !parcels.length ||
      parcels.some((p) => p.priceReviewRequired && !p.priceReviewApproved)
    )
      throw new Error("REVIEW_REQUIRED");
    replace(actor, shipment, { ...shipment.payload, departure: departure.id });
    replace(actor, departure, {
      ...departure.payload,
      shipments: [...(departure.payload.shipments as string[]), shipment.id],
    });
    return { ok: true };
  }
  if (command === "approveMeasures") {
    if (!["admin", "manager"].includes(actor.role))
      throw new Error("ACCESS_DENIED");
    const parcel = getEntity(actor, text(input.parcelId, 100));
    if (parcel.kind !== "parcel") throw new Error("INVALID_INPUT");
    replace(actor, parcel, {
      ...parcel.payload,
      priceReviewApproved: true,
      approvalReason: text(input.reason),
      approvedBy: actor.id,
    });
    return { ok: true };
  }
  if (command === "event") {
    const shipment = getEntity(actor, text(input.shipmentId, 100)),
      status = text(input.status, 60);
    if (
      shipment.kind !== "shipment" ||
      !shipmentTransition(String(shipment.payload.status), status)
    )
      throw new Error("INVALID_TRANSITION");
    if (status === "remis" && (!input.proof || !input.entitlementConfirmed))
      throw new Error("WITHDRAWAL_PROOF_REQUIRED");
    const event = put(actor, "event", shipment.owner, shipment.agency, {
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
      put(actor, "document", shipment.owner, shipment.agency, {
        shipmentId: shipment.id,
        type: "proof-of-handover",
        body: text(input.proof),
        public: false,
      });
    replace(actor, shipment, { ...shipment.payload, status });
    return event;
  }
  if (command === "correctEvent") {
    if (!["admin", "manager"].includes(actor.role))
      throw new Error("ACCESS_DENIED");
    const original = getEntity(actor, text(input.eventId, 100));
    if (original.kind !== "event") throw new Error("INVALID_INPUT");
    return put(actor, "event", original.owner, original.agency, {
      ...original.payload,
      occurredAt: new Date().toISOString(),
      reason: text(input.reason),
      location: text(input.location, 200),
      author: actor.id,
      corrects: original.id,
    });
  }
  if (command === "proposal") {
    const shipment = getEntity(actor, text(input.shipmentId, 100));
    if (
      shipment.kind !== "shipment" ||
      !/^\d{1,12}$/.test(String(input.totalMinor)) ||
      BigInt(String(input.totalMinor)) <= 0n ||
      !["EUR", "XAF"].includes(String(input.currency)) ||
      !Number.isFinite(Date.parse(String(input.validUntil)))
    )
      throw new Error("INVALID_INPUT");
    const previous = listEntities(actor).filter(
      (e) => e.kind === "proposal" && e.payload.shipmentId === shipment.id,
    );
    const version = previous.length + 1;
    return put(actor, "proposal", shipment.owner, shipment.agency, {
      shipmentId: shipment.id,
      version,
      number: "DEMO-DEV-" + randomBytes(8).toString("hex"),
      totalMinor: String(input.totalMinor),
      currency: input.currency,
      exclusions: text(input.exclusions),
      status: "proposition-envoyee",
      validUntil: text(input.validUntil, 40),
      tariffSnapshot: null,
    });
  }
  if (command === "acceptProposal") {
    const proposal = getEntity(actor, text(input.proposalId, 100));
    if (
      actor.role !== "client" ||
      proposal.owner !== actor.id ||
      proposal.kind !== "proposal" ||
      proposal.payload.status !== "proposition-envoyee" ||
      Date.parse(String(proposal.payload.validUntil)) < Date.now()
    )
      throw new Error("ACCESS_DENIED");
    const result = opsDb()
      .prepare(
        "UPDATE entities SET payload=?,revision=revision+1 WHERE id=? AND revision=?",
      )
      .run(
        JSON.stringify({
          ...proposal.payload,
          status: "acceptee",
          acceptedAt: new Date().toISOString(),
        }),
        proposal.id,
        proposal.revision,
      );
    if (!result.changes) throw new Error("CONFLICT");
    audit(actor, "proposal.accepted", proposal.id, {});
    return { ok: true, payment: "non-confirme" };
  }
  if (command === "ticket")
    return put(actor, "ticket", actor.id, actor.agency, {
      subject: text(input.subject, 160),
      body: text(input.body),
      status: "nouveau",
    });
  if (command === "replyTicket") {
    const ticket = getEntity(actor, text(input.ticketId, 100));
    if (ticket.kind !== "ticket" || !canWrite(actor, "ticket"))
      throw new Error("ACCESS_DENIED");
    replace(actor, ticket, {
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
