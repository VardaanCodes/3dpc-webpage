/** @format */

import { db, testDatabaseConnection } from "../server/db";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import dotenv from "dotenv";

// Load environment variables from .env file for local development
dotenv.config();

async function main() {
  try {
    console.log("Checking database connection...");
    const connected = await testDatabaseConnection();

    if (!connected) {
      throw new Error(
        "Failed to connect to database. Check environment variables and connection string."
      );
    }

    console.log("Running database migrations...");

    // Run migrations using drizzle-orm migrator
    await migrate(db, { migrationsFolder: "./migrations" });

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Unhandled error during migration:", err);
    process.exit(1);
  });
