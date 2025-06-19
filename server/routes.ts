import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertOrderSchema, insertBatchSchema, insertAuditLogSchema, UserRole, OrderStatus } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware to extract user from session
  const requireAuth = async (req: any, res: any, next: any) => {
    try {
      // Check session first
      const user = req.session?.user;
      if (user) {
        req.user = user;
        return next();
      }
      
      return res.status(401).json({ message: "Authentication required" });
    } catch (error) {
      res.status(401).json({ message: "Authentication failed" });
    }
  };

  const requireRole = (roles: string[]) => (req: any, res: any, next: any) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };

  // User routes
  app.get("/api/user/profile", requireAuth, async (req, res) => {
    try {
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
      
      // Check if user already exists first
      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        // Store user in session and return
        req.session.user = existingUser;
        console.log("Existing user logged in:", existingUser.email);
        return res.json(existingUser);
      }

      // Validate the data against schema
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      
      // Store new user in session
      req.session.user = user;
      console.log("New user created:", user.email);
      res.status(201).json(user);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ message: "Invalid user data", error: error.message });
    }
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
      let orders;
      
      if (req.user.role === UserRole.STUDENT) {
        orders = await storage.getUserOrders(req.user.id);
      } else {
        orders = await storage.getAllOrders();
      }
      
      // Include club and user information
      const ordersWithDetails = await Promise.all(orders.map(async (order) => {
        const club = order.clubId ? await storage.getClub(order.clubId) : null;
        const user = await storage.getUser(order.userId);
        return {
          ...order,
          club,
          user: req.user.role !== UserRole.STUDENT ? user : undefined
        };
      }));
      
      res.json(ordersWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/orders/:id", requireAuth, async (req, res) => {
    try {
      const order = await storage.getOrder(parseInt(req.params.id));
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      
      // Students can only view their own orders
      if (req.user.role === UserRole.STUDENT && order.userId !== req.user.id) {
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
      const orderData = insertOrderSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      // Check file upload limits
      const fileUploadLimit = await storage.getSystemConfig("file_upload_limit");
      const maxFiles = fileUploadLimit?.value as number || 10;
      
      const user = await storage.getUser(req.user.id);
      if (user && user.fileUploadsUsed >= maxFiles) {
        return res.status(400).json({ message: "File upload limit exceeded" });
      }
      
      const order = await storage.createOrder(orderData);
      
      // Update user's file upload count
      if (orderData.files && Array.isArray(orderData.files)) {
        await storage.updateUser(req.user.id, {
          fileUploadsUsed: (user?.fileUploadsUsed || 0) + orderData.files.length
        });
      }
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user.id,
        action: "order_submitted",
        entityType: "order",
        entityId: order.id.toString(),
        details: { orderId: order.orderId, projectName: order.projectName }
      });
      
      res.status(201).json(order);
    } catch (error) {
      res.status(400).json({ message: "Invalid order data" });
    }
  });

  app.patch("/api/orders/:id", requireAuth, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]), async (req, res) => {
    try {
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
        reason: updates.reason
      });
      
      res.json(order);
    } catch (error) {
      res.status(400).json({ message: "Failed to update order" });
    }
  });

  // Batch routes
  app.get("/api/batches", requireAuth, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]), async (req, res) => {
    try {
      const batches = await storage.getAllBatches();
      res.json(batches);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/batches", requireAuth, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]), async (req, res) => {
    try {
      const batchData = insertBatchSchema.parse({
        ...req.body,
        createdById: req.user.id
      });
      
      const batch = await storage.createBatch(batchData);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user.id,
        action: "batch_created",
        entityType: "batch",
        entityId: batch.id.toString(),
        details: { batchNumber: batch.batchNumber, name: batch.name }
      });
      
      res.status(201).json(batch);
    } catch (error) {
      res.status(400).json({ message: "Invalid batch data" });
    }
  });

  app.patch("/api/batches/:id", requireAuth, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]), async (req, res) => {
    try {
      const batchId = parseInt(req.params.id);
      const updates = req.body;
      
      const batch = await storage.updateBatch(batchId, updates);
      
      // Create audit log
      await storage.createAuditLog({
        userId: req.user.id,
        action: "batch_updated",
        entityType: "batch",
        entityId: batchId.toString(),
        details: updates
      });
      
      res.json(batch);
    } catch (error) {
      res.status(400).json({ message: "Failed to update batch" });
    }
  });

  // Statistics routes
  app.get("/api/stats/user", requireAuth, async (req, res) => {
    try {
      const orders = await storage.getUserOrders(req.user.id);
      
      const stats = {
        pending: orders.filter(o => o.status === OrderStatus.SUBMITTED || o.status === OrderStatus.APPROVED).length,
        inProgress: orders.filter(o => o.status === OrderStatus.STARTED).length,
        completed: orders.filter(o => o.status === OrderStatus.FINISHED).length,
        failed: orders.filter(o => o.status === OrderStatus.FAILED || o.status === OrderStatus.CANCELLED).length,
        total: orders.length
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/stats/admin", requireAuth, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]), async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      const batches = await storage.getAllBatches();
      
      const stats = {
        totalPending: orders.filter(o => o.status === OrderStatus.SUBMITTED).length,
        inProgress: orders.filter(o => o.status === OrderStatus.STARTED).length,
        batchesActive: batches.filter(b => b.status === "created" || b.status === "approved").length,
        avgProcessingTime: "2.5 days" // This would be calculated from actual data
      };
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Audit log routes
  app.get("/api/audit-logs", requireAuth, requireRole([UserRole.ADMIN, UserRole.SUPERADMIN]), async (req, res) => {
    try {
      const filters = {
        userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
        entityType: req.query.entityType as string,
        action: req.query.action as string
      };
      
      const logs = await storage.getAuditLogs(filters);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // System config routes
  app.get("/api/system-config", requireAuth, requireRole([UserRole.SUPERADMIN]), async (req, res) => {
    try {
      const configs = await storage.getAllSystemConfig();
      res.json(configs);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get("/api/system-config/:key", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
