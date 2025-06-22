/** @format */

import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serviceAccount;

// Function to check for service account file in the current directory
function getServiceAccountFromFile(directory: string): any | null {
  const serviceAccountPath = path.join(directory, "serviceAccountKey.json");
  if (fs.existsSync(serviceAccountPath)) {
    try {
      return JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
    } catch (error) {
      console.error(
        `Error reading or parsing serviceAccountKey.json from ${directory}:`,
        error
      );
      return null;
    }
  }
  return null;
}

// First check if the file exists in the current directory (for Netlify functions)
serviceAccount = getServiceAccountFromFile(__dirname);

// Next check if the file exists in the project root (for local development)
if (!serviceAccount) {
  serviceAccount = getServiceAccountFromFile(path.join(__dirname, ".."));
}

// Last resort: try to use the environment variable (not recommended for Netlify)
if (!serviceAccount && process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY) {
  try {
    const decodedServiceAccount = Buffer.from(
      process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY,
      "base64"
    ).toString("utf8");
    serviceAccount = JSON.parse(decodedServiceAccount);
    console.log(
      "Initializing Firebase Admin SDK from environment variable. This is not recommended for Netlify deployments."
    );
  } catch (error) {
    console.error(
      "Error parsing Firebase service account key from environment variable:",
      error
    );
  }
}

if (serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error) {
    console.error("Firebase Admin SDK initialization failed:", error);
  }
} else {
  console.error(
    "Firebase Admin SDK initialization failed: Service account credentials not found."
  );
  console.error(
    "For local development, ensure serviceAccountKey.json is in the project root. For production, set the FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY environment variable."
  );
}

export default admin;
