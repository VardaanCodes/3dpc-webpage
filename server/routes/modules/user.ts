/** @format */

import { Router, type Request, type Response } from "express";
import { insertUserSchema } from "../../../shared/schema";
import type { RouteContext } from "../context";

export function createUserRouter({ storage, requireAuth }: RouteContext) {
  const router = Router();

  router.get("/profile", requireAuth, async (req: Request, res: Response) => {
    try {
      if (!(req as any).user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const user = await storage.getUser((req as any).user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.post("/register", async (req, res) => {
    try {
      console.log("Registration request body:", req.body);
      console.log("User from token:", req.user);

      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        console.log("Existing user found:", existingUser.email);
        return res.json(existingUser);
      }

      const userData = {
        ...insertUserSchema.parse(req.body),
        lastLogin: null,
        photoURL: req.body.photoURL || null,
        role: req.body.role || "USER",
        suspended: req.body.suspended ?? false,
        fileUploadsUsed: req.body.fileUploadsUsed ?? 0,
        notificationPreferences: req.body.notificationPreferences || null,
      };

      const user = await storage.createUser(userData as any);
      console.log("New user created:", user.email);
      res.status(201).json(user);
    } catch (error: any) {
      console.error("Registration error:", error);
      res
        .status(400)
        .json({ message: "Invalid user data", error: error.message });
    }
  });

  router.post("/logout", (req, res) => {
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

  router.get("/file-limits", requireAuth, async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const fileUploadLimit = await storage.getSystemConfig(
        "file_upload_limit"
      );
      const maxFiles = (fileUploadLimit?.value as number) || 25;

      res.json({
        used: user.fileUploadsUsed || 0,
        limit: maxFiles,
        remaining: maxFiles - (user.fileUploadsUsed || 0),
        percentageUsed: Math.round(
          ((user.fileUploadsUsed || 0) / maxFiles) * 100
        ),
      });
    } catch (error) {
      console.error("Error fetching file limits:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  router.get(
    "/notification-preferences",
    requireAuth,
    async (req, res) => {
      try {
        if (!req.user)
          return res.status(401).json({ message: "Unauthorized" });

        const user = await storage.getUser(req.user.id);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        const defaultPreferences = {
          orderApproved: true,
          orderStarted: true,
          orderCompleted: true,
          orderFailed: true,
          orderCancelled: true,
        };

        const preferences =
          user.notificationPreferences || defaultPreferences;
        res.json(preferences);
      } catch (error) {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  );

  router.put(
    "/notification-preferences",
    requireAuth,
    async (req, res) => {
      try {
        if (!req.user)
          return res.status(401).json({ message: "Unauthorized" });

        const preferences = req.body;
        const validKeys = [
          "orderApproved",
          "orderStarted",
          "orderCompleted",
          "orderFailed",
          "orderCancelled",
        ];
        for (const key of validKeys) {
          if (typeof preferences[key] !== "boolean") {
            return res
              .status(400)
              .json({ message: `Invalid preference value for ${key}` });
          }
        }

        await storage.updateUser(req.user.id, {
          notificationPreferences: preferences,
        });

        await storage.createAuditLog({
          userId: req.user.id,
          action: "notification_preferences_updated",
          entityType: "user",
          entityId: req.user.id.toString(),
          details: preferences,
          reason: null,
        } as any);

        res.json(preferences);
      } catch (error) {
        res
          .status(400)
          .json({ message: "Failed to update notification preferences" });
      }
    }
  );

  return router;
}
