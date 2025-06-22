<!-- @format -->

# Netlify Neon Database Integration Guide

This guide outlines the steps to set up and use Neon serverless PostgreSQL with your Netlify site.

## Setup Instructions

### 1. Create a Neon Database (Development)

1. Visit [Neon](https://neon.tech) and create an account if you don't have one
2. Create a new project
3. Get your connection string from the connection details page
4. Add the connection string to your local `.env` file as `NEON_DATABASE_URL`

### 2. Install Netlify Neon Extension (Production)

1. Log in to your Netlify dashboard
2. Go to your site settings
3. Navigate to Integrations > Extensions
4. Search for and install "Neon"
5. Follow the prompts to connect to your Neon account
6. Select the project you want to use with your Netlify site

This will automatically add the `NETLIFY_DATABASE_URL` environment variable to your site.

### 3. Run Migrations

For local development:

```bash
# Make sure your .env file has NEON_DATABASE_URL set
pnpm db:generate  # Generate migration files
pnpm db:migrate   # Apply migrations to your database
```

For production (after deployment):

```bash
# Migrations will be automatically run during the build process
```

### 4. Working with Drizzle ORM

Drizzle ORM is already set up in the project. You can use the repositories in `server/repositories/` to interact with your database:

- `users.ts` - User management
- `orders.ts` - Order management
- `clubs.ts` - Club management
- `batches.ts` - Batch management
- `files.ts` - File management (using Netlify Blobs for storage)
- `auditLogs.ts` - Audit log management
- `system.ts` - System configuration

### 5. Environment Variables

Make sure these variables are set:

- For local development:
  - `NEON_DATABASE_URL` or `DATABASE_URL` in `.env`
- For production (set automatically by Netlify):
  - `NETLIFY_DATABASE_URL`

## Testing

1. Run database migrations
2. Create test data using the repositories
3. Check database state using Neon's SQL Editor or Drizzle Studio:
   ```bash
   pnpm db:studio
   ```
