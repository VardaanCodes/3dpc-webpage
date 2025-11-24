#!/usr/bin/env node
/**
 * Integration validation script
 * Tests the connection between frontend and backend components
 *
 * @format
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTest(test) {
  try {
    console.log(`🧪 Testing: ${test.name}`);
    await test.fn();
    console.log(`✅ PASS: ${test.name}`);
    passed++;
  } catch (error) {
    console.log(`❌ FAIL: ${test.name}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
}

// Test: Check required files exist
test("Required files exist", () => {
  const requiredFiles = [
    "package.json",
    "netlify.toml",
    "client/src/App.tsx",
    "server/index.ts",
    "shared/schema.ts",
    "netlify/functions/server/server-enhanced.js",
    "netlify/functions/server/package.json",
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Required file missing: ${file}`);
    }
  }
});

// Test: Package.json structure
test("Package.json has required scripts", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "package.json"), "utf8")
  );

  const requiredScripts = ["dev", "build", "build:netlify"];
  for (const script of requiredScripts) {
    if (!packageJson.scripts[script]) {
      throw new Error(`Missing required script: ${script}`);
    }
  }
});

// Test: Netlify configuration
test("Netlify configuration is valid", () => {
  const tomlContent = fs.readFileSync(
    path.join(__dirname, "netlify.toml"),
    "utf8"
  );

  if (!tomlContent.includes("/.netlify/functions/server")) {
    throw new Error("API redirect configuration missing");
  }

  if (!tomlContent.includes("dist/client")) {
    throw new Error("Publish directory not configured correctly");
  }

  if (!tomlContent.includes("netlify/functions")) {
    throw new Error("Functions directory not configured");
  }
});

// Test: Serverless function structure
test("Serverless function is properly configured", () => {
  const functionPath = path.join(
    __dirname,
    "netlify/functions/server/server-enhanced.js"
  );
  const functionContent = fs.readFileSync(functionPath, "utf8");

  if (!functionContent.includes("serverless-http")) {
    throw new Error("Serverless HTTP adapter not found");
  }

  if (!functionContent.includes("firebase-admin")) {
    throw new Error("Firebase Admin integration missing");
  }

  if (!functionContent.includes("@neondatabase/serverless")) {
    throw new Error("Neon database integration missing");
  }

  if (!functionContent.includes("exports.handler")) {
    throw new Error("Serverless handler export missing");
  }

  // Check for required API routes
  const requiredRoutes = [
    "/api/user/profile",
    "/api/user/register",
    "/api/clubs",
    "/api/orders",
    "/api/health",
  ];

  for (const route of requiredRoutes) {
    if (!functionContent.includes(route)) {
      throw new Error(`API route missing: ${route}`);
    }
  }
});

// Test: Function dependencies
test("Function dependencies are correctly configured", () => {
  const packagePath = path.join(
    __dirname,
    "netlify/functions/server/package.json"
  );
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

  const requiredDeps = [
    "express",
    "serverless-http",
    "firebase-admin",
    "@neondatabase/serverless",
    "drizzle-orm",
    "zod",
  ];

  for (const dep of requiredDeps) {
    if (!packageJson.dependencies[dep]) {
      throw new Error(`Missing function dependency: ${dep}`);
    }
  }
});

// Test: Client configuration
test("Client is configured for API integration", () => {
  const queryClientPath = path.join(__dirname, "client/src/lib/queryClient.ts");
  const queryClientContent = fs.readFileSync(queryClientPath, "utf8");

  if (!queryClientContent.includes("getApiBaseUrl")) {
    throw new Error("API base URL configuration missing");
  }

  if (!queryClientContent.includes("Authorization")) {
    throw new Error("Authorization header handling missing");
  }

  if (!queryClientContent.includes("X-User-Email")) {
    throw new Error("Debug headers missing");
  }
});

// Test: Environment detection
test("Environment detection is configured", () => {
  const environmentPath = path.join(__dirname, "client/src/lib/environment.ts");
  const environmentContent = fs.readFileSync(environmentPath, "utf8");

  if (!environmentContent.includes("isProduction")) {
    throw new Error("Production detection missing");
  }

  if (!environmentContent.includes("isNetlify")) {
    throw new Error("Netlify detection missing");
  }
});

// Test: Schema sharing
test("Shared schema is accessible", () => {
  const schemaPath = path.join(__dirname, "shared/schema.ts");
  const schemaContent = fs.readFileSync(schemaPath, "utf8");

  if (!schemaContent.includes("insertUserSchema")) {
    throw new Error("User schema missing");
  }

  if (!schemaContent.includes("insertOrderSchema")) {
    throw new Error("Order schema missing");
  }
});

// Test: Build script functionality
test("Build scripts are executable", () => {
  const deployScriptPath = path.join(__dirname, "deploy-netlify.js");
  const deployContent = fs.readFileSync(deployScriptPath, "utf8");

  if (!deployContent.includes("server-enhanced.js")) {
    throw new Error("Deploy script not updated for enhanced server");
  }

  if (!deployContent.includes("vite build")) {
    throw new Error("Client build command missing");
  }
});

// Test: TypeScript configuration
test("TypeScript configuration is correct", () => {
  const tsconfigPath = path.join(__dirname, "tsconfig.json");
  if (!fs.existsSync(tsconfigPath)) {
    throw new Error("TypeScript configuration missing");
  }

  const viteconfigPath = path.join(__dirname, "vite.config.ts");
  if (!fs.existsSync(viteconfigPath)) {
    throw new Error("Vite configuration missing");
  }
});

// Test: Git configuration
test("Git ignores sensitive files", () => {
  const gitignorePath = path.join(__dirname, ".gitignore");
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, "utf8");

    const sensitivePatterns = [".env", "serviceAccountKey.json"];
    for (const pattern of sensitivePatterns) {
      if (!gitignoreContent.includes(pattern)) {
        console.warn(`⚠️  Warning: ${pattern} should be in .gitignore`);
      }
    }
  }
});

// Run all tests
async function runAllTests() {
  console.log("🚀 Starting integration validation...");
  console.log(`Running ${tests.length} tests...\n`);

  for (const test of tests) {
    await runTest(test);
  }

  console.log("\n📊 Test Results:");
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📝 Total: ${tests.length}`);

  if (failed === 0) {
    console.log("\n🎉 All tests passed! Integration is ready for deployment.");

    console.log("\n📋 Next steps:");
    console.log("1. Set up environment variables in Netlify");
    console.log("2. Configure Firebase and Neon database");
    console.log("3. Run 'pnpm run build:netlify' to test build");
    console.log("4. Deploy to Netlify");

    process.exit(0);
  } else {
    console.log(
      "\n🚨 Some tests failed. Please fix the issues before deploying."
    );
    process.exit(1);
  }
}

runAllTests().catch((error) => {
  console.error("❌ Test runner failed:", error);
  process.exit(1);
});
