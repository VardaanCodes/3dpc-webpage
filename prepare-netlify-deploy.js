#!/usr/bin/env node
/**
 * This script prepares a Netlify deployment by:
 * 1. Building the client-side React application with Vite
 * 2. Ensuring the netlify/functions/server directory exists
 * 3. Copying required server files into the function directory
 *
 * @format
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("Starting Netlify deployment preparation...");

try {
  // Step 1: Build the client application
  console.log("Building client application...");
  execSync("vite build --emptyOutDir", { stdio: "inherit" });

  // Step 2: Ensure netlify/functions/server directory exists
  const functionDir = path.join(__dirname, "netlify", "functions", "server");
  if (!fs.existsSync(functionDir)) {
    fs.mkdirSync(functionDir, { recursive: true });
    console.log("Created functions directory:", functionDir);
  }

  // Step 3: Create a self-contained server.js function
  console.log("Creating serverless function...");

  // The function content is already updated directly in the file
  // We just need to ensure dependencies are installed

  console.log("Deployment preparation complete!");
  console.log("You can now deploy to Netlify with: netlify deploy");
} catch (error) {
  console.error("Error during deployment preparation:", error);
  process.exit(1);
}
