/** @format */

import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import { getStore } from "@netlify/blobs";
import { v4 as uuid } from "uuid";
import { orders } from "../../shared/schema";
import { createSelectSchema } from "drizzle-zod";

/**
 * Interface representing file metadata to be stored in the database
 */
export interface FileMetadata {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedBy: number;
  orderId?: number;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Repository for file operations using Netlify Blobs for storage and PostgreSQL for metadata
 */
export class FilesRepository {
  private blobStore = getStore("file-uploads");

  /**
   * Upload a file to Netlify Blobs and store metadata in database
   * @param fileBuffer The file content as a buffer
   * @param fileName Original filename
   * @param contentType MIME type of the file
   * @param size File size in bytes
   * @param uploadedBy User ID who uploaded the file
   * @param orderId Optional order ID if file is associated with an order
   * @returns The file metadata including generated ID
   */
  async uploadFile(
    fileBuffer: Buffer | Blob,
    fileName: string,
    contentType: string,
    size: number,
    uploadedBy: number,
    orderId?: number
  ): Promise<FileMetadata> {
    // Generate a unique ID for the file
    const fileId = uuid();
    const createdAt = new Date();

    // Calculate expiration date (30 days by default)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Create metadata object
    const metadata: FileMetadata = {
      id: fileId,
      fileName,
      contentType,
      size,
      uploadedBy,
      orderId,
      createdAt,
      expiresAt,
    };

    // Upload file to Netlify Blobs with metadata
    await this.blobStore.set(fileId, fileBuffer, {
      metadata: {
        fileName,
        contentType,
        size,
        uploadedBy,
        orderId,
        createdAt: createdAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
    });

    // If file is associated with an order, update the order's files field
    if (orderId) {
      await this.addFileToOrder(orderId, metadata);
    }

    return metadata;
  }

  /**
   * Get a file from Netlify Blobs by its ID
   * @param fileId The file ID
   * @returns The file content and metadata, or null if not found
   */
  async getFileById(
    fileId: string
  ): Promise<{ data: Blob; metadata: FileMetadata } | null> {
    const result = await this.blobStore.getWithMetadata(fileId);

    if (!result || !result.data) {
      return null;
    }

    // Convert string dates in metadata back to Date objects
    const metadata = result.metadata as any;

    return {
      data: result.data as unknown as Blob,
      metadata: {
        ...metadata,
        createdAt: new Date(metadata.createdAt),
        expiresAt: metadata.expiresAt
          ? new Date(metadata.expiresAt)
          : undefined,
      },
    };
  }

  /**
   * Get file metadata without downloading the actual file
   * @param fileId The file ID
   * @returns The file metadata or null if not found
   */
  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    const result = await this.blobStore.getMetadata(fileId);

    if (!result || !result.metadata) {
      return null;
    }

    // Convert string dates in metadata back to Date objects
    const metadata = result.metadata as any;

    return {
      ...metadata,
      createdAt: new Date(metadata.createdAt),
      expiresAt: metadata.expiresAt ? new Date(metadata.expiresAt) : undefined,
    };
  }

  /**
   * Delete a file from Netlify Blobs
   * @param fileId The file ID
   * @param orderId Optional order ID to remove file reference from
   * @returns True if file was deleted, false otherwise
   */
  async deleteFile(fileId: string, orderId?: number): Promise<boolean> {
    try {
      // If file is associated with an order, remove it from the order's files field
      if (orderId) {
        await this.removeFileFromOrder(orderId, fileId);
      }

      // Delete the file from Netlify Blobs
      await this.blobStore.delete(fileId);
      return true;
    } catch (error) {
      console.error(`Error deleting file ${fileId}:`, error);
      return false;
    }
  }

  /**
   * List all files associated with an order
   * @param orderId The order ID
   * @returns Array of file metadata
   */
  async getFilesByOrderId(orderId: number): Promise<FileMetadata[]> {
    const orderResult = await db
      .select({ files: orders.files })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!orderResult.length || !orderResult[0].files) {
      return [];
    }

    // The files field in the order is an array of file metadata
    return orderResult[0].files as FileMetadata[];
  }

  /**
   * Clean up expired files
   * @returns Number of files deleted
   */
  async cleanupExpiredFiles(): Promise<number> {
    let deletedCount = 0;
    const now = new Date();

    // List all blobs in the store
    const { blobs } = await this.blobStore.list();

    // Process each blob
    for (const blob of blobs) {
      // Get metadata to check expiration
      const metadata = await this.blobStore.getMetadata(blob.key);

      if (metadata && metadata.metadata) {
        const fileMetadata = metadata.metadata as any;

        // Check if file has expired
        if (fileMetadata.expiresAt && new Date(fileMetadata.expiresAt) < now) {
          // Delete the expired file
          await this.blobStore.delete(blob.key);
          deletedCount++;

          // If file was associated with an order, update the order
          if (fileMetadata.orderId) {
            await this.removeFileFromOrder(fileMetadata.orderId, blob.key);
          }
        }
      }
    }

    return deletedCount;
  }

  /**
   * Add file metadata to an order's files array
   * @param orderId The order ID
   * @param fileMetadata The file metadata to add
   * @private
   */
  private async addFileToOrder(
    orderId: number,
    fileMetadata: FileMetadata
  ): Promise<void> {
    // Get current files array from the order
    const orderResult = await db
      .select({ files: orders.files })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!orderResult.length) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    // Get current files array or initialize empty array
    const currentFiles = (orderResult[0].files as FileMetadata[]) || [];

    // Add new file metadata to the array
    const updatedFiles = [...currentFiles, fileMetadata];

    // Update the order with the new files array
    await db
      .update(orders)
      .set({
        files: updatedFiles as any,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));
  }

  /**
   * Remove file metadata from an order's files array
   * @param orderId The order ID
   * @param fileId The file ID to remove
   * @private
   */
  private async removeFileFromOrder(
    orderId: number,
    fileId: string
  ): Promise<void> {
    // Get current files array from the order
    const orderResult = await db
      .select({ files: orders.files })
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!orderResult.length) {
      return; // Order not found, nothing to update
    }

    // Get current files array or initialize empty array
    const currentFiles = (orderResult[0].files as FileMetadata[]) || [];

    // Filter out the file to remove
    const updatedFiles = currentFiles.filter((file) => file.id !== fileId);

    // Update the order with the new files array
    await db
      .update(orders)
      .set({
        files: updatedFiles as any,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId));
  }

  /**
   * Generate a signed URL for a file
   * @param fileId The file ID
   * @param expirationMinutes How many minutes the URL should be valid for
   * @returns The signed URL
   */ async getSignedUrl(
    fileId: string,
    expirationMinutes: number = 15
  ): Promise<string> {
    // Create a URL that expires in the specified time
    // We'll convert to a public URL since getSignedUrl is not available in the API
    try {
      // Get the file metadata first to ensure it exists
      const metadata = await this.getFileMetadata(fileId);
      if (!metadata) {
        throw new Error(`File with ID ${fileId} not found`);
      }

      // Generate a one-time URL that expires after the specified time
      // This is a placeholder - implement according to your needs
      const baseUrl = process.env.NETLIFY_SITE_URL || "http://localhost:8888";
      // This would be replaced with actual URL signing in production
      const expiresAt = Date.now() + expirationMinutes * 60 * 1000;
      return `${baseUrl}/.netlify/functions/files/download/${fileId}?expires=${expiresAt}`;
    } catch (error) {
      console.error(`Error generating signed URL for file ${fileId}:`, error);
      throw new Error(
        `Could not generate signed URL: ${(error as Error).message}`
      );
    }
  }
}
