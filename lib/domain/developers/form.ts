import type { DeveloperApplicationInput } from "@/lib/domain/developers/schema";

function splitList(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseMoneyToCents(value: FormDataEntryValue | null) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) : -1;
}

export function createDeveloperApplicationFromForm(
  formData: FormData,
): DeveloperApplicationInput {
  return {
    bio: String(formData.get("bio") ?? ""),
    city: String(formData.get("city") ?? ""),
    contact: String(formData.get("contact") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
    payoutSubjectName: String(formData.get("payoutSubjectName") ?? ""),
    payoutSubjectType:
      formData.get("payoutSubjectType") === "company"
        ? "company"
        : "individual",
    portfolio: {
      description: String(formData.get("portfolioDescription") ?? ""),
      imageUrl: String(formData.get("portfolioImageUrl") ?? ""),
      title: String(formData.get("portfolioTitle") ?? ""),
      url: String(formData.get("portfolioUrl") ?? ""),
    },
    serviceScopes: splitList(formData.get("serviceScopes")),
    skills: splitList(formData.get("skills")),
    startingPriceCents: parseMoneyToCents(formData.get("startingPrice")),
  };
}
