import { expect, test } from "@playwright/test";

test("home page renders the brand and headline", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Know who is coming to fix it",
  );
});

test("health endpoint answers with the API envelope", async ({ request }) => {
  const res = await request.get("/api/v1/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ success: true, data: { status: "ok" } });
});
