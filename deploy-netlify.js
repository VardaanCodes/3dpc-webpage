#!/usr/bin/env node
/**
 * Deploy script for Netlify that:
 * 1. Builds the client application
 * 2. Ensures the serverless function uses CommonJS format
 *
 * @format
 */

// Use require since this script will be run in Node.js environment
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Define paths
const clientBuildCommand = "vite build --emptyOutDir";
const functionDir = path.join(process.cwd(), "netlify", "functions", "server");
const serverCjsPath = path.join(functionDir, "server-cjs.js");
const serverJsPath = path.join(functionDir, "server.js");

console.log("Starting Netlify deployment preparation...");

try {
  // Step 1: Build the client application
  console.log("Building client application...");
  execSync(clientBuildCommand, { stdio: "inherit" });

  // Step 2: Copy the CommonJS server file to server.js
  console.log("Setting up serverless function...");
  if (fs.existsSync(serverCjsPath)) {
    // Copy server-cjs.js to server.js
    fs.copyFileSync(serverCjsPath, serverJsPath);
    console.log("Copied CommonJS server implementation to server.js");
  } else {
    console.error("Error: server-cjs.js not found!");
    process.exit(1);
  }

  console.log("Deployment preparation complete!");
} catch (error) {
  console.error("Error during deployment preparation:", error);
  process.exit(1);
}
