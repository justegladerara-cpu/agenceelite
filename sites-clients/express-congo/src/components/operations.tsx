"use client";
import { useState } from "react";
import type { Actor, Entity } from "@/domain/operations";
import { shipmentStates } from "@/domain/operations";
import type { demoAccounts } from "@/server/demo-auth";
type Field = {
  name: string;
  label: string;
  type?: string;
  value?: string;
  options?: { value: string; label: string }[];
};
const labels: Record<string, string> = {
  service: "Service",
  route: "Route",
  destination: "Destination",
  status: "État",
  reference: "Référence",
  scheduledAt: "Date prévisionnelle",
  confirmedAt: "Date confirmée",
  mode: "Mode",
  number: "Numéro",
  version: "Version",
  totalMinor: "Total",
  currency: "Devise",
  exclusions: "Prestations et exclusions",
  validUntil: "Validité",
  acceptedAt: "Acceptée le",
  location: "Lieu",
  occurredAt: "Date de l’événement",
  reason: "Motif",
  description: "Contenu",
  reserves: "État et réserves",
  priceReviewRequired: "Révision des mesures requise",
  priceReviewApproved: "Révision approuvée",
  approvalReason: "Motif de l’accord",
  subject: "Sujet",
  body: "Contenu privé",
  type: "Document",
};
const agencyOptions = ["paris", "brazzaville", "pointe-noire"].map((value) => ({
  value,
  label: value,
}));
const select = (name: string, label: string, items: Entity[]): Field => ({
  name,
  label,
  options: items.map((i) => ({
    value: i.id,
    label: String(i.payload.reference || i.payload.number || i.id).slice(0, 45),
  })),
});
function CommandForm({
  title,
  command,
  fields,
  run,
}: {
  title: string;
  command: string;
  fields: Field[];
  run: (command: string, input: Record<string, unknown>) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const data = Object.fromEntries(new FormData(e.currentTarget));
        await run(command, data);
        setBusy(false);
      }}
    >
      <h3>{title}</h3>
      {fields.map((f) => (
        <label key={f.name} htmlFor={`${command}-${f.name}`}>
          {f.label}
          {f.options ? (
            <select
              id={`${command}-${f.name}`}
              name={f.name}
              defaultValue={f.value}
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`${command}-${f.name}`}
              name={f.name}
              type={f.type || "text"}
              defaultValue={f.value}
              required
            />
          )}
        </label>
      ))}
      <button className="button" disabled={busy}>
        Enregistrer {title.toLowerCase()}
      </button>
    </form>
  );
}
export function Operations({
  actor,
  entities,
  accounts,
  code,
}: {
  actor: Actor | null;
  entities: Entity[];
  accounts: typeof demoAccounts;
  code: string;
}) {
  const [message, setMessage] = useState(""),
    [kind, setKind] = useState("shipment"),
    [search, setSearch] = useState(""),
    [email, setEmail] = useState("client-a@example.invalid"),
    [password, setPassword] = useState(""),
    [factor, setFactor] = useState("");
  async function run(command: string, input: Record<string, unknown>) {
    if (command === "receiveParcel") {
      const parcel = {
        length: String(input.length),
        width: String(input.width),
        height: String(input.height),
        weight: String(input.weight),
        quantity: String(input.quantity),
        unit: "cm",
      };
      input = {
        ...input,
        declared: parcel,
        controlled: { ...parcel, weight: String(input.controlledWeight) },
      };
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
      return;
    }
    const data = await r.json();
    const explanations: Record<string, string> = {
      ACCESS_DENIED: "Votre rôle ne permet pas cette opération.",
      INVALID_TRANSITION:
        "Cette transition ne correspond pas à l’état actuel de l’expédition.",
      REVIEW_REQUIRED:
        "Contrôlez les colis et approuvez la révision des mesures avant affectation.",
      ASSIGNMENT_CONFLICT:
        "Cette expédition est déjà affectée ou incompatible avec ce départ.",
      WITHDRAWAL_PROOF_REQUIRED:
        "Confirmez le droit de retrait et renseignez une preuve avant la remise.",
      INVALID_MEASUREMENTS: "Vérifiez les dimensions et les poids.",
      INVALID_INPUT: "Vérifiez les valeurs saisies.",
      INVALID_OWNER: "Choisissez un client vérifié.",
    };
    setMessage(
      explanations[data.message] || "L’opération n’a pas pu être enregistrée.",
    );
  }
  if (!actor)
    return (
      <div className="login card">
        <span className="eyebrow">
          Dossiers fictifs séparés · Aucune opération réelle
        </span>
        <h2>Tester un rôle</h2>
        <p>
          Comptes de démonstration : mot de passe <code>DemoExpress!2026</code>.
          Le second facteur simulé de l’administrateur est{" "}
          <strong>{code}</strong> (valable 30 secondes ; actualiser si expiré).
        </p>
        <form
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
                "Accès refusé. Vérifiez les identifiants et le second facteur.",
              );
          }}
        >
          <label>
            Compte
            <select
              aria-label="Compte"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.email}>
                  {a.email} · {a.role} · {a.agency}
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
            Second facteur administrateur (simulation)
            <input
              value={factor}
              onChange={(e) => setFactor(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <button className="button">Se connecter à la démonstration</button>
          {message && <p role="alert">{message}</p>}
        </form>
      </div>
    );
  const filtered = (type: string) => entities.filter((e) => e.kind === type),
    shipments = filtered("shipment"),
    parcels = filtered("parcel"),
    departures = filtered("departure"),
    proposals = filtered("proposal"),
    tickets = filtered("ticket");
  const choices = accounts
    .filter((a) => a.role === "client")
    .map((a) => ({ value: a.id, label: a.email }));
  return (
    <div>
      <div className="notice">
        <strong>Démonstration opérationnelle</strong>
        <p>
          Profil : {actor.role}, agence : {actor.agency}. Les états et
          procédures sont proposés, à valider. Aucun départ, paiement ou message
          réel.
        </p>
      </div>
      <div className="admin-toolbar">
        <p>Dossiers visibles selon vos permissions : {entities.length}</p>
        <button
          className="text-button"
          onClick={async () => {
            await fetch("/api/demo/session", { method: "DELETE" });
            location.reload();
          }}
        >
          Se déconnecter du portail
        </button>
      </div>
      {message && (
        <p role="alert" className="notice">
          {message}
        </p>
      )}
      <nav className="ops-tabs" aria-label="Modules">
        {[
          ["shipment", "Expéditions"],
          ["parcel", "Colis"],
          ["departure", "Départs"],
          ["proposal", "Propositions"],
          ["event", "Historique"],
          ["document", "Documents privés"],
          ["ticket", "Assistance"],
        ]
          .filter(([k]) => actor.role !== "client" || k !== "departure")
          .map(([k, label]) => (
            <button
              key={k}
              className={kind === k ? "button" : "button secondary"}
              onClick={() => setKind(k)}
            >
              {label}
            </button>
          ))}
      </nav>
      <label>
        Rechercher dans les dossiers visibles
        <input value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>
      <div className="admin-list">
        {entities
          .filter(
            (e) =>
              e.kind === kind &&
              JSON.stringify(e).toLowerCase().includes(search.toLowerCase()),
          )
          .map((e) => (
            <article className="card" key={e.id}>
              <h3>
                {String(
                  e.payload.reference ||
                    e.payload.number ||
                    e.payload.subject ||
                    e.payload.status ||
                    e.kind,
                )}
              </h3>
              <p>
                Agence : {e.agency} · Révision {e.revision}
              </p>
              <dl className="recap">
                {Object.entries(e.payload)
                  .filter(([k]) => !!labels[k])
                  .map(([k, v]) => (
                    <div key={k}>
                      <dt>{labels[k]}</dt>
                      <dd>
                        {v == null
                          ? "—"
                          : typeof v === "boolean"
                            ? v
                              ? "Oui"
                              : "Non"
                            : k === "totalMinor"
                              ? new Intl.NumberFormat("fr-FR", {
                                  style: "currency",
                                  currency: String(e.payload.currency),
                                }).format(
                                  Number(v) /
                                    (e.payload.currency === "EUR" ? 100 : 1),
                                )
                              : [
                                    "occurredAt",
                                    "scheduledAt",
                                    "confirmedAt",
                                    "acceptedAt",
                                  ].includes(k)
                                ? new Intl.DateTimeFormat("fr-FR", {
                                    dateStyle: "medium",
                                    timeStyle: "short",
                                    timeZone:
                                      e.agency === "paris"
                                        ? "Europe/Paris"
                                        : "Africa/Brazzaville",
                                  }).format(new Date(String(v)))
                                : String(v)}
                      </dd>
                    </div>
                  ))}
              </dl>
              {e.kind === "parcel" && (
                <>
                  <p>
                    Mesures déclarées : {JSON.stringify(e.payload.declared)}
                  </p>
                  <p>
                    Mesures contrôlées : {JSON.stringify(e.payload.controlled)}
                  </p>
                  <a href={"/api/demo/label?id=" + e.id} target="_blank">
                    Étiquette privée à imprimer →
                  </a>
                </>
              )}
              {e.kind === "proposal" && (
                <div className="actions">
                  <a href={"/api/demo/proposal-pdf?id=" + e.id}>
                    Télécharger la proposition PDF
                  </a>
                  {actor.role === "client" &&
                    e.payload.status === "proposition-envoyee" && (
                      <button
                        className="button"
                        onClick={() =>
                          run("acceptProposal", { proposalId: e.id })
                        }
                      >
                        Accepter la proposition
                      </button>
                    )}
                </div>
              )}
              {e.kind === "departure" && (
                <a href={"/api/demo/manifest?id=" + e.id}>
                  Exporter le manifeste CSV privé →
                </a>
              )}
            </article>
          ))}
        {!filtered(kind).length && (
          <p>Aucun dossier de ce type dans votre périmètre.</p>
        )}
      </div>
      <section className="section">
        <h2>
          {actor.role === "client"
            ? "Vos demandes d’assistance"
            : "Opérations autorisées par votre rôle"}
        </h2>
        <div className="two-col">
          {["admin", "manager", "agent"].includes(actor.role) && (
            <>
              <CommandForm
                title="Nouvelle expédition"
                command="newShipment"
                run={run}
                fields={[
                  { name: "owner", label: "Client vérifié", options: choices },
                  {
                    name: "agency",
                    label: "Agence responsable",
                    options:
                      actor.role === "admin"
                        ? agencyOptions
                        : agencyOptions.filter((a) => a.value === actor.agency),
                  },
                  {
                    name: "service",
                    label: "Service",
                    options: ["aerien", "maritime", "conteneur"].map(
                      (value) => ({ value, label: value }),
                    ),
                  },
                  {
                    name: "destination",
                    label: "Destination",
                    options: ["Brazzaville", "Pointe-Noire"].map((value) => ({
                      value,
                      label: value,
                    })),
                  },
                ]}
              />
              {shipments.length > 0 && (
                <>
                  <CommandForm
                    title="Réception du colis"
                    command="receiveParcel"
                    run={run}
                    fields={[
                      select("shipmentId", "Expédition", shipments),
                      { name: "description", label: "Contenu" },
                      { name: "length", label: "Longueur (cm)" },
                      { name: "width", label: "Largeur (cm)" },
                      { name: "height", label: "Hauteur (cm)" },
                      { name: "weight", label: "Poids déclaré (kg)" },
                      {
                        name: "controlledWeight",
                        label: "Poids contrôlé (kg)",
                      },
                      { name: "quantity", label: "Quantité", value: "1" },
                      {
                        name: "reserves",
                        label: "État et réserves",
                        value:
                          "Aucune réserve relevée dans cette démonstration",
                      },
                    ]}
                  />
                  <CommandForm
                    title="Événement de suivi"
                    command="event"
                    run={run}
                    fields={[
                      select("shipmentId", "Expédition", shipments),
                      {
                        name: "status",
                        label: "Nouvel état",
                        options: shipmentStates.map((value) => ({
                          value,
                          label: value,
                        })),
                      },
                      { name: "location", label: "Lieu" },
                      {
                        name: "reason",
                        label: "Motif",
                        value: "Saisie de démonstration",
                      },
                      {
                        name: "proof",
                        label: "Preuve de remise (privée)",
                        value: "Non applicable hors remise",
                      },
                      {
                        name: "entitlementConfirmed",
                        label: "Droit de retrait confirmé",
                        options: [
                          { value: "non", label: "Non" },
                          { value: "oui", label: "Oui, contrôle réalisé" },
                        ],
                      },
                    ]}
                  />
                </>
              )}
              <CommandForm
                title="Nouveau départ"
                command="newDeparture"
                run={run}
                fields={[
                  {
                    name: "agency",
                    label: "Agence",
                    options:
                      actor.role === "admin"
                        ? agencyOptions
                        : agencyOptions.filter((a) => a.value === actor.agency),
                  },
                  {
                    name: "mode",
                    label: "Mode",
                    options: ["aerien", "maritime"].map((value) => ({
                      value,
                      label: value,
                    })),
                  },
                  {
                    name: "scheduledAt",
                    label: "Date prévisionnelle (UTC)",
                    type: "datetime-local",
                  },
                ]}
              />
              {shipments.length > 0 && departures.length > 0 && (
                <CommandForm
                  title="Affectation au départ"
                  command="assignDeparture"
                  run={run}
                  fields={[
                    select("shipmentId", "Expédition", shipments),
                    select("departureId", "Départ", departures),
                  ]}
                />
              )}
            </>
          )}
          {["admin", "manager"].includes(actor.role) && parcels.length > 0 && (
            <CommandForm
              title="Accord sur les mesures"
              command="approveMeasures"
              run={run}
              fields={[
                select("parcelId", "Colis contrôlé", parcels),
                { name: "reason", label: "Motif et accord tracé" },
              ]}
            />
          )}
          {["admin", "sales"].includes(actor.role) && shipments.length > 0 && (
            <CommandForm
              title="Proposition commerciale"
              command="proposal"
              run={run}
              fields={[
                select("shipmentId", "Expédition", shipments),
                {
                  name: "totalMinor",
                  label: "Total en unités mineures (centimes EUR / francs XAF)",
                },
                {
                  name: "currency",
                  label: "Devise",
                  options: [
                    { value: "EUR", label: "EUR" },
                    { value: "XAF", label: "XAF" },
                  ],
                },
                { name: "exclusions", label: "Détail et exclusions" },
                { name: "validUntil", label: "Valable jusqu’au", type: "date" },
              ]}
            />
          )}
          <CommandForm
            title="Demande d’assistance"
            command="ticket"
            run={run}
            fields={[
              { name: "subject", label: "Sujet" },
              { name: "body", label: "Votre demande" },
            ]}
          />
          {tickets.length > 0 && (
            <CommandForm
              title="Réponse d’assistance"
              command="replyTicket"
              run={run}
              fields={[
                select("ticketId", "Demande", tickets),
                { name: "body", label: "Réponse" },
              ]}
            />
          )}
        </div>
      </section>
      {actor.role === "client" && (
        <p>
          Les demandes en invité ne sont pas rattachées sur simple déclaration
          d’email. La vérification de rattachement reste à développer.{" "}
          {proposals.length} proposition(s) visible(s).
        </p>
      )}
    </div>
  );
}
