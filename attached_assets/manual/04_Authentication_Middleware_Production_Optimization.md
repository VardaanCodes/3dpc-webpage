<!-- @format -->

# Authentication Middleware Production Optimization Guide

## Problem Description

The current authentication middleware in the Netlify serverless function works but requires optimization for production use. The system needs better error handling, performance improvements, and more robust user creation flows to handle edge cases and high traffic scenarios.

## Prerequisites

- [x] Firebase Admin SDK initialized in Netlify function
- [x] Basic authentication middleware implemented
- [x] User auto-creation functionality working
- [x] Database connection established
- [ ] Production-ready error handling implemented
- [ ] Performance optimizations applied
- [ ] Edge case handling implemented
- [ ] Monitoring and logging enhanced

## Environment Setup

Ensure these environment variables are properly configured:

```env
FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY=base64_encoded_service_account
NETLIFY_DATABASE_URL=postgresql://user:pass@host/db
SESSION_SECRET=your_secure_session_secret_here
NODE_ENV=production
```

## Implementation Steps

### Step 1: Optimize Authentication Middleware Performance

Update the authentication middleware in `netlify/functions/server/server.js`:

```javascript
// Enhanced authentication middleware with caching and optimization
let userCache = new Map(); // In-memory cache for user data
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

app.use(async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")?.[1];

  if (token && token !== "undefined" && token !== "null") {
    try {
      const firebaseAdmin = initializeFirebase();

      if (firebaseAdmin) {
        // Verify Firebase token
        const decodedToken = await firebaseAdmin.auth().verifyIdToken(token);
        const userEmail = decodedToken.email;

        // Validate email domain early
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
          console.log("User retrieved from cache:", userEmail);
          return next();
        }

        // Initialize database connection only when needed
        const database = await initializeDatabase();
        const { users, insertUserSchema } = require("./schema.js");
        const { eq } = require("drizzle-orm");

        // Use prepared statement for better performance
        const userResults = await database
          .select()
          .from(users)
          .where(eq(users.email, userEmail))
          .limit(1);

        if (userResults.length > 0) {
          const user = userResults[0];
          req.user = user;

          // Cache the user
          userCache.set(cacheKey, {
            user,
            timestamp: Date.now(),
          });

          // Update last login asynchronously (don't wait)
          database
            .update(users)
            .set({ lastLogin: new Date() })
            .where(eq(users.id, user.id))
            .catch((error) =>
              console.error("Failed to update last login:", error)
            );

          console.log("User authenticated from database:", userEmail);
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

            // Cache the new user
            userCache.set(cacheKey, {
              user: newUser[0],
              timestamp: Date.now(),
            });

            console.log("Auto-created new user:", userEmail);

            // Add audit log asynchronously
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

      // Different error handling based on error type
      if (error.code === "auth/id-token-expired") {
        return res.status(401).json({
          message: "Token expired",
          code: "TOKEN_EXPIRED",
        });
      } else if (error.code === "auth/id-token-revoked") {
        return res.status(401).json({
          message: "Token revoked",
          code: "TOKEN_REVOKED",
        });
      } else if (error.code === "auth/invalid-id-token") {
        return res.status(401).json({
          message: "Invalid token",
          code: "INVALID_TOKEN",
        });
      }

      // Don't block request for other errors, just don't authenticate
      console.log("Continuing without authentication due to error");
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
```

### Step 2: Enhance Error Handling and Logging

Add comprehensive error handling:

```javascript
// Enhanced error handling middleware
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  const errorId = Date.now().toString(36);

  // Log error with context
  console.error(`[ERROR ${errorId}] ${timestamp}:`, {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    headers: req.headers,
    user: req.user?.email || "anonymous",
  });

  // Different error responses based on environment
  const isDevelopment = process.env.NODE_ENV !== "production";

  const errorResponse = {
    message: err.message || "Internal Server Error",
    errorId,
    timestamp,
  };

  if (isDevelopment) {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details;
  }

  const status = err.status || err.statusCode || 500;
  res.status(status).json(errorResponse);
});

// Request timeout middleware
app.use((req, res, next) => {
  const timeout = 30000; // 30 seconds

  req.setTimeout(timeout, () => {
    const error = new Error("Request timeout");
    error.status = 408;
    next(error);
  });

  next();
});
```

### Step 3: Implement Rate Limiting and Security

Add rate limiting for authentication endpoints:

```javascript
// Simple in-memory rate limiter
const rateLimitMap = new Map();

const rateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create rate limit data for this IP
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, []);
    }

    const requests = rateLimitMap.get(key);

    // Remove old requests outside the window
    const validRequests = requests.filter(
      (timestamp) => timestamp > windowStart
    );

    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        message: "Too many requests",
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    // Add current request
    validRequests.push(now);
    rateLimitMap.set(key, validRequests);

    next();
  };
};

// Apply rate limiting to authentication-related endpoints
app.use("/api/user/register", rateLimit(10, 15 * 60 * 1000)); // 10 requests per 15 minutes
app.use("/api/user/profile", rateLimit(100, 15 * 60 * 1000)); // 100 requests per 15 minutes
```

### Step 4: Optimize Database Connections

Implement connection pooling and prepared statements:

```javascript
// Enhanced database initialization with connection pooling
let dbPool = null;

const initializeDatabase = async () => {
  if (dbPool) return dbPool;

  try {
    const { neon, Pool } = require("@neondatabase/serverless");
    const { drizzle } = require("drizzle-orm/neon-http");

    const databaseUrl =
      process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("Database URL not configured");
    }

    // Create connection pool for better performance
    const sql = neon(databaseUrl, {
      poolConfig: {
        max: 10, // Maximum number of connections
        idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
      },
    });

    dbPool = drizzle(sql, {
      schema: require("./schema.js"),
      logger: process.env.NODE_ENV === "development",
    });

    console.log("Database connection pool initialized");
    return dbPool;
  } catch (error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
};

// Prepared statements for common queries
const preparedStatements = {
  getUserByEmail: null,
  updateLastLogin: null,
  createUser: null,
};

const initializePreparedStatements = async (db) => {
  const { users } = require("./schema.js");
  const { eq } = require("drizzle-orm");

  preparedStatements.getUserByEmail = db
    .select()
    .from(users)
    .where(eq(users.email, $email))
    .limit(1)
    .prepare();

  preparedStatements.updateLastLogin = db
    .update(users)
    .set({ lastLogin: new Date() })
    .where(eq(users.id, $userId))
    .prepare();
};
```

### Step 5: Add Health Monitoring

Implement health checks and monitoring:

```javascript
// Enhanced health check endpoint
app.get("/api/health/detailed", async (req, res) => {
  const healthCheck = {
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "unknown",
    version: process.env.npm_package_version || "unknown",
    services: {},
    performance: {},
  };

  try {
    const startTime = Date.now();

    // Test database connectivity
    try {
      const database = await initializeDatabase();
      const testResult = await database.execute("SELECT 1 as test");

      healthCheck.services.database = {
        status: "healthy",
        responseTime: Date.now() - startTime,
        provider: "neon",
      };
    } catch (dbError) {
      healthCheck.services.database = {
        status: "unhealthy",
        error: dbError.message,
        provider: "neon",
      };
      healthCheck.status = "degraded";
    }

    // Test Firebase connectivity
    try {
      const firebaseAdmin = initializeFirebase();
      if (firebaseAdmin) {
        healthCheck.services.firebase = {
          status: "healthy",
          provider: "firebase_admin",
        };
      } else {
        healthCheck.services.firebase = {
          status: "not_configured",
        };
      }
    } catch (firebaseError) {
      healthCheck.services.firebase = {
        status: "unhealthy",
        error: firebaseError.message,
      };
    }

    // Memory and performance metrics
    const memUsage = process.memoryUsage();
    healthCheck.performance = {
      memoryUsage: {
        rss: Math.round(memUsage.rss / 1024 / 1024) + " MB",
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + " MB",
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + " MB",
      },
      uptime: process.uptime(),
      cacheSize: userCache.size,
    };

    const finalStatus =
      healthCheck.services.database?.status === "unhealthy"
        ? "unhealthy"
        : "ok";

    res.status(finalStatus === "ok" ? 200 : 503).json(healthCheck);
  } catch (error) {
    res.status(500).json({
      status: "error",
      timestamp: new Date().toISOString(),
      error: error.message,
    });
  }
});
```

## Testing Instructions

### Local Testing

1. Set up environment variables in `.env`
2. Run load testing:

   ```bash
   # Install artillery for load testing
   npm install -g artillery

   # Create test script
   artillery quick --count 10 --num 5 http://localhost:3000/api/health
   ```

3. Test authentication flow:

   ```bash
   # Test with valid token
   curl -H "Authorization: Bearer valid_token" http://localhost:3000/api/user/profile

   # Test with invalid token
   curl -H "Authorization: Bearer invalid_token" http://localhost:3000/api/user/profile
   ```

### Production Testing

1. Deploy updated code
2. Monitor Netlify function logs for errors
3. Test rate limiting by making multiple rapid requests
4. Verify health check endpoint returns proper status
5. Monitor memory usage and performance metrics

## Common Issues & Troubleshooting

### Issue 1: High memory usage from user cache

**Cause**: User cache growing too large without proper cleanup
**Solution**:

- Implement LRU cache with size limits
- Reduce cache duration for high-traffic scenarios
- Monitor cache hit rates and adjust accordingly

### Issue 2: Database connection timeouts

**Cause**: Too many concurrent connections or slow queries
**Solution**:

- Optimize database queries with proper indexes
- Implement connection pooling
- Add query timeout limits
- Monitor database performance metrics

### Issue 3: Authentication failures during high traffic

**Cause**: Firebase token verification timeouts
**Solution**:

- Implement retry logic for token verification
- Add circuit breaker pattern for Firebase calls
- Cache token verification results temporarily

### Issue 4: Memory leaks in serverless environment

**Cause**: Not properly cleaning up resources between invocations
**Solution**:

- Clear caches and timers on function completion
- Use WeakMap for automatic garbage collection
- Monitor memory usage patterns

## Next Steps

After implementing these optimizations:

1. **Implement Distributed Caching**: Use Redis or similar for shared cache across function instances
2. **Add Comprehensive Monitoring**: Integrate with monitoring services like DataDog or New Relic
3. **Implement Circuit Breakers**: Add resilience patterns for external service calls
4. **Add Request Tracing**: Implement distributed tracing for better debugging
5. **Optimize Database Queries**: Add database performance monitoring and optimization

## Additional Resources

- [Netlify Function Best Practices](https://docs.netlify.com/functions/best-practices/)
- [Firebase Admin SDK Error Handling](https://firebase.google.com/docs/admin/setup#handle_errors)
- [Neon Connection Pooling](https://neon.tech/docs/guides/connection-pooling)
- [Node.js Performance Monitoring](https://nodejs.org/en/docs/guides/simple-profiling/)
