<!-- @format -->

# Hybrid Approach Implementation Plan

## Current Status

- ✅ Firebase Authentication is already implemented and working
- ✅ Netlify Functions framework is set up
- ✅ Netlify Blobs implementation for file storage exists
- ✅ Drizzle ORM schema defined for PostgreSQL
- ❌ Database connection to Neon Postgres not yet implemented
- ❌ Migration from Firestore to Neon Postgres not implemented

## Phase 1: Neon PostgreSQL Database Integration

### Step 1.1: Install Netlify Neon Extension

- Install the Netlify Neon Extension via Netlify dashboard
  - Navigate to Site settings > Extensions > Add extension > search for "Neon"
  - Click "Connect" and follow the prompts to create a new Neon database
- Add `NEON_DATABASE_URL` environment variable in Netlify dashboard
  - The extension will automatically add this, but verify it exists
- Update local `.env` file with the same database connection string for local development
  - Format: `postgres://username:password@hostname:port/database`

### Step 1.2: Create Database Connection Client

- Create a new file `server/db.ts` that initializes Neon PostgreSQL connection
  - Implement connection pooling for efficient database connections
  - Add proper error handling and connection retry logic
- Configure the drizzle client with the Neon database URL
  - Support both local development and production environments
- Export a configured client for use in services

  - Example implementation:

  ```typescript
  import { drizzle } from "drizzle-orm/node-postgres";
  import { Pool } from "pg";
  import * as schema from "../shared/schema";

  const connectionString =
    process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "Database connection string not found in environment variables"
    );
  }

  // Create a connection pool
  const pool = new Pool({
    connectionString,
    max: 10,
    ssl: process.env.NODE_ENV === "production",
  });

  // Create and export the drizzle client
  export const db = drizzle(pool, { schema });
  ```

### Step 1.3: Run Database Migrations

- Update `drizzle.config.ts` to support both local and Netlify environments
  - Ensure it can read from either NEON_DATABASE_URL or DATABASE_URL
  - Add environment detection to use the appropriate URL
- Create migration scripts in package.json for applying schema changes
  - Add scripts for generating, applying, and reverting migrations
- Run initial migration to create all tables based on shared schema
  - Create a script that can be run locally and in CI/CD pipeline
  - Example scripts for package.json:
  ```json
  "scripts": {
    "db:generate": "drizzle-kit generate:pg",
    "db:migrate": "ts-node scripts/migrate-db.ts",
    "db:push": "drizzle-kit push:pg",
    "db:studio": "drizzle-kit studio"
  }
  ```

## Phase 2: Storage Service Implementation

### Step 2.1: Create Database Repository Layer

- Create `server/repositories` directory structure:
  - `server/repositories/users.ts` for user data operations
  - `server/repositories/orders.ts` for order data operations
  - `server/repositories/clubs.ts` for club data operations
  - `server/repositories/system.ts` for system configuration
- Implement standard CRUD operations for each repository

  - Each repository should handle one type of data entity
  - Use prepared statements for all database queries
  - Implement proper error handling and transaction support
  - Example implementation for users repository:

  ```typescript
  import { db } from "../db";
  import { users } from "@shared/schema";
  import { eq } from "drizzle-orm";
  import type { User, InsertUser } from "../types/storage";

  export async function getUserByEmail(email: string): Promise<User | null> {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return results.length ? results[0] : null;
  }

  export async function createUser(userData: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(userData).returning();
    return newUser;
  }

  // Additional methods...
  ```

### Step 2.2: Storage Interface Refactoring

- Create an interface `IStorage` in `server/types/storage.ts`
  - Define all required methods for data operations
  - Group methods by entity type (users, orders, etc.)
- Create an implementation for Postgres in `server/storage/postgresStorage.ts`
  - Implement all methods defined in the interface
  - Use repository layer created in previous step
- Migrate methods from `firestoreStorage.ts` to the new implementation
  - Keep same method signatures for compatibility
  - Update internal implementation to use Postgres
- Ensure proper error handling and transaction support
  - Add transaction support for operations that update multiple tables
  - Implement consistent error handling strategy

## Phase 3: API Implementation

### Step 3.1: Refactor Routes to Use New Storage

- Update `server/routes.ts` to use the new storage implementation
  - Create a factory function to get the appropriate storage implementation
  - Inject storage implementation into route handlers
- Add necessary middleware for database connection and error handling
  - Create middleware for connection management
  - Add error handling middleware for database errors
- Ensure all routes use database repositories instead of direct Firestore access
  - Update route handlers to use the storage abstraction
  - Test each endpoint for correct behavior

### Step 3.2: User Authentication Integration

- Update user creation/verification flow to work with Postgres
  - Implement user creation on first login if user doesn't exist
  - Add role verification from database instead of environment variables
- Ensure Firebase Auth IDs are properly linked to database user records
  - Store Firebase UID in the user record
  - Add methods to lookup users by Firebase UID
- Implement role-based access control based on database user records
  - Create middleware for role checking
  - Update protected routes to use the new middleware

### Step 3.3: File Management System

- Enhance `server/netlifyBlobs.ts` to integrate with database for file metadata
  - Store file metadata in database (filename, size, content type, etc.)
  - Add methods to link files to orders, users, etc.
- Create API endpoints for file upload, download, and management
  - Implement file upload with progress tracking
  - Add download endpoints with access control
  - Create endpoints for listing and deleting files
- Implement file retention policies and cleanup processes
  - Create scheduled function to cleanup expired files
  - Add metadata to track file expiration

## Phase 4: Data Migration

### Step 4.1: Create Migration Scripts

- Create a script to export all data from Firestore collections
  - Export each collection to JSON files
  - Preserve relationships between documents
- Create a script to import data into Postgres tables via Neon
  - Transform document data to relational format
  - Handle nested data and arrays appropriately
- Ensure proper data transformation and validation during migration
  - Validate data against schema before insertion
  - Log any validation errors for manual review

### Step 4.2: Test Migration Process

- Run migration in a staging environment
  - Create a staging database instance
  - Run full migration process with real data
- Verify all data is correctly migrated
  - Create validation scripts to compare source and target data
  - Check data integrity and relationships
- Test application functionality with migrated data
  - Run end-to-end tests against migrated database
  - Manually verify critical functionality

### Step 4.3: Production Migration

- Schedule maintenance window for production migration
  - Notify users of planned maintenance
  - Implement read-only mode during migration
- Execute migration process with verification steps
  - Run migration scripts with progress monitoring
  - Verify data integrity after migration
- Update application settings to use new database
  - Switch environment variables to point to new database
  - Update any client-side configuration as needed

## Phase 5: Testing and Deployment

### Step 5.1: Unit and Integration Testing

- Write tests for database repositories
  - Create unit tests for each repository method
  - Use test database instance for integration tests
- Test API endpoints with the new storage layer
  - Create end-to-end tests for each endpoint
  - Test error handling and edge cases
- Test file upload and download functionality
  - Verify file storage and retrieval
  - Test file access control

### Step 5.2: Continuous Integration

- Update CI/CD pipeline to run migrations automatically
  - Add migration step to deployment process
  - Run database tests in CI pipeline
- Add database validation steps to deployment process
  - Verify database schema before deployment
  - Check for pending migrations

### Step 5.3: Monitoring and Logging

- Set up database performance monitoring
  - Add query performance tracking
  - Set up alerts for slow queries
- Implement logging for database operations
  - Log all write operations
  - Create audit trail for sensitive operations
- Create alerts for database connectivity issues
  - Monitor connection pool health
  - Set up alerts for connection failures

## Phase 6: Optimization and Cleanup

### Step 6.1: Remove Legacy Firestore Code

- Remove `firestore.ts` and `firestoreStorage.ts` after successful migration
  - Keep backups of these files
  - Remove unused imports
- Update imports across the codebase
  - Update all references to Firestore
  - Fix any broken imports
- Clean up Firebase Admin SDK initialization to only what's needed for auth
  - Remove Firestore initialization
  - Keep only authentication-related code

### Step 6.2: Performance Optimization

- Add indexes to PostgreSQL tables for common queries
  - Identify frequent queries
  - Create appropriate indexes
- Implement caching strategies for frequently accessed data
  - Add in-memory caching for reference data
  - Implement cache invalidation
- Optimize database queries for performance
  - Review and optimize complex queries
  - Implement pagination for large result sets

### Step 6.3: Documentation Update

- Update project documentation to reflect the new architecture
  - Document the hybrid approach
  - Update deployment instructions
- Document database schema and relationships
  - Create ER diagram
  - Document table structures and relationships
- Create developer guide for working with the hybrid architecture
  - Document setup process for new developers
  - Create troubleshooting guide
