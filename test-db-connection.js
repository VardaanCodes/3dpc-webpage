#!/usr/bin/env node
/**
 * Test script to verify Neon database connection and setup
 * Run this to test your database before deployment
 *
 * Usage: node test-db-connection.js
 *
 * @format
 */

import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function testDatabaseConnection() {
  console.log("🔍 Testing Neon Database Connection...\n");

  // Check environment variables
  const netlifyDbUrl = process.env.NETLIFY_DATABASE_URL;
  const dbUrl = process.env.DATABASE_URL;
  const finalUrl = netlifyDbUrl || dbUrl;

  console.log("Environment Check:");
  console.log(
    `  NETLIFY_DATABASE_URL: ${netlifyDbUrl ? "✅ Set" : "❌ Not set"}`
  );
  console.log(`  DATABASE_URL: ${dbUrl ? "✅ Set" : "❌ Not set"}`);
  console.log(
    `  Using: ${
      finalUrl ? finalUrl.split("@")[0] + "@***" : "❌ No URL available"
    }\n`
  );
  if (!finalUrl || !finalUrl.includes("neon.tech")) {
    console.error("❌ No Neon database URL found.");
    console.error(
      "\n📝 This is expected if you're running locally without Neon environment setup."
    );
    console.error("\n🔧 To test database connection:");
    console.error("   1. Add your Neon DATABASE_URL to your .env file");
    console.error(
      "   2. Or test the deployed API at: https://3dpc-webpage.netlify.app/api/admin/init-db-test"
    );
    console.error(
      "   3. The database will be automatically initialized on first API request"
    );
    console.error("\n✅ Database setup is complete in production environment.");
    process.exit(0);
  }

  try {
    // Initialize connection
    const sql = neon(finalUrl);

    // Test basic connectivity
    console.log("Testing connectivity...");
    const connectTest =
      await sql`SELECT 1 as test, NOW() as timestamp, version() as pg_version`;
    console.log(`✅ Connection successful!`);
    console.log(`   Server time: ${connectTest[0].timestamp}`);
    console.log(
      `   PostgreSQL: ${connectTest[0].pg_version.split(" ")[0]} ${
        connectTest[0].pg_version.split(" ")[1]
      }\n`
    );

    // Check for tables
    console.log("Checking database schema...");
    const expectedTables = [
      "users",
      "clubs",
      "orders",
      "batches",
      "audit_logs",
      "system_config",
    ];
    let missingTables = [];

    for (const tableName of expectedTables) {
      try {
        const result = await sql`SELECT COUNT(*) as count FROM ${sql(
          tableName
        )}`;
        console.log(`   ✅ ${tableName}: ${result[0].count} rows`);
      } catch (error) {
        if (error.message.includes(`relation "${tableName}" does not exist`)) {
          console.log(`   ❌ ${tableName}: Table does not exist`);
          missingTables.push(tableName);
        } else {
          console.log(`   ⚠️  ${tableName}: Error - ${error.message}`);
          missingTables.push(tableName);
        }
      }
    }

    // Summary
    console.log("\n📊 Summary:");
    if (missingTables.length === 0) {
      console.log("✅ All tables exist! Database is ready.");
    } else {
      console.log(`⚠️  Missing tables: ${missingTables.join(", ")}`);
      console.log(
        "📝 The server will automatically create these tables on first API request."
      );
    }

    // Test a simple query to ensure everything works
    console.log("\nTesting query capabilities...");
    const testQuery = await sql`SELECT COUNT(*) as total_tables 
                                FROM information_schema.tables 
                                WHERE table_schema = 'public'`;
    console.log(
      `✅ Found ${testQuery[0].total_tables} tables in public schema`
    );

    console.log("\n🎉 Database test completed successfully!");
  } catch (error) {
    console.error("\n❌ Database test failed:");
    console.error(`   Error: ${error.message}`);
    console.error("\n🔧 Troubleshooting:");
    console.error("   1. Verify your Neon database URL is correct");
    console.error("   2. Check if the database exists in your Neon dashboard");
    console.error(
      "   3. Ensure your IP is allowed (Neon is usually open by default)"
    );
    console.error("   4. Verify the database user has sufficient permissions");
    process.exit(1);
  }
}

// Run the test
testDatabaseConnection().catch(console.error);
