/** @format */

import { drizzle } from "drizzle-orm/neon-serverless";
import { neon, neonConfig } from "@neondatabase/serverless";
import * as schema from "../shared/schema";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Configure Neon to use WebSockets for serverless environments
neonConfig.fetchConnectionCache = true;
neonConfig.useSecureWebSocket = true;
neonConfig.wsProxy = (host) => `wss://${host}/v1`;

// Get the database URL from environment variables
// Priority: NETLIFY_DATABASE_URL (from Netlify Neon extension) -> NEON_DATABASE_URL -> DATABASE_URL
const databaseUrl =
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NEON_DATABASE_URL ||
  process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Database URL not found in environment variables");
  throw new Error(
    "Missing database connection string. Set NETLIFY_DATABASE_URL, NEON_DATABASE_URL, or DATABASE_URL environment variable."
  );
}

// Create a Neon client
const sql = neon(databaseUrl);

// Create and export the database connection with schema
export const db = drizzle(sql, { schema });

/**
 * Test the database connection
 * @returns True if connection successful, false otherwise
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    // Simple query to test the connection
    const result = await sql`SELECT 1 as test`;
    console.log("Database connection successful:", result);
    return true;
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
}

// Export the raw SQL client for direct queries if needed
export { sql };
