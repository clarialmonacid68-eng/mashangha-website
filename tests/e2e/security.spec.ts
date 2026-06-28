import { expect, test } from "@playwright/test";

test("mutating api requests require same-origin origin header", async ({
  request,
}) => {
  const missingOrigin = await request.post("/api/demands", {
    data: { title: "no origin" },
  });
  expect(missingOrigin.status()).toBe(403);

  const crossOrigin = await request.post("/api/demands", {
    data: { title: "cross origin" },
    headers: { Origin: "https://evil.example" },
  });
  expect(crossOrigin.status()).toBe(403);
});
