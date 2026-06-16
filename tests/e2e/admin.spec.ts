import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

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
  const password = `Test-${crypto.randomUUID()}-Aa1!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
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
  await page.getByRole("tab", { name: "邮箱登录" }).click();
  await page.getByLabel("邮箱地址").fill(email);
  await page.getByRole("button", { name: "发送登录链接" }).click();
  await expect(page.getByText("登录链接已发送")).toBeVisible();

  return { email, userId: user.id };
}

async function consumeMagicLink(request: APIRequestContext, email: string) {
  let messageId: string | undefined;
  await expect
    .poll(
      async () => {
        const response = await request.get(
          "http://127.0.0.1:54324/api/v1/messages",
        );
        const payload = (await response.json()) as {
          messages: Array<{
            ID: string;
            To: Array<{ Address: string }>;
          }>;
        };
        const message = payload.messages.find((item) =>
          item.To.some(({ Address }) => Address === email),
        );
        messageId = message?.ID;
        return Boolean(messageId);
      },
      { timeout: 10_000 },
    )
    .toBe(true);

  const messageResponse = await request.get(
    `http://127.0.0.1:54324/api/v1/message/${messageId}`,
  );
  const message = (await messageResponse.json()) as {
    HTML: string;
    Text: string;
  };
  return `${message.Text}\n${message.HTML}`
    .match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]+/)?.[0]
    .replaceAll("&amp;", "&");
}

test("non-admin users cannot access operations console", async ({
  page,
  request,
}) => {
  const account = await createSignedInUser(page, "customer");
  const magicLink = await consumeMagicLink(request, account.email);
  expect(magicLink).toBeTruthy();
  await page.goto(magicLink!);

  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "运营后台" })).not.toBeVisible();
  await expect(page).toHaveURL(/\/workspace\/settings|\/login/);
});

test("admin developer review writes audit log", async ({ page, request }) => {
  const adminClient = createAdminClient();
  const account = await createSignedInUser(page, "admin");
  const magicLink = await consumeMagicLink(request, account.email);
  expect(magicLink).toBeTruthy();
  await page.goto(magicLink!);

  const { data: developer, error: createError } =
    await adminClient.auth.admin.createUser({
      email: `pending-dev-${crypto.randomUUID()}@example.com`,
      password: `Test-${crypto.randomUUID()}-Aa1!`,
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
