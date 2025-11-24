/** @format */

import { Router } from "express";
import {
  insertOrderSchema,
  OrderStatus,
} from "../../../shared/schema";
import type { RouteContext } from "../context";

export function createOrderRouter({
  storage,
  requireAuth,
  requireRole,
}: RouteContext) {
  const router = Router();

  router.get("/", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const currentUser = req.user;
      let orders;

      if (currentUser.role === "student") {
        orders = await storage.getUserOrders(currentUser.id);
      } else {
        orders = await storage.getAllOrders();
      }

      const ordersWithDetails = await Promise.all(
        orders.map(async (order) => {
          const club = order.clubId
            ? await storage.getClub(order.clubId)
            : null;
          const user = await storage.getUser(order.userId);
          return {
            ...order,
            club,
            user: currentUser.role !== "student" ? user : undefined,
          };
        })
      );

      res.json(ordersWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get("/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const order = await storage.getOrder(parseInt(req.params.id));
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (req.user.role === "student" && order.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const club = order.clubId ? await storage.getClub(order.clubId) : null;
      const user = await storage.getUser(order.userId);

      res.json({ ...order, club, user });
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      console.log("Order request body:", req.body);

      if (!req.user.id) {
        return res.status(400).json({
          message: "Invalid user ID",
          error: "User ID is required but was not provided",
        });
      }

      const orderData = insertOrderSchema.parse({
        ...req.body,
        userId: req.user.id,
      });

      const fileUploadLimit = await storage.getSystemConfig(
        "file_upload_limit"
      );
      const maxFiles = (fileUploadLimit?.value as number) || 10;

      const user = await storage.getUser(req.user.id);
      if (user && (user.fileUploadsUsed || 0) >= maxFiles) {
        return res.status(400).json({ message: "File upload limit exceeded" });
      }

      if (!orderData.files || !Array.isArray(orderData.files)) {
        orderData.files = [];
      }

      const sanitizedOrderData = {
        userId: orderData.userId,
        projectName: orderData.projectName,
        clubId: orderData.clubId || null,
        status: "submitted",
        material: orderData.material || "PLA",
        color: orderData.color || "White",
        providingFilament: orderData.providingFilament ?? false,
        specialInstructions: orderData.specialInstructions || null,
        files: orderData.files || [],
        batchId: null,
        estimatedCompletionTime: null,
        actualCompletionTime: null,
        failureReason: null,
        cancellationReason: null,
        eventDeadline: orderData.eventDeadline
          ? new Date(orderData.eventDeadline).toISOString()
          : null,
      };

      const order = await storage.createOrder(sanitizedOrderData as any);
      console.log("Order created successfully:", order.orderId);

      if (orderData.files && Array.isArray(orderData.files)) {
        await storage.updateUser(req.user.id, {
          fileUploadsUsed:
            (user?.fileUploadsUsed || 0) + orderData.files.length,
        });
      }

      await storage.createAuditLog({
        userId: req.user.id,
        action: "order_submitted",
        entityType: "order",
        entityId: order.id.toString(),
        details: { orderId: order.orderId, projectName: order.projectName },
        reason: null,
      } as any);

      res.status(201).json(order);
    } catch (error: any) {
      console.error("Order creation error:", error);
      res.status(400).json({
        message: "Invalid order data",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  router.patch(
    "/:id",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (req, res) => {
      try {
        if (!req.user)
          return res.status(401).json({ message: "Unauthorized" });
        const orderId = parseInt(req.params.id);
        const updates = req.body;

        const order = await storage.updateOrderWithNotification(
          orderId,
          updates
        );

        await storage.createAuditLog({
          userId: req.user.id,
          action: "order_updated",
          entityType: "order",
          entityId: orderId.toString(),
          details: updates,
          reason: updates.reason,
        } as any);

        res.json(order);
      } catch (error) {
        res.status(400).json({ message: "Failed to update order" });
      }
    }
  );

  router.patch(
    "/:id/status",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (req, res) => {
      try {
        if (!req.user)
          return res.status(401).json({ message: "Unauthorized" });
        const orderId = parseInt(req.params.id);
        const { status } = req.body;

        if (!Object.values(OrderStatus).includes(status)) {
          return res.status(400).json({ message: "Invalid order status" });
        }

        const order = await storage.updateOrderWithNotification(orderId, {
          status,
        });

        await storage.createAuditLog({
          userId: req.user.id,
          action: "order_status_updated",
          entityType: "order",
          entityId: orderId.toString(),
          details: { status },
          reason: null,
        } as any);

        res.json(order);
      } catch (error) {
        res.status(400).json({ message: "Failed to update order status" });
      }
    }
  );

  return router;
}
