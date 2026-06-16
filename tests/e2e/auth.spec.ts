import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

function createAdminClient() {
  return createClient(
    process.env.SUPABASE_URL ?? process.env.API_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

test("email and phone identifiers authenticate the same account", async ({
  page,
  request,
}) => {
  const email = `e2e-${Date.now()}@example.com`;
  const phone = "+8613800138000";
  const admin = createAdminClient();

  const { data: existingUsers, error: listError } =
    await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  expect(listError).toBeNull();

  const staleUsers =
    existingUsers?.users.filter(
      (user) =>
        user.phone === phone ||
        user.phone === phone.replace("+", "") ||
        user.email?.startsWith("e2e-"),
    ) ?? [];
  const staleUserIds = staleUsers.map((user) => user.id);

  if (staleUserIds.length) {
    const { error } = await admin
      .from("demands")
      .delete()
      .in("customer_id", staleUserIds);
    expect(error).toBeNull();
  }

  for (const user of staleUsers) {
    const { error } = await admin.auth.admin.deleteUser(user.id);
    expect(error).toBeNull();
  }

  await page.goto("/login");
  await page.getByRole("tab", { name: "邮箱登录" }).click();
  await page.getByLabel("邮箱地址").fill(email);
  await page.getByRole("button", { name: "发送登录链接" }).click();
  await expect(page.getByText("登录链接已发送")).toBeVisible();
  const verifierCookie = (await page.context().cookies()).find((cookie) =>
    cookie.name.includes("code-verifier"),
  );
  expect(verifierCookie?.domain).toBe("127.0.0.1");

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
  const content = `${message.Text}\n${message.HTML}`;
  const magicLink = content
    .match(/https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]+/)?.[0]
    .replaceAll("&amp;", "&");

  expect(magicLink).toBeTruthy();
  await page.goto(magicLink!);
  await expect(page).toHaveURL(/\/workspace\/settings$/);
  await expect(page.getByRole("heading", { name: "工作台身份" })).toBeVisible();
  await expect(page.getByText("客户工作台")).toBeVisible();

  await page.getByRole("button", { name: "申请开发者认证" }).click();
  await expect(
    page.getByRole("button", { name: "切换为开发者" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "切换为开发者" }).click();
  await expect(page.getByText("开发者工作台")).toBeVisible();

  const accountId = await page.getByTestId("account-id").textContent();

  const { error: bindError } = await admin.auth.admin.updateUserById(
    accountId!,
    {
      phone,
      phone_confirm: true,
    },
  );
  expect(bindError).toBeNull();

  await page.context().clearCookies();
  await page.goto("/login");
  const phoneInput = page.getByLabel("手机号");
  await expect(phoneInput).toHaveValue("+86");
  await phoneInput.fill(phone);
  await page.getByRole("button", { name: "发送验证码" }).click();
  await expect(page).toHaveURL(/\/verify\?phone=%2B8613800138000$/);
  await page.getByLabel("6 位验证码").fill("123456");
  await page.getByRole("button", { name: "完成登录" }).click();
  await expect(page).toHaveURL(/\/workspace\/settings$/);
  await expect(page.getByTestId("account-id")).toHaveText(accountId!);

  await page.goto("/workspace/customer/demands/new");
  await expect(page.getByRole("heading", { name: "发布开发需求" })).toBeVisible();
  await page.getByLabel("需求标题").fill("企业官网接入 AI 客服");
  await page
    .getByLabel("需求描述")
    .fill("希望在企业官网右下角接入 AI 客服，支持产品问答、线索收集和人工联系方式展示。");
  await page.getByLabel("项目类型").selectOption("ai_app");
  await page.getByLabel("预算下限（元）").fill("3000");
  await page.getByLabel("预算上限（元）").fill("8000");
  await page.getByLabel("期望周期（天）").fill("21");
  await page.getByLabel("合作方式").selectOption("fixed_scope");
  await page.getByRole("button", { name: "提交需求审核" }).click();
  await expect(page).toHaveURL(
    /\/workspace\/customer\/demands\/new\?submitted=1$/,
  );
  await expect(page.getByText("需求已提交审核。")).toBeVisible();
});
