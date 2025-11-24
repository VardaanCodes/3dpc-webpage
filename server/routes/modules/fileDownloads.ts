/** @format */

import { Router } from "express";
import type { RouteContext } from "../context";

export function createFileDownloadRouter({
  storage,
  requireAuth,
}: RouteContext) {
  const router = Router();

  router.get("/:id/download", requireAuth, async (req, res) => {
    try {
      if (!(req as any).user)
        return res.status(401).json({ message: "Unauthorized" });

      const fileId = req.params.id;
      const fileData = await storage.getFileById(fileId);

      if (!fileData) {
        return res.status(404).json({ message: "File not found" });
      }

      const file = fileData.metadata;

      if (file.orderId) {
        const order = await storage.getOrder(file.orderId);
        if (!order) {
          return res.status(404).json({ message: "Associated order not found" });
        }

        if (
          order.userId !== (req as any).user.id &&
          !["ADMIN", "SUPERADMIN"].includes(
            ((req as any).user.role || "").toUpperCase()
          )
        ) {
          return res.status(403).json({ message: "Access denied" });
        }

        const systemConfig = await storage.getSystemConfig("file_download_days");
        const downloadDays = (systemConfig?.value as number) || 30;

        if (order.submittedAt) {
          const submittedDate = new Date(order.submittedAt);
          const expiryDate = new Date(submittedDate);
          expiryDate.setDate(expiryDate.getDate() + downloadDays);

          if (new Date() > expiryDate) {
            return res.status(410).json({
              message: "File has expired and is no longer available for download",
            });
          }
        }
      }

      await storage.createAuditLog({
        userId: (req as any).user.id,
        action: "file_downloaded",
        entityType: "file",
        entityId: fileId,
        details: {
          fileName: file.fileName,
          orderId: file.orderId || null,
        } as any,
        reason: null,
      } as any);

      res.setHeader(
        "Content-Type",
        file.contentType || "application/octet-stream"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${file.fileName}"`
      );
      res.setHeader("Content-Length", file.size);

      res.send(fileData.data);
    } catch (error) {
      console.error("File download error:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  return router;
}
