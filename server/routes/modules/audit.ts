/** @format */

import { Router } from "express";
import type { RouteContext } from "../context";

export function createAuditRouter({
  storage,
  requireAuth,
  requireRole,
}: RouteContext) {
  const router = Router();

  router.get(
    "/",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (_req, res) => {
      try {
        const logs = await storage.getAuditLogs();
        res.json(logs);
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  return router;
}
