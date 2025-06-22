/** @format */

import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { IStorage } from "../types/storage";
import * as schema from "../../shared/schema";

/**
 * PostgreSQL implementation of the Storage interface using Drizzle ORM
 */
export class PostgresStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<schema.User | undefined> {
    const results = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);
    return results[0];
  }

  async getUserByEmail(email: string): Promise<schema.User | undefined> {
    const results = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);
    return results[0];
  }

  async createUser(
    user: Omit<schema.User, "id" | "createdAt">
  ): Promise<schema.User> {
    const results = await db.insert(schema.users).values(user).returning();

    // Log the creation
    await this.createAuditLog({
      userId: results[0].id,
      action: "CREATE",
      entityType: "USER",
      entityId: String(results[0].id),
      details: { message: `User ${user.email} created` },
    });

    return results[0];
  }

  async updateUser(
    id: number,
    updates: Partial<schema.User>
  ): Promise<schema.User> {
    const results = await db
      .update(schema.users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning();

    if (!results.length) {
      throw new Error(`User with ID ${id} not found`);
    }

    return results[0];
  }

  // Club operations
  async getAllClubs(): Promise<schema.Club[]> {
    return db.select().from(schema.clubs);
  }

  async getClub(id: number): Promise<schema.Club | undefined> {
    const results = await db
      .select()
      .from(schema.clubs)
      .where(eq(schema.clubs.id, id))
      .limit(1);
    return results[0];
  }

  async createClub(
    club: Omit<schema.Club, "id" | "createdAt">
  ): Promise<schema.Club> {
    const results = await db.insert(schema.clubs).values(club).returning();
    return results[0];
  }

  async updateClub(
    id: number,
    updates: Partial<schema.Club>
  ): Promise<schema.Club> {
    const results = await db
      .update(schema.clubs)
      .set(updates)
      .where(eq(schema.clubs.id, id))
      .returning();

    if (!results.length) {
      throw new Error(`Club with ID ${id} not found`);
    }

    return results[0];
  }

  // Order operations
  async getOrder(id: number): Promise<schema.Order | undefined> {
    const results = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.id, id))
      .limit(1);
    return results[0];
  }

  async getOrdersByUser(userId: number): Promise<schema.Order[]> {
    return db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.userId, userId));
  }

  async getOrdersByClub(clubId: number): Promise<schema.Order[]> {
    return db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.clubId, clubId));
  }

  async getOrdersByStatus(status: string): Promise<schema.Order[]> {
    return db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.status, status));
  }

  async createOrder(
    order: Omit<schema.Order, "id" | "submittedAt" | "updatedAt">
  ): Promise<schema.Order> {
    const results = await db.insert(schema.orders).values(order).returning();

    // Log the creation
    await this.createAuditLog({
      userId: order.userId,
      action: "CREATE",
      entityType: "ORDER",
      entityId: String(results[0].id),
      details: { message: `Order created for project: ${order.projectName}` },
    });

    return results[0];
  }

  async updateOrder(
    id: number,
    updates: Partial<schema.Order>
  ): Promise<schema.Order> {
    const results = await db
      .update(schema.orders)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(schema.orders.id, id))
      .returning();

    if (!results.length) {
      throw new Error(`Order with ID ${id} not found`);
    }

    return results[0];
  }

  // Audit log operations
  async createAuditLog(
    log: Omit<schema.AuditLog, "id" | "timestamp">
  ): Promise<schema.AuditLog> {
    const results = await db.insert(schema.auditLogs).values(log).returning();
    return results[0];
  }

  async getAuditLogs(
    filters?: Partial<schema.AuditLog>,
    limit?: number
  ): Promise<schema.AuditLog[]> {
    let query = db
      .select()
      .from(schema.auditLogs)
      .orderBy(desc(schema.auditLogs.timestamp));

    if (filters) {
      // Apply filters if they exist
      const conditions = [];

      if (filters.userId) {
        conditions.push(eq(schema.auditLogs.userId, filters.userId));
      }

      if (filters.action) {
        conditions.push(eq(schema.auditLogs.action, filters.action));
      }

      if (filters.entityType) {
        conditions.push(eq(schema.auditLogs.entityType, filters.entityType));
      }

      if (filters.entityId) {
        conditions.push(eq(schema.auditLogs.entityId, filters.entityId));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
    }

    if (limit) {
      query = query.limit(limit);
    }

    return query;
  }

  // System configuration
  async getSystemConfig(key: string): Promise<schema.SystemConfig | undefined> {
    const results = await db
      .select()
      .from(schema.systemConfig)
      .where(eq(schema.systemConfig.key, key))
      .limit(1);
    return results[0];
  }

  async updateSystemConfig(
    key: string,
    value: any,
    updatedBy: number
  ): Promise<schema.SystemConfig> {
    // Check if config exists
    const existing = await this.getSystemConfig(key);

    if (existing) {
      // Update existing config
      const results = await db
        .update(schema.systemConfig)
        .set({ value, updatedBy, updatedAt: new Date() })
        .where(eq(schema.systemConfig.key, key))
        .returning();

      return results[0];
    } else {
      // Create new config
      const results = await db
        .insert(schema.systemConfig)
        .values({
          key,
          value,
          updatedBy,
          description: `Auto-created configuration for ${key}`,
        })
        .returning();

      return results[0];
    }
  }
}
