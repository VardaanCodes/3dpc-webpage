<!-- @format -->

# Netlify Neon PostgreSQL Integration Guide

This guide provides detailed steps for implementing the Neon PostgreSQL integration with Netlify for the 3DPC Print Queue Management Website.

## Prerequisites

- Netlify account with site already deployed
- Basic understanding of PostgreSQL and Drizzle ORM
- Local development environment set up

## Step 1: Install Netlify Neon Extension

1. **Access Netlify Dashboard**

   - Navigate to [Netlify Dashboard](https://app.netlify.com/)
   - Select your site (3dpc-webpage)

2. **Install Neon Extension**

   - Go to Site settings > Extensions
   - Click "Add extension" and search for "Neon"
   - Click "Connect" to install the extension

3. **Configure Neon Database**

   - Follow the prompts to create a new Neon database
   - Note: The extension will automatically add the `NEON_DATABASE_URL` environment variable

4. **Verify Environment Variables**

   - Check that `NEON_DATABASE_URL` is added to your site's environment variables
   - The format will be: `postgres://username:password@hostname:port/database`

5. **Local Development Setup**
   - Add the same database URL to your local `.env` file:
   ```
   NEON_DATABASE_URL=postgres://username:password@hostname:port/database
   ```

## Step 2: Update Database Configuration

1. **Update drizzle.config.ts**

   - Ensure it supports both local and Netlify environments:

   ```typescript
   import { defineConfig } from "drizzle-kit";
   import * as dotenv from "dotenv";

   // Load environment variables from .env file for local development
   dotenv.config();

   // Get the database URL, prioritizing Netlify's Neon extension URL
   const databaseUrl =
     process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

   if (!databaseUrl) {
     throw new Error(
       "DATABASE_URL or NEON_DATABASE_URL environment variable is required"
     );
   }

   export default defineConfig({
     out: "./migrations",
     schema: "./shared/schema.ts",
     dialect: "postgresql",
     dbCredentials: {
       url: databaseUrl,
     },
     verbose: process.env.NODE_ENV !== "production",
     strict: process.env.NODE_ENV !== "production",
   });
   ```

2. **Update server/db.ts**

   - Review the existing implementation to ensure it works with Neon:

   ```typescript
   import { drizzle } from "drizzle-orm/neon-serverless";
   import { neon } from "@neondatabase/serverless";
   import * as schema from "../shared/schema";

   // Get the database URL from environment variables
   const databaseUrl =
     process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

   if (!databaseUrl) {
     console.error("Database URL not found in environment variables");
     throw new Error(
       "Missing database connection string. Set NEON_DATABASE_URL environment variable."
     );
   }

   // Create a Neon client
   const sql = neon(databaseUrl);

   // Create and export the database connection
   export const db = drizzle(sql, { schema });

   /**
    * Test the database connection
    * @returns True if connection successful, false otherwise
    */
   export async function testDatabaseConnection(): Promise<boolean> {
     try {
       // Simple query to test the connection
       const result = await sql`SELECT 1 as test`;
       console.log("Database connection successful:", result);
       return true;
     } catch (error) {
       console.error("Database connection failed:", error);
       return false;
     }
   }
   ```

## Step 3: Update Package Scripts

1. **Add/Review Database Scripts in package.json**

   - Make sure these scripts are present:

   ```json
   "scripts": {
     "db:push": "drizzle-kit push",
     "db:migrate": "tsx scripts/migrate-db.ts",
     "db:generate": "drizzle-kit generate:pg",
     "db:studio": "drizzle-kit studio"
   }
   ```

2. **Install Required Dependencies**
   ```bash
   pnpm add -D dotenv drizzle-kit
   pnpm add drizzle-orm @neondatabase/serverless
   ```

## Step 4: Run Initial Migration

1. **Generate Migration Files**

   ```bash
   pnpm run db:generate
   ```

2. **Apply Migrations**

   ```bash
   pnpm run db:migrate
   ```

3. **Verify Database Schema**
   ```bash
   pnpm run db:studio
   ```

## Step 5: Deploy to Netlify

1. **Update netlify.toml**

   - Ensure the build command correctly includes database migration:

   ```toml
   [build]
     command = "pnpm run db:migrate && pnpm run build"
     publish = "dist"
   ```

2. **Deploy to Netlify**

   ```bash
   netlify deploy --prod
   ```

3. **Verify Database Connection**
   - Check the Netlify function logs to ensure the database connection is successful

## Step 6: Testing

1. **Test User Authentication**

   - Verify Firebase auth still works with the new database
   - Test user creation and role assignment

2. **Test File Uploads**

   - Test file uploads with Netlify Blobs
   - Verify file metadata is stored in the database

3. **Test API Endpoints**
   - Test all API endpoints to ensure they work with the new database
   - Test error handling and edge cases

## Troubleshooting

### Common Issues

1. **Database Connection Errors**

   - Check the `NEON_DATABASE_URL` environment variable
   - Verify network connectivity and firewall settings
   - Check Neon database status in the Netlify dashboard

2. **Migration Errors**

   - Check migration logs for errors
   - Ensure the schema definition is valid
   - Try running migrations manually in development first

3. **Authentication Issues**
   - Verify Firebase configuration
   - Check user creation and role assignment logic
   - Test with a fresh user account

### Support Resources

- [Netlify Neon Extension Documentation](https://docs.netlify.com/integrations/neon/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
