import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

function createAdminClient() {
  return createClient(
    process.env.SUPABASE_URL ?? process.env.API_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

const PASSWORD = "Test-Password-Aa1!";

test("a visitor can self-register and reach the workspace", async ({ page }) => {
  const email = `e2e-register-${crypto.randomUUID()}@example.com`;

  await page.goto("/register");
  await page.getByLabel("邮箱地址").fill(email);
  await page.getByLabel("设置密码").fill(PASSWORD);
  await page.getByLabel("确认密码").fill(PASSWORD);
  await page.getByRole("button", { name: "注册" }).click();

  // With email confirmation disabled, signUp returns a session and we land in
  // the workspace; the new account defaults to the customer role.
  await expect(page).toHaveURL(/\/workspace\/settings$/);
  await expect(page.getByRole("heading", { name: "工作台身份" })).toBeVisible();
  await expect(page.getByText("客户工作台")).toBeVisible();

  // The same account can pick up the developer role and switch into it.
  await page.getByRole("button", { name: "申请开发者认证" }).click();
  await expect(
    page.getByRole("button", { name: "切换为开发者" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "切换为开发者" }).click();
  await expect(page.getByText("开发者工作台")).toBeVisible();
});

test("a registered user can sign in with email and password", async ({
  page,
}) => {
  const email = `e2e-login-${crypto.randomUUID()}@example.com`;
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  expect(error).toBeNull();

  await page.goto("/login");
  await page.getByLabel("邮箱地址").fill(email);
  await page.getByLabel("密码").fill(PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page).toHaveURL(/\/workspace\/settings$/);
  await expect(page.getByText("客户工作台")).toBeVisible();
});

test("wrong password is rejected", async ({ page }) => {
  const email = `e2e-badpass-${crypto.randomUUID()}@example.com`;
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  expect(error).toBeNull();

  await page.goto("/login");
  await page.getByLabel("邮箱地址").fill(email);
  await page.getByLabel("密码").fill("wrong-password-123");
  await page.getByRole("button", { name: "登录" }).click();

  await expect(page.getByText("邮箱或密码不正确，请重试。")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
