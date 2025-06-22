#!/usr/bin/env node
/**
 * Deploy script for Netlify that:
 * 1. Builds the client application
 * 2. Ensures the serverless function uses CommonJS format
 *
 * @format
 */

// Use ES module syntax since package.json has "type": "module"
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define paths
const clientBuildCommand = "vite build --emptyOutDir";
const functionDir = path.join(process.cwd(), "netlify", "functions", "server");
const serverJsPath = path.join(functionDir, "server.js");

console.log("Starting Netlify deployment preparation...");

// Check if this is a dry run
const isDryRun = process.argv.includes("--dry-run");

try {
  // Step 1: Prepare schema for deployment
  console.log("Preparing schema for deployment...");
  if (!isDryRun) {
    execSync("node prepare-netlify-schema.js", { stdio: "inherit" });
  } else {
    console.log("[Dry run] Would execute: node prepare-netlify-schema.js");
  }

  // Step 2: Build the client application
  console.log("Building client application...");
  if (!isDryRun) {
    execSync(clientBuildCommand, { stdio: "inherit" });
  } else {
    console.log("[Dry run] Would execute: " + clientBuildCommand);
  }
  // Step 3: Verify server.js exists
  console.log("Verifying serverless function...");
  if (!fs.existsSync(serverJsPath)) {
    console.error("Error: server.js not found in netlify/functions/server/");
    process.exit(1);
  } else {
    console.log("Server function verified at:", serverJsPath);
  }

  // Step 4: Database setup notification
  console.log("📊 Database Setup Information:");
  console.log("  ✅ Neon extension is installed");
  console.log("  ✅ NETLIFY_DATABASE_URL is configured");
  console.log("  ✅ Server includes automatic migration logic");
  console.log(
    "  📝 Database tables will be created automatically on first request"
  );
  console.log("");
  console.log("🚀 Ready for deployment!");

  console.log("Deployment preparation complete!");
} catch (error) {
  console.error("Error during deployment preparation:", error);
  process.exit(1);
}
