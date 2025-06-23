/** @format */

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertUserSchema,
  insertOrderSchema,
  insertBatchSchema,
  insertAuditLogSchema,
  OrderStatus,
} from "../shared/schema";
import admin from "firebase-admin";
import filesRoutes from "./routes/files";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware to extract user from session or Firebase token
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.user) {
      return next();
    }
    res.status(401).json({ message: "Authentication required" });
  };

  // Role hierarchy for access control
  const roleHierarchy = ["GUEST", "USER", "ADMIN", "SUPERADMIN"];

  const requireRole = (roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    // Find the highest required role index
    const minRequiredIndex = Math.min(
      ...roles.map((r) => roleHierarchy.indexOf(r)).filter((i) => i !== -1)
    );
    const userRoleIndex = roleHierarchy.indexOf(req.user.role.toUpperCase());
    if (userRoleIndex === -1 || userRoleIndex < minRequiredIndex) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };

  // User routes
  app.get("/api/user/profile", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  app.post("/api/user/register", async (req, res) => {
    try {
      console.log("Registration request body:", req.body);
      console.log("User from token:", req.user);

      // Check if user already exists first
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        console.log("Existing user found:", existingUser.email);
        // Don't store in session for serverless
        return res.json(existingUser);
      } // Validate the data against schema
      const userData = {
        ...insertUserSchema.parse(req.body),
        lastLogin: null, // Add the required lastLogin field
        photoURL: req.body.photoURL || null, // Convert undefined to null
        role: req.body.role || "USER", // Set default role if undefined
        suspended: req.body.suspended ?? false, // Convert undefined to false
        fileUploadsUsed: req.body.fileUploadsUsed ?? 0, // Convert undefined to 0
        notificationPreferences: req.body.notificationPreferences || null, // Convert undefined to null
      };
      const user = await storage.createUser(userData);

      console.log("New user created:", user.email);
      res.status(201).json(user);
    } catch (error: any) {
      console.error("Registration error:", error);
      res
        .status(400)
        .json({ message: "Invalid user data", error: error.message });
    }
  });

  app.post("/api/user/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "Could not log out, please try again." });
      }
      res.clearCookie("connect.sid");
      res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Club routes
  app.get("/api/clubs", async (req, res) => {
    try {
      const clubs = await storage.getAllClubs();
      res.json(clubs);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/clubs/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.json([]);
      }
      const clubs = await storage.searchClubs(query);
      res.json(clubs);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Order routes
  app.get("/api/orders", requireAuth, async (req, res) => {
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

      // Include club and user information
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

  app.get("/api/orders/:id", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const order = await storage.getOrder(parseInt(req.params.id));
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Students can only view their own orders
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
  app.post("/api/orders", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      console.log("Order request body:", req.body);

      // First validate that we have a userId
      if (!req.user.id) {
        return res.status(400).json({
          message: "Invalid user ID",
          error: "User ID is required but was not provided",
        });
      }

      // Parse and validate the order data
      const orderData = insertOrderSchema.parse({
        ...req.body,
        userId: req.user.id,
      });

      // Check file upload limits
      const fileUploadLimit = await storage.getSystemConfig(
        "file_upload_limit"
      );
      const maxFiles = (fileUploadLimit?.value as number) || 10;

      const user = await storage.getUser(req.user.id);
      if (user && (user.fileUploadsUsed || 0) >= maxFiles) {
        return res.status(400).json({ message: "File upload limit exceeded" });
      }

      // Ensure the files field is an array
      if (!orderData.files || !Array.isArray(orderData.files)) {
        orderData.files = [];
      }

      // Create the order
      const order = await storage.createOrder(orderData);
      console.log("Order created successfully:", order.orderId);

      // Update user's file upload count
      if (orderData.files && Array.isArray(orderData.files)) {
        await storage.updateUser(req.user.id, {
          fileUploadsUsed:
            (user?.fileUploadsUsed || 0) + orderData.files.length,
        });
      }

      // Create audit log
      await storage.createAuditLog({
        userId: req.user.id,
        action: "order_submitted",
        entityType: "order",
        entityId: order.id.toString(),
        details: { orderId: order.orderId, projectName: order.projectName },
        reason: null,
      });

      res.status(201).json(order);
    } catch (error) {
      console.error("Order creation error:", error);
      res.status(400).json({
        message: "Invalid order data",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
  app.patch(
    "/api/orders/:id",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (req, res) => {
      try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
        const orderId = parseInt(req.params.id);
        const updates = req.body;

        const order = await storage.updateOrder(orderId, updates);

        // Create audit log
        await storage.createAuditLog({
          userId: req.user.id,
          action: "order_updated",
          entityType: "order",
          entityId: orderId.toString(),
          details: updates,
          reason: updates.reason,
        });

        res.json(order);
      } catch (error) {
        res.status(400).json({ message: "Failed to update order" });
      }
    }
  );
  app.patch(
    "/api/orders/:id/status",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (req, res) => {
      try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
        const orderId = parseInt(req.params.id);
        const { status } = req.body;

        // Validate status
        if (!Object.values(OrderStatus).includes(status)) {
          return res.status(400).json({ message: "Invalid order status" });
        }

        const order = await storage.updateOrder(orderId, { status }); // Create audit log
        await storage.createAuditLog({
          userId: req.user.id,
          action: "order_status_updated",
          entityType: "order",
          entityId: orderId.toString(),
          details: { status },
          reason: null,
        });

        res.json(order);
      } catch (error) {
        res.status(400).json({ message: "Failed to update order status" });
      }
    }
  );

  // Batch routes
  app.get(
    "/api/batches",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (req, res) => {
      try {
        const batches = await storage.getAllBatches();
        res.json(batches);
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/api/batches",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (req, res) => {
      try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
        const batchData = insertBatchSchema.parse({
          ...req.body,
          createdById: req.user.id,
        });

        const batch = await storage.createBatch(batchData); // Create audit log
        await storage.createAuditLog({
          userId: req.user.id,
          action: "batch_created",
          entityType: "batch",
          entityId: batch.id.toString(),
          details: { batchNumber: batch.batchNumber, name: batch.name },
          reason: null,
        });

        res.status(201).json(batch);
      } catch (error) {
        res.status(400).json({ message: "Invalid batch data" });
      }
    }
  );

  app.patch(
    "/api/batches/:id",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (req, res) => {
      try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
        const batchId = parseInt(req.params.id);
        const updates = req.body;

        const batch = await storage.updateBatch(batchId, updates); // Create audit log
        await storage.createAuditLog({
          userId: req.user.id,
          action: "batch_updated",
          entityType: "batch",
          entityId: batchId.toString(),
          details: updates,
          reason: null,
        });

        res.json(batch);
      } catch (error) {
        res.status(400).json({ message: "Failed to update batch" });
      }
    }
  );

  // Admin routes
  app.get(
    "/api/users",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (req, res) => {
      try {
        const users = await storage.getAllUsers();
        res.json(users);
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.get(
    "/api/users/:id",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (req, res) => {
      try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
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

  app.patch(
    "/api/users/:id",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (req, res) => {
      try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
        const userId = parseInt(req.params.id);
        const updates = req.body;

        const user = await storage.updateUser(userId, updates); // Create audit log
        await storage.createAuditLog({
          userId: req.user.id,
          action: "user_updated",
          entityType: "user",
          entityId: userId.toString(),
          details: updates,
          reason: null,
        });

        res.json(user);
      } catch (error) {
        res.status(400).json({ message: "Failed to update user" });
      }
    }
  );

  // Statistics routes
  app.get("/api/stats/user", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const orders = await storage.getUserOrders(req.user.id);

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
            o.status === OrderStatus.FAILED ||
            o.status === OrderStatus.CANCELLED
        ).length,
        total: orders.length,
      };

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(
    "/api/stats/admin",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (req, res) => {
      try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
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
          avgProcessingTime: "2.5 days", // This would be calculated from actual data
        };

        res.json(stats);
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // Audit log routes
  app.get(
    "/api/audit-logs",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (req, res) => {
      try {
        const logs = await storage.getAuditLogs();
        res.json(logs);
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  // System config routes
  app.get(
    "/api/system/config",
    requireAuth,
    requireRole(["ADMIN", "SUPERADMIN"]),
    async (req, res) => {
      try {
        const config = await storage.getAllSystemConfig();
        res.json(config);
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.get("/api/system/config/:key", async (req, res) => {
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

  app.post(
    "/api/system/config",
    requireAuth,
    requireRole(["SUPERADMIN"]),
    async (req, res) => {
      try {
        if (!req.user) return res.status(401).json({ message: "Unauthorized" });
        const configData = req.body;

        // Create or update config
        const config = await storage.setSystemConfig(configData); // Create audit log
        await storage.createAuditLog({
          userId: req.user.id,
          action: "system_config_updated",
          entityType: "system_config",
          entityId: config.key,
          details: configData,
          reason: null,
        });

        res.status(201).json(config);
      } catch (error) {
        res.status(400).json({ message: "Invalid config data" });
      }
    }
  );

  // Add files routes
  app.use("/api/files", filesRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
