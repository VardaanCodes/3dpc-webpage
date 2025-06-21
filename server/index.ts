/** @format */

import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import path from "path";
import admin from "./firebaseAdmin";
import { storage } from "./storage";
import serverless from "serverless-http";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Firebase authentication middleware
app.use(async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split("Bearer ")?.[1];
  if (token) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      const user = await storage.getUserByEmail(decodedToken.email!);
      if (user) {
        (req as any).user = user;
      }
    } catch (error) {
      // Don't throw error, just don't authenticate
      console.log("Invalid auth token");
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

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

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

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    const clientRoot = path.resolve(process.cwd(), "dist/client");

    app.use(express.static(clientRoot));

    app.use("*", (_req, res) => {
      res.sendFile(path.resolve(clientRoot, "index.html"));
    });
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(port, "localhost", () => {
    log(`serving on port ${port}`);
  });
})();

// Export handler for Netlify Functions
export const handler = serverless(app);
