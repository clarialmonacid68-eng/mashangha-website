import { expect, test, type Page } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { approveDeveloper, createAdminClient } from "./marketplace-flow-helpers";

/**
 * Full click-through UI smoke test for the phase-one transaction loop.
 *
 * Unlike the service-layer flow specs, every business action here is performed
 * by clicking real rendered pages:
 *   客户登录 -> 发布需求 -> 管理员审核发布 -> 开发者报价 -> 客户选标
 *   -> 页面创建并确认模拟支付 -> 开发者交付 -> 客户验收 -> 模拟结算 -> 评价
 *
 * Authentication uses the email + password login UI (signInWithPassword).
 *
 * Requires a running local Supabase stack and `pnpm dev`, with Supabase env
 * exported (SUPABASE_URL / ANON / SERVICE_ROLE keys).
 */

const PASSWORD = "Test-Password-Aa1!";

async function createConfirmedUser(admin: SupabaseClient, label: string) {
  const email = `uie2e-${label}-${crypto.randomUUID()}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  expect(error).toBeNull();
  expect(data.user).not.toBeNull();
  return { email, userId: data.user!.id };
}

async function grantAdminRole(admin: SupabaseClient, userId: string) {
  const { error } = await admin
    .from("user_roles")
    .upsert({ role: "admin", user_id: userId });
  expect(error).toBeNull();
}

/** Drive the email + password login UI and land in the workspace. */
async function loginWithPassword(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("邮箱地址").fill(email);
  await page.getByLabel("密码").fill(PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page).toHaveURL(/\/workspace\//);
}

test("full transaction loop is completable entirely through the UI", async ({
  browser,
  baseURL,
}) => {
  test.setTimeout(120_000);

  const admin = createAdminClient();
  const title = `UIE2E ${crypto.randomUUID().slice(0, 8)}`;

  // --- Actors ---
  const customer = await createConfirmedUser(admin, "customer");
  const developer = await createConfirmedUser(admin, "developer");
  await approveDeveloper(admin, developer.userId);
  const operator = await createConfirmedUser(admin, "admin");
  await grantAdminRole(admin, operator.userId);

  const customerContext = await browser.newContext({ baseURL: baseURL! });
  const developerContext = await browser.newContext({ baseURL: baseURL! });
  const adminContext = await browser.newContext({ baseURL: baseURL! });
  const customerPage = await customerContext.newPage();
  const developerPage = await developerContext.newPage();
  const adminPage = await adminContext.newPage();

  try {
    // 1) Customer logs in and publishes a demand for review.
    await loginWithPassword(customerPage, customer.email);
    await customerPage.goto("/workspace/customer/demands/new");
    await expect(
      customerPage.getByRole("heading", { name: "发布开发需求" }),
    ).toBeVisible();
    await customerPage.getByLabel("需求标题").fill(title);
    await customerPage
      .getByLabel("需求描述")
      .fill("完整 UI 流程测试需求：企业官网接入 AI 客服，支持问答和线索收集。");
    await customerPage.getByLabel("项目类型").selectOption("ai_app");
    await customerPage.getByLabel("预算下限（元）").fill("3000");
    await customerPage.getByLabel("预算上限（元）").fill("8000");
    await customerPage.getByLabel("期望周期（天）").fill("21");
    await customerPage.getByLabel("合作方式").selectOption("fixed_scope");
    await customerPage.getByRole("button", { name: "提交需求审核" }).click();
    await expect(customerPage.getByText("需求已提交审核。")).toBeVisible();

    const { data: demandRow } = await admin
      .from("demands")
      .select("id")
      .eq("title", title)
      .single();
    const demandId = demandRow!.id as string;

    // 2) Admin reviews and publishes the demand through the admin console.
    await loginWithPassword(adminPage, operator.email);
    await adminPage.goto("/admin/demands");
    const adminCard = adminPage.locator(".settings-card", { hasText: title });
    await expect(adminCard).toBeVisible();
    await adminCard
      .getByRole("textbox", { name: "审核备注" })
      .fill("需求描述清晰、预算合理，准予发布。");
    await adminCard.getByRole("button", { name: "发布" }).click();
    await expect(adminPage.getByText("已审核需求：")).toBeVisible();

    // 3) Developer logs in and submits a quote on the published demand.
    await loginWithPassword(developerPage, developer.email);
    await developerPage.goto("/workspace/developer/demands");
    const devCard = developerPage.locator(".settings-card", { hasText: title });
    await expect(devCard).toBeVisible();
    await devCard.locator('input[name="amountYuan"]').fill("5000");
    await devCard.locator('input[name="deliveryDays"]').fill("18");
    await devCard.locator('input[name="validDays"]').fill("14");
    await devCard
      .locator('textarea[name="proposal"]')
      .fill("提供完整方案：需求分析、原型、开发、测试与上线部署，含一次验收修改。");
    await devCard.getByRole("button", { name: "提交报价" }).click();
    await expect(developerPage.getByText("报价已提交。")).toBeVisible();

    // 4) Customer selects the quote, creating a pending-payment order.
    await customerPage.goto(`/workspace/customer/demands/${demandId}/quotes`);
    await customerPage.getByRole("button", { name: "选择此报价" }).click();
    await expect(customerPage.getByText("已选择报价。")).toBeVisible();

    const { data: orderRow } = await admin
      .from("orders")
      .select("id")
      .eq("demand_id", demandId)
      .single();
    const orderId = orderRow!.id as string;

    // 5) Customer creates and confirms the mock payment on the pay page.
    await customerPage.goto(`/workspace/orders/${orderId}/pay`);
    await customerPage.getByRole("checkbox").check();
    await customerPage.getByRole("button", { name: "创建模拟支付单" }).click();
    await expect(customerPage.getByText(/模拟支付单已创建/)).toBeVisible();
    await customerPage.getByRole("button", { name: "确认模拟支付" }).click();
    await expect(customerPage).toHaveURL(
      new RegExp(`/workspace/orders/${orderId}\\?payment=confirmed`),
    );

    // 6) Developer submits the formal delivery.
    await developerPage.goto(`/workspace/orders/${orderId}`);
    await developerPage
      .getByLabel("交付说明")
      .fill("首版交付，包含源码、部署说明和演示链接。");
    await developerPage
      .getByLabel("交付链接")
      .fill("https://example.com/mahcod-release");
    await developerPage.getByRole("button", { name: "提交正式交付" }).click();
    await expect(developerPage.getByText("交付已提交。")).toBeVisible();

    // 7) Customer accepts, settles (mock), and reviews.
    await customerPage.goto(`/workspace/orders/${orderId}`);
    await customerPage.getByRole("button", { name: "验收交付" }).click();
    await expect(customerPage.getByText("已验收交付。")).toBeVisible();

    await customerPage.getByRole("button", { name: "完成结算（模拟）" }).click();
    await expect(customerPage.getByText(/模拟结算已完成/)).toBeVisible();

    await customerPage.getByLabel("评分（1-5）").selectOption("5");
    await customerPage
      .getByLabel("评价内容（可选）")
      .fill("交付质量高，沟通顺畅，按时完成。");
    await customerPage.getByRole("button", { name: "提交评价" }).click();
    await expect(customerPage.getByText("评价已提交。")).toBeVisible();

    // 8) Verify final persisted state.
    const { data: finalOrder } = await admin
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .single();
    expect(finalOrder?.status).toBe("completed");

    const { data: review } = await admin
      .from("reviews")
      .select("rating")
      .eq("order_id", orderId)
      .single();
    expect(review?.rating).toBe(5);
  } finally {
    await customerContext.close();
    await developerContext.close();
    await adminContext.close();
  }
});
