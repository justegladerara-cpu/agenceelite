import { test, expect, APIRequestContext } from "@playwright/test";
test("permissions API, réception jusqu’à remise, PDF, étiquette et portail client", async ({
  request,
  page,
}) => {
  test.setTimeout(60000);
  const origin = "http://127.0.0.1:3000";
  async function login(context: APIRequestContext, email: string) {
    const session = await (await context.get("/api/demo/session")).json();
    const r = await context.post("/api/demo/session", {
      headers: { Origin: origin },
      data: { email, password: "DemoExpress!2026", code: session.secondStep },
    });
    expect(r.status()).toBe(200);
  }
  async function command(command: string, data: Record<string, unknown>) {
    const r = await request.post("/api/demo/operations", {
      headers: { Origin: origin },
      data: { command, ...data },
    });
    expect(r.status(), await r.text()).toBe(201);
    return r.json();
  }
  expect((await request.get("/api/demo/operations")).status()).toBe(401);
  await login(request, "admin@example.invalid");
  const s = await command("newShipment", {
    owner: "client-demo-a",
    agency: "paris",
    service: "maritime",
    destination: "Brazzaville",
  });
  const measures = {
    length: "60",
    width: "40",
    height: "40",
    weight: "12",
    quantity: "3",
    unit: "cm",
  };
  const parcel = await command("receiveParcel", {
    shipmentId: s.id,
    description: "Colis fictifs",
    declared: measures,
    controlled: measures,
  });
  const label = await request.get("/api/demo/label?id=" + parcel.id);
  expect(label.status()).toBe(200);
  expect(await label.text()).toContain("data:image/png");
  const d = await command("newDeparture", {
    agency: "paris",
    mode: "maritime",
    scheduledAt: "2026-12-01T10:00:00Z",
  });
  for (const status of ["recu-en-agence", "controle", "en-attente-de-depart"])
    await command("event", {
      shipmentId: s.id,
      status,
      location: "Agence fictive",
    });
  await command("assignDeparture", { shipmentId: s.id, departureId: d.id });
  const manifest = await request.get("/api/demo/manifest?id=" + d.id);
  expect(await manifest.text()).toContain(s.payload.reference);
  for (const status of ["expedie", "arrive", "disponible-au-retrait"])
    await command("event", {
      shipmentId: s.id,
      status,
      location: "Agence fictive",
    });
  await command("event", {
    shipmentId: s.id,
    status: "remis",
    location: "Agence fictive",
    proof: "Remise fictive avec contrôle",
    entitlementConfirmed: true,
  });
  const proposal = await command("proposal", {
    shipmentId: s.id,
    totalMinor: "10000",
    currency: "EUR",
    exclusions: "Proposition fictive, aucun transport réel",
    validUntil: "2099-01-01",
  });
  await login(request, "client-b@example.invalid");
  expect((await request.get("/api/demo/operations?id=" + s.id)).status()).toBe(
    403,
  );
  expect(
    (await request.get("/api/demo/proposal-pdf?id=" + proposal.id)).status(),
  ).toBe(403);
  await login(request, "agent-brazzaville@example.invalid");
  expect((await request.get("/api/demo/operations?id=" + s.id)).status()).toBe(
    403,
  );
  await login(request, "client-a@example.invalid");
  const own = await (
    await request.get("/api/demo/operations?id=" + s.id)
  ).json();
  expect(own.payload.status).toBe("remis");
  const pdf = await request.get("/api/demo/proposal-pdf?id=" + proposal.id);
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  const accepted = await command("acceptProposal", { proposalId: proposal.id });
  expect(accepted.payment).toBe("non-confirme");
  expect(
    (
      await request.post("/api/demo/operations", {
        headers: { Origin: origin },
        data: {
          command: "event",
          shipmentId: s.id,
          status: "incident",
          location: "Faux",
        },
      })
    ).status(),
  ).toBe(403);
  await page.goto("/demo");
  await page
    .getByLabel("Compte", { exact: true })
    .selectOption("client-a@example.invalid");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("DemoExpress!2026");
  await page
    .getByRole("button", { name: "Se connecter à la démonstration" })
    .click();
  await expect(
    page.getByText("Profil : client", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Expéditions", exact: true }),
  ).toBeVisible();
});
test("demandes web : traitement contrôlé côté serveur et tableau de bord", async ({
  page,
  request,
  playwright,
}) => {
  const origin = "http://127.0.0.1:3000";
  const created = await request.post("/api/devis", {
    headers: {
      Origin: origin,
      "Idempotency-Key": "e2e-backoffice-" + Date.now(),
    },
    multipart: {
      payload: JSON.stringify({
        kind: "particulier",
        service: "aerien",
        destination: "Brazzaville",
        description: "Cartons fictifs pour test de gestion",
        parcels: [
          {
            length: "60",
            width: "40",
            height: "40",
            weight: "12",
            quantity: "3",
            unit: "cm",
          },
        ],
        customs: "",
        desiredDate: "",
        agency: "paris",
        city: "Ville fictive",
        name: "Client Gestion Test",
        email: "gestion@example.invalid",
        phone: "+33000000000",
        channel: "email",
        comment: "",
        frequency: "",
        constraints: "",
        privacy: true,
        marketing: false,
      }),
    },
  });
  expect(created.status()).toBe(201);
  async function as(email: string) {
    const ctx = await playwright.request.newContext({ baseURL: origin });
    const s = await (await ctx.get("/api/demo/session")).json();
    expect(
      (
        await ctx.post("/api/demo/session", {
          headers: { Origin: origin },
          data: { email, password: "DemoExpress!2026", code: s.secondStep },
        })
      ).status(),
    ).toBe(200);
    return ctx;
  }
  const admin = await as("admin@example.invalid");
  const html = await (await admin.get("/demo/")).text();
  expect(html).toContain("Client Gestion Test");
  // L’identifiant est lu depuis la page rendue pour l’administrateur.
  const { reference } = await created.json();
  const id = new RegExp(
    `"id":"([0-9a-f-]{36})","reference":"${reference}"`,
  ).exec(html.replace(/\\"/g, '"'))?.[1];
  expect(id).toBeTruthy();
  const post = (ctx: typeof admin, status: string) =>
    ctx.post("/api/demo/operations", {
      headers: { Origin: origin },
      data: { command: "quoteStatus", quoteId: id, status },
    });
  const client = await as("client-a@example.invalid");
  expect((await post(client, "en-etude")).status()).toBe(403);
  expect((await post(admin, "acceptee")).status()).toBe(422);
  expect((await post(admin, "en-etude")).status()).toBe(201);

  await page.goto("/demo/");
  const s = await (await page.request.get("/api/demo/session")).json();
  await page
    .getByLabel("Compte", { exact: true })
    .selectOption("admin@example.invalid");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("DemoExpress!2026");
  await page.getByLabel("Code administrateur (simulation)").fill(s.secondStep);
  await page
    .getByRole("button", { name: "Se connecter à la démonstration" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Tableau de bord" }),
  ).toBeVisible();
  await expect(page.getByText("Expéditions par étape")).toBeVisible();
  await page.getByRole("button", { name: "Demandes web", exact: true }).click();
  await page.getByRole("row", { name: /Client Gestion Test/ }).click();
  await expect(page.getByRole("dialog")).toContainText("En étude");
  await expect(
    page.getByRole("button", { name: "Passer à « Proposition envoyée »" }),
  ).toBeVisible();
});
