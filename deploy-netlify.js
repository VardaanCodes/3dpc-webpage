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
const serverEnhancedPath = path.join(functionDir, "server-enhanced.js");
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
  // Step 3: Copy the enhanced server file to server.js
  console.log("Setting up enhanced serverless function...");
  if (fs.existsSync(serverEnhancedPath)) {
    if (!isDryRun) {
      // Copy server-enhanced.js to server.js
      fs.copyFileSync(serverEnhancedPath, serverJsPath);
      console.log("Copied enhanced server implementation to server.js");
    } else {
      console.log(
        "[Dry run] Would copy: " + serverEnhancedPath + " to " + serverJsPath
      );
    }
  } else if (fs.existsSync(serverCjsPath)) {
    if (!isDryRun) {
      // Fallback to basic server if enhanced version doesn't exist
      fs.copyFileSync(serverCjsPath, serverJsPath);
      console.log(
        "Copied basic CommonJS server implementation to server.js (fallback)"
      );
    } else {
      console.log(
        "[Dry run] Would copy: " +
          serverCjsPath +
          " to " +
          serverJsPath +
          " (fallback)"
      );
    }
  } else {
    console.error("Error: Neither server-enhanced.js nor server-cjs.js found!");
    process.exit(1);
  }

  console.log("Deployment preparation complete!");
} catch (error) {
  console.error("Error during deployment preparation:", error);
  process.exit(1);
}
