<!-- @format -->

# Hybrid Backend Implementation Update Plan

This document outlines the steps to update the current implementation to use our repository pattern with PostgreSQL and Netlify Blobs.

## Current Status

- Schema defined in `shared/schema.ts`
- Migration scripts (`scripts/migrate-db.ts` and `scripts/generate-migrations.ts`) created
- Repository implementations created for entities:
  - Users
  - Orders
  - Clubs
  - Batches
  - Files (using Netlify Blobs)
  - Audit Logs
  - System Config

## Next Steps

### 1. Update Storage Implementation

- Modify `server/storage.ts` to use our repositories instead of direct database access
- Create a `RepositoryStorage` class that implements the `IStorage` interface
- Initialize repositories in the storage class

### 2. Update Routes

- Refactor file upload/download routes to use the new FilesRepository
- Update API endpoints to use the repository pattern
- Ensure proper error handling and type safety

### 3. Testing

- Test database migrations
- Test API endpoints
- Verify file uploads and downloads

### 4. Deployment

- Configure Netlify build settings
- Set up environment variables
- Deploy to Netlify

## Implementation Details

### Storage Class Update

The new `RepositoryStorage` class will:

1. Instantiate all repositories
2. Implement the `IStorage` interface by delegating to the appropriate repository
3. Handle error logging and transformations

### Repository Usage

Each repository follows a consistent pattern:

- CRUD operations (create, read, update, delete)
- Domain-specific operations
- Type safety with Zod schemas
- Error handling

### File Storage

The `FilesRepository` will:

1. Store files using Netlify Blobs
2. Store metadata in the PostgreSQL database
3. Support retrieving files with signed URLs
4. Support listing files associated with orders
5. Handle file cleanup for expired files

## Benefits

- Separation of concerns
- Type safety
- Testability
- Serverless compatibility
- Better error handling
- Consistent interface

## Completion Criteria

- All repositories implemented and tested
- Storage class updated to use repositories
- API endpoints refactored
- Migrations successfully run
- File uploads/downloads working
- Deployed to Netlify with Neon and Blobs extensions
