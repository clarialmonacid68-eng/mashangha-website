import { expect, test } from "@playwright/test";

const publicPages = [
  ["/", "找到靠谱开发者"],
  ["/demands", "需求市场"],
  ["/developers", "开发者市场"],
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
    page.getByRole("link", { name: "发布开发需求" }),
  ).toHaveAttribute("href", "/workspace/customer/demands/new");
  await expect(page.getByRole("link", { name: "浏览开发者" })).toHaveAttribute(
    "href",
    "/developers",
  );
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
