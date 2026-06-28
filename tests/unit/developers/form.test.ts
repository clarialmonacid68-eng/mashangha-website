import { describe, expect, it } from "vitest";

import { createDeveloperApplicationFromForm } from "@/lib/domain/developers/form";

describe("developer application form helpers", () => {
  it("parses developer application form values into domain input", () => {
    const formData = new FormData();
    formData.set("displayName", "Ada Studio");
    formData.set("city", "Shanghai");
    formData.set("bio", "We build production AI applications.");
    formData.set("skills", "AI 应用\nNext.js，Supabase");
    formData.set("serviceScopes", "需求梳理, 原型开发\n上线部署");
    formData.set("startingPrice", "1288.5");
    formData.set("portfolioTitle", "AI CRM");
    formData.set("portfolioDescription", "An AI CRM automation project.");
    formData.set("portfolioUrl", "https://example.com/case");
    formData.set("portfolioImageUrl", "https://example.com/case.png");
    formData.set("contact", "ada@example.com");
    formData.set("payoutSubjectType", "company");
    formData.set("payoutSubjectName", "Ada Tech Ltd");

    expect(createDeveloperApplicationFromForm(formData)).toEqual({
      bio: "We build production AI applications.",
      city: "Shanghai",
      contact: "ada@example.com",
      displayName: "Ada Studio",
      payoutSubjectName: "Ada Tech Ltd",
      payoutSubjectType: "company",
      portfolio: {
        description: "An AI CRM automation project.",
        imageUrl: "https://example.com/case.png",
        title: "AI CRM",
        url: "https://example.com/case",
      },
      serviceScopes: ["需求梳理", "原型开发", "上线部署"],
      skills: ["AI 应用", "Next.js", "Supabase"],
      startingPriceCents: 128_850,
    });
  });

  it("defaults invalid payout type and invalid money consistently", () => {
    const formData = new FormData();
    formData.set("payoutSubjectType", "unknown");
    formData.set("startingPrice", "not-a-number");

    expect(createDeveloperApplicationFromForm(formData)).toMatchObject({
      payoutSubjectType: "individual",
      serviceScopes: [],
      skills: [],
      startingPriceCents: -1,
    });
  });
});
