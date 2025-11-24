/** @format */

import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "../storage";
import filesRoutes from "./files";
import { createUserRouter } from "./modules/user";
import { createAdminUserRouter } from "./modules/adminUsers";
import { createClubRouter } from "./modules/clubs";
import { createOrderRouter } from "./modules/orders";
import { createBatchRouter } from "./modules/batches";
import { createStatsRouter } from "./modules/stats";
import { createAuditRouter } from "./modules/audit";
import { createSystemConfigRouter } from "./modules/systemConfig";
import { createAnalyticsRouter } from "./modules/analytics";
import { createFileDownloadRouter } from "./modules/fileDownloads";
import type { RouteContext } from "./context";

export async function registerRoutes(app: Express): Promise<Server> {
  const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if ((req as any).user) {
      return next();
    }
    res.status(401).json({ message: "Authentication required" });
  };

  const roleHierarchy = ["GUEST", "USER", "ADMIN", "SUPERADMIN"];

  const requireRole =
    (roles: string[]) => (req: Request, res: Response, next: NextFunction) => {
      if (!(req as any).user || !(req as any).user.role) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      const minRequiredIndex = Math.min(
        ...roles.map((r) => roleHierarchy.indexOf(r)).filter((i) => i !== -1)
      );
      const userRoleIndex = roleHierarchy.indexOf(
        (req as any).user.role.toUpperCase()
      );
      if (userRoleIndex === -1 || userRoleIndex < minRequiredIndex) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      next();
    };

  const context: RouteContext = {
    storage,
    requireAuth,
    requireRole,
  };

  app.use("/api/user", createUserRouter(context));
  app.use("/api/users", createAdminUserRouter(context));
  app.use("/api/clubs", createClubRouter(context));
  app.use("/api/orders", createOrderRouter(context));
  app.use("/api/batches", createBatchRouter(context));
  app.use("/api/stats", createStatsRouter(context));
  app.use("/api/audit-logs", createAuditRouter(context));
  app.use("/api/system/config", createSystemConfigRouter(context));
  app.use("/api/analytics", createAnalyticsRouter(context));
  app.use("/api/files", filesRoutes);
  app.use("/api/files", createFileDownloadRouter(context));

  const httpServer = createServer(app);
  return httpServer;
}
