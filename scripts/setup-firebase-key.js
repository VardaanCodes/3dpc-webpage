#!/usr/bin/env node
/**
 * Script to set up Firebase service account key for Netlify deployment
 * This script extracts the Firebase service account key from an environment variable
 * and writes it to a file in the Netlify functions directory
 *
 * @format
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to ensure directory exists
function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

// Main function to extract and save the Firebase service account key
function setupFirebaseKey() {
  try {
    console.log(
      "Setting up Firebase service account key for Netlify deployment..."
    );

    const serviceAccountKey = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountKey) {
      console.log(
        "No FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY environment variable found. Skipping."
      );
      return;
    }

    // Parse the Base64-encoded JSON
    let serviceAccountJSON;
    try {
      // Try to parse directly (if the env var is already JSON)
      serviceAccountJSON = JSON.parse(serviceAccountKey);
      console.log("Service account key parsed as JSON");
    } catch (e) {
      // If that fails, try to decode from Base64
      try {
        const decodedKey = Buffer.from(serviceAccountKey, "base64").toString(
          "utf8"
        );
        serviceAccountJSON = JSON.parse(decodedKey);
        console.log(
          "Service account key decoded from Base64 and parsed as JSON"
        );
      } catch (e2) {
        console.error("Error decoding service account key:", e2);
        throw new Error("Invalid Firebase service account key format");
      }
    }

    // Ensure the netlify/functions/server directory exists
    const functionsDir = path.resolve(__dirname, "../netlify/functions/server");
    ensureDirectoryExists(functionsDir);

    // Write the service account key to a file
    const serviceAccountFilePath = path.join(
      functionsDir,
      "serviceAccountKey.json"
    );
    fs.writeFileSync(
      serviceAccountFilePath,
      JSON.stringify(serviceAccountJSON, null, 2)
    );

    console.log(
      `Firebase service account key written to ${serviceAccountFilePath}`
    );

    // Set a flag environment variable to indicate we've done this
    process.env.FIREBASE_SERVICE_ACCOUNT_FILE_CREATED = "true";
    console.log("Set FIREBASE_SERVICE_ACCOUNT_FILE_CREATED=true");

    // Important: DO NOT delete the environment variable here
    // This would only affect the current process, not Netlify's environment
    console.log(
      "NOTE: After deployment, remove FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY from Netlify environment variables"
    );
    console.log("and add FIREBASE_SERVICE_ACCOUNT_EXISTS=true instead.");
  } catch (error) {
    console.error("Error setting up Firebase service account key:", error);
    process.exit(1);
  }
}

setupFirebaseKey();
