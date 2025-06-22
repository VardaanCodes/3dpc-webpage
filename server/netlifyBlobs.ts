/** @format */

import { getStore } from "@netlify/blobs";
import * as crypto from "crypto";

/**
 * Service class for managing file uploads with Netlify Blobs
 */
export class NetlifyBlobsService {
  private storeName: string;

  constructor(storeName: string = "file-uploads") {
    this.storeName = storeName;
  }

  private getStoreInstance() {
    return getStore(this.storeName);
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
      const contentType = this.getContentType(fileName); // Upload the file to Netlify Blobs
      const store = this.getStoreInstance();
      const blob = new Blob([buffer], { type: contentType });
      await store.set(key, blob, {
        metadata: {
          ...metadata,
          userId,
          orderId: orderId || "",
          originalName: fileName,
          contentType,
          uploadedAt: new Date().toISOString(),
        },
      });

      // Return the file metadata
      return {
        key,
        url: `/api/files/${key}`, // We'll serve files through our API
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
      throw new Error(
        `File upload failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Get a file from Netlify Blobs
   */
  async getFile(
    key: string
  ): Promise<{ data: ArrayBuffer; metadata: Record<string, any> }> {
    try {
      const store = this.getStoreInstance();
      const result = await store.getWithMetadata(key);

      if (!result) {
        throw new Error("File not found");
      }
      return {
        data: result.data as unknown as ArrayBuffer,
        metadata: result.metadata as Record<string, any>,
      };
    } catch (error) {
      console.error(`Error getting file ${key}:`, error);
      throw new Error(
        `File retrieval failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
  /**
   * Get a signed URL for a file (Netlify Blobs doesn't support signed URLs, so we'll return a direct API URL)
   */
  async getSignedUrl(key: string, expirationMinutes = 60): Promise<string> {
    try {
      // Netlify Blobs doesn't support signed URLs like AWS S3
      // We'll return a direct URL to our API endpoint that serves the file
      return `/api/files/${key}`;
    } catch (error) {
      console.error(`Error generating signed URL for ${key}:`, error);
      throw new Error(
        `Could not generate signed URL: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
  /**
   * Delete a file from Netlify Blobs
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      const store = this.getStoreInstance();
      await store.delete(key);
      return true;
    } catch (error) {
      console.error(`Error deleting file ${key}:`, error);
      throw new Error(
        `File deletion failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * List files with a given prefix
   */
  async listFiles(prefix: string): Promise<string[]> {
    try {
      const store = this.getStoreInstance();
      const { blobs } = await store.list({ prefix });
      return blobs.map((blob) => blob.key);
    } catch (error) {
      console.error(`Error listing files with prefix ${prefix}:`, error);
      throw new Error(
        `File listing failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
}

// Create a singleton instance for the application to use
export const netlifyBlobsService = new NetlifyBlobsService();
