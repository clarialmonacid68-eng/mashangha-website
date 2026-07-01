import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const migrationDir = join(process.cwd(), "supabase", "migrations");

function readNormalizedMigrationSql() {
  return readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(join(migrationDir, file), "utf8"))
    .join("\n")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

describe("product schema database grants", () => {
  it("allows service role clients to review products in admin workflows", () => {
    const sql = readNormalizedMigrationSql();

    expect(sql).toContain(
      "grant select, update on public.products to service_role",
    );
  });
});
