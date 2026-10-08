import { createHash, randomBytes, randomUUID } from "node:crypto";
import { db } from "./database";
import {
  QuoteInput,
  quoteVolume,
  QuoteState,
  canTransition,
} from "@/domain/quotes";
export type QuoteRecord = {
  id: string;
  reference: string;
  payload: string;
  volume: string;
  status: QuoteState;
  agency: string;
  created_at: string;
  updated_at: string;
};
export type Upload = { mime: string; bytes: Buffer; name: string };
export interface QuoteRepository {
  create(
    input: QuoteInput,
    key: string,
    uploads?: Upload[],
  ): { reference: string; created: boolean };
  list(): QuoteRecord[];
}
export const localQuotes: QuoteRepository = {
  create(input, key, uploads = []) {
    const database = db();
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(input))
      .update(
        JSON.stringify(
          uploads.map((u) => ({
            name: u.name,
            mime: u.mime,
            hash: createHash("sha256").update(u.bytes).digest("hex"),
          })),
        ),
      )
      .digest("hex");
    database.exec("BEGIN IMMEDIATE");
    try {
      const existing = database
        .prepare("SELECT reference,fingerprint FROM quotes WHERE idempotency=?")
        .get(key) as { reference: string; fingerprint: string } | undefined;
      if (existing) {
        if (existing.fingerprint !== fingerprint)
          throw new Error("IDEMPOTENCY_CONFLICT");
        database.exec("COMMIT");
        return { reference: existing.reference, created: false };
      }
      const id = randomUUID(),
        reference = "EC-" + randomBytes(10).toString("hex").toUpperCase(),
        date = new Date().toISOString();
      database
        .prepare(
          "INSERT INTO quotes(id,reference,idempotency,fingerprint,payload,volume,agency,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)",
        )
        .run(
          id,
          reference,
          key,
          fingerprint,
          JSON.stringify(input),
          quoteVolume(input),
          input.agency,
          date,
          date,
        );
      for (const upload of uploads)
        database
          .prepare(
            "INSERT INTO documents(id,quote_id,name,mime,bytes,created_at) VALUES(?,?,?,?,?,?)",
          )
          .run(randomUUID(), id, upload.name, upload.mime, upload.bytes, date);
      database
        .prepare(
          "INSERT INTO audit(actor,action,object_id,detail,created_at) VALUES(?,?,?,?,?)",
        )
        .run("guest", "quote.created", id, "{}", date);
      database.exec("COMMIT");
      return { reference, created: true };
    } catch (e) {
      database.exec("ROLLBACK");
      throw e;
    }
  },
  list() {
    return db()
      .prepare(
        "SELECT id,reference,payload,volume,status,agency,created_at,updated_at FROM quotes ORDER BY created_at DESC",
      )
      .all()
      .map((row) => ({ ...row })) as QuoteRecord[];
  },
};
export function updateQuote(
  id: string,
  to: QuoteState,
  reason: string,
  actor: string,
) {
  const database = db();
  database.exec("BEGIN IMMEDIATE");
  try {
    const row = database
      .prepare("SELECT status FROM quotes WHERE id=?")
      .get(id) as { status: QuoteState } | undefined;
    if (!row || !canTransition(row.status, to))
      throw new Error("Transition non autorisée");
    const date = new Date().toISOString();
    database
      .prepare("UPDATE quotes SET status=?,updated_at=? WHERE id=?")
      .run(to, date, id);
    database
      .prepare(
        "INSERT INTO audit(actor,action,object_id,detail,created_at) VALUES(?,?,?,?,?)",
      )
      .run(
        actor,
        "quote.status",
        id,
        JSON.stringify({ from: row.status, to, reason }),
        date,
      );
    database.exec("COMMIT");
  } catch (e) {
    database.exec("ROLLBACK");
    throw e;
  }
}
