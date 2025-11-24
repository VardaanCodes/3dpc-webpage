/** @format */

import { Router, type Request, type Response } from "express";
import type { RouteContext } from "../context";

export function createAdminUserRouter({
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
        const users = await storage.getAllUsers();
        res.json(users);
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  router.get(
    "/:id",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (req: Request, res: Response) => {
      try {
        const user = await storage.getUser(parseInt(req.params.id));
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        res.json(user);
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
        const userId = parseInt(req.params.id);
        const updates = req.body;

        const user = await storage.updateUser(userId, updates);
        await storage.createAuditLog({
          userId: (req as any).user.id,
          action: "user_updated",
          entityType: "user",
          entityId: userId.toString(),
          details: updates,
          reason: null,
        } as any);

        res.json(user);
      } catch (error) {
        res.status(400).json({ message: "Failed to update user" });
      }
    }
  );

  return router;
}
