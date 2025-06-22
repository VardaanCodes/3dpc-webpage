/** @format */

import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let serviceAccount;

// Netlify/Production environment: Use environment variable
if (process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY) {
  try {
    const decodedServiceAccount = Buffer.from(
      process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY,
      "base64"
    ).toString("utf8");
    serviceAccount = JSON.parse(decodedServiceAccount);
    console.log("Initializing Firebase Admin SDK from environment variable.");
  } catch (error) {
    console.error(
      "Error parsing Firebase service account key from environment variable:",
      error
    );
  }
} else {
  // Local development: Use serviceAccountKey.json file
  const serviceAccountPath = path.join(__dirname, "../serviceAccountKey.json");
  if (fs.existsSync(serviceAccountPath)) {
    try {
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, "utf8"));
      console.log(
        "Initializing Firebase Admin SDK from serviceAccountKey.json file."
      );
    } catch (error) {
      console.error("Error reading or parsing serviceAccountKey.json:", error);
    }
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
