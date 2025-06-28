/** @format */

import { eq, and, desc, SQL } from "drizzle-orm";
import { db } from "../db";
import { IStorage } from "../types/storage";
import * as schema from "../../shared/schema";
// Import Json type from storage
import { Json as StorageJson } from "../storage";

// Use the imported Json type
type Json = StorageJson;

// Helper function to safely convert unknown to Json type
function ensureJsonType(data: unknown): Json {
  if (data === null || data === undefined) {
    return null;
  }

  // Simple JSON type validation/conversion
  if (
    typeof data === "string" ||
    typeof data === "number" ||
    typeof data === "boolean" ||
    data === null
  ) {
    return data;
  }

  // For objects/arrays
  return JSON.parse(JSON.stringify(data)) as Json;
}

/**
 * PostgreSQL implementation of the Storage interface using Drizzle ORM
 */
export class PostgresStorage implements IStorage {
  // Helper method to ensure correct Json typing
  private ensureJsonType(data: unknown): Json {
    if (data === null || data === undefined) {
      return null;
    }

    // Simple JSON type validation/conversion
    if (
      typeof data === "string" ||
      typeof data === "number" ||
      typeof data === "boolean" ||
      data === null
    ) {
      return data;
    }

    // For objects/arrays
    return JSON.parse(JSON.stringify(data)) as Json;
  }

  // User operations
  async getUser(id: number): Promise<schema.User | undefined> {
    const results = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, id))
      .limit(1);

    if (results.length === 0) return undefined;

    // Ensure notificationPreferences is correctly typed
    return {
      ...results[0],
      notificationPreferences: this.ensureJsonType(
        results[0].notificationPreferences
      ),
    } as schema.User;
  }

  async getUserByEmail(email: string): Promise<schema.User | undefined> {
    const results = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    if (results.length === 0) return undefined;

    // Ensure notificationPreferences is correctly typed
    return {
      ...results[0],
      notificationPreferences: this.ensureJsonType(
        results[0].notificationPreferences
      ),
    } as schema.User;
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
      reason: null,
    });

    // Ensure notificationPreferences is correctly typed
    return {
      ...results[0],
      notificationPreferences: this.ensureJsonType(
        results[0].notificationPreferences
      ),
    } as schema.User;
  }
  async updateUser(
    id: number,
    updates: Partial<schema.User>
  ): Promise<schema.User> {
    const results = await db
      .update(schema.users)
      .set(updates)
      .where(eq(schema.users.id, id))
      .returning();

    if (!results.length) {
      throw new Error(`User with ID ${id} not found`);
    }

    // Ensure notificationPreferences is correctly typed
    return {
      ...results[0],
      notificationPreferences: this.ensureJsonType(
        results[0].notificationPreferences
      ),
    } as schema.User;
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

    if (results.length === 0) return undefined;

    // Convert files to Json type
    return {
      ...results[0],
      files: this.ensureJsonType(results[0].files),
    } as schema.Order;
  }

  async getOrdersByUser(userId: number): Promise<schema.Order[]> {
    const orders = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.userId, userId));

    // Ensure files field is properly typed as Json
    return orders.map((order) => ({
      ...order,
      files: this.ensureJsonType(order.files),
    })) as schema.Order[];
  }

  async getOrdersByClub(clubId: number): Promise<schema.Order[]> {
    const orders = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.clubId, clubId));

    // Ensure files field is properly typed as Json
    return orders.map((order) => ({
      ...order,
      files: this.ensureJsonType(order.files),
    })) as schema.Order[];
  }

  async getOrdersByStatus(status: string): Promise<schema.Order[]> {
    const orders = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.status, status));

    // Ensure files field is properly typed as Json
    return orders.map((order) => ({
      ...order,
      files: this.ensureJsonType(order.files),
    })) as schema.Order[];
  }
  async createOrder(orderData: schema.InsertOrder): Promise<schema.Order> {
    // Generate a unique order ID
    // Format: #<ClubCode><AY><PrintNumber>
    let orderId = "";

    // Try to get club code if clubId is provided
    if (orderData.clubId) {
      const clubResult = await db
        .select({ code: schema.clubs.code })
        .from(schema.clubs)
        .where(eq(schema.clubs.id, orderData.clubId))
        .limit(1);

      if (clubResult.length > 0) {
        const clubCode = clubResult[0].code;
        // Get current academic year (e.g., "23" for 2023-2024)
        const currentYear = new Date().getFullYear();
        const academicYear = String(currentYear).substring(2);

        // Get count of existing orders for this club + year to determine print number
        const orderCountResult = await db
          .select()
          .from(schema.orders)
          .where(eq(schema.orders.clubId, orderData.clubId));

        const printNumber = orderCountResult.length + 1;

        // Format: #RC23001 (Robotics Club, 2023, order #1)
        orderId = `#${clubCode}${academicYear}${String(printNumber).padStart(
          3,
          "0"
        )}`;
      }
    }

    // If we couldn't generate a club-specific ID, create a generic one
    if (!orderId) {
      // Format: #GEN23001 (Generic, 2023, sequential number)
      const currentYear = new Date().getFullYear();
      const academicYear = String(currentYear).substring(2);

      const allOrdersResult = await db.select().from(schema.orders);
      const printNumber = allOrdersResult.length + 1;
      orderId = `#GEN${academicYear}${String(printNumber).padStart(3, "0")}`;
    }

    // Add the generated order ID and timestamps
    const orderWithId = {
      ...orderData,
      orderId,
      submittedAt: new Date(),
      updatedAt: new Date(),
    };

    const results = await db
      .insert(schema.orders)
      .values(orderWithId)
      .returning();

    // Log the creation
    await this.createAuditLog({
      userId: orderData.userId,
      action: "CREATE",
      entityType: "ORDER",
      entityId: String(results[0].id),
      details: {
        message: `Order created for project: ${orderData.projectName}`,
      },
      reason: null,
    });

    // Ensure files field is properly typed as Json
    return {
      ...results[0],
      files: this.ensureJsonType(results[0].files),
    } as schema.Order;
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

    // Ensure files field is properly typed as Json
    return {
      ...results[0],
      files: this.ensureJsonType(results[0].files),
    } as schema.Order;
  }
  // Audit log operations
  async createAuditLog(
    log: Omit<schema.AuditLog, "id" | "timestamp">
  ): Promise<schema.AuditLog> {
    const results = await db.insert(schema.auditLogs).values(log).returning();

    // Ensure details field is properly typed as Json
    return {
      ...results[0],
      details: this.ensureJsonType(results[0].details),
    } as schema.AuditLog;
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
      const conditions: SQL[] = [];

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
        // Need to fix this operation that's causing type errors
        // We'll use a type assertion to help TypeScript
        const baseQuery = query as any;
        query = baseQuery.where(and(...conditions));
      }
    }

    if (limit) {
      // Need to fix this operation that's causing type errors
      // We'll use a type assertion to help TypeScript
      const baseQuery = query as any;
      query = baseQuery.limit(limit);
    }

    const logs = await query;

    // Ensure details field is properly typed as Json for all logs
    return logs.map((log) => ({
      ...log,
      details: this.ensureJsonType(log.details),
    })) as schema.AuditLog[];
  }
  // System configuration
  async getSystemConfig(key: string): Promise<schema.SystemConfig | undefined> {
    const results = await db
      .select()
      .from(schema.systemConfig)
      .where(eq(schema.systemConfig.key, key))
      .limit(1);

    if (results.length === 0) return undefined;

    // Ensure value field is properly typed as Json
    return {
      ...results[0],
      value: this.ensureJsonType(results[0].value),
    } as schema.SystemConfig;
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

      // Ensure value field is properly typed as Json
      return {
        ...results[0],
        value: this.ensureJsonType(results[0].value),
      } as schema.SystemConfig;
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

      // Ensure value field is properly typed as Json
      return {
        ...results[0],
        value: this.ensureJsonType(results[0].value),
      } as schema.SystemConfig;
    }
  }

  // Add missing methods to implement IStorage interface
  async getOrderByOrderId(orderId: string): Promise<schema.Order | undefined> {
    const results = await db
      .select()
      .from(schema.orders)
      .where(eq(schema.orders.orderId, orderId))
      .limit(1);

    if (results.length === 0) return undefined;

    // Ensure files field is properly typed as Json
    return {
      ...results[0],
      files: this.ensureJsonType(results[0].files),
    } as schema.Order;
  }

  async getUserOrders(userId: number): Promise<schema.Order[]> {
    // This is an alias for getOrdersByUser for compatibility
    return this.getOrdersByUser(userId);
  }

  async getAllOrders(): Promise<schema.Order[]> {
    const orders = await db.select().from(schema.orders);

    // Ensure files field is properly typed as Json
    return orders.map((order) => ({
      ...order,
      files: this.ensureJsonType(order.files),
    })) as schema.Order[];
  }

  async getClubByCode(code: string): Promise<schema.Club | undefined> {
    const results = await db
      .select()
      .from(schema.clubs)
      .where(eq(schema.clubs.code, code))
      .limit(1);
    return results[0];
  }

  async searchClubs(query: string): Promise<schema.Club[]> {
    // Simple implementation that filters clubs by name containing the query
    const clubs = await db.select().from(schema.clubs);
    return clubs.filter((club) =>
      club.name.toLowerCase().includes(query.toLowerCase())
    );
  }

  async getBatch(id: number): Promise<schema.Batch | undefined> {
    const results = await db
      .select()
      .from(schema.batches)
      .where(eq(schema.batches.id, id))
      .limit(1);
    return results[0];
  }

  async getAllBatches(): Promise<schema.Batch[]> {
    return db.select().from(schema.batches);
  }

  async getBatchesByStatus(status: string): Promise<schema.Batch[]> {
    return db
      .select()
      .from(schema.batches)
      .where(eq(schema.batches.status, status));
  }

  async createBatch(
    batch: Omit<schema.Batch, "id" | "createdAt">
  ): Promise<schema.Batch> {
    const results = await db.insert(schema.batches).values(batch).returning();
    return results[0];
  }

  async updateBatch(
    id: number,
    updates: Partial<schema.Batch>
  ): Promise<schema.Batch> {
    const results = await db
      .update(schema.batches)
      .set(updates)
      .where(eq(schema.batches.id, id))
      .returning();

    if (!results.length) {
      throw new Error(`Batch with ID ${id} not found`);
    }

    return results[0];
  }

  async setSystemConfig(
    config: Omit<schema.SystemConfig, "id" | "updatedAt">
  ): Promise<schema.SystemConfig> {
    // Check if config exists
    const existing = await this.getSystemConfig(config.key);

    if (existing) {
      // Update existing config
      return this.updateSystemConfig(
        config.key,
        config.value,
        config.updatedBy || 0
      );
    } else {
      // Create new config
      const results = await db
        .insert(schema.systemConfig)
        .values(config)
        .returning();

      // Ensure value field is properly typed as Json
      return {
        ...results[0],
        value: this.ensureJsonType(results[0].value),
      } as schema.SystemConfig;
    }
  }

  async getAllSystemConfig(): Promise<schema.SystemConfig[]> {
    const configs = await db.select().from(schema.systemConfig);

    // Ensure value field is properly typed as Json for all configs
    return configs.map((config) => ({
      ...config,
      value: this.ensureJsonType(config.value),
    })) as schema.SystemConfig[];
  }
}
