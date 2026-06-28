import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const PASSWORD = "Test-Password-Aa1!";

function createAdminClient() {
  return createClient(
    process.env.SUPABASE_URL ?? process.env.API_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function createSignedInUser(page: Page, role: "admin" | "customer") {
  const admin = createAdminClient();
  const email = `admin-e2e-${role}-${crypto.randomUUID()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  expect(error).toBeNull();
  expect(data.user).not.toBeNull();
  const user = data.user!;

  if (role === "admin") {
    const { error: roleError } = await admin.from("user_roles").insert({
      role: "admin",
      user_id: user.id,
    });
    expect(roleError).toBeNull();
  }

  await page.goto("/login");
  await page.getByLabel("邮箱地址").fill(email);
  await page.getByLabel("密码").fill(PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/workspace\//);

  return { email, userId: user.id };
}

test("non-admin users cannot access operations console", async ({ page }) => {
  await createSignedInUser(page, "customer");
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "运营后台" })).not.toBeVisible();
  await expect(page).toHaveURL(/\/workspace\/settings|\/login/);
});

test("admin developer review writes audit log", async ({ page }) => {
  const adminClient = createAdminClient();
  await createSignedInUser(page, "admin");

  const { data: developer, error: createError } =
    await adminClient.auth.admin.createUser({
      email: `pending-dev-${crypto.randomUUID()}@example.com`,
      password: PASSWORD,
      email_confirm: true,
    });
  expect(createError).toBeNull();
  expect(developer.user).not.toBeNull();
  const developerUser = developer.user!;
  const { error: profileError } = await adminClient
    .from("developer_profiles")
    .upsert({
      bio: "等待后台审核的开发者资料。",
      headline: "待审核开发者",
      review_status: "pending",
      skills: ["AI 应用"],
      user_id: developerUser.id,
    });
  expect(profileError).toBeNull();
  const { error: roleError } = await adminClient.from("user_roles").insert({
    role: "developer",
    user_id: developerUser.id,
  });
  expect(roleError).toBeNull();

  await page.goto("/admin/developers");
  await expect(page.getByRole("heading", { name: "开发者审核" })).toBeVisible();
  await page
    .getByRole("textbox", { name: `审核备注-${developerUser.id}` })
    .fill("资料完整，允许入驻。");
  await page
    .getByRole("button", { name: `通过开发者-${developerUser.id}` })
    .click();
  await expect(page.getByText("资料完整，允许入驻。").first()).toBeVisible();

  await expect
    .poll(async () => {
      const { data: auditLogs, error: auditError } = await adminClient
        .from("audit_logs")
        .select("action, entity_type, entity_id")
        .eq("entity_id", developerUser.id);
      expect(auditError).toBeNull();
      return auditLogs ?? [];
    })
    .toContainEqual({
      action: "developer.approve",
      entity_id: developerUser.id,
      entity_type: "developer_profile",
    });
});
