/** @format */

import { NetlifyIntegration } from "@netlify/functions";
import * as crypto from "crypto";

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
 * Service class for managing file uploads with Netlify Blobs
 */
export class NetlifyBlobsService {
  private blobs;
  private DEFAULT_RETENTION_DAYS = 30;

  constructor() {
    try {
      const client = getNetlifyClient();
      this.blobs = client.blobs;
    } catch (error) {
      console.error("Failed to initialize Netlify Blobs service:", error);
      throw error;
    }
  }

  /**
   * Generates a unique file path for storage
   */
  private generateFilePath(userId: string, orderId?: string): string {
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString("hex");

    if (orderId) {
      return `orders/${orderId}/${timestamp}-${randomSuffix}`;
    }

    return `users/${userId}/${timestamp}-${randomSuffix}`;
  }

  /**
   * Get content type based on file extension
   */
  private getContentType(fileName: string): string {
    const extension = fileName.split(".").pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      stl: "application/vnd.ms-pki.stl",
      obj: "application/object",
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      txt: "text/plain",
      zip: "application/zip",
      gcode: "text/plain",
    };

    return mimeTypes[extension || ""] || "application/octet-stream";
  }

  /**
   * Upload a file to Netlify Blobs
   */
  async uploadFile(
    buffer: Buffer,
    fileName: string,
    userId: string,
    metadata: Record<string, any> = {},
    orderId?: string
  ): Promise<{
    key: string;
    url: string;
    fileName: string;
    contentType: string;
    size: number;
    uploadedAt: Date;
    metadata: Record<string, any>;
  }> {
    try {
      // Generate a unique file path/key
      const path = this.generateFilePath(userId, orderId);
      const key = `${path}/${fileName}`;

      // Determine content type based on file extension
      const contentType = this.getContentType(fileName);

      // Upload the file to Netlify Blobs
      const { url } = await this.blobs.store(key, buffer, {
        contentType,
        metadata: {
          ...metadata,
          userId,
          orderId: orderId || "",
          originalName: fileName,
        },
      });

      // Return the file metadata
      return {
        key,
        url,
        fileName,
        contentType,
        size: buffer.length,
        uploadedAt: new Date(),
        metadata: {
          ...metadata,
          userId,
          orderId: orderId || "",
        },
      };
    } catch (error) {
      console.error("Error uploading file to Netlify Blobs:", error);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Get a file from Netlify Blobs
   */
  async getFile(
    key: string
  ): Promise<{ data: Buffer; metadata: Record<string, any> }> {
    try {
      const { data, metadata } = await this.blobs.get(key);
      return { data, metadata };
    } catch (error) {
      console.error(`Error getting file ${key}:`, error);
      throw new Error(`File retrieval failed: ${error.message}`);
    }
  }

  /**
   * Get a signed URL for a file
   */
  async getSignedUrl(key: string, expirationMinutes = 60): Promise<string> {
    try {
      const url = await this.blobs.getSignedUrl({
        key,
        expiration: expirationMinutes * 60, // Convert to seconds
      });
      return url;
    } catch (error) {
      console.error(`Error generating signed URL for ${key}:`, error);
      throw new Error(`Could not generate signed URL: ${error.message}`);
    }
  }

  /**
   * Delete a file from Netlify Blobs
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      await this.blobs.delete(key);
      return true;
    } catch (error) {
      console.error(`Error deleting file ${key}:`, error);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * List files with a given prefix
   */
  async listFiles(prefix: string): Promise<string[]> {
    try {
      const { items } = await this.blobs.list({ prefix });
      return items;
    } catch (error) {
      console.error(`Error listing files with prefix ${prefix}:`, error);
      throw new Error(`File listing failed: ${error.message}`);
    }
  }
}

// Create a singleton instance for the application to use
export const netlifyBlobsService = new NetlifyBlobsService();
