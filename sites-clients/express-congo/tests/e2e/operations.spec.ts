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
