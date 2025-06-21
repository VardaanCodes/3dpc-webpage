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
      outfile: "dist/server.js",
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

    // Create Netlify function wrapper (optional, may fail in some environments)
    try {
      const fs = await import("fs");
      const path = await import("path");

      await fs.promises.mkdir(
        path.join(process.cwd(), "netlify", "functions", "server"),
        { recursive: true }
      );

      const functionCode = `import { handler as serverHandler } from '../../dist/server.js';
export const handler = serverHandler;`;

      await fs.promises.writeFile(
        path.join(process.cwd(), "netlify", "functions", "server", "server.js"),
        functionCode
      );

      console.log("Netlify function wrapper created");
    } catch (err) {
      console.warn(
        "Could not create function wrapper (non-critical):",
        err.message
      );
    }
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
