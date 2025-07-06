/** @format */

// Production Netlify serverless function with full backend integration
const express = require("express");
const serverless = require("serverless-http");
const session = require("express-session");
const multer = require("multer");

// Create Express app
const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// --- Production-ready enhancements for authentication middleware ---
// In-memory user cache for performance
let userCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Simple in-memory rate limiter
const rateLimitMap = new Map();
const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, []);
    }
    const requests = rateLimitMap
      .get(key)
      .filter((timestamp) => timestamp > windowStart);
    if (requests.length >= maxRequests) {
      return res.status(429).json({
        message: "Too many requests",
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }
    requests.push(now);
    rateLimitMap.set(key, requests);
    next();
  };
};

// Apply rate limiting to authentication endpoints
app.use("/api/user/register", rateLimit(10, 15 * 60 * 1000));
app.use("/api/user/profile", rateLimit(100, 15 * 60 * 1000));

// Enhanced authentication middleware with caching and optimization
app.use(async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")?.[1];
  if (token && token !== "undefined" && token !== "null") {
    try {
      const firebaseAdmin = initializeFirebase();
      if (firebaseAdmin) {
        const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
        const userEmail = decodedToken.email;
        if (!userEmail || !userEmail.endsWith("@smail.iitm.ac.in")) {
          return res.status(403).json({
            message:
              "Access denied. Only @smail.iitm.ac.in email addresses are allowed.",
          });
        }
        // Check cache first
        const cacheKey = userEmail;
        const cachedUser = userCache.get(cacheKey);
        if (cachedUser && Date.now() - cachedUser.timestamp < CACHE_DURATION) {
          req.user = cachedUser.user;
          return next();
        }
        // Initialize database connection only when needed
        const database = await initializeDatabase();
        const { users, insertUserSchema } = require("./schema.js");
        const { eq } = require("drizzle-orm");
        const userResults = await database
          .select()
          .from(users)
          .where(eq(users.email, userEmail))
          .limit(1);
        if (userResults.length > 0) {
          const user = userResults[0];
          req.user = user;
          userCache.set(cacheKey, { user, timestamp: Date.now() });
          database
            .update(users)
            .set({ lastLogin: new Date() })
            .where(eq(users.id, user.id))
            .catch((error) =>
              console.error("Failed to update last login:", error)
            );
        } else {
          // Auto-create user with better error handling
          try {
            const newUserData = {
              email: userEmail,
              displayName: decodedToken.name || userEmail.split("@")[0],
              photoURL: decodedToken.picture || null,
              role: "USER",
              suspended: false,
              fileUploadsUsed: 0,
              notificationPreferences: {},
              lastLogin: new Date(),
            };
            const validatedData = insertUserSchema.parse(newUserData);
            const newUser = await database
              .insert(users)
              .values(validatedData)
              .returning();
            req.user = newUser[0];
            userCache.set(cacheKey, {
              user: newUser[0],
              timestamp: Date.now(),
            });
            const { auditLogs } = require("./schema.js");
            database
              .insert(auditLogs)
              .values({
                userId: newUser[0].id,
                action: "USER_AUTO_CREATED",
                entityType: "user",
                entityId: newUser[0].id.toString(),
                details: {
                  createdVia: "auth_middleware",
                  emailDomain: "smail.iitm.ac.in",
                  userAgent: req.headers["user-agent"] || "unknown",
                },
                timestamp: new Date(),
              })
              .catch((error) =>
                console.error("Failed to create audit log:", error)
              );
          } catch (createError) {
            console.error("Error auto-creating user:", createError);
            return res.status(500).json({
              message: "Failed to create user account",
              error: "Please try again or contact support",
            });
          }
        }
      } else {
        console.log("Firebase Admin SDK not available - development mode");
      }
    } catch (error) {
      console.error("Auth token verification failed:", error);
      if (error.code === "auth/id-token-expired") {
        return res
          .status(401)
          .json({ message: "Token expired", code: "TOKEN_EXPIRED" });
      } else if (error.code === "auth/id-token-revoked") {
        return res
          .status(401)
          .json({ message: "Token revoked", code: "TOKEN_REVOKED" });
      } else if (error.code === "auth/invalid-id-token") {
        return res
          .status(401)
          .json({ message: "Invalid token", code: "INVALID_TOKEN" });
      }
      // Don't block request for other errors, just don't authenticate
    }
  }
  next();
});

// Clear cache periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of userCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      userCache.delete(key);
    }
  }
}, CACHE_DURATION);

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
    // Import database modules
    const { neon } = require("@neondatabase/serverless");
    const { drizzle } = require("drizzle-orm/neon-http");
    const schema = require("./schema.js");

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

    // Test database connectivity
    console.log("Testing database connectivity...");
    const connectivityTest = await sql`SELECT 1 as test`;
    console.log("Database connectivity test result:", connectivityTest);

    // Check and create tables if they don't exist
    console.log("Checking and initializing database schema...");
    const tablesNeeded = [
      { name: "users", required: true },
      { name: "clubs", required: true },
      { name: "orders", required: true },
      { name: "batches", required: true },
      { name: "audit_logs", required: true },
      { name: "system_config", required: true },
    ];

    let missingTables = [];

    for (const table of tablesNeeded) {
      try {
        await sql`SELECT COUNT(*) FROM ${sql(table.name)} LIMIT 1`;
        console.log(`✓ Table '${table.name}' exists`);
      } catch (tableError) {
        if (
          tableError.message.includes(`relation "${table.name}" does not exist`)
        ) {
          console.log(`✗ Table '${table.name}' is missing`);
          missingTables.push(table.name);
        } else {
          console.error(
            `Error checking table '${table.name}':`,
            tableError.message
          );
          missingTables.push(table.name);
        }
      }
    }

    // If tables are missing, run the migration SQL
    if (missingTables.length > 0) {
      console.log(`⚠️  Missing tables detected: ${missingTables.join(", ")}`);
      console.log("Running database migrations...");

      try {
        // Execute the migration SQL
        const migrationSQL = `
          CREATE TABLE IF NOT EXISTS "audit_logs" (
            "id" serial PRIMARY KEY NOT NULL,
            "user_id" integer NOT NULL,
            "action" text NOT NULL,
            "entity_type" text NOT NULL,
            "entity_id" text,
            "details" jsonb DEFAULT '{}'::jsonb,
            "reason" text,
            "timestamp" timestamp DEFAULT now()
          );

          CREATE TABLE IF NOT EXISTS "batches" (
            "id" serial PRIMARY KEY NOT NULL,
            "batch_number" text NOT NULL,
            "name" text,
            "status" text DEFAULT 'created' NOT NULL,
            "created_by_id" integer NOT NULL,
            "started_at" timestamp,
            "completed_at" timestamp,
            "estimated_duration_hours" integer,
            "created_at" timestamp DEFAULT now(),
            CONSTRAINT "batches_batch_number_unique" UNIQUE("batch_number")
          );

          CREATE TABLE IF NOT EXISTS "clubs" (
            "id" serial PRIMARY KEY NOT NULL,
            "name" text NOT NULL,
            "code" text NOT NULL,
            "contact_email" text,
            "is_active" boolean DEFAULT true,
            "created_at" timestamp DEFAULT now(),
            CONSTRAINT "clubs_name_unique" UNIQUE("name"),
            CONSTRAINT "clubs_code_unique" UNIQUE("code")
          );

          CREATE TABLE IF NOT EXISTS "orders" (
            "id" serial PRIMARY KEY NOT NULL,
            "order_id" text NOT NULL,
            "user_id" integer NOT NULL,
            "club_id" integer,
            "project_name" text NOT NULL,
            "event_deadline" timestamp,
            "material" text DEFAULT 'PLA',
            "color" text DEFAULT 'White',
            "providing_filament" boolean DEFAULT false,
            "special_instructions" text,
            "files" jsonb DEFAULT '[]'::jsonb,
            "status" text DEFAULT 'submitted' NOT NULL,
            "batch_id" integer,
            "estimated_completion_time" timestamp,
            "actual_completion_time" timestamp,
            "failure_reason" text,
            "cancellation_reason" text,
            "submitted_at" timestamp DEFAULT now(),
            "updated_at" timestamp DEFAULT now(),
            CONSTRAINT "orders_order_id_unique" UNIQUE("order_id")
          );

          CREATE TABLE IF NOT EXISTS "system_config" (
            "id" serial PRIMARY KEY NOT NULL,
            "key" text NOT NULL,
            "value" jsonb NOT NULL,
            "description" text,
            "updated_by" integer,
            "updated_at" timestamp DEFAULT now(),
            CONSTRAINT "system_config_key_unique" UNIQUE("key")
          );

          CREATE TABLE IF NOT EXISTS "users" (
            "id" serial PRIMARY KEY NOT NULL,
            "email" text NOT NULL,
            "display_name" text NOT NULL,
            "photo_url" text,
            "role" text DEFAULT 'USER' NOT NULL,
            "suspended" boolean DEFAULT false,
            "file_uploads_used" integer DEFAULT 0,
            "notification_preferences" jsonb DEFAULT '{}'::jsonb,
            "last_login" timestamp,
            "created_at" timestamp DEFAULT now(),
            CONSTRAINT "users_email_unique" UNIQUE("email")
          );

          DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_user_id_users_id_fk') THEN
              ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
            END IF;
          END $$;

          DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'batches_created_by_id_users_id_fk') THEN
              ALTER TABLE "batches" ADD CONSTRAINT "batches_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
            END IF;
          END $$;

          DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_user_id_users_id_fk') THEN
              ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
            END IF;
          END $$;

          DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_club_id_clubs_id_fk') THEN
              ALTER TABLE "orders" ADD CONSTRAINT "orders_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE no action ON UPDATE no action;
            END IF;
          END $$;

          DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_batch_id_batches_id_fk') THEN
              ALTER TABLE "orders" ADD CONSTRAINT "orders_batch_id_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."batches"("id") ON DELETE no action ON UPDATE no action;
            END IF;
          END $$;

          DO $$ BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'system_config_updated_by_users_id_fk') THEN
              ALTER TABLE "system_config" ADD CONSTRAINT "system_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
            END IF;
          END $$;
        `;

        // Split and execute each statement
        const statements = migrationSQL
          .split(";")
          .filter((stmt) => stmt.trim());
        for (const statement of statements) {
          if (statement.trim()) {
            await sql.unsafe(statement.trim());
          }
        }

        console.log("✅ Database migrations completed successfully!");

        // Verify tables were created
        for (const tableName of missingTables) {
          try {
            await sql`SELECT COUNT(*) FROM ${sql(tableName)} LIMIT 1`;
            console.log(`✅ Table '${tableName}' created successfully`);
          } catch (verifyError) {
            console.error(
              `❌ Failed to verify table '${tableName}':`,
              verifyError.message
            );
          }
        }
      } catch (migrationError) {
        console.error("❌ Migration failed:", migrationError);
        console.warn("⚠️  Continuing with potentially uninitialized database");
      }
    } else {
      console.log("✅ All required database tables exist");
    }

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

        // Strictly validate email domain - only allow @smail.iitm.ac.in
        if (
          !decodedToken.email ||
          !decodedToken.email.endsWith("@smail.iitm.ac.in")
        ) {
          console.error("Invalid email domain:", decodedToken.email);
          return res.status(403).json({
            message:
              "Access denied. Only @smail.iitm.ac.in email addresses are allowed.",
          });
        }

        // Initialize database connection
        const database = await initializeDatabase();

        // Query user from database
        const { users } = require("./schema.js");
        const { eq } = require("drizzle-orm");

        const userResults = await database
          .select()
          .from(users)
          .where(eq(users.email, decodedToken.email))
          .limit(1);

        if (userResults.length > 0) {
          req.user = userResults[0];
          console.log("User attached to request:", req.user.email);

          // Update last login time
          await database
            .update(users)
            .set({ lastLogin: new Date() })
            .where(eq(users.id, req.user.id));
        } else {
          console.log(
            "User not found in database for email:",
            decodedToken.email
          );

          // Auto-create user with basic information
          try {
            const { insertUserSchema } = require("./schema.js");

            const newUserData = {
              email: decodedToken.email,
              displayName:
                decodedToken.name || decodedToken.email.split("@")[0],
              photoURL: decodedToken.picture || null,
              role: "USER", // Default role
              suspended: false,
              fileUploadsUsed: 0,
              notificationPreferences: {},
              lastLogin: new Date(),
            };

            const validatedData = insertUserSchema.parse(newUserData);

            const newUser = await database
              .insert(users)
              .values(validatedData)
              .returning();

            req.user = newUser[0];
            console.log("Auto-created new user:", req.user.email);

            // Add audit log for user auto-creation
            const { auditLogs } = require("./schema.js");
            await database.insert(auditLogs).values({
              userId: newUser[0].id,
              action: "USER_AUTO_CREATED",
              entityType: "user",
              entityId: newUser[0].id.toString(),
              details: {
                createdVia: "auth_middleware",
                emailDomain: "smail.iitm.ac.in",
              },
              timestamp: new Date(),
            });
          } catch (createError) {
            console.error("Error auto-creating user:", createError);
            // Continue without user - they'll be prompted to register
          }
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

// Helper function to get the current academic year (e.g., "2324")
const getAcademicYear = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed, 6 is July
  if (month >= 6) {
    return `${year.toString().slice(-2)}${(year + 1).toString().slice(-2)}`;
  }
  return `${(year - 1).toString().slice(-2)}${year.toString().slice(-2)}`;
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
    const { users, insertUserSchema } = require("./schema.js");
    const { eq } = require("drizzle-orm");

    // Validate email domain - only allow @smail.iitm.ac.in
    const email = req.body.email;
    if (!email || !email.endsWith("@smail.iitm.ac.in")) {
      console.error("Invalid email domain:", email);
      return res.status(403).json({
        message:
          "Access denied. Only @smail.iitm.ac.in email addresses are allowed.",
      });
    }

    // Check if user already exists
    const existingUser = await database
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      console.log("Existing user found:", existingUser[0].email);

      // Update the last login time for the existing user
      await database
        .update(users)
        .set({
          lastLogin: new Date(),
          // Update displayName and photoURL if they've changed
          displayName: req.body.displayName || existingUser[0].displayName,
          photoURL: req.body.photoURL || existingUser[0].photoURL,
        })
        .where(eq(users.id, existingUser[0].id));

      // Fetch updated user
      const updatedUser = await database
        .select()
        .from(users)
        .where(eq(users.id, existingUser[0].id))
        .limit(1);

      return res.json(updatedUser[0]);
    }

    // Validate and create new user
    const userData = {
      ...req.body,
      email: email, // Ensure we use the validated email
      lastLogin: new Date(),
      photoURL: req.body.photoURL || null,
      role: req.body.role || "USER", // Default to USER role
      suspended: false,
      fileUploadsUsed: 0,
      notificationPreferences: req.body.notificationPreferences || {},
    };

    try {
      const validatedData = insertUserSchema.parse(userData);

      const newUser = await database
        .insert(users)
        .values(validatedData)
        .returning();

      console.log("New user created:", newUser[0].email);

      // Add audit log for user creation
      const { auditLogs } = require("./schema.js");
      await database.insert(auditLogs).values({
        userId: newUser[0].id,
        action: "USER_CREATED",
        entityType: "user",
        entityId: newUser[0].id.toString(),
        details: {
          registeredVia: "google",
          emailDomain: "smail.iitm.ac.in",
        },
        timestamp: new Date(),
      });

      res.status(201).json(newUser[0]);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({
        message: "Invalid user data",
        error: error.message,
      });
    }
  } catch (error) {
    console.error("Registration error:", error);

    // Provide more detailed error messages
    if (error.message.includes("schema")) {
      res.status(400).json({
        message: "Invalid user data format",
        error: error.message,
      });
    } else if (error.message.includes("email")) {
      res.status(403).json({
        message: "Email domain not allowed",
        error: "Only @smail.iitm.ac.in email addresses are permitted",
      });
    } else {
      res.status(400).json({
        message: "Registration failed",
        error: error.message,
      });
    }
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
    const { clubs } = require("./schema.js");

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
    const { clubs } = require("./schema.js");
    const { ilike } = require("drizzle-orm");

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
    const { orders, users, clubs } = require("./schema.js");
    const { eq } = require("drizzle-orm");

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
    const { orders, insertOrderSchema, clubs } = require("./schema.js");
    const { sql, like, eq } = require("drizzle-orm");

    const orderData = {
      ...req.body,
      userId: req.user.id,
    };

    const validatedData = insertOrderSchema.parse(orderData);

    // --- Start: Generate custom orderId ---

    // 1. Get club code
    const clubResult = await database
      .select({ code: clubs.code })
      .from(clubs)
      .where(eq(clubs.id, validatedData.clubId))
      .limit(1);

    if (!clubResult || clubResult.length === 0) {
      return res.status(400).json({ message: "Invalid club ID provided." });
    }
    const clubCode = clubResult[0].code;

    // 2. Determine Academic Year (e.g., 24 for 2023-2024, 25 for 2024-2025)
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11
    // Academic year starts in August (index 7)
    const academicYearEnd = month >= 7 ? year + 1 : year;
    const academicYearShort = academicYearEnd.toString().slice(-2);

    // 3. Determine next print number for the club and academic year
    const orderIdPrefix = `#${clubCode}${academicYearShort}`;

    const latestOrderForClub = await database
      .select({ orderId: orders.orderId })
      .from(orders)
      .where(like(orders.orderId, `${orderIdPrefix}%`))
      .orderBy(
        sql`CAST(SUBSTRING(order_id FROM ${
          orderIdPrefix.length + 1
        }) AS INTEGER) DESC`
      )
      .limit(1);

    let nextPrintNumber = 1;
    if (latestOrderForClub.length > 0) {
      const lastOrderId = latestOrderForClub[0].orderId;
      const lastPrintNumberStr = lastOrderId.substring(orderIdPrefix.length);
      const lastPrintNumber = parseInt(lastPrintNumberStr, 10);
      if (!isNaN(lastPrintNumber)) {
        nextPrintNumber = lastPrintNumber + 1;
      }
    }

    // 4. Construct the new orderId, padded to 4 digits
    const newOrderId = `${orderIdPrefix}${nextPrintNumber
      .toString()
      .padStart(4, "0")}`;

    // --- End: Generate custom orderId ---

    const dataToInsert = {
      ...validatedData,
      orderId: newOrderId,
    };

    const newOrder = await database
      .insert(orders)
      .values(dataToInsert)
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
    const { orders } = require("./schema.js");
    const { eq, count } = require("drizzle-orm");

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

// Database initialization endpoint (for admin use)
app.post(
  "/api/admin/init-db",
  requireAuth,
  requireRole(["ADMIN", "SUPERADMIN"]),
  async (req, res) => {
    try {
      console.log(
        "Manual database initialization requested by:",
        req.user.email
      );

      const database = await initializeDatabase();
      const { sql } = require("@neondatabase/serverless");
      const dbUrl =
        process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
      const sqlClient = require("@neondatabase/serverless").neon(dbUrl);

      // Check current database status
      const initStatus = {
        connectivity: false,
        tables: {},
        needsMigration: false,
      };

      // Test connectivity
      try {
        await sqlClient`SELECT 1 as test`;
        initStatus.connectivity = true;
      } catch (error) {
        throw new Error(`Database connectivity failed: ${error.message}`);
      }

      // Check for each expected table
      const expectedTables = [
        "users",
        "clubs",
        "orders",
        "batches",
        "audit_logs",
        "system_config",
      ];

      for (const tableName of expectedTables) {
        try {
          await sqlClient`SELECT COUNT(*) FROM ${sqlClient(tableName)} LIMIT 1`;
          initStatus.tables[tableName] = "exists";
        } catch (error) {
          if (
            error.message.includes(`relation "${tableName}" does not exist`)
          ) {
            initStatus.tables[tableName] = "missing";
            initStatus.needsMigration = true;
          } else {
            initStatus.tables[tableName] = "error";
          }
        }
      }

      // Add audit log for this action
      if (initStatus.tables.audit_logs === "exists") {
        const { auditLogs } = require("./schema.js");
        await database.insert(auditLogs).values({
          userId: req.user.id,
          action: "DB_INIT_CHECK",
          entityType: "system",
          details: {
            requestedBy: req.user.email,
            initStatus,
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date(),
        });
      }

      res.json({
        message: "Database initialization check completed",
        status: initStatus,
        recommendations: initStatus.needsMigration
          ? [
              "Run database migrations using: npm run db:migrate",
              "Or use Drizzle Kit: npx drizzle-kit push",
              "Check your drizzle.config.ts configuration",
            ]
          : [
              "Database schema is properly initialized",
              "All expected tables are present",
            ],
      });
    } catch (error) {
      console.error("Database initialization check failed:", error);
      res.status(500).json({
        message: "Database initialization check failed",
        error: error.message,
        troubleshooting: [
          "Verify NETLIFY_DATABASE_URL or DATABASE_URL is set correctly",
          "Check if the Neon database exists and is accessible",
          "Ensure database migrations have been run",
          "Check Netlify function logs for detailed error information",
        ],
      });
    }
  }
);

// Manual database initialization endpoint (for testing and verification)
app.get("/api/admin/init-db-test", async (req, res) => {
  try {
    console.log("Manual database initialization test requested");

    const database = await initializeDatabase();
    const { neon } = require("@neondatabase/serverless");
    const dbUrl = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
    const sqlClient = neon(dbUrl);

    // Test connectivity and schema
    const testResults = {
      connectivity: false,
      tables: {},
      environment: {
        NODE_ENV: process.env.NODE_ENV || "unknown",
        hasNetlifyUrl: !!process.env.NETLIFY_DATABASE_URL,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        databaseHost: dbUrl ? dbUrl.split("@")[1]?.split("/")[0] : "unknown",
      },
    };

    // Test connectivity
    try {
      const connectTest = await sqlClient`SELECT 1 as test, NOW() as timestamp`;
      testResults.connectivity = true;
      testResults.connectionTest = connectTest[0];
    } catch (error) {
      throw new Error(`Database connectivity failed: ${error.message}`);
    }

    // Check for each expected table
    const expectedTables = [
      "users",
      "clubs",
      "orders",
      "batches",
      "audit_logs",
      "system_config",
    ];

    for (const tableName of expectedTables) {
      try {
        const countResult =
          await sqlClient`SELECT COUNT(*) as count FROM ${sqlClient(
            tableName
          )}`;
        testResults.tables[tableName] = {
          exists: true,
          rowCount: parseInt(countResult[0].count),
        };
      } catch (error) {
        if (error.message.includes(`relation "${tableName}" does not exist`)) {
          testResults.tables[tableName] = {
            exists: false,
            error: "Table does not exist",
          };
        } else {
          testResults.tables[tableName] = {
            exists: false,
            error: error.message,
          };
        }
      }
    }

    // Check if we need sample data
    try {
      const userCount = await sqlClient`SELECT COUNT(*) as count FROM users`;
      testResults.needsSampleData = parseInt(userCount[0].count) === 0;
    } catch (error) {
      testResults.needsSampleData = true;
    }

    res.json({
      message: "Database initialization test completed",
      status: "success",
      results: testResults,
      recommendations: Object.values(testResults.tables).some((t) => !t.exists)
        ? [
            "Some tables are missing - they should be created automatically on the next API call",
            "If tables are still missing, check Netlify function logs for errors",
            "Verify that NETLIFY_DATABASE_URL points to a valid Neon database",
          ]
        : [
            "Database schema is properly initialized",
            "All expected tables are present",
            testResults.needsSampleData
              ? "Consider adding sample data for testing"
              : "Database contains data",
          ],
    });
  } catch (error) {
    console.error("Database initialization test failed:", error);
    res.status(500).json({
      message: "Database initialization test failed",
      error: error.message,
      troubleshooting: [
        "Verify NETLIFY_DATABASE_URL or DATABASE_URL is set correctly",
        "Check if the Neon database exists and is accessible",
        "Review Netlify function logs for detailed error information",
        "Ensure the database user has sufficient permissions",
      ],
    });
  }
});

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    const healthData = {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      services: {},
    };

    // Test database connectivity
    try {
      const database = await initializeDatabase();
      const { sql } = require("@neondatabase/serverless");
      const dbUrl =
        process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
      const sqlClient = require("@neondatabase/serverless").neon(dbUrl);

      await sqlClient`SELECT 1 as test`;
      healthData.services.database = { status: "connected", provider: "neon" };

      // Check if core tables exist
      try {
        await sqlClient`SELECT COUNT(*) FROM users LIMIT 1`;
        healthData.services.database.schema = "initialized";
      } catch (schemaError) {
        if (schemaError.message.includes('relation "users" does not exist')) {
          healthData.services.database.schema = "not_initialized";
          healthData.services.database.warning =
            "Database tables do not exist - run migrations";
        } else {
          healthData.services.database.schema = "error";
          healthData.services.database.error = schemaError.message;
        }
      }
    } catch (dbError) {
      healthData.services.database = {
        status: "error",
        error: dbError.message,
        provider: "neon",
      };
    }

    // Test Firebase connectivity (if configured)
    try {
      const firebaseAdmin = initializeFirebase();
      if (firebaseAdmin) {
        healthData.services.firebase = {
          status: "configured",
          provider: "firebase_admin",
        };
      } else {
        healthData.services.firebase = { status: "not_configured" };
      }
    } catch (firebaseError) {
      healthData.services.firebase = {
        status: "error",
        error: firebaseError.message,
      };
    }

    res.json(healthData);
  } catch (error) {
    console.error("Health check error:", error);
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});

// Admin endpoints for order management
app.patch(
  "/api/orders/:id",
  requireAuth,
  requireRole(["ADMIN", "SUPERADMIN"]),
  async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const database = await initializeDatabase();
      const { orders, auditLogs } = require("./schema.js");
      const { eq } = require("drizzle-orm");

      const orderId = parseInt(req.params.id);
      const updates = req.body;

      // Update the order
      const updatedOrders = await database
        .update(orders)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      if (updatedOrders.length === 0) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Create audit log
      await database.insert(auditLogs).values({
        userId: req.user.id,
        action: "order_updated",
        entityType: "order",
        entityId: orderId.toString(),
        details: updates,
        reason: updates.reason || null,
        timestamp: new Date(),
      });

      res.json(updatedOrders[0]);
    } catch (error) {
      console.error("Order update error:", error);
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

      const database = await initializeDatabase();
      const { orders, auditLogs } = require("./schema.js");
      const { eq } = require("drizzle-orm");

      const orderId = parseInt(req.params.id);
      const { status } = req.body;

      // Validate status
      const validStatuses = [
        "submitted",
        "approved",
        "started",
        "finished",
        "failed",
        "cancelled",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid order status" });
      }

      // Update the order status
      const updatedOrders = await database
        .update(orders)
        .set({
          status,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId))
        .returning();

      if (updatedOrders.length === 0) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Create audit log
      await database.insert(auditLogs).values({
        userId: req.user.id,
        action: "order_status_updated",
        entityType: "order",
        entityId: orderId.toString(),
        details: { status },
        reason: null,
        timestamp: new Date(),
      });

      res.json(updatedOrders[0]);
    } catch (error) {
      console.error("Order status update error:", error);
      res.status(400).json({ message: "Failed to update order status" });
    }
  }
);

// Batch management endpoints
app.get(
  "/api/batches",
  requireAuth,
  requireRole(["ADMIN", "SUPERADMIN"]),
  async (req, res) => {
    try {
      const database = await initializeDatabase();
      const { batches } = require("./schema.js");
      const { desc } = require("drizzle-orm");

      const allBatches = await database
        .select()
        .from(batches)
        .orderBy(desc(batches.createdAt));

      res.json(allBatches);
    } catch (error) {
      console.error("Error fetching batches:", error);
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

      const database = await initializeDatabase();
      const { batches, auditLogs } = require("./schema.js");

      const batchData = {
        ...req.body,
        createdById: req.user.id,
        createdAt: new Date(),
      };

      const newBatches = await database
        .insert(batches)
        .values(batchData)
        .returning();

      const batch = newBatches[0];

      // Create audit log
      await database.insert(auditLogs).values({
        userId: req.user.id,
        action: "batch_created",
        entityType: "batch",
        entityId: batch.id.toString(),
        details: { batchNumber: batch.batchNumber, name: batch.name },
        reason: null,
        timestamp: new Date(),
      });

      res.status(201).json(batch);
    } catch (error) {
      console.error("Batch creation error:", error);
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

      const database = await initializeDatabase();
      const { batches, auditLogs } = require("./schema.js");
      const { eq } = require("drizzle-orm");

      const batchId = parseInt(req.params.id);
      const updates = req.body;

      const updatedBatches = await database
        .update(batches)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(batches.id, batchId))
        .returning();

      if (updatedBatches.length === 0) {
        return res.status(404).json({ message: "Batch not found" });
      }

      // Create audit log
      await database.insert(auditLogs).values({
        userId: req.user.id,
        action: "batch_updated",
        entityType: "batch",
        entityId: batchId.toString(),
        details: updates,
        reason: null,
        timestamp: new Date(),
      });

      res.json(updatedBatches[0]);
    } catch (error) {
      console.error("Batch update error:", error);
      res.status(400).json({ message: "Failed to update batch" });
    }
  }
);

// User management endpoints
app.get(
  "/api/users",
  requireAuth,
  requireRole(["ADMIN", "SUPERADMIN"]),
  async (req, res) => {
    try {
      const database = await initializeDatabase();
      const { users } = require("./schema.js");

      const allUsers = await database.select().from(users);
      res.json(allUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
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

      const database = await initializeDatabase();
      const { users, auditLogs } = require("./schema.js");
      const { eq } = require("drizzle-orm");

      const userId = parseInt(req.params.id);
      const updates = req.body;

      const updatedUsers = await database
        .update(users)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      if (updatedUsers.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create audit log
      await database.insert(auditLogs).values({
        userId: req.user.id,
        action: "user_updated",
        entityType: "user",
        entityId: userId.toString(),
        details: updates,
        reason: null,
        timestamp: new Date(),
      });

      res.json(updatedUsers[0]);
    } catch (error) {
      console.error("User update error:", error);
      res.status(400).json({ message: "Failed to update user" });
    }
  }
);

// File upload routes implementation
const { v4: uuid } = require("uuid");
const { getStore } = require("@netlify/blobs");

// Helper function to get blob store with better error handling
const getBlobStore = (storeName) => {
  try {
    console.log("Attempting to initialize Netlify Blobs store:", storeName);
    console.log("Environment check:");
    console.log("- NETLIFY_SITE_ID:", !!process.env.NETLIFY_SITE_ID);
    console.log("- NETLIFY_ACCESS_TOKEN:", !!process.env.NETLIFY_ACCESS_TOKEN);
    console.log("- CONTEXT:", process.env.CONTEXT);
    console.log("- DEPLOY_URL:", !!process.env.DEPLOY_URL);

    // Try automatic configuration first
    const store = getStore(storeName);
    console.log("Netlify Blobs store initialized successfully");
    return store;
  } catch (error) {
    console.error("Failed to initialize Netlify Blobs store:", error.message);
    console.error("This might be due to:");
    console.error("1. Missing environment variables");
    console.error("2. Not running in Netlify environment");
    console.error("3. Site configuration issues");

    // For now, throw a more descriptive error
    throw new Error(
      `Netlify Blobs configuration failed: ${error.message}. Please ensure environment variables are set correctly.`
    );
  }
};

// Set up multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check allowed file types
    const allowedTypes = [
      "application/vnd.ms-pki.stl",
      "application/object",
      "model/stl",
      "application/gcode",
      "text/plain",
      "application/octet-stream",
    ];

    const allowedExtensions = [".stl", ".gcode", ".obj"];
    const fileExtension =
      "." + file.originalname.split(".").pop()?.toLowerCase();

    if (
      allowedTypes.includes(file.mimetype) ||
      allowedExtensions.includes(fileExtension)
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(`File type not supported: ${file.mimetype || fileExtension}`),
        false
      );
    }
  },
});

// File upload endpoint
app.post(
  "/api/files/upload",
  requireAuth,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const file = req.file;
      const { orderId } = req.body;
      const email = req.user.email;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Get user ID from database based on email
      const database = await initializeDatabase();
      const { users, orders } = require("./schema.js");
      const { eq } = require("drizzle-orm");

      const userResult = await database
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!userResult.length) {
        return res.status(404).json({ error: "User not found" });
      }

      const userDbId = userResult[0].id;

      // Upload file using Netlify Blobs
      const fileId = uuid();
      const createdAt = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const fileMetadata = {
        id: fileId,
        fileName: file.originalname,
        contentType:
          file.mimetype || `application/${file.originalname.split(".").pop()}`,
        size: file.size,
        uploadedBy: userDbId,
        orderId: orderId ? parseInt(orderId, 10) : undefined,
        createdAt,
        expiresAt,
      };

      // Upload to Netlify Blobs
      const blobStore = getBlobStore("file-uploads");
      await blobStore.set(fileId, file.buffer, {
        metadata: {
          fileName: file.originalname,
          contentType: file.mimetype,
          size: file.size.toString(),
          uploadedBy: userDbId.toString(),
          orderId: orderId?.toString(),
          createdAt: createdAt.toISOString(),
          expiresAt: expiresAt.toISOString(),
        },
      });

      // If file is associated with an order, update the order's files field
      if (orderId) {
        const orderResult = await database
          .select({ files: orders.files })
          .from(orders)
          .where(eq(orders.id, parseInt(orderId, 10)))
          .limit(1);

        if (orderResult.length > 0) {
          const currentFiles = orderResult[0].files || [];
          const updatedFiles = [...currentFiles, fileMetadata];

          await database
            .update(orders)
            .set({
              files: updatedFiles,
              updatedAt: new Date(),
            })
            .where(eq(orders.id, parseInt(orderId, 10)));
        }
      }

      res.json({
        message: "File uploaded successfully",
        file: fileMetadata,
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({
        error: "File upload failed",
        details: error.message,
      });
    }
  }
);

// File download endpoint
app.get("/api/files/download/:id", requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    // Get file metadata from Netlify Blobs
    const blobStore = getBlobStore("file-uploads");
    const result = await blobStore.getWithMetadata(id);

    if (!result || !result.data) {
      return res.status(404).json({ error: "File not found" });
    }

    const fileMetadata = result.metadata;

    // Check permissions - user must own the file or be admin
    const fileUploadedBy = parseInt(fileMetadata.uploadedBy);
    if (
      fileUploadedBy !== userId &&
      !["ADMIN", "SUPERADMIN"].includes(role?.toUpperCase() || "")
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    // Check if file has an associated order
    if (fileMetadata.orderId) {
      const database = await initializeDatabase();
      const { orders } = require("./schema.js");
      const { eq } = require("drizzle-orm");

      const orderResult = await database
        .select()
        .from(orders)
        .where(eq(orders.id, parseInt(fileMetadata.orderId)))
        .limit(1);

      if (orderResult.length > 0) {
        const order = orderResult[0];

        // Check if user owns the order or is admin
        if (
          order.userId !== userId &&
          !["ADMIN", "SUPERADMIN"].includes(role?.toUpperCase() || "")
        ) {
          return res.status(403).json({ error: "Access denied" });
        }

        // Check file expiration (30 days from submission)
        if (order.submittedAt) {
          const submittedDate = new Date(order.submittedAt);
          const expiryDate = new Date(submittedDate);
          expiryDate.setDate(expiryDate.getDate() + 30);

          if (new Date() > expiryDate) {
            return res.status(410).json({
              error: "File has expired and is no longer available for download",
            });
          }
        }
      }
    }

    // Set appropriate headers
    res.setHeader(
      "Content-Type",
      fileMetadata.contentType || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${fileMetadata.fileName}"`
    );
    res.setHeader("Content-Length", fileMetadata.size);

    // Stream the file data
    const fileBuffer = Buffer.from(await result.data.arrayBuffer());
    res.send(fileBuffer);
  } catch (error) {
    console.error("File download error:", error);
    res.status(500).json({
      error: "File download failed",
      details: error.message,
    });
  }
});

// File deletion endpoint
app.delete("/api/files/:id", requireAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;
    const userId = req.user.id;
    const role = req.user.role;

    // Get file metadata first
    const blobStore = getBlobStore("file-uploads");
    const metadata = await blobStore.getMetadata(id);

    if (!metadata || !metadata.metadata) {
      return res.status(404).json({ error: "File not found" });
    }

    const fileMetadata = metadata.metadata;
    const fileUploadedBy = parseInt(fileMetadata.uploadedBy);

    // Check permissions
    if (
      fileUploadedBy !== userId &&
      !["ADMIN", "SUPERADMIN"].includes(role?.toUpperCase() || "")
    ) {
      return res.status(403).json({ error: "Access denied" });
    }

    // If file is associated with an order, remove it from the order's files field
    if (fileMetadata.orderId) {
      const database = await initializeDatabase();
      const { orders } = require("./schema.js");
      const { eq } = require("drizzle-orm");

      const orderResult = await database
        .select({ files: orders.files })
        .from(orders)
        .where(eq(orders.id, parseInt(fileMetadata.orderId)))
        .limit(1);

      if (orderResult.length > 0) {
        const currentFiles = orderResult[0].files || [];
        const updatedFiles = currentFiles.filter((file) => file.id !== id);

        await database
          .update(orders)
          .set({
            files: updatedFiles,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, parseInt(fileMetadata.orderId)));
      }
    }

    // Delete the file from Netlify Blobs
    await blobStore.delete(id);

    res.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("File deletion error:", error);
    res.status(500).json({
      error: "File deletion failed",
      details: error.message,
    });
  }
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
