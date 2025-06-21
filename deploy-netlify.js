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
const serverCjsPath = path.join(functionDir, "server-cjs.js");
const serverJsPath = path.join(functionDir, "server.js");

console.log("Starting Netlify deployment preparation...");

// Check if this is a dry run
const isDryRun = process.argv.includes("--dry-run");

try {
  // Step 1: Build the client application
  console.log("Building client application...");
  if (!isDryRun) {
    execSync(clientBuildCommand, { stdio: "inherit" });
  } else {
    console.log("[Dry run] Would execute: " + clientBuildCommand);
  }

  // Step 2: Copy the CommonJS server file to server.js
  console.log("Setting up serverless function...");
  if (fs.existsSync(serverCjsPath)) {
    if (!isDryRun) {
      // Copy server-cjs.js to server.js
      fs.copyFileSync(serverCjsPath, serverJsPath);
      console.log("Copied CommonJS server implementation to server.js");
    } else {
      console.log(
        "[Dry run] Would copy: " + serverCjsPath + " to " + serverJsPath
      );
    }
  } else {
    console.error("Error: server-cjs.js not found!");
    process.exit(1);
  }

  console.log("Deployment preparation complete!");
} catch (error) {
  console.error("Error during deployment preparation:", error);
  process.exit(1);
}
