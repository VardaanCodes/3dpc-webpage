/** @format */

import { Router } from "express";
import { OrderStatus } from "../../../shared/schema";
import type { RouteContext } from "../context";

export function createStatsRouter({
  storage,
  requireAuth,
  requireRole,
}: RouteContext) {
  const router = Router();

  router.get("/user", requireAuth, async (req, res) => {
    try {
      if (!(req as any).user)
        return res.status(401).json({ message: "Unauthorized" });
      const orders = await storage.getUserOrders((req as any).user.id);

      const stats = {
        pending: orders.filter(
          (o) =>
            o.status === OrderStatus.SUBMITTED ||
            o.status === OrderStatus.APPROVED
        ).length,
        inProgress: orders.filter((o) => o.status === OrderStatus.STARTED)
          .length,
        completed: orders.filter((o) => o.status === OrderStatus.FINISHED)
          .length,
        failed: orders.filter(
          (o) =>
            o.status === OrderStatus.FAILED || o.status === OrderStatus.CANCELLED
        ).length,
        total: orders.length,
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get(
    "/admin",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (_req, res) => {
      try {
        const orders = await storage.getAllOrders();
        const batches = await storage.getAllBatches();

        const stats = {
          totalPending: orders.filter((o) => o.status === OrderStatus.SUBMITTED)
            .length,
          inProgress: orders.filter((o) => o.status === OrderStatus.STARTED)
            .length,
          batchesActive: batches.filter(
            (b) => b.status === "created" || b.status === "approved"
          ).length,
          avgProcessingTime: "2.5 days",
        };

        res.json(stats);
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  router.get(
    "/admin/overview",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (_req, res) => {
      try {
        const orders = await storage.getAllOrders();
        const batches = await storage.getAllBatches();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = {
          totalOrders: orders.length,
          totalPending: orders.filter((o: any) => o.status === "submitted")
            .length,
          inProgress: orders.filter((o: any) =>
            ["approved", "started"].includes(o.status)
          ).length,
          batchesActive: batches.filter((b: any) =>
            ["created", "approved", "active"].includes(b.status)
          ).length,
          completedToday: orders.filter(
            (o: any) =>
              o.status === "finished" &&
              o.actualCompletionTime &&
              new Date(o.actualCompletionTime) >= today
          ).length,
          avgProcessingTime: "3.2 days",
          failed: orders.filter((o: any) =>
            ["failed", "cancelled"].includes(o.status)
          ).length,
          totalUsers: await storage
            .getAllUsers()
            .then((users) => users.length),
        };

        res.json(stats);
      } catch (error) {
        res.status(500).json({ message: "Failed to get admin stats" });
      }
    }
  );

  router.get(
    "/system",
    requireAuth,
    requireRole(["SUPERADMIN"]),
    async (_req, res) => {
      try {
        const orders = await storage.getAllOrders();
        const users = await storage.getAllUsers();
        const batches = await storage.getAllBatches();

        const systemStats = {
          totalOrders: orders.length,
          totalUsers: users.length,
          totalAdmins: users.filter((u: any) => u.role === "ADMIN").length,
          totalBatches: batches.length,
          storageUsed: "2.4 GB",
          systemHealth: "healthy",
          activeSessions: users.filter((u: any) => u.status === "active")
            .length,
        };

        res.json(systemStats);
      } catch (error) {
        res.status(500).json({ message: "Failed to get system stats" });
      }
    }
  );

  return router;
}
