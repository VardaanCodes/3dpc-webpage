/** @format */

// CommonJS serverless function for Netlify
const express = require("express");
const serverless = require("serverless-http");
const session = require("express-session");

// Create Express app
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Firebase authentication middleware
// We'll use a simplified version for now
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")?.[1];
  if (token) {
    try {
      console.log(
        "Auth token received, but Firebase admin not initialized in this simplified version"
      );
      // We'll set a mock user for testing
      req.user = {
        id: "test-user-id",
        email: req.headers["x-user-email"] || "test@example.com",
        role: "USER",
      };
    } catch (error) {
      console.log("Auth error:", error.message);
    }
  }
  next();
});

// Simple user routes for testing
app.get("/api/user/profile", async (req, res) => {
  try {
    // For testing, we'll return the user from req or a mock user
    const user = req.user || {
      id: "test-user-id",
      email: "test@example.com",
      displayName: "Test User",
      role: "USER",
    };

    console.log("Returning user profile:", user);
    return res.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return res
      .status(500)
      .json({ message: "Error fetching user profile", error: error.message });
  }
});

app.post("/api/user/register", async (req, res) => {
  try {
    const { email, displayName, photoURL, role } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    console.log("Registering user with email:", email);

    // Mock user registration
    const user = {
      id: "new-user-" + Date.now(),
      email,
      displayName: displayName || email.split("@")[0],
      photoURL: photoURL || "",
      role: role || "USER",
      created: new Date().toISOString(),
    };

    console.log("User registered successfully:", user);
    return res.status(201).json(user);
  } catch (error) {
    console.error("Error registering user:", error);
    return res
      .status(500)
      .json({ message: "Error registering user", error: error.message });
  }
});

// Return 404 for unknown API routes
app.use("/api/*", (req, res) => {
  res.status(404).json({ message: "API endpoint not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message, error: err.toString() });
});

// Export the serverless handler
exports.handler = serverless(app);
