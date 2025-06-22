<!-- @format -->

# Repository Pattern Implementation Guide

This guide outlines how to implement the repository pattern for data access in the 3DPC Print Queue Management Website using Drizzle ORM with Neon PostgreSQL.

## Overview

The repository pattern provides an abstraction layer between the data access logic and the business logic of the application. This separation makes the code more maintainable, testable, and allows for easier switching between different data sources.

## Repository Structure

In our application, repositories are organized in the `server/repositories` directory:

```
server/
├── repositories/
│   ├── users.ts       # User-related database operations
│   ├── orders.ts      # Order-related database operations
│   ├── clubs.ts       # Club-related database operations
│   └── system.ts      # System configuration operations
```

## Basic Repository Implementation

Here's the basic structure for a repository class:

```typescript
import { eq } from "drizzle-orm";
import { db } from "../db";
import { entityTable } from "../../shared/schema";
import type { Entity, InsertEntity } from "../storage";

export class EntityRepository {
  // Get by ID
  async getById(id: number): Promise<Entity | undefined> {
    const results = await db
      .select()
      .from(entityTable)
      .where(eq(entityTable.id, id))
      .limit(1);
    return results[0];
  }

  // Create
  async create(data: InsertEntity): Promise<Entity> {
    const results = await db.insert(entityTable).values(data).returning();
    return results[0];
  }

  // Update
  async update(id: number, updates: Partial<Entity>): Promise<Entity> {
    const results = await db
      .update(entityTable)
      .set(updates)
      .where(eq(entityTable.id, id))
      .returning();

    if (results.length === 0) {
      throw new Error(`Entity with ID ${id} not found`);
    }

    return results[0];
  }

  // Delete
  async delete(id: number): Promise<boolean> {
    const result = await db
      .delete(entityTable)
      .where(eq(entityTable.id, id))
      .returning({ id: entityTable.id });

    return result.length > 0;
  }
}
```

## Creating a New Repository

To create a new repository for a data entity:

1. Create a new file in the `server/repositories` directory
2. Import the Drizzle ORM tools and the schema for the entity
3. Implement the basic CRUD operations
4. Add any specialized query methods needed for the entity

### Example: Users Repository

```typescript
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../../shared/schema";
import type { User, InsertUser } from "../storage";

export class UsersRepository {
  async getById(id: number): Promise<User | undefined> {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return results[0];
  }

  async getByEmail(email: string): Promise<User | undefined> {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return results[0];
  }

  async create(userData: InsertUser): Promise<User> {
    const results = await db.insert(users).values(userData).returning();
    return results[0];
  }

  async update(id: number, updates: Partial<User>): Promise<User> {
    const results = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    if (results.length === 0) {
      throw new Error(`User with ID ${id} not found`);
    }

    return results[0];
  }

  async delete(id: number): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });

    return result.length > 0;
  }
}
```

## Using Repositories in Services or Routes

Here's an example of how to use a repository in a service or route handler:

```typescript
import { UsersRepository } from "../repositories/users";

// Create an instance of the repository
const usersRepository = new UsersRepository();

// In a route handler or service method
async function getUserProfile(req, res) {
  try {
    const userId = parseInt(req.params.id);
    const user = await usersRepository.getById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    console.error("Error getting user profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
```

## Transactions

For operations that need to modify multiple tables atomically, use Drizzle's transaction support:

```typescript
import { db } from "../db";

async function createOrderWithItems(orderData, items) {
  return await db.transaction(async (tx) => {
    // Create the order
    const [order] = await tx.insert(orders).values(orderData).returning();

    // Create the items with the order ID
    const orderItems = items.map((item) => ({
      ...item,
      orderId: order.id,
    }));

    await tx.insert(orderItems).values(orderItems);

    return order;
  });
}
```

## Best Practices

1. **Keep repositories focused**: Each repository should handle only one entity type
2. **Use meaningful method names**: Name methods based on what they retrieve, not how
3. **Handle errors gracefully**: Catch and handle database errors in a consistent way
4. **Use transactions for multi-table operations**: Ensure data consistency
5. **Include proper documentation**: Document each method's purpose and parameters
6. **Add logging for debugging**: Log key operations for easier troubleshooting
7. **Write unit tests**: Test repository methods to ensure they work correctly

## Next Steps

After implementing all repositories:

1. Create services that use repositories for business logic
2. Update route handlers to use services instead of direct database access
3. Add error handling middleware to catch and format database errors
4. Implement caching for frequently accessed data
5. Add transaction support for complex operations
