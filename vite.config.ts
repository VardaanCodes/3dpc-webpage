/** @format */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  root: "client",
  envDir: "..", // Look for .env file in the parent directory
  build: {
    outDir: "../dist/client",
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ["firebase/app", "firebase/auth"],
          "react-query": ["@tanstack/react-query"],
          "ui-vendor": [
            "lucide-react",
            "@radix-ui/react-slot",
            "class-variance-authority",
            "clsx",
            "tailwind-merge",
          ],
          "react-vendor": ["react", "react-dom", "wouter"],
        },
      },
    },
  },
  plugins: [react()],
  server: {
    host: "localhost",
    port: 5000,
    proxy: {
      "/api": {
        target: "http://localhost:5001",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
