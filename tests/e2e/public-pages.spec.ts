import { expect, test } from "@playwright/test";

import { createProductForReview } from "@/lib/domain/products/service";
import {
  approveDeveloper,
  createAdminClient,
  createSignedInUser,
} from "./marketplace-flow-helpers";

const publicPages = [
  ["/", "找到靠谱开发者"],
  ["/demands", "需求市场"],
  ["/developers", "开发者市场"],
  ["/digital-employees", "把重复工作，交给定制的数字员工"],
  ["/products", "即买即用的 AI 应用"],
  ["/rules/service", "服务协议"],
  ["/rules/privacy", "隐私政策"],
  ["/rules/trading", "交易规则"],
  ["/rules/disputes", "争议处理规则"],
] as const;

for (const [path, heading] of publicPages) {
  test(`${path} is accessible and avoids unsupported promises`, async ({
    page,
  }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: new RegExp(heading) })).toBeVisible();

    const body = await page.locator("body").innerText();
    expect(body).not.toMatch(/资金托管|保证退款|30\s*天售后/);
    expect(body).not.toMatch(/成交\s*\d+|服务\s*\d+\s*位|好评率\s*\d+/);
  });
}

test("homepage exposes real primary actions", async ({ page }) => {
  await page.goto("/");
  await expect(
    page
      .getByRole("link", { name: "发布开发需求" })
      .filter({ hasText: "发布开发需求" })
      .first(),
  ).toHaveAttribute("href", "/workspace/customer/demands/new");
  await expect(
    page.getByRole("link", { name: "浏览开发者" }).first(),
  ).toHaveAttribute("href", "/developers");
});

test("mobile navigation exposes marketplace and rules links", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByText("菜单", { exact: true }).click();
  const mobileNavigation = page.getByLabel("移动端导航");
  await expect(
    mobileNavigation.getByRole("link", { name: "需求市场" }),
  ).toBeVisible();
  await expect(
    mobileNavigation.getByRole("link", { name: "开发者市场" }),
  ).toBeVisible();
  await expect(
    mobileNavigation.getByRole("link", { name: "交易规则" }),
  ).toBeVisible();
});

test("digital employees page preselects the digital employee demand type", async ({
  page,
}) => {
  await page.goto("/digital-employees");

  const firstRoleCta = page
    .getByRole("link", { name: "定制这个数字员工" })
    .first();

  await expect(firstRoleCta).toHaveAttribute(
    "href",
    /\/workspace\/customer\/demands\/new\?type=digital_employee&title=/,
  );
});

test("public product marketplace links to detail and login purchase flow", async ({
  page,
}) => {
  const admin = createAdminClient();
  const seller = await createSignedInUser(admin, "public-product-seller");
  await approveDeveloper(admin, seller.userId);

  const productTitle = `公开商品 ${crypto.randomUUID().slice(0, 8)}`;
  const product = await createProductForReview(seller.client, {
    category: "ai_agent",
    description:
      "用于公开产品页端到端测试的 AI 应用，覆盖列表、详情和未登录购买入口。",
    fulfillment: `public-license-${crypto.randomUUID()}`,
    priceYuan: 299,
    summary: "公开产品页测试商品",
    title: productTitle,
  });

  const { error: publishError } = await admin
    .from("products")
    .update({
      published_at: new Date().toISOString(),
      review_notes: "Public page E2E approved",
      status: "published",
    })
    .eq("id", product.id);
  expect(publishError).toBeNull();

  await page.goto(`/products?keyword=${encodeURIComponent(productTitle)}`);

  await expect(page.getByText(productTitle)).toBeVisible();
  await page.getByRole("link", { name: new RegExp(productTitle) }).click();

  await expect(page).toHaveURL(new RegExp(`/products/${product.id}`));
  await expect(
    page.getByRole("heading", { name: productTitle }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "立即购买（模拟）" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "立即购买（模拟）" }).click();
  await expect(page).toHaveURL(/\/login/);
});
