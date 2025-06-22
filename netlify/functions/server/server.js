/** @format */

// Enhanced Netlify serverless function with full backend integration
const express = require("express");
const serverless = require("serverless-http");
const session = require("express-session");

// Create Express app
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// CORS middleware for local development
app.use((req, res, next) => {
  const allowedOrigins = [
    "http://localhost:5000",
    "http://localhost:3000",
    "https://3dpc-webpage.netlify.app",
    "https://deploy-preview-*--3dpc-webpage.netlify.app",
    "https://branch-*--3dpc-webpage.netlify.app",
  ];

  const origin = req.headers.origin;
  if (
    allowedOrigins.some((allowed) =>
      allowed.includes("*")
        ? origin && origin.match(allowed.replace("*", ".*"))
        : origin === allowed
    )
  ) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, PATCH, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-User-Email"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
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
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  })
);

// Enhanced logging middleware
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

// Initialize Firebase Admin SDK for serverless environment
let admin = null;
let firebaseInitialized = false;

const initializeFirebase = () => {
  if (firebaseInitialized) return admin;

  try {
    // Import firebase-admin dynamically to avoid cold start issues
    admin = require("firebase-admin");

    if (admin.apps.length === 0) {
      const serviceAccountKey = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY;

      if (serviceAccountKey) {
        try {
          // Decode base64-encoded service account key
          const serviceAccount = JSON.parse(
            Buffer.from(serviceAccountKey, "base64").toString("utf8")
          );

          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });

          console.log(
            "Firebase Admin SDK initialized successfully with service account"
          );
        } catch (keyError) {
          console.error("Failed to parse service account key:", keyError);
          // Try to initialize with environment variables as fallback
          if (process.env.VITE_FIREBASE_PROJECT_ID) {
            console.log(
              "Attempting Firebase initialization with environment variables..."
            );
            admin.initializeApp({
              credential: admin.credential.applicationDefault(),
              projectId: process.env.VITE_FIREBASE_PROJECT_ID,
            });
            console.log(
              "Firebase Admin SDK initialized with application default credentials"
            );
          }
        }
      } else {
        console.warn("Firebase Admin SDK service account key not found");
        // For now, return null to gracefully handle the missing key
        // Registration will work without Firebase token verification
        return null;
      }
    }

    firebaseInitialized = true;
    return admin;
  } catch (error) {
    console.error("Firebase Admin SDK initialization failed:", error);
    return null;
  }
};

// Database connection setup
let db = null;
let dbInitialized = false;

const initializeDatabase = async () => {
  if (dbInitialized && db) return db;

  try {
    // Dynamic import for database modules to avoid cold start issues
    const { neon } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-http");
    const schema = await import("../../../shared/schema.js");

    // Use NETLIFY_DATABASE_URL if available, otherwise fall back to DATABASE_URL
    const databaseUrl =
      process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error(
        "Neither NETLIFY_DATABASE_URL nor DATABASE_URL environment variable is set"
      );
    }

    console.log(
      "Connecting to database with URL:",
      databaseUrl.split("@")[0] + "@***"
    );

    const sql = neon(databaseUrl);
    db = drizzle(sql, { schema });

    dbInitialized = true;
    console.log("Database connection initialized successfully");
    return db;
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
};

// Enhanced Firebase authentication middleware
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")?.[1];

  if (token && token !== "undefined" && token !== "null") {
    try {
      const firebaseAdmin = initializeFirebase();

      if (firebaseAdmin) {
        console.log("Verifying Firebase token...");
        const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
        console.log("Token verified for user:", decodedToken.email);

        // Initialize database connection
        const database = await initializeDatabase();

        // Query user from database
        const { users } = await import("../../../shared/schema.js");
        const { eq } = await import("drizzle-orm");

        const userResults = await database
          .select()
          .from(users)
          .where(eq(users.email, decodedToken.email))
          .limit(1);

        if (userResults.length > 0) {
          req.user = userResults[0];
          console.log("User attached to request:", req.user.email);
        } else {
          console.log(
            "User not found in database for email:",
            decodedToken.email
          );
          // User will be created during registration flow
        }
      } else {
        console.log(
          "Firebase Admin SDK not available - skipping token verification"
        );
      }
    } catch (error) {
      console.log("Auth token verification failed:", error.message);
      // Don't block request, just don't authenticate
    }
  }

  next();
});

// Auth middleware helpers
const requireAuth = (req, res, next) => {
  if (req.user) {
    return next();
  }
  res.status(401).json({ message: "Authentication required" });
};

const roleHierarchy = ["GUEST", "USER", "ADMIN", "SUPERADMIN"];

const requireRole = (roles) => (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }

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

    res.json(req.user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/user/register", async (req, res) => {
  try {
    console.log("Registration request body:", req.body);

    const database = await initializeDatabase();
    const { users, insertUserSchema } = await import(
      "../../../shared/schema.js"
    );
    const { eq } = await import("drizzle-orm");

    // Check if user already exists
    const existingUser = await database
      .select()
      .from(users)
      .where(eq(users.email, req.body.email))
      .limit(1);

    if (existingUser.length > 0) {
      console.log("Existing user found:", existingUser[0].email);
      return res.json(existingUser[0]);
    }

    // Validate and create new user
    const userData = {
      ...req.body,
      lastLogin: null,
      photoURL: req.body.photoURL || null,
      role: req.body.role || "USER",
      suspended: req.body.suspended ?? false,
      fileUploadsUsed: req.body.fileUploadsUsed ?? 0,
      notificationPreferences: req.body.notificationPreferences || null,
    };

    const validatedData = insertUserSchema.parse(userData);

    const newUser = await database
      .insert(users)
      .values(validatedData)
      .returning();

    console.log("New user created:", newUser[0].email);
    res.status(201).json(newUser[0]);
  } catch (error) {
    console.error("Registration error:", error);
    res.status(400).json({
      message: "Invalid user data",
      error: error.message,
    });
  }
});

app.post("/api/user/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        message: "Could not log out, please try again.",
      });
    }
    res.clearCookie("connect.sid");
    res.status(200).json({ message: "Logged out successfully" });
  });
});

// Club routes
app.get("/api/clubs", async (req, res) => {
  try {
    const database = await initializeDatabase();
    const { clubs } = await import("../../../shared/schema.js");

    const allClubs = await database.select().from(clubs);
    res.json(allClubs);
  } catch (error) {
    console.error("Error fetching clubs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/api/clubs/search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.json([]);
    }

    const database = await initializeDatabase();
    const { clubs } = await import("../../../shared/schema.js");
    const { ilike } = await import("drizzle-orm");

    const searchResults = await database
      .select()
      .from(clubs)
      .where(ilike(clubs.name, `%${query}%`));

    res.json(searchResults);
  } catch (error) {
    console.error("Error searching clubs:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Order routes
app.get("/api/orders", requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const database = await initializeDatabase();
    const { orders, users, clubs } = await import("../../../shared/schema.js");
    const { eq } = await import("drizzle-orm");

    let orderQuery = database
      .select({
        order: orders,
        user: users,
        club: clubs,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .leftJoin(clubs, eq(orders.clubId, clubs.id));

    // Filter by user role
    if (req.user.role === "USER") {
      orderQuery = orderQuery.where(eq(orders.userId, req.user.id));
    }

    const ordersWithDetails = await orderQuery;

    // Transform the data structure
    const transformedOrders = ordersWithDetails.map((row) => ({
      ...row.order,
      user: req.user.role !== "USER" ? row.user : undefined,
      club: row.club,
    }));

    res.json(transformedOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/orders", requireAuth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const database = await initializeDatabase();
    const { orders, insertOrderSchema } = await import(
      "../../../shared/schema.js"
    );

    const orderData = {
      ...req.body,
      userId: req.user.id,
    };

    const validatedData = insertOrderSchema.parse(orderData);

    const newOrder = await database
      .insert(orders)
      .values(validatedData)
      .returning();

    res.status(201).json(newOrder[0]);
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(400).json({
      message: "Invalid order data",
      error: error.message,
    });
  }
});

// Stats routes
app.get("/api/stats/user", requireAuth, async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Unauthorized" });

    const database = await initializeDatabase();
    const { orders } = await import("../../../shared/schema.js");
    const { eq, count } = await import("drizzle-orm");

    const userOrderCount = await database
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.userId, req.user.id));

    res.json({
      totalOrders: userOrderCount[0]?.count || 0,
      fileUploadsUsed: req.user.fileUploadsUsed || 0,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Return 404 for unknown API routes
app.use("/api/*", (req, res) => {
  console.log(`404 - API endpoint not found: ${req.method} ${req.path}`);
  res.status(404).json({ message: "API endpoint not found" });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({
    message,
    error: process.env.NODE_ENV === "development" ? err.toString() : undefined,
  });
});

// Export the serverless handler
exports.handler = serverless(app);
