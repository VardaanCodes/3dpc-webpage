/** @format */

// @ts-nocheck
import * as esbuild from "esbuild";

async function build() {
  try {
    console.log("Starting server build...");

    // Build server code with comprehensive externals
    const result = await esbuild.build({
      entryPoints: ["server/index.ts"],
      bundle: true,
      platform: "node",
      target: "node18",
      format: "esm",
      outfile: "dist/server.js",
      external: [
        // Core Node.js modules
        "path",
        "fs",
        "fs/promises",
        "url",
        "crypto",
        "buffer",
        "stream",
        "util",
        "os",
        "http",
        "https",
        "querystring",

        // Database and Firebase
        "@neondatabase/serverless",
        "firebase-admin",

        // Express ecosystem
        "express",
        "express-session",
        "serverless-http",

        // ORM and validation
        "drizzle-orm",
        "drizzle-zod",
        "zod",
        // Problematic build packages that cause resolution errors
        "@babel/preset-typescript",
        "@babel/preset-typescript/package.json",
        "@babel/core",
        "@babel/core/lib/*",
        "lightningcss",
        "../pkg",
        "esbuild",
        "vite",
        "typescript",
        "tsx",

        // PostCSS and Tailwind related packages that might cause issues
        "postcss",
        "autoprefixer",
        "tailwindcss",

        // Utility packages
        "nanoid",

        // Type definitions
        "@types/*",

        // Native modules
        "*.node",
      ],
      define: {
        "process.env.NODE_ENV": '"production"',
      },
      metafile: true,
      write: true,
      logLevel: "info",
      conditions: ["node"],
      mainFields: ["module", "main"], // Ignore resolution warnings for these specific packages
      plugins: [
        {
          name: "ignore-resolution-warnings",
          setup(build) {
            // Handle @babel/preset-typescript package.json resolution
            build.onResolve(
              { filter: /@babel\/preset-typescript\/package\.json/ },
              () => ({
                path: "@babel/preset-typescript/package.json",
                external: true,
              })
            );

            // Handle lightningcss native binding
            build.onResolve({ filter: /^\.\.\/pkg$/ }, () => ({
              path: "../pkg",
              external: true,
            }));

            // Handle any other lightningcss patterns
            build.onResolve({ filter: /lightningcss\..*\.node$/ }, () => ({
              path: "lightningcss.node",
              external: true,
            }));

            // Handle any other @babel patterns
            build.onResolve(
              { filter: /@babel\/.*\/package\.json$/ },
              (args) => ({
                path: args.path,
                external: true,
              })
            );
          },
        },
      ],
    });

    console.log("Server build complete");

    // Create the dist directory if it doesn't exist
    try {
      const fs = await import("fs");
      const path = await import("path");

      await fs.promises.mkdir(
        path.join(process.cwd(), "netlify", "functions", "server"),
        { recursive: true }
      );

      // Create Netlify function wrapper
      const functionCode = `import { handler as serverHandler } from '../../dist/server.js';
export const handler = serverHandler;`;

      await fs.promises.writeFile(
        path.join(process.cwd(), "netlify", "functions", "server", "server.js"),
        functionCode
      );

      console.log("Netlify function wrapper created");
    } catch (err) {
      console.warn("Could not create function wrapper:", err.message);
      // Continue anyway - the server.js is built
    }
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

build().catch(console.error);
