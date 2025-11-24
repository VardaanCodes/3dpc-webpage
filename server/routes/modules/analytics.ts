/** @format */

import { Router } from "express";
import type { RouteContext } from "../context";

function resolveStartDate(period: string | string[] | undefined): Date {
  const now = new Date();
  const startDate = new Date();
  const value = Array.isArray(period) ? period[0] : period;

  switch (value) {
    case "7d":
      startDate.setDate(now.getDate() - 7);
      break;
    case "90d":
      startDate.setDate(now.getDate() - 90);
      break;
    case "1y":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    case "30d":
    default:
      startDate.setDate(now.getDate() - 30);
      break;
  }

  return startDate;
}

export function createAnalyticsRouter({
  storage,
  requireAuth,
  requireRole,
}: RouteContext) {
  const router = Router();

  router.get(
    "/orders/timeline",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (req, res) => {
      try {
        const orders = await storage.getAllOrders();
        const startDate = resolveStartDate(req.query.period as string);

        const timeline = orders
          .filter((order) => new Date(order.submittedAt || "") >= startDate)
          .reduce((acc: Record<string, any>, order) => {
            const date = new Date(order.submittedAt || "")
              .toISOString()
              .split("T")[0];
            if (!acc[date]) {
              acc[date] = { submitted: 0, completed: 0, failed: 0 };
            }
            acc[date].submitted++;
            if (order.status === "finished") acc[date].completed++;
            if (order.status === "failed" || order.status === "cancelled")
              acc[date].failed++;
            return acc;
          }, {} as Record<string, any>);

        res.json(timeline);
      } catch (error) {
        res.status(500).json({ message: "Failed to get timeline analytics" });
      }
    }
  );

  router.get(
    "/materials",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (_req, res) => {
      try {
        const orders = await storage.getAllOrders();

        const materialStats = orders.reduce((acc: any, order) => {
          const material = order.material || "Unknown";
          const color = order.color || "Unknown";

          if (!acc[material]) {
            acc[material] = { total: 0, colors: {}, completed: 0 };
          }

          acc[material].total++;
          if (!acc[material].colors[color]) {
            acc[material].colors[color] = 0;
          }
          acc[material].colors[color]++;

          if (order.status === "finished") {
            acc[material].completed++;
          }

          return acc;
        }, {} as Record<string, any>);

        res.json(materialStats);
      } catch (error) {
        res.status(500).json({ message: "Failed to get material analytics" });
      }
    }
  );

  router.get(
    "/performance",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (_req, res) => {
      try {
        const orders = await storage.getAllOrders();

        const completedOrders = orders.filter(
          (order) =>
            order.status === "finished" &&
            order.submittedAt &&
            order.actualCompletionTime
        );

        const processingTimes = completedOrders.map((order) => {
          const submitted = new Date(order.submittedAt!);
          const completed = new Date(order.actualCompletionTime!);
          return (
            (completed.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24)
          );
        });

        const avgProcessingTime =
          processingTimes.length > 0
            ? processingTimes.reduce((a, b) => a + b, 0) /
              processingTimes.length
            : 0;

        const successRate =
          orders.length > 0
            ? (orders.filter((o) => o.status === "finished").length /
                orders.length) *
              100
            : 0;

        const performance = {
          avgProcessingTime: Number(avgProcessingTime.toFixed(2)),
          successRate: Number(successRate.toFixed(2)),
          totalProcessed: completedOrders.length,
          totalFailed: orders.filter((o) =>
            ["failed", "cancelled"].includes(o.status)
          ).length,
          processingTimeDistribution: {
            "0-2 days": processingTimes.filter((t) => t <= 2).length,
            "2-5 days": processingTimes.filter((t) => t > 2 && t <= 5).length,
            "5-10 days": processingTimes.filter((t) => t > 5 && t <= 10)
              .length,
            "10+ days": processingTimes.filter((t) => t > 10).length,
          },
        };

        res.json(performance);
      } catch (error) {
        res.status(500).json({ message: "Failed to get performance analytics" });
      }
    }
  );

  router.get(
    "/export/csv",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (req, res) => {
      try {
        const { type = "orders", period = "30d" } = req.query;

        if (type !== "orders") {
          return res.status(400).json({ message: "Invalid export type" });
        }

        const orders = await storage.getAllOrders();
        const startDate = resolveStartDate(period as string);
        const filteredOrders = orders.filter(
          (order) => new Date(order.submittedAt || "") >= startDate
        );

        const csvHeaders = [
          "Order ID",
          "Project Name",
          "User Email",
          "Club",
          "Status",
          "Material",
          "Color",
          "Submitted At",
          "Completion Time",
          "Processing Days",
        ].join(",");

        const csvRows = await Promise.all(
          filteredOrders.map(async (order) => {
            const user = await storage.getUser(order.userId);
            const club = order.clubId
              ? await storage.getClub(order.clubId)
              : null;

            const processingDays =
              order.submittedAt && order.actualCompletionTime
                ? (
                    (new Date(order.actualCompletionTime).getTime() -
                      new Date(order.submittedAt).getTime()) /
                    (1000 * 60 * 60 * 24)
                  ).toFixed(2)
                : "";

            return [
              order.orderId,
              `"${order.projectName}"`,
              user?.email || "",
              club?.name || "",
              order.status,
              order.material || "",
              order.color || "",
              order.submittedAt || "",
              order.actualCompletionTime || "",
              processingDays,
            ].join(",");
          })
        );

        const csv = [csvHeaders, ...csvRows].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="orders_${period}_${
            new Date().toISOString().split("T")[0]
          }.csv"`
        );
        res.send(csv);
      } catch (error) {
        res.status(500).json({ message: "Failed to export data" });
      }
    }
  );

  return router;
}
