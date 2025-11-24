/** @format */

import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Load environment variables from .env file for local development
dotenv.config();

// Get the database URL, prioritizing Netlify's Neon extension URL
const databaseUrl =
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL, NEON_DATABASE_URL, or NETLIFY_DATABASE_URL environment variable is required"
  );
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
  // Specify verbose logging for better debugging
  verbose: process.env.NODE_ENV !== "production",
  // Add strict mode to catch more errors during development
  strict: process.env.NODE_ENV !== "production",
});
