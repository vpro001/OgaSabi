import { expect, test } from "@playwright/test";

// The API is stubbed, so these check the forms themselves and need no database.

test("sign-up refuses a mistyped password and never sends the confirmation", async ({ page }) => {
  const sent: Record<string, unknown>[] = [];
  await page.route("**/api/v1/auth/register", async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({
      status: 500,
      json: { success: false, error: { code: "INTERNAL_ERROR", message: "x" } },
    });
  });
  await page.goto("/register");
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Last name").fill("Obi");
  await page.getByLabel("Email address").fill("ada.confirm@ogasabi.test");
  await page.getByLabel("Password", { exact: true }).fill("OgaSabi#Dev2026");
  await page.getByLabel(/I agree to the/).check();
  const submit = page.getByRole("button", { name: /^Create account/ });

  await submit.click();
  await expect(page.getByText("Enter your password again")).toBeVisible();

  await page.getByLabel("Confirm password").fill("OgaSabi#Dev2027");
  await submit.click();
  await expect(page.getByText("The passwords do not match")).toBeVisible();
  expect(sent).toHaveLength(0);

  await page.getByLabel("Confirm password").fill("OgaSabi#Dev2026");
  await submit.click();
  await expect(page.getByText("The passwords do not match")).toBeHidden();
  await expect.poll(() => sent.length).toBe(1);
  expect(sent[0]).toMatchObject({ password: "OgaSabi#Dev2026" });
  expect(sent[0]).not.toHaveProperty("confirmPassword");
});

test("password reset refuses a mistyped new password", async ({ page }) => {
  const sent: Record<string, unknown>[] = [];
  await page.route("**/api/v1/auth/password/forgot", (route) =>
    route.fulfill({ json: { success: true, data: {} } }),
  );
  await page.route("**/api/v1/auth/password/reset", async (route) => {
    sent.push(route.request().postDataJSON());
    await route.fulfill({
      status: 500,
      json: { success: false, error: { code: "INTERNAL_ERROR", message: "x" } },
    });
  });
  await page.goto("/forgot-password");
  await page.getByLabel(/^Email/).fill("ada.confirm@ogasabi.test");
  await page.getByRole("button", { name: "Send code" }).click();
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByLabel("New password", { exact: true }).fill("OgaSabi#Dev2026");
  await page.getByLabel("Confirm new password").fill("OgaSabi#Dev2027");
  const submit = page.getByRole("button", { name: "Change password" });
  await submit.click();
  await expect(page.getByText("The passwords do not match")).toBeVisible();
  expect(sent).toHaveLength(0);

  await page.getByLabel("Confirm new password").fill("OgaSabi#Dev2026");
  await submit.click();
  await expect.poll(() => sent.length).toBe(1);
  expect(sent[0]).not.toHaveProperty("confirmPassword");
});
