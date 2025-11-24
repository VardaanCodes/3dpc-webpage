/** @format */

import { Router, type Request, type Response } from "express";
import { insertBatchSchema } from "../../../shared/schema";
import type { RouteContext } from "../context";

export function createBatchRouter({
  storage,
  requireAuth,
  requireRole,
}: RouteContext) {
  const router = Router();

  router.get(
    "/",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (_req: Request, res: Response) => {
      try {
        const batches = await storage.getAllBatches();
        res.json(batches);
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  router.patch(
    "/:id",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (req: Request, res: Response) => {
      try {
        const batchId = parseInt(req.params.id);
        const updates = req.body;

        const batch = await storage.updateBatch(batchId, updates);
        await storage.createAuditLog({
          userId: (req as any).user.id,
          action: "batch_updated",
          entityType: "batch",
          entityId: batchId.toString(),
          details: updates,
          reason: null,
        } as any);

        res.json(batch);
      } catch (error) {
        res.status(400).json({ message: "Failed to update batch" });
      }
    }
  );

  router.post(
    "/",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (req: Request, res: Response) => {
      try {
        const batchData = insertBatchSchema.parse(req.body);
        const batch = await storage.createBatch(batchData as any);

        await storage.createAuditLog({
          userId: (req as any).user.id,
          action: "batch_created",
          entityType: "batch",
          entityId: batch.id.toString(),
          details: batchData,
          reason: null,
        } as any);

        res.status(201).json(batch);
      } catch (error) {
        res.status(400).json({ message: "Invalid batch data" });
      }
    }
  );

  return router;
}
