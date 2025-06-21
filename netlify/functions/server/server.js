/** @format */

// Direct serverless function implementation using Express and serverless-http
import express from "express";
import serverless from "serverless-http";
import admin from "../../../server/firebaseAdmin.js";
import { storage } from "../../../server/storage.js";
import session from "express-session";
import {
  insertUserSchema,
  insertOrderSchema,
  insertBatchSchema,
  insertAuditLogSchema,
  OrderStatus,
} from "../../../shared/schema.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Firebase authentication middleware
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")?.[1];
  if (token) {
    try {
      console.log("Verifying Firebase token...");
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log("Token verified for user:", decodedToken.email);

      const user = await storage.getUserByEmail(decodedToken.email);
      if (user) {
        req.user = user;
        console.log("User attached to request:", user.email);
      } else {
        console.log(
          "User not found in database for email:",
          decodedToken.email
        );
      }
    } catch (error) {
      // Don't throw error, just don't authenticate
      console.log("Invalid auth token:", error.message);
    }
  }
  next();
});

// Configure session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// Add logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      console.log(logLine);
    }
  });

  next();
});

// Auth middleware to extract user from session or Firebase token
const requireAuth = (req, res, next) => {
  if (req.user) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
};

// Role hierarchy for access control
const roleHierarchy = ["GUEST", "USER", "ADMIN", "SUPERADMIN"];

const requireRole = (roles) => (req, res, next) => {
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
    console.error("Error fetching user profile:", error);
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
    }

    // Validate the data against schema
    const userData = insertUserSchema.parse(req.body);
    const user = await storage.createUser(userData);

    console.log("New user created:", user.email);
    res.status(201).json(user);
  } catch (error) {
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

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Export the serverless handler
export const handler = serverless(app);
