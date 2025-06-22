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
 * @returns True if the environment is correctly configured
 */
export async function verifyNetlifyConfig(): Promise<boolean> {
  try {
    const client = getNetlifyClient();
    // Test the client with a basic operation
    const { blobs } = client;

    // Attempt to list blobs (this will fail if permissions are incorrect)
    await blobs.list({ prefix: "test" });

    console.log("Netlify configuration verified successfully");
    return true;
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
