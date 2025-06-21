/**
 * Netlify Function Adapter
 *
 * This file serves as a wrapper for the server code in Netlify Functions.
 * It re-exports the serverless handler from the built server bundle.
 *
 * @format
 */

// Import the handler from the built server file
import { handler as serverHandler } from "../../../dist/server.js";

// Export the handler for Netlify Functions
export const handler = serverHandler;
