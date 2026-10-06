import { defineConfig } from "prisma/config";

// Client generation only needs the schema. Keep dependency installation
// independent from production database credentials.
export default defineConfig({
  schema: "prisma/schema.prisma",
  engine: "classic",
  // `generate` never connects to the database; Prisma's config type still
  // requires a datasource URL, so use a local placeholder when unset.
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/linkdrop",
  },
});
