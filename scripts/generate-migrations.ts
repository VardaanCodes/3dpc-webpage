/** @format */

import { execSync } from "child_process";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables
dotenv.config();

const MIGRATIONS_DIR = path.join(__dirname, "..", "migrations");

// Ensure migrations directory exists
if (!fs.existsSync(MIGRATIONS_DIR)) {
  fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
  console.log(`Created migrations directory at ${MIGRATIONS_DIR}`);
}

try {
  console.log("Generating database migrations...");

  // Run drizzle-kit generate command
  execSync("pnpm drizzle-kit generate:pg", {
    stdio: "inherit",
    cwd: path.join(__dirname, ".."),
  });

  console.log("Migration files generated successfully!");
  console.log("To apply these migrations, run: pnpm db:migrate");
} catch (error) {
  console.error("Failed to generate migrations:", error);
  process.exit(1);
}
