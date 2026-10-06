import { defineConfig } from "prisma/config";

// Client generation only needs the schema. Keep dependency installation
// independent from production database credentials.
export default defineConfig({
  schema: "prisma/schema.prisma",
  engine: "classic",
});
