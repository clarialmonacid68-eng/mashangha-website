import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { demandProjectTypes } from "@/lib/domain/demands/schema";

const migrationDir = join(process.cwd(), "supabase", "migrations");

function readMigrationSql() {
  return readdirSync(migrationDir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => readFileSync(join(migrationDir, file), "utf8"))
    .join("\n");
}

describe("demand schema database constraints", () => {
  it("keeps demand project type enum aligned with database constraint migrations", () => {
    const sql = readMigrationSql();

    for (const projectType of demandProjectTypes) {
      expect(sql).toContain(`'${projectType}'`);
    }
  });
});
