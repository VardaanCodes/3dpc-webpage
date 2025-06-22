#!/usr/bin/env node
/**
 * Database setup script for 3DPC website
 * This script checks and initializes the Neon database if needed
 *
 * @format
 */

const { neon } = require("@neondatabase/serverless");
const fs = require("fs");
const path = require("path");

async function setupDatabase() {
  try {
    console.log("🔍 Starting database setup...");

    // Get database URL
    const databaseUrl =
      process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

    if (!databaseUrl) {
      console.error("❌ No database URL found!");
      console.error(
        "Please set NETLIFY_DATABASE_URL or DATABASE_URL environment variable"
      );
      console.error(
        "Expected format: postgresql://user:password@host/database?sslmode=require"
      );
      process.exit(1);
    }

    console.log("📡 Connecting to database...");
    const sql = neon(databaseUrl);

    // Test connectivity
    try {
      const result = await sql`SELECT 1 as test`;
      console.log("✅ Database connectivity successful");
    } catch (error) {
      console.error("❌ Database connectivity failed:", error.message);
      process.exit(1);
    }

    // Check if tables exist
    console.log("🔍 Checking database schema...");
    const expectedTables = [
      "users",
      "clubs",
      "orders",
      "batches",
      "audit_logs",
      "system_config",
    ];
    const missingTables = [];

    for (const tableName of expectedTables) {
      try {
        await sql`SELECT 1 FROM ${sql(tableName)} LIMIT 1`;
        console.log(`✅ Table '${tableName}' exists`);
      } catch (error) {
        if (error.message.includes(`relation "${tableName}" does not exist`)) {
          console.log(`❌ Table '${tableName}' missing`);
          missingTables.push(tableName);
        } else {
          console.warn(`⚠️  Table '${tableName}' check failed:`, error.message);
        }
      }
    }

    if (missingTables.length > 0) {
      console.log("\n🚨 Database schema is not initialized!");
      console.log("Missing tables:", missingTables.join(", "));
      console.log("\n📝 To fix this, run one of the following:");
      console.log("  1. npm run db:migrate");
      console.log("  2. npx drizzle-kit push");
      console.log("  3. npx drizzle-kit migrate");

      // Check if migration files exist
      const migrationDir = path.join(process.cwd(), "migrations");
      if (fs.existsSync(migrationDir)) {
        const migrationFiles = fs
          .readdirSync(migrationDir)
          .filter((file) => file.endsWith(".sql"));

        if (migrationFiles.length > 0) {
          console.log("\n📁 Found migration files:");
          migrationFiles.forEach((file) => console.log(`   - ${file}`));
          console.log("\n💡 You can run migrations with: npm run db:migrate");
        }
      } else {
        console.log(
          "\n💡 No migrations directory found. You may need to generate migrations first:"
        );
        console.log("   npx drizzle-kit generate");
      }

      process.exit(1);
    } else {
      console.log("\n🎉 Database schema is properly initialized!");
      console.log("All expected tables are present and accessible.");

      // Test basic operations
      try {
        const userCount = await sql`SELECT COUNT(*) as count FROM users`;
        console.log(`📊 Current user count: ${userCount[0].count}`);
      } catch (error) {
        console.warn("⚠️  Could not query user count:", error.message);
      }
    }
  } catch (error) {
    console.error("💥 Database setup failed:", error);
    process.exit(1);
  }
}

// Run the setup
setupDatabase().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
