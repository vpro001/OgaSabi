import { expect, test } from "@playwright/test";

test("home page renders the brand and headline", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Stop asking WhatsApp groups",
  );
});

test("health endpoint answers with the API envelope", async ({ request }) => {
  const res = await request.get("/api/v1/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ success: true, data: { status: "ok" } });
});

test("search lists artisans and a profile opens", async ({ page }) => {
  await page.goto("/search");
  const first = page.locator("article h3 a").first();
  await expect(first).toBeVisible();
  await first.click();
  await expect(page.getByText("Trust meter")).toBeVisible();
});

test("protected pages send visitors to sign in", async ({ page }) => {
  await page.goto("/requests");
  await expect(page).toHaveURL(/\/login\?next=%2Frequests/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("a customer can sign in and see their requests", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email or phone number").fill("adaeze.nwankwo@ogasabi.test");
  await page.getByLabel("Password", { exact: true }).fill("OgaSabi#Dev2026");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/requests$/);
  await expect(page.getByRole("heading", { level: 1, name: "My requests" })).toBeVisible();
});
