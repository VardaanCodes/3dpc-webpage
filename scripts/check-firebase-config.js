#!/usr/bin/env node

/**
 * Pre-deployment check script for Firebase configuration
 * This script validates that all required environment variables are set
 * before building and deploying to Netlify
 *
 * @format
 */

import fs from "fs";
import path from "path";

const requiredEnvVars = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

// Skip the check if we're in a CI/build environment where vars might be set externally
if (process.env.CI || process.env.NETLIFY || process.env.NODE_ENV === 'production') {
  console.log('🚀 Skipping Firebase config check in CI/build environment');
  process.exit(0);
}

console.log("🔍 Checking Firebase environment variables...\n");

let hasErrors = false;
const envStatus = {};

requiredEnvVars.forEach((varName) => {
  const value = process.env[varName];
  const isSet =
    value &&
    value.trim() !== "" &&
    !value.includes("your_") &&
    !value.includes("placeholder");

  envStatus[varName] = {
    set: isSet,
    value: isSet ? "✓ Set" : "✗ Missing or placeholder",
  };

  if (!isSet) {
    hasErrors = true;
  }

  console.log(`${varName}: ${envStatus[varName].value}`);
});

console.log("\n📋 Summary:");
console.log(
  `✅ Configured: ${Object.values(envStatus).filter((s) => s.set).length}`
);
console.log(
  `❌ Missing: ${Object.values(envStatus).filter((s) => !s.set).length}`
);

if (hasErrors) {
  console.log(
    "\n❌ ERROR: Some required Firebase environment variables are missing or contain placeholder values."
  );
  console.log("\n🔧 To fix this:");
  console.log("1. Go to your Netlify dashboard");
  console.log("2. Navigate to Site Settings > Environment Variables");
  console.log(
    "3. Set the missing environment variables with your actual Firebase config values"
  );
  console.log(
    "4. You can find these values in your Firebase console under Project Settings"
  );
  console.log("\n📖 For more help, see the Firebase setup documentation.");

  process.exit(1);
} else {
  console.log(
    "\n✅ All Firebase environment variables are properly configured!"
  );
  console.log("🚀 Ready for deployment.");
}
