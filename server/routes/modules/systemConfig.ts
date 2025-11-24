/** @format */

import { Router } from "express";
import type { RouteContext } from "../context";

export function createSystemConfigRouter({
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
        const config = await storage.getAllSystemConfig();
        res.json(config);
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  router.get("/:key", async (req, res) => {
    try {
      const config = await storage.getSystemConfig(req.params.key);
      if (!config) {
        return res.status(404).json({ message: "Config not found" });
      }
      res.json(config);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post(
    "/",
    requireAuth,
    requireRole(["SUPERADMIN"]),
    async (req, res) => {
      try {
        const configData = req.body;
        const config = await storage.setSystemConfig(configData);

        await storage.createAuditLog({
          userId: (req as any).user.id,
          action: "system_config_updated",
          entityType: "system_config",
          entityId: config.key,
          details: configData,
          reason: null,
        } as any);

        res.status(201).json(config);
      } catch (error) {
        res.status(400).json({ message: "Invalid config data" });
      }
    }
  );

  return router;
}
