/** @format */

import { NetlifyIntegration } from "@netlify/sdk";

let netlifyClient: NetlifyIntegration | null = null;

/**
 * Get the Netlify SDK client, initializing it if necessary
 * @returns A Netlify SDK client instance
 */
export function getNetlifyClient(): NetlifyIntegration {
  if (!netlifyClient) {
    try {
      netlifyClient = new NetlifyIntegration();
      console.log("Netlify SDK client initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Netlify SDK client:", error);
      throw new Error("Netlify SDK initialization failed");
    }
  }

  return netlifyClient;
}

/**
 * Verify the Netlify environment is properly configured
 * Note: Blobs verification is now handled separately in netlifyBlobs.ts
 * @returns True if the environment is correctly configured
 */
export async function verifyNetlifyConfig(): Promise<boolean> {
  try {
    const client = getNetlifyClient();

    // Basic client validation - just check if it's initialized
    if (client) {
      console.log("Netlify configuration verified successfully");
      return true;
    }

    return false;
  } catch (error) {
    console.error("Netlify configuration verification failed:", error);
    return false;
  }
}

/**
 * Get the current Netlify site ID from environment variables
 * @returns The Netlify site ID
 */
export function getNetlifySiteId(): string {
  const siteId = process.env.NETLIFY_SITE_ID;
  if (!siteId) {
    console.warn("NETLIFY_SITE_ID environment variable is not set");
  }
  return siteId || "";
}
