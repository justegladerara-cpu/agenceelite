import {
  scryptSync,
  randomBytes,
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { Actor, Role } from "@/domain/operations";
import { opsDb } from "./operations-repository";
import { isDemo, siteUrl } from "@/config";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export const demoAccounts = [
  {
    id: "client-demo-a",
    email: "client-a@example.invalid",
    role: "client",
    agency: "paris",
  },
  {
    id: "client-demo-b",
    email: "client-b@example.invalid",
    role: "client",
    agency: "brazzaville",
  },
  {
    id: "agent-paris",
    email: "agent-paris@example.invalid",
    role: "agent",
    agency: "paris",
  },
  {
    id: "agent-brazzaville",
    email: "agent-brazzaville@example.invalid",
    role: "agent",
    agency: "brazzaville",
  },
  {
    id: "admin-demo",
    email: "admin@example.invalid",
    role: "admin",
    agency: "paris",
  },
] as const;
export function seedAccounts() {
  if (!isDemo()) throw new Error("DEMO_DISABLED");
  for (const user of demoAccounts) {
    const salt = "ec-demo-" + user.id;
    opsDb()
      .prepare("INSERT OR IGNORE INTO demo_users VALUES(?,?,?,?,?,?,NULL,1)")
      .run(
        user.id,
        user.email,
        scryptSync("DemoExpress!2026", salt, 64).toString("hex"),
        salt,
        user.role,
        user.agency,
      );
  }
}
type User = {
  id: string;
  email: string;
  password_hash: string;
  salt: string;
  role: Role;
  agency: string;
  organization: string | null;
  verified: number;
};
// Only demonstrates a second step. This public demo secret is forbidden outside demo.
export function demoMfa() {
  const step = Math.floor(Date.now() / 30000),
    buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(step));
  const mac = createHmac("sha1", "PUBLIC_DEMO_FACTOR_ONLY")
      .update(buffer)
      .digest(),
    offset = mac[mac.length - 1] & 15;
  return ((mac.readUInt32BE(offset) & 0x7fffffff) % 1000000)
    .toString()
    .padStart(6, "0");
}
export async function signIn(email: string, password: string, code: string) {
  seedAccounts();
  const row = opsDb()
    .prepare("SELECT * FROM demo_users WHERE email=?")
    .get(email.toLowerCase()) as User | undefined;
  const derived = scryptSync(password, row?.salt || "missing-user", 64),
    expected = row ? Buffer.from(row.password_hash, "hex") : Buffer.alloc(64);
  if (
    !row ||
    !row.verified ||
    !timingSafeEqual(derived, expected) ||
    (row.role === "admin" && code !== demoMfa())
  )
    throw new Error("ACCESS_DENIED");
  const token = randomBytes(32).toString("hex");
  opsDb()
    .prepare("INSERT INTO user_sessions VALUES(?,?,?)")
    .run(hash(token), row.id, Date.now() + 3600000);
  (await cookies()).set("ec-demo-user", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: siteUrl().startsWith("https:"),
    maxAge: 3600,
    path: "/",
  });
  return {
    id: row.id,
    role: row.role,
    agency: row.agency,
    organization: row.organization,
  };
}
export async function currentActor(): Promise<Actor | null> {
  if (!isDemo()) return null;
  const token = (await cookies()).get("ec-demo-user")?.value;
  if (!token) return null;
  const row = opsDb()
    .prepare(
      "SELECT u.id,u.role,u.agency,u.organization FROM user_sessions s JOIN demo_users u ON u.id=s.user_id WHERE s.hash=? AND s.expires_at>? AND u.verified=1",
    )
    .get(hash(token), Date.now()) as Actor | undefined;
  return row ? { ...row } : null;
}
export async function signOut() {
  const jar = await cookies(),
    token = jar.get("ec-demo-user")?.value;
  if (token)
    opsDb().prepare("DELETE FROM user_sessions WHERE hash=?").run(hash(token));
  jar.delete("ec-demo-user");
}
