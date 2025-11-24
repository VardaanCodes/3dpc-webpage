/** @format */

import type { Config } from "@netlify/functions";
import { storage } from "../../server/storage.ts";

// This function runs daily at 2 AM UTC to clean up expired files
export default async (req: Request) => {
  const { next_run } = await req.json();

  console.log("Starting automated file cleanup...");
  console.log("Next invocation at:", next_run);

  try {
    // Get system configuration for file retention days
    const fileRetentionConfig = await storage.getSystemConfig(
      "file_download_days"
    );
    const retentionDays = (fileRetentionConfig?.value as number) || 30;

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    console.log(
      `Cleaning up files older than ${retentionDays} days (before ${cutoffDate.toISOString()})`
    );

    // Get all orders submitted before cutoff date
    const allOrders = await storage.getAllOrders();
    const expiredOrders = allOrders.filter((order) => {
      if (!order.submittedAt) return false;
      const submittedDate = new Date(order.submittedAt);
      return submittedDate < cutoffDate;
    });

    let deletedFilesCount = 0;
    let totalSizeDeleted = 0;

    // Process each expired order
    for (const order of expiredOrders) {
      if (order.files && Array.isArray(order.files)) {
        for (const fileInfo of order.files) {
          try {
            // Type guard and null check
            if (
              !fileInfo ||
              typeof fileInfo !== "object" ||
              !("id" in fileInfo)
            ) {
              continue;
            }

            const file = fileInfo as {
              id: string;
              fileName: string;
              size?: number;
            };

            // Get file metadata to check size before deletion
            const fileData = await storage.getFileById(file.id);
            if (fileData) {
              totalSizeDeleted += fileData.metadata.size || 0;
            }

            // Delete the file from storage
            await storage.deleteFile(file.id);
            deletedFilesCount++;

            console.log(
              `Deleted expired file: ${file.fileName} (Order: ${order.orderId})`
            );
          } catch (error) {
            const file = fileInfo as { fileName?: string };
            console.error(
              `Failed to delete file ${file.fileName || "unknown"}:`,
              error
            );
          }
        }

        // Clear files array from order
        await storage.updateOrder(order.id, { files: [] });
      }
    }

    // Create audit log for cleanup operation
    await storage.createAuditLog({
      userId: 0, // System user
      action: "automated_file_cleanup",
      entityType: "system",
      entityId: "file_cleanup",
      details: {
        deletedFilesCount,
        totalSizeDeleted,
        retentionDays,
        cutoffDate: cutoffDate.toISOString(),
        expiredOrdersCount: expiredOrders.length,
      },
      reason: "Automated cleanup of expired files",
    });

    console.log(`File cleanup completed successfully:`);
    console.log(`- Deleted ${deletedFilesCount} files`);
    console.log(
      `- Total size freed: ${(totalSizeDeleted / 1024 / 1024).toFixed(2)} MB`
    );
    console.log(`- Processed ${expiredOrders.length} expired orders`);

    // Scheduled functions don't return response bodies, but we can log the result
    console.log("File cleanup completed successfully");
  } catch (error) {
    console.error("File cleanup failed:", error);

    // Create audit log for failed cleanup
    try {
      await storage.createAuditLog({
        userId: 0, // System user
        action: "automated_file_cleanup_failed",
        entityType: "system",
        entityId: "file_cleanup",
        details: {
          error: error instanceof Error ? error.message : String(error),
        },
        reason: "Automated cleanup failed",
      });
    } catch (auditError) {
      console.error(
        "Failed to create audit log for cleanup failure:",
        auditError
      );
    }
  }
};

export const config: Config = {
  schedule: "0 2 * * *", // Daily at 2 AM UTC
};
