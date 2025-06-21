/** @format */

// Alternative build script that avoids problematic dependencies
// @ts-nocheck
import * as esbuild from "esbuild";

// Minimal build script for Netlify
async function buildSimple() {
  try {
    console.log("Starting simple server build...");

    await esbuild.build({
      entryPoints: ["server/index.ts"],
      bundle: true,
      platform: "node",
      target: "node18",
      format: "esm",
      outfile: "netlify/functions/server/server.js",
      // External everything that could cause issues
      external: [
        "*", // External all dependencies
      ],
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      write: true,
      logLevel: "error", // Only show errors
    });

    console.log("Simple server build complete");
  } catch (error) {
    console.error("Simple build failed:", error);
    process.exit(1);
  }
}

if (process.argv.includes("--simple")) {
  buildSimple();
} else {
  console.log("Use --simple flag for alternative build");
}
