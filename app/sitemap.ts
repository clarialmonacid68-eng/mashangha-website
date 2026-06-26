import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.mshcode.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/digital-employees",
    "/products",
    "/demands",
    "/developers",
    "/rules/service",
    "/rules/privacy",
    "/rules/trading",
    "/rules/disputes",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date("2026-06-15"),
    changeFrequency: path ? "weekly" : "daily",
    priority: path ? 0.7 : 1,
  }));
}

