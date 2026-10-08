"use client";
import { useState } from "react";
import Image from "next/image";
import type { Actor, Entity } from "@/domain/operations";
import { shipmentStates } from "@/domain/operations";
import type { demoAccounts } from "@/server/demo-auth";
import type { QuoteView, AuditView } from "@/server/backoffice";
import {
  states,
  stateLabel,
  roles,
  agencies,
  services,
  pipeline,
  quoteNext,
  actions,
  shortRef,
  date,
  measures,
  money,
  parcelVolume,
  parcelWeight,
  fr,
} from "./backoffice/labels";
import { HBars, Columns } from "./backoffice/charts";

type Accounts = typeof demoAccounts;
const errors: Record<string, string> = {
  ACCESS_DENIED: "Votre rôle ne permet pas cette opération.",
  INVALID_TRANSITION:
    "Ce changement d’état n’est pas possible depuis l’état actuel.",
  REVIEW_REQUIRED:
    "Validez d’abord l’écart de mesures du colis avant de l’affecter.",
  ASSIGNMENT_CONFLICT:
    "Cette expédition est déjà affectée ou ne correspond pas à ce départ.",
  WITHDRAWAL_PROOF_REQUIRED:
    "Confirmez le droit de retrait et renseignez la preuve avant la remise.",
  INVALID_MEASUREMENTS: "Vérifiez les dimensions et les poids saisis.",
  INVALID_INPUT: "Vérifiez les valeurs saisies.",
  INVALID_OWNER: "Choisissez un client vérifié.",
};

function Pill({ value }: { value: unknown }) {
  const [label, tone] = states[String(value)] || [String(value ?? "—"), ""];
  return <span className={"pill " + tone}>{label}</span>;
}

/* ---------- Actions guidées ---------- */
type Field = {
  name: string;
  label: string;
  type?: string;
  value?: string;
  optional?: boolean;
  group?: string;
  options?: { value: string; label: string }[];
};
type Task = {
  key: string;
  title: string;
  hint: string;
  command: string;
  fields: Field[];
};
const pick = (name: string, label: string, items: Entity[]): Field => ({
  name,
  label,
  options: items.map((i) => ({
    value: i.id,
    label: [
      shortRef(i.payload.reference || i.payload.number || i.payload.subject),
      services[String(i.payload.service || i.payload.mode)] || "",
      i.payload.status ? stateLabel(i.payload.status) : "",
    ]
      .filter(Boolean)
      .join(" — "),
  })),
});
function groups(fields: Field[]) {
  const out: [string, Field[]][] = [];
  for (const f of fields) {
    const last = out[out.length - 1];
    if (last && last[0] === (f.group || "")) last[1].push(f);
    else out.push([f.group || "", [f]]);
  }
  return out;
}
function TaskForm({
  task,
  preset,
  run,
  close,
}: {
  task: Task;
  preset: Record<string, string>;
  run: (command: string, input: Record<string, unknown>) => Promise<boolean>;
  close: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const renderField = (f: Field) => (
    <label key={f.name} htmlFor={`${task.key}-${f.name}`}>
      {f.label}
      {f.optional ? " (facultatif)" : ""}
      {f.options ? (
        <select
          id={`${task.key}-${f.name}`}
          name={f.name}
          defaultValue={preset[f.name] ?? f.value}
        >
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={`${task.key}-${f.name}`}
          name={f.name}
          type={!f.type || f.type === "decimal" ? "text" : f.type}
          defaultValue={preset[f.name] ?? f.value}
          inputMode={f.type === "decimal" ? "decimal" : undefined}
          required={!f.optional}
        />
      )}
    </label>
  );
  return (
    <form
      className="task-panel"
      aria-labelledby={"task-" + task.key}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const ok = await run(
          task.command,
          Object.fromEntries(new FormData(e.currentTarget)),
        );
        setBusy(false);
        if (ok) close();
      }}
    >
      <h2 id={"task-" + task.key}>{task.title}</h2>
      <p className="hint">{task.hint}</p>
      {groups(task.fields).map(([group, fields]) =>
        group ? (
          <fieldset className="measure-group" key={group}>
            <legend>{group}</legend>
            <div className="fields four">{fields.map(renderField)}</div>
          </fieldset>
        ) : (
          <div className="fields" key={fields[0].name}>
            {fields.map(renderField)}
          </div>
        ),
      )}
      <div className="actions">
        <button className="button" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
        <button type="button" className="text-button" onClick={close}>
          Annuler
        </button>
      </div>
    </form>
  );
}

/* ---------- Connexion ---------- */
function Login({ accounts, code }: { accounts: Accounts; code: string }) {
  const [email, setEmail] = useState("client-a@example.invalid"),
    [password, setPassword] = useState(""),
    [factor, setFactor] = useState(""),
    [message, setMessage] = useState("");
  return (
    <div className="app-shell login-shell">
      <aside className="login-brand">
        <div className="app-brand">
          <Image
            src="/assets/logo-expresscongo.png"
            alt="Express Congo"
            width={511}
            height={80}
          />
        </div>
        <h1>Gestion des expéditions</h1>
        <p>
          Demandes, colis, départs et remises des agences de Paris, Brazzaville
          et Pointe-Noire.
        </p>
        <span className="demo-flag">Démonstration — dossiers fictifs</span>
      </aside>
      <form
        className="login-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await fetch("/api/demo/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, code: factor }),
          });
          if (r.ok) location.reload();
          else
            setMessage(
              "Connexion refusée. Vérifiez le compte, le mot de passe et le code administrateur.",
            );
        }}
      >
        <h2>Connexion</h2>
        <p className="hint">
          Mot de passe des comptes de démonstration :{" "}
          <code>DemoExpress!2026</code>. Code administrateur simulé :{" "}
          <strong>{code}</strong> (valable 30 secondes, actualisez la page s’il
          a expiré).
        </p>
        <label>
          Compte
          <select
            aria-label="Compte"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.email}>
                {roles[a.role].charAt(0).toUpperCase() + roles[a.role].slice(1)}{" "}
                — {agencies[a.agency]} ({a.email})
              </option>
            ))}
          </select>
        </label>
        <label>
          Mot de passe
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        <label>
          Code administrateur (simulation)
          <input
            value={factor}
            onChange={(e) => setFactor(e.target.value)}
            inputMode="numeric"
          />
        </label>
        <button className="button">Se connecter à la démonstration</button>
        {message && (
          <p role="alert" className="error">
            {message}
          </p>
        )}
      </form>
    </div>
  );
}

/* ---------- Lignes de tableau ---------- */
type Row = {
  id: string;
  kind: string;
  status?: string;
  agency: string;
  at: string;
  text: string;
  cells: React.ReactNode[];
  csv: string[];
};
function download(name: string, head: string[], rows: string[][]) {
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const body = [head, ...rows].map((r) => r.map(esc).join(";")).join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["﻿" + body], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function Operations({
  actor,
  entities,
  accounts,
  code,
  quotes = [],
  audit = [],
}: {
  actor: Actor | null;
  entities: Entity[];
  accounts: Accounts;
  code: string;
  quotes?: QuoteView[];
  audit?: AuditView[];
}) {
  const staff = !!actor && actor.role !== "client";
  const [view, setView] = useState(staff ? "dashboard" : "shipment"),
    [task, setTask] = useState(""),
    [preset, setPreset] = useState<Record<string, string>>({}),
    [search, setSearch] = useState(""),
    [stateFilter, setStateFilter] = useState(""),
    [agencyFilter, setAgencyFilter] = useState(""),
    [oldestFirst, setOldestFirst] = useState(false),
    [detail, setDetail] = useState<{ kind: string; id: string } | null>(null),
    [message, setMessage] = useState("");
  if (!actor) return <Login accounts={accounts} code={code} />;

  async function run(command: string, input: Record<string, unknown>) {
    if (command === "receiveParcel") {
      const declared = {
        length: String(input.length),
        width: String(input.width),
        height: String(input.height),
        weight: String(input.weight),
        quantity: String(input.quantity),
        unit: "cm",
      };
      const controlled = {
        ...declared,
        length: String(input.controlledLength || input.length),
        width: String(input.controlledWidth || input.width),
        height: String(input.controlledHeight || input.height),
        weight: String(input.controlledWeight),
      };
      input = { ...input, declared, controlled };
    }
    if (command === "event")
      input = {
        ...input,
        entitlementConfirmed: input.entitlementConfirmed === "oui",
      };
    const r = await fetch("/api/demo/operations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, ...input }),
    });
    if (r.ok) {
      location.reload();
      return true;
    }
    const data = await r.json().catch(() => ({}));
    setMessage(
      errors[data.message] || "L’opération n’a pas pu être enregistrée.",
    );
    return false;
  }

  /* Données dérivées, toutes issues des dossiers visibles par ce rôle. */
  const of = (kind: string) => entities.filter((e) => e.kind === kind);
  const shipments = of("shipment"),
    parcels = of("parcel"),
    departures = of("departure"),
    proposals = of("proposal"),
    events = of("event"),
    tickets = of("ticket");
  const email = (id: string) => accounts.find((a) => a.id === id)?.email || "—";
  const clientAccounts = accounts.filter((a) => a.role === "client");
  const clients = clientAccounts.map((a) => ({ value: a.id, label: a.email }));
  const myAgencies = Object.entries(agencies)
    .filter(([k]) => actor.role === "admin" || k === actor.agency)
    .map(([value, label]) => ({ value, label }));
  const can = (...r: string[]) => r.includes(actor.role);
  const byShipment = (list: Entity[], id: string) =>
    list.filter((e) => e.payload.shipmentId === id);
  const active = shipments.filter(
    (s) => !["remis", "annule"].includes(String(s.payload.status)),
  );
  const toReview = parcels.filter(
    (p) => p.payload.priceReviewRequired && !p.payload.priceReviewApproved,
  );
  const incidents = shipments.filter((s) => s.payload.status === "incident");
  const ready = shipments.filter(
    (s) => s.payload.status === "disponible-au-retrait",
  );
  const quotesToHandle = quotes.filter((q) =>
    ["nouveau", "a-completer"].includes(q.status),
  );
  const openTickets = tickets.filter((t) => t.payload.status === "nouveau");

  /* ---------- Actions ---------- */
  const tasks = (
    [
      can("admin", "manager", "agent") && {
        key: "newShipment",
        title: "Ouvrir une expédition",
        hint: "Crée le dossier d’un client vérifié, avant la réception de ses colis.",
        command: "newShipment",
        fields: [
          { name: "owner", label: "Client", options: clients },
          { name: "agency", label: "Agence responsable", options: myAgencies },
          {
            name: "service",
            label: "Service",
            options: ["aerien", "maritime", "conteneur"].map((value) => ({
              value,
              label: services[value],
            })),
          },
          {
            name: "destination",
            label: "Destination",
            options: ["Brazzaville", "Pointe-Noire"].map((v) => ({
              value: v,
              label: v,
            })),
          },
        ],
      },
      can("admin", "manager", "agent") &&
        shipments.length > 0 && {
          key: "receiveParcel",
          title: "Réceptionner un colis",
          hint: "Saisissez les mesures déclarées par le client puis celles relevées au comptoir. Un écart bloque l’affectation jusqu’à validation.",
          command: "receiveParcel",
          fields: [
            pick("shipmentId", "Expédition", shipments),
            { name: "description", label: "Contenu" },
            ...(
              [
                ["length", "Longueur (cm)"],
                ["width", "Largeur (cm)"],
                ["height", "Hauteur (cm)"],
                ["weight", "Poids (kg)"],
              ] as const
            ).map(([name, label]) => ({
              name,
              label,
              type: "decimal",
              group: "Déclaré par le client",
            })),
            ...(
              [
                ["controlledLength", "Longueur (cm)", true],
                ["controlledWidth", "Largeur (cm)", true],
                ["controlledHeight", "Hauteur (cm)", true],
                ["controlledWeight", "Poids pesé (kg)", false],
              ] as const
            ).map(([name, label, optional]) => ({
              name,
              label,
              type: "decimal",
              optional,
              group: "Mesuré au comptoir",
            })),
            { name: "quantity", label: "Nombre de colis", value: "1" },
            {
              name: "reserves",
              label: "État et réserves",
              value: "Aucune réserve",
            },
          ],
        },
      can("admin", "manager") &&
        toReview.length > 0 && {
          key: "approveMeasures",
          title: "Valider un écart de mesures",
          hint: "L’accord est tracé avec son motif dans l’historique du colis.",
          command: "approveMeasures",
          fields: [
            pick("parcelId", "Colis à valider", toReview),
            { name: "reason", label: "Motif de l’accord" },
          ],
        },
      can("admin", "manager", "agent") &&
        shipments.length > 0 && {
          key: "event",
          title: "Mettre à jour le suivi",
          hint: "Chaque mise à jour s’ajoute à l’historique ; rien n’est effacé.",
          command: "event",
          fields: [
            pick("shipmentId", "Expédition", shipments),
            {
              name: "status",
              label: "Nouvel état",
              options: shipmentStates.map((value) => ({
                value,
                label: stateLabel(value),
              })),
            },
            { name: "location", label: "Lieu" },
            {
              name: "reason",
              label: "Commentaire",
              value: "Mise à jour agence",
            },
            {
              name: "entitlementConfirmed",
              label: "Droit de retrait contrôlé (remise)",
              options: [
                { value: "non", label: "Non concerné" },
                { value: "oui", label: "Oui, pièce contrôlée" },
              ],
            },
            {
              name: "proof",
              label: "Preuve de remise",
              value: "Non applicable",
            },
          ],
        },
      can("admin", "manager", "agent") && {
        key: "newDeparture",
        title: "Programmer un départ",
        hint: "La date reste prévisionnelle tant qu’elle n’est pas confirmée.",
        command: "newDeparture",
        fields: [
          { name: "agency", label: "Agence", options: myAgencies },
          {
            name: "mode",
            label: "Mode",
            options: [
              { value: "aerien", label: "Fret aérien" },
              { value: "maritime", label: "Fret maritime" },
            ],
          },
          {
            name: "scheduledAt",
            label: "Date prévisionnelle (UTC)",
            type: "datetime-local",
          },
        ],
      },
      can("admin", "manager", "agent") &&
        shipments.length > 0 &&
        departures.length > 0 && {
          key: "assignDeparture",
          title: "Affecter à un départ",
          hint: "L’expédition doit avoir le même mode et la même agence que le départ.",
          command: "assignDeparture",
          fields: [
            pick("shipmentId", "Expédition", shipments),
            pick("departureId", "Départ", departures),
          ],
        },
      can("admin", "sales") &&
        shipments.length > 0 && {
          key: "proposal",
          title: "Envoyer une proposition",
          hint: "Montant en centimes pour l’euro (12500 = 125,00 €), en francs pour le XAF.",
          command: "proposal",
          fields: [
            pick("shipmentId", "Expédition", shipments),
            { name: "totalMinor", label: "Montant total", type: "decimal" },
            {
              name: "currency",
              label: "Devise",
              options: [
                { value: "EUR", label: "Euro (EUR)" },
                { value: "XAF", label: "Franc CFA (XAF)" },
              ],
            },
            { name: "exclusions", label: "Prestations et exclusions" },
            { name: "validUntil", label: "Valable jusqu’au", type: "date" },
          ],
        },
      {
        key: "ticket",
        title: "Nouvelle demande d’assistance",
        hint: "Visible uniquement par vous et l’agence concernée.",
        command: "ticket",
        fields: [
          { name: "subject", label: "Sujet" },
          { name: "body", label: "Votre message" },
        ],
      },
      tickets.length > 0 && {
        key: "replyTicket",
        title: "Répondre à une demande",
        hint: "La réponse s’ajoute à la conversation.",
        command: "replyTicket",
        fields: [
          pick("ticketId", "Demande", tickets),
          { name: "body", label: "Réponse" },
        ],
      },
    ] as (Task | false)[]
  ).filter(Boolean) as Task[];
  const current = tasks.find((t) => t.key === task);
  const hasTask = (key: string) => tasks.some((t) => t.key === key);
  const openTask = (key: string, values: Record<string, string> = {}) => {
    setPreset(values);
    setTask(key);
    setDetail(null);
    setMessage("");
    window.scrollTo({ top: 0 });
  };

  /* ---------- Navigation ---------- */
  type Item = [string, string, number | null];
  const nav: [string, Item[]][] = [
    ["", staff ? [["dashboard", "Tableau de bord", null]] : []],
    [
      "Ventes",
      [
        ...(staff && actor.role !== "finance"
          ? ([["quote", "Demandes web", quotesToHandle.length]] as Item[])
          : []),
        ["proposal", "Propositions", proposals.length],
        ...(staff
          ? ([["clients", "Clients", clientAccounts.length]] as Item[])
          : []),
      ],
    ],
    [
      "Opérations",
      [
        ["shipment", "Expéditions", shipments.length],
        ["parcel", "Colis", parcels.length],
        ...(staff
          ? ([["departure", "Départs", departures.length]] as Item[])
          : []),
        ["event", "Historique", events.length],
      ],
    ],
    [
      "Support",
      [
        ["ticket", "Assistance", tickets.length],
        ["document", "Documents privés", of("document").length],
      ],
    ],
    [
      "Analyse",
      staff
        ? [
            ["reports", "Rapports", null],
            ...(actor.role === "admin"
              ? ([["audit", "Journal d’activité", null]] as Item[])
              : []),
          ]
        : [],
    ],
  ];
  const go = (v: string, state = "") => {
    setView(v);
    setStateFilter(state);
    setAgencyFilter("");
    setSearch("");
    setTask("");
    setDetail(null);
  };
  const open = (v: string, kind: string, id: string) => {
    setView(v);
    setStateFilter("");
    setDetail({ kind, id });
  };
  const title =
    nav.flatMap(([, items]) => items).find(([k]) => k === view)?.[1] || "";

  /* ---------- Lignes par module ---------- */
  function rowsFor(kind: string): { head: string[]; rows: Row[] } {
    const ref = (v: unknown) => (
      <span className="ref" key="r" title={String(v)}>
        {shortRef(v)}
      </span>
    );
    const pill = (v: unknown) => <Pill key="s" value={v} />;
    if (kind === "quote")
      return {
        head: [
          "Référence",
          "Client",
          "Service",
          "Destination",
          "Volume",
          "Agence",
          "État",
          "Reçue le",
        ],
        rows: quotes.map((q) => {
          const v = [
            q.reference,
            q.name,
            services[q.service] || q.service,
            q.destination,
            fr(Number(q.volume), 3) + " m³",
            agencies[q.agency],
            stateLabel(q.status),
            date(q.createdAt, q.agency),
          ];
          return {
            id: q.id,
            kind,
            status: q.status,
            agency: q.agency,
            at: q.createdAt,
            text: v.join(" ") + " " + q.description + " " + q.email,
            csv: v,
            cells: [
              ref(q.reference),
              v[1],
              v[2],
              v[3],
              v[4],
              v[5],
              pill(q.status),
              v[7],
            ],
          };
        }),
      };
    if (kind === "clients")
      return {
        head: [
          "Client",
          "Agence",
          "Expéditions",
          "En cours",
          "Propositions",
          "Accepté (EUR)",
        ],
        rows: clientAccounts.map((a) => {
          const own = shipments.filter((s) => s.owner === a.id),
            props = proposals.filter((p) => p.owner === a.id),
            accepted = props
              .filter(
                (p) =>
                  p.payload.status === "acceptee" &&
                  p.payload.currency === "EUR",
              )
              .reduce((s, p) => s + Number(p.payload.totalMinor), 0);
          const v = [
            a.email,
            agencies[a.agency],
            String(own.length),
            String(
              own.filter(
                (s) => !["remis", "annule"].includes(String(s.payload.status)),
              ).length,
            ),
            String(props.length),
            money(accepted, "EUR"),
          ];
          return {
            id: a.id,
            kind,
            agency: a.agency,
            at: "",
            text: v.join(" "),
            csv: v,
            cells: [
              <span className="ref" key="r">
                {a.email}
              </span>,
              ...v.slice(1),
            ],
          };
        }),
      };
    const list = of(kind);
    const base = (e: Entity, v: string[], cells: React.ReactNode[]): Row => ({
      id: e.id,
      kind,
      status: e.payload.status ? String(e.payload.status) : undefined,
      agency: e.agency,
      at: e.createdAt,
      text: v.join(" "),
      csv: v,
      cells,
    });
    const ship = (id: unknown) =>
      String(shipments.find((s) => s.id === id)?.payload.reference ?? "—");
    switch (kind) {
      case "shipment":
        return {
          head: [
            "Référence",
            "Client",
            "Service",
            "Destination",
            "Agence",
            "État",
            "Ouverte le",
          ],
          rows: list.map((e) => {
            const p = e.payload;
            const v = [
              String(p.reference),
              email(e.owner),
              services[String(p.service)],
              String(p.destination),
              agencies[e.agency],
              stateLabel(p.status),
              date(e.createdAt, e.agency),
            ];
            return base(e, v, [
              ref(p.reference),
              v[1],
              v[2],
              v[3],
              v[4],
              pill(p.status),
              v[6],
            ]);
          }),
        };
      case "parcel":
        return {
          head: [
            "Référence",
            "Contenu",
            "Déclaré",
            "Mesuré",
            "Contrôle",
            "Agence",
          ],
          rows: list.map((e) => {
            const p = e.payload;
            const review = p.priceReviewRequired
              ? p.priceReviewApproved
                ? ["Écart validé", "ok"]
                : ["À valider", "bad"]
              : ["Conforme", "ok"];
            const v = [
              String(p.reference),
              String(p.description),
              measures(p.declared),
              measures(p.controlled),
              review[0],
              agencies[e.agency],
            ];
            return base(e, v, [
              ref(p.reference),
              v[1],
              <span className="measures" key="d">
                {v[2]}
              </span>,
              <span className="measures" key="c">
                {v[3]}
              </span>,
              <span className={"pill " + review[1]} key="v">
                {review[0]}
              </span>,
              v[5],
            ]);
          }),
        };
      case "departure":
        return {
          head: [
            "Mode",
            "Agence",
            "Date prévue",
            "Expéditions",
            "Volume",
            "État",
          ],
          rows: list.map((e) => {
            const p = e.payload;
            const ids = (p.shipments as string[]) || [];
            const vol = parcelVolume(
              parcels.filter((x) => ids.includes(String(x.payload.shipmentId))),
            );
            const v = [
              services[String(p.mode)],
              agencies[e.agency],
              date(p.confirmedAt || p.scheduledAt, e.agency),
              String(ids.length),
              fr(vol, 3) + " m³",
              stateLabel(p.status),
            ];
            return {
              ...base(e, v, [v[0], v[1], v[2], v[3], v[4], pill(p.status)]),
              at: String(p.scheduledAt),
            };
          }),
        };
      case "proposal":
        return {
          head: ["Numéro", "Client", "Version", "Montant", "Validité", "État"],
          rows: list.map((e) => {
            const p = e.payload;
            const v = [
              String(p.number),
              email(e.owner),
              "v" + String(p.version),
              money(Number(p.totalMinor), String(p.currency)),
              String(p.validUntil ?? "—"),
              stateLabel(p.status),
            ];
            return base(e, v, [
              ref(p.number),
              v[1],
              v[2],
              v[3],
              v[4],
              pill(p.status),
            ]);
          }),
        };
      case "event":
        return {
          head: ["État", "Expédition", "Lieu", "Date", "Commentaire"],
          rows: list.map((e) => {
            const p = e.payload;
            const v = [
              stateLabel(p.status),
              ship(p.shipmentId),
              String(p.location ?? "—"),
              date(p.occurredAt || e.createdAt, e.agency),
              String(p.reason ?? "—"),
            ];
            return base(e, v, [pill(p.status), ref(v[1]), v[2], v[3], v[4]]);
          }),
        };
      case "document":
        return {
          head: ["Document", "Agence", "Ajouté le"],
          rows: list.map((e) => {
            const v = [
              String(e.payload.type ?? "Document"),
              agencies[e.agency],
              date(e.createdAt, e.agency),
            ];
            return base(e, v, v);
          }),
        };
      case "ticket":
        return {
          head: ["Sujet", "Agence", "Réponses", "État", "Ouverte le"],
          rows: list.map((e) => {
            const p = e.payload;
            const v = [
              String(p.subject),
              agencies[e.agency],
              String((p.replies as unknown[])?.length ?? 0),
              stateLabel(p.status),
              date(e.createdAt, e.agency),
            ];
            return base(e, v, [
              <span className="ref" key="r">
                {v[0]}
              </span>,
              v[1],
              v[2],
              pill(p.status),
              v[4],
            ]);
          }),
        };
    }
    return { head: [], rows: [] };
  }

  /* ---------- Vue liste ---------- */
  function listView(kind: string) {
    const { head, rows } = rowsFor(kind);
    const statesHere = [
      ...new Set(rows.map((r) => r.status).filter(Boolean)),
    ] as string[];
    const agenciesHere = [...new Set(rows.map((r) => r.agency))];
    const shown = rows
      .filter((r) => !stateFilter || r.status === stateFilter)
      .filter((r) => !agencyFilter || r.agency === agencyFilter)
      .filter((r) => r.text.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => (oldestFirst ? 1 : -1) * a.at.localeCompare(b.at));
    const openable = kind !== "clients";
    return (
      <div className="panel">
        <div className="panel-head">
          <div className="filters" role="group" aria-label="Filtres">
            {(statesHere.length > 1 || stateFilter) && (
              <>
                <button
                  type="button"
                  className={"chip" + (!stateFilter ? " on" : "")}
                  onClick={() => setStateFilter("")}
                >
                  Tous
                </button>
                {[...new Set([...statesHere, stateFilter].filter(Boolean))].map(
                  (s) => (
                    <button
                      type="button"
                      key={s}
                      className={"chip" + (stateFilter === s ? " on" : "")}
                      aria-pressed={stateFilter === s}
                      onClick={() => setStateFilter(stateFilter === s ? "" : s)}
                    >
                      {stateLabel(s)}
                    </button>
                  ),
                )}
              </>
            )}
            {agenciesHere.length > 1 && (
              <select
                aria-label="Agence"
                className="chip-select"
                value={agencyFilter}
                onChange={(e) => setAgencyFilter(e.target.value)}
              >
                <option value="">Toutes les agences</option>
                {agenciesHere.map((a) => (
                  <option key={a} value={a}>
                    {agencies[a]}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="panel-tools">
            <label>
              <span className="sr-only">Rechercher</span>
              <input
                type="search"
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            {kind !== "clients" && (
              <button
                type="button"
                className="text-button"
                onClick={() => setOldestFirst(!oldestFirst)}
              >
                {oldestFirst ? "Plus anciens d’abord" : "Plus récents d’abord"}
              </button>
            )}
            <button
              type="button"
              className="button secondary small"
              disabled={!shown.length}
              onClick={() =>
                download(
                  `express-congo-${kind}-${new Date().toISOString().slice(0, 10)}.csv`,
                  head,
                  shown.map((r) => r.csv),
                )
              }
            >
              Exporter en CSV
            </button>
          </div>
        </div>
        {shown.length ? (
          <div className="table-wrap flush">
            <table className="data-table">
              <thead>
                <tr>
                  {head.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr
                    key={r.id}
                    className={openable ? "clickable" : undefined}
                    tabIndex={openable ? 0 : undefined}
                    onClick={
                      openable ? () => setDetail({ kind, id: r.id }) : undefined
                    }
                    onKeyDown={
                      openable
                        ? (e) => {
                            if (e.key === "Enter")
                              setDetail({ kind, id: r.id });
                          }
                        : undefined
                    }
                  >
                    {r.cells.map((c, i) => (
                      <td key={i}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="table-foot">
              {shown.length} sur {rows.length} dossier
              {rows.length > 1 ? "s" : ""}
              {openable ? " · cliquez une ligne pour ouvrir la fiche" : ""}
            </p>
          </div>
        ) : (
          <p className="empty">
            {rows.length
              ? "Aucun dossier ne correspond à ces filtres."
              : "Aucun dossier dans votre périmètre pour l’instant."}
          </p>
        )}
      </div>
    );
  }

  /* ---------- Fiche détaillée ---------- */
  function detailView() {
    if (!detail) return null;
    const close = () => setDetail(null);
    const dl = (pairs: [string, React.ReactNode][]) => (
      <dl className="recap">
        {pairs.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    );
    let head: React.ReactNode = null,
      body: React.ReactNode = null;
    if (detail.kind === "quote") {
      const q = quotes.find((x) => x.id === detail.id);
      if (!q) return null;
      head = (
        <>
          <span className="ref">{q.reference}</span> <Pill value={q.status} />
        </>
      );
      body = (
        <>
          {dl([
            ["Client", q.name],
            [
              "Profil",
              q.kind === "professionnel" ? "Professionnel" : "Particulier",
            ],
            [
              "Téléphone",
              <a key="t" href={"tel:" + q.phone.replace(/[^\d+]/g, "")}>
                {q.phone}
              </a>,
            ],
            [
              "Email",
              <a key="m" href={"mailto:" + q.email}>
                {q.email}
              </a>,
            ],
            [
              "Réponse souhaitée par",
              q.channel === "telephone" ? "Téléphone" : "Email",
            ],
            ["Ville", q.city || "—"],
            ["Service", services[q.service] || q.service],
            ["Destination", q.destination],
            ["Colis", String(q.parcels)],
            ["Volume déclaré", fr(Number(q.volume), 3) + " m³"],
            ["Date souhaitée", q.desiredDate || "—"],
            ["Agence", agencies[q.agency]],
          ])}
          <h3>Marchandises</h3>
          <p>{q.description}</p>
          {q.customs && (
            <>
              <h3>Dédouanement</h3>
              <p>{q.customs}</p>
            </>
          )}
          {q.comment && (
            <>
              <h3>Commentaire</h3>
              <p>{q.comment}</p>
            </>
          )}
          {can("admin", "manager", "agent", "sales") &&
            (quoteNext[q.status] || []).length > 0 && (
              <div className="drawer-actions">
                <h3>Faire avancer la demande</h3>
                {(quoteNext[q.status] || []).map((to, i) => (
                  <button
                    key={to}
                    className={"button small" + (i ? " secondary" : "")}
                    onClick={() =>
                      run("quoteStatus", { quoteId: q.id, status: to })
                    }
                  >
                    Passer à « {stateLabel(to)} »
                  </button>
                ))}
              </div>
            )}
        </>
      );
    } else {
      const e = entities.find((x) => x.id === detail.id);
      if (!e) return null;
      const p = e.payload;
      head = (
        <>
          <span className="ref">
            {String(
              p.reference || p.number || p.subject || stateLabel(p.status),
            )}
          </span>{" "}
          {p.status ? <Pill value={p.status} /> : null}
        </>
      );
      if (e.kind === "shipment") {
        const timeline = [
          {
            at: e.createdAt,
            status: "cree",
            where: agencies[e.agency],
            note: "Dossier ouvert",
          },
          ...byShipment(events, e.id).map((ev) => ({
            at: String(ev.payload.occurredAt || ev.createdAt),
            status: String(ev.payload.status),
            where: String(ev.payload.location ?? ""),
            note: String(ev.payload.reason ?? ""),
          })),
        ].sort((a, b) => a.at.localeCompare(b.at));
        const own = byShipment(parcels, e.id),
          props = byShipment(proposals, e.id),
          dep = departures.find((d) =>
            ((d.payload.shipments as string[]) || []).includes(e.id),
          );
        body = (
          <>
            {dl([
              ["Client", email(e.owner)],
              ["Service", services[String(p.service)]],
              ["Destination", String(p.destination)],
              ["Agence", agencies[e.agency]],
              [
                "Départ",
                dep
                  ? `${services[String(dep.payload.mode)]} — ${date(dep.payload.scheduledAt, dep.agency)}`
                  : "Non affecté",
              ],
              [
                "Volume contrôlé",
                own.length ? fr(parcelVolume(own), 3) + " m³" : "—",
              ],
            ])}
            {staff && (
              <div className="drawer-actions">
                {hasTask("event") && (
                  <button
                    className="button small"
                    onClick={() => openTask("event", { shipmentId: e.id })}
                  >
                    Mettre à jour le suivi
                  </button>
                )}
                {hasTask("receiveParcel") && (
                  <button
                    className="button secondary small"
                    onClick={() =>
                      openTask("receiveParcel", { shipmentId: e.id })
                    }
                  >
                    Réceptionner un colis
                  </button>
                )}
                {hasTask("assignDeparture") && !dep && (
                  <button
                    className="button secondary small"
                    onClick={() =>
                      openTask("assignDeparture", { shipmentId: e.id })
                    }
                  >
                    Affecter à un départ
                  </button>
                )}
                {hasTask("proposal") && (
                  <button
                    className="button secondary small"
                    onClick={() => openTask("proposal", { shipmentId: e.id })}
                  >
                    Envoyer une proposition
                  </button>
                )}
              </div>
            )}
            <h3>Suivi</h3>
            <ol className="timeline">
              {timeline.map((t, i) => (
                <li key={i}>
                  <Pill value={t.status} />
                  <span>{date(t.at, e.agency)}</span>
                  <small>{[t.where, t.note].filter(Boolean).join(" — ")}</small>
                </li>
              ))}
            </ol>
            <h3>Colis ({own.length})</h3>
            {own.length ? (
              <ul className="mini-list">
                {own.map((x) => (
                  <li key={x.id}>
                    <div>
                      <strong>{String(x.payload.description)}</strong>
                      <span className="measures">
                        Mesuré : {measures(x.payload.controlled)}
                      </span>
                    </div>
                    <a href={"/api/demo/label?id=" + x.id} target="_blank">
                      Étiquette
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint">Aucun colis réceptionné.</p>
            )}
            <h3>Propositions ({props.length})</h3>
            {props.length ? (
              <ul className="mini-list">
                {props.map((x) => (
                  <li key={x.id}>
                    <div>
                      <strong>
                        {money(
                          Number(x.payload.totalMinor),
                          String(x.payload.currency),
                        )}
                      </strong>
                      <span>
                        v{String(x.payload.version)} ·{" "}
                        {stateLabel(x.payload.status)}
                      </span>
                    </div>
                    <a href={"/api/demo/proposal-pdf?id=" + x.id}>PDF</a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="hint">Aucune proposition envoyée.</p>
            )}
          </>
        );
      } else if (e.kind === "parcel") {
        body = (
          <>
            {dl([
              ["Contenu", String(p.description)],
              ["Déclaré", measures(p.declared)],
              ["Mesuré", measures(p.controlled)],
              [
                "Contrôle",
                p.priceReviewRequired
                  ? p.priceReviewApproved
                    ? "Écart validé"
                    : "Écart à valider"
                  : "Conforme",
              ],
              ["État et réserves", String(p.reserves || "—")],
              ["Agence", agencies[e.agency]],
            ])}
            <div className="drawer-actions">
              <a
                className="button secondary small"
                href={"/api/demo/label?id=" + e.id}
                target="_blank"
              >
                Imprimer l’étiquette
              </a>
              {hasTask("approveMeasures") &&
                !!p.priceReviewRequired &&
                !p.priceReviewApproved && (
                  <button
                    className="button small"
                    onClick={() =>
                      openTask("approveMeasures", { parcelId: e.id })
                    }
                  >
                    Valider l’écart
                  </button>
                )}
            </div>
          </>
        );
      } else if (e.kind === "departure") {
        const ids = (p.shipments as string[]) || [];
        const loaded = parcels.filter((x) =>
          ids.includes(String(x.payload.shipmentId)),
        );
        body = (
          <>
            {dl([
              ["Mode", services[String(p.mode)]],
              ["Agence", agencies[e.agency]],
              ["Date prévisionnelle", date(p.scheduledAt, e.agency)],
              [
                "Date confirmée",
                p.confirmedAt ? date(p.confirmedAt, e.agency) : "Non confirmée",
              ],
              ["Expéditions", String(ids.length)],
              [
                "Volume / poids",
                `${fr(parcelVolume(loaded), 3)} m³ · ${fr(parcelWeight(loaded), 1)} kg`,
              ],
            ])}
            <div className="drawer-actions">
              <a
                className="button secondary small"
                href={"/api/demo/manifest?id=" + e.id}
              >
                Exporter le manifeste
              </a>
            </div>
            <h3>Expéditions chargées</h3>
            {ids.length ? (
              <ul className="mini-list">
                {ids.map((id) => {
                  const s = shipments.find((x) => x.id === id);
                  return (
                    <li key={id}>
                      <strong>{shortRef(s?.payload.reference ?? id)}</strong>
                      <span>{s ? stateLabel(s.payload.status) : ""}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="hint">Aucune expédition affectée.</p>
            )}
          </>
        );
      } else if (e.kind === "proposal") {
        body = (
          <>
            {dl([
              ["Client", email(e.owner)],
              ["Version", "v" + String(p.version)],
              ["Montant", money(Number(p.totalMinor), String(p.currency))],
              ["Valable jusqu’au", String(p.validUntil ?? "—")],
              [
                "Acceptée le",
                p.acceptedAt ? date(p.acceptedAt, e.agency) : "—",
              ],
            ])}
            <h3>Prestations et exclusions</h3>
            <p>{String(p.exclusions ?? "—")}</p>
            <div className="drawer-actions">
              <a
                className="button secondary small"
                href={"/api/demo/proposal-pdf?id=" + e.id}
              >
                Télécharger le PDF
              </a>
              {actor!.role === "client" &&
                p.status === "proposition-envoyee" && (
                  <button
                    className="button small"
                    onClick={() => run("acceptProposal", { proposalId: e.id })}
                  >
                    Accepter la proposition
                  </button>
                )}
            </div>
            <p className="hint">
              Une acceptation ne vaut pas confirmation de paiement.
            </p>
          </>
        );
      } else if (e.kind === "ticket") {
        const replies = (p.replies as { body?: string }[]) || [];
        body = (
          <>
            <h3>Message</h3>
            <p>{String(p.body ?? "")}</p>
            <h3>Réponses ({replies.length})</h3>
            {replies.map((r, i) => (
              <p key={i} className="reply">
                {String(r.body ?? "")}
              </p>
            ))}
            {hasTask("replyTicket") && (
              <div className="drawer-actions">
                <button
                  className="button small"
                  onClick={() => openTask("replyTicket", { ticketId: e.id })}
                >
                  Répondre
                </button>
              </div>
            )}
          </>
        );
      } else {
        body = dl(
          Object.entries(p)
            .filter(([, v]) => v !== null && typeof v !== "object")
            .map(([k, v]) => [k, k === "status" ? stateLabel(v) : String(v)]),
        );
      }
    }
    return (
      <div className="drawer-backdrop" onClick={close}>
        <aside
          className="drawer"
          role="dialog"
          aria-modal="true"
          aria-label="Fiche du dossier"
          onClick={(ev) => ev.stopPropagation()}
        >
          <div className="drawer-head">
            <div>{head}</div>
            <button className="text-button" onClick={close} autoFocus>
              Fermer
            </button>
          </div>
          <div className="drawer-body">{body}</div>
        </aside>
      </div>
    );
  }

  /* ---------- Tableau de bord ---------- */
  function dashboard() {
    const byCur = (status: string, cur: string) =>
      proposals.filter(
        (p) => p.payload.status === status && p.payload.currency === cur,
      );
    const sum = (l: Entity[]) =>
      l.reduce((s, p) => s + Number(p.payload.totalMinor), 0);
    const currencies = ["EUR", "XAF"].filter(
      (c) =>
        byCur("proposition-envoyee", c).length + byCur("acceptee", c).length >
        0,
    );
    const days = Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (13 - i));
      return d;
    });
    const dayKey = (v: string) => new Date(v).toDateString();
    const activity = days.map((d) => {
      const k = d.toDateString();
      return {
        key: k,
        label: new Intl.DateTimeFormat("fr-FR", {
          day: "numeric",
          month: "short",
        }).format(d),
        value:
          entities.filter((e) => dayKey(e.createdAt) === k).length +
          quotes.filter((q) => dayKey(q.createdAt) === k).length,
      };
    });
    const upcoming = departures
      .filter(
        (d) =>
          Date.parse(String(d.payload.scheduledAt)) >= Date.now() - 86400000,
      )
      .sort((a, b) =>
        String(a.payload.scheduledAt).localeCompare(
          String(b.payload.scheduledAt),
        ),
      )
      .slice(0, 5);
    const todo: { key: string; text: string; tone: string; go: () => void }[] =
      [
        ...quotesToHandle.slice(0, 4).map((q) => ({
          key: q.id,
          text: `Demande web de ${q.name} — ${services[q.service] || q.service} vers ${q.destination}`,
          tone: "wait",
          go: () => open("quote", "quote", q.id),
        })),
        ...toReview.slice(0, 3).map((p) => ({
          key: p.id,
          text: `Écart de mesures à valider — ${String(p.payload.description)}`,
          tone: "bad",
          go: () => open("parcel", "parcel", p.id),
        })),
        ...incidents.slice(0, 3).map((s) => ({
          key: s.id,
          text: `Incident sur ${shortRef(s.payload.reference)}`,
          tone: "bad",
          go: () => open("shipment", "shipment", s.id),
        })),
        ...ready.slice(0, 3).map((s) => ({
          key: s.id,
          text: `Retrait à préparer — ${shortRef(s.payload.reference)} (${String(s.payload.destination)})`,
          tone: "ok",
          go: () => open("shipment", "shipment", s.id),
        })),
        ...openTickets.slice(0, 3).map((t) => ({
          key: t.id,
          text: `Assistance : ${String(t.payload.subject)}`,
          tone: "wait",
          go: () => open("ticket", "ticket", t.id),
        })),
      ];
    const kpis = (
      [
        ["quote", quotesToHandle.length, "Demandes web à traiter", "", true],
        ["shipment", active.length, "Expéditions en cours", "", false],
        ["parcel", toReview.length, "Écarts de mesures à valider", "", true],
        ["shipment", incidents.length, "En incident", "incident", true],
        [
          "shipment",
          ready.length,
          "Prêtes au retrait",
          "disponible-au-retrait",
          false,
        ],
      ] as [string, number, string, string, boolean][]
    ).filter(([k]) => k !== "quote" || actor!.role !== "finance");
    return (
      <>
        <div className="kpis five">
          {kpis.map(([k, n, label, st, alert]) => (
            <button
              key={label}
              className={"kpi" + (alert && n > 0 ? " alert" : "")}
              onClick={() => go(k, st)}
            >
              <b>{n}</b>
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="dash-grid">
          <section className="widget">
            <h2>À faire</h2>
            {todo.length ? (
              <ul className="todo">
                {todo.slice(0, 8).map((t) => (
                  <li key={t.key}>
                    <button type="button" onClick={t.go}>
                      <i className={"dot " + t.tone} aria-hidden />
                      {t.text}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">
                Rien en attente. Les nouvelles demandes et les écarts
                apparaîtront ici.
              </p>
            )}
          </section>
          <section className="widget">
            <h2>Propositions</h2>
            {currencies.length ? (
              currencies.map((c) => (
                <div className="money-row" key={c}>
                  {(
                    [
                      ["proposition-envoyee", "En attente de réponse"],
                      ["acceptee", "Acceptées"],
                    ] as const
                  ).map(([st, label]) => (
                    <button
                      type="button"
                      key={st}
                      onClick={() => go("proposal", st)}
                    >
                      <span>{label}</span>
                      <b>{money(sum(byCur(st, c)), c)}</b>
                      <small>
                        {byCur(st, c).length} proposition
                        {byCur(st, c).length > 1 ? "s" : ""}
                      </small>
                    </button>
                  ))}
                </div>
              ))
            ) : (
              <p className="empty">
                Aucune proposition envoyée pour l’instant.
              </p>
            )}
            <p className="hint">
              Une proposition acceptée n’est pas un paiement encaissé.
            </p>
          </section>
          <section className="widget">
            <h2>Expéditions par étape</h2>
            <HBars
              title="Expéditions par étape"
              bars={[...pipeline, "incident"].map((s) => ({
                key: s,
                label: stateLabel(s),
                value: shipments.filter((x) => x.payload.status === s).length,
                onSelect: () => go("shipment", s),
              }))}
            />
          </section>
          <section className="widget">
            <h2>Activité des 14 derniers jours</h2>
            <Columns title="Dossiers enregistrés par jour" bars={activity} />
            <p className="hint">
              Demandes web, dossiers, colis, événements et propositions
              enregistrés chaque jour.
            </p>
          </section>
          <section className="widget">
            <h2>Prochains départs</h2>
            {upcoming.length ? (
              <ul className="mini-list">
                {upcoming.map((d) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      className="link-row"
                      onClick={() => open("departure", "departure", d.id)}
                    >
                      <strong>{date(d.payload.scheduledAt, d.agency)}</strong>
                      <span>
                        {services[String(d.payload.mode)]} ·{" "}
                        {agencies[d.agency]} ·{" "}
                        {((d.payload.shipments as string[]) || []).length}{" "}
                        expédition(s)
                      </span>
                    </button>
                    <Pill value={d.payload.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">Aucun départ programmé.</p>
            )}
          </section>
          <section className="widget">
            <h2>Dernières demandes web</h2>
            {quotes.length ? (
              <ul className="mini-list">
                {quotes.slice(0, 5).map((q) => (
                  <li key={q.id}>
                    <button
                      type="button"
                      className="link-row"
                      onClick={() => open("quote", "quote", q.id)}
                    >
                      <strong>{q.name}</strong>
                      <span>
                        {services[q.service] || q.service} → {q.destination} ·{" "}
                        {fr(Number(q.volume), 3)} m³
                      </span>
                    </button>
                    <Pill value={q.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty">
                Les demandes envoyées depuis le site apparaîtront ici.
              </p>
            )}
          </section>
        </div>
      </>
    );
  }

  /* ---------- Rapports ---------- */
  function reports() {
    const sent = proposals.length,
      acceptedN = proposals.filter(
        (p) => p.payload.status === "acceptee",
      ).length;
    const byAgency = Object.keys(agencies).map((a) => {
      const pa = parcels.filter((p) => p.agency === a);
      return { a, vol: parcelVolume(pa), kg: parcelWeight(pa), n: pa.length };
    });
    const loadHead = [
      "Départ",
      "Mode",
      "Agence",
      "Expéditions",
      "Colis",
      "Volume (m³)",
      "Poids (kg)",
      "État",
    ];
    const loads = departures
      .slice()
      .sort((a, b) =>
        String(a.payload.scheduledAt).localeCompare(
          String(b.payload.scheduledAt),
        ),
      )
      .map((d) => {
        const ids = (d.payload.shipments as string[]) || [];
        const pl = parcels.filter((x) =>
          ids.includes(String(x.payload.shipmentId)),
        );
        return [
          date(d.payload.scheduledAt, d.agency),
          services[String(d.payload.mode)],
          agencies[d.agency],
          String(ids.length),
          String(pl.length),
          fr(parcelVolume(pl), 3),
          fr(parcelWeight(pl), 1),
          stateLabel(d.payload.status),
        ];
      });
    const stageHead = ["Agence", ...pipeline.map(stateLabel), "Incident"];
    const stages = Object.keys(agencies).map((a) => [
      agencies[a],
      ...[...pipeline, "incident"].map((s) =>
        String(
          shipments.filter((x) => x.agency === a && x.payload.status === s)
            .length,
        ),
      ),
    ]);
    const table = (head: string[], rows: string[][], name: string) => (
      <>
        <div className="table-wrap flush">
          <table className="data-table">
            <thead>
              <tr>
                {head.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="panel-foot">
          <button
            type="button"
            className="button secondary small"
            disabled={!rows.length}
            onClick={() => download(`express-congo-${name}.csv`, head, rows)}
          >
            Exporter en CSV
          </button>
        </div>
      </>
    );
    return (
      <>
        <div className="kpis">
          {(
            [
              [quotes.length, "Demandes web reçues"],
              [sent, "Propositions envoyées"],
              [acceptedN, "Propositions acceptées"],
              [
                sent ? fr((acceptedN / sent) * 100) + " %" : "—",
                "Taux d’acceptation",
              ],
            ] as [string | number, string][]
          ).map(([n, l]) => (
            <div className="kpi" key={l}>
              <b>{n}</b>
              <span>{l}</span>
            </div>
          ))}
        </div>
        <div className="dash-grid">
          <section className="widget">
            <h2>Volume contrôlé par agence</h2>
            <HBars
              title="Volume contrôlé par agence"
              bars={byAgency.map((x) => ({
                key: x.a,
                label: agencies[x.a],
                value: x.vol,
                display: fr(x.vol, 3) + " m³",
              }))}
            />
            <p className="hint">
              Mesures relevées au comptoir, colis identiques multipliés par leur
              nombre.
            </p>
          </section>
          <section className="widget">
            <h2>Poids pesé par agence</h2>
            <HBars
              title="Poids pesé par agence"
              bars={byAgency.map((x) => ({
                key: x.a,
                label: agencies[x.a],
                value: x.kg,
                display: fr(x.kg, 1) + " kg",
              }))}
            />
            <p className="hint">
              {byAgency.reduce((s, x) => s + x.n, 0)} colis réceptionnés au
              total.
            </p>
          </section>
        </div>
        <section className="panel report">
          <div className="panel-head">
            <h2>Chargement par départ</h2>
          </div>
          {loads.length ? (
            table(loadHead, loads, "chargement-par-depart")
          ) : (
            <p className="empty">Aucun départ programmé.</p>
          )}
        </section>
        <section className="panel report">
          <div className="panel-head">
            <h2>Expéditions par agence et par étape</h2>
          </div>
          {table(stageHead, stages, "expeditions-par-etape")}
        </section>
      </>
    );
  }

  function auditView() {
    return (
      <div className="panel">
        {audit.length ? (
          <div className="table-wrap flush">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Action</th>
                  <th>Par</th>
                  <th>Dossier</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td>{date(a.createdAt)}</td>
                    <td>{actions[a.action] || a.action}</td>
                    <td>
                      {accounts.find((x) => x.id === a.actor)?.email || a.actor}
                    </td>
                    <td className="ref">{shortRef(a.objectId)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="table-foot">
              Les {audit.length} dernières actions enregistrées, sans contenu
              personnel.
            </p>
          </div>
        ) : (
          <p className="empty">Aucune action enregistrée.</p>
        )}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="app-side">
        <div className="app-brand">
          <Image
            src="/assets/logo-expresscongo.png"
            alt="Express Congo"
            width={511}
            height={80}
          />
        </div>
        <nav aria-label="Modules">
          {nav
            .filter(([, items]) => items.length)
            .map(([group, items]) => (
              <div className="nav-group" key={group || "accueil"}>
                {group && <p className="nav-title">{group}</p>}
                {items.map(([k, label, count]) => (
                  <button
                    key={k}
                    className="nav-item"
                    aria-label={label}
                    aria-current={view === k ? "page" : undefined}
                    onClick={() => go(k)}
                  >
                    {label}
                    {count !== null && <span className="count">{count}</span>}
                  </button>
                ))}
              </div>
            ))}
        </nav>
        <div className="app-side-foot">
          <strong>Profil : {roles[actor.role]}</strong>
          Agence de {agencies[actor.agency]}
          <br />
          <button
            className="text-button"
            onClick={async () => {
              await fetch("/api/demo/session", { method: "DELETE" });
              location.reload();
            }}
          >
            Se déconnecter
          </button>
        </div>
      </aside>
      <section className="app-main">
        <div className="app-topbar">
          <h1>{title}</h1>
          <div className="topbar-tools">
            {tasks.length > 0 && (
              <details className="new-menu">
                <summary className="button small">Nouveau</summary>
                <div className="new-menu-list">
                  {tasks.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={(e) => {
                        const menu = e.currentTarget.closest("details");
                        if (menu) menu.open = false;
                        openTask(t.key);
                      }}
                    >
                      {t.title}
                    </button>
                  ))}
                </div>
              </details>
            )}
            <span className="demo-flag">Démonstration — dossiers fictifs</span>
          </div>
        </div>
        {message && (
          <p role="alert" className="notice">
            {message}
          </p>
        )}
        {current && (
          <TaskForm
            key={current.key + JSON.stringify(preset)}
            task={current}
            preset={preset}
            run={run}
            close={() => setTask("")}
          />
        )}
        {view === "dashboard" && dashboard()}
        {view === "reports" && reports()}
        {view === "audit" && auditView()}
        {!["dashboard", "reports", "audit"].includes(view) && listView(view)}
      </section>
      {detailView()}
    </div>
  );
}
