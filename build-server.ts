/** @format */

import * as esbuild from "esbuild";
import { join } from "path";
import { mkdir, writeFile } from "fs/promises";

async function build() {
  try {
    // Create netlify/functions directory if it doesn't exist
    await mkdir(join("netlify", "functions", "server"), { recursive: true });

    // Build server code
    const result = await esbuild.build({
      entryPoints: ["server/index.ts"],
      bundle: true,
      platform: "node",
      target: "node18",
      format: "esm",
      outfile: "dist/server.js",      external: [
        // Add any packages that should be excluded from bundling
        "@neondatabase/serverless",
        "firebase-admin",
        "serverless-http",
        "nanoid",
        "express",
        "express-session",
        "drizzle-orm",
        "drizzle-zod",
        "zod",
      ],
      metafile: true,
      write: true,
    });

    console.log("Server build complete");

    // Create Netlify function wrapper
    const functionCode = `
import { handler as serverHandler } from '../../dist/server.js';
export const handler = serverHandler;
`;

    await writeFile(
      join("netlify", "functions", "server", "server.js"),
      functionCode
    );
    console.log("Netlify function wrapper created");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

build();
