/** @format */

// Production Netlify serverless function with full backend integration
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
    const { orders, insertOrderSchema } = require("./schema.js");

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

      // Check current database state
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
