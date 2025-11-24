/** @format */

import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { auditLogs } from "../../shared/schema";
import { createSelectSchema } from "drizzle-zod";

// Define the JSON type for audit log details
type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// Create a select schema for audit logs
const selectAuditLogSchema = createSelectSchema(auditLogs);
// Fix the type to use our Json type for details
export type AuditLog = Omit<z.infer<typeof selectAuditLogSchema>, "details"> & {
  details: Json;
};

import { z } from "zod";

/**
 * Repository for audit log operations
 */
export class AuditLogsRepository {
  /**
   * Create a new audit log entry
   * @param logData The audit log data
   * @returns The created audit log entry
   */
  async create(logData: {
    userId: number;
    action: string;
    entityType: string;
    entityId?: string;
    details?: Record<string, any>;
    reason?: string;
  }): Promise<AuditLog> {
    const results = await db.insert(auditLogs).values(logData).returning();
    return results[0] as unknown as AuditLog;
  }

  /**
   * Get an audit log entry by its ID
   * @param id The audit log ID
   * @returns The audit log entry or undefined if not found
   */
  async getById(id: number): Promise<AuditLog | undefined> {
    const results = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.id, id))
      .limit(1);
    return results[0] as unknown as AuditLog;
  }

  /**
   * Get audit logs by user ID
   * @param userId The user ID
   * @param limit Optional maximum number of results to return
   * @returns Array of audit log entries
   */
  async getByUserId(userId: number, limit?: number): Promise<AuditLog[]> {
    const query = db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.timestamp));

    if (limit) {
      const results = await query.limit(limit);
      return results as unknown as AuditLog[];
    }

    const results = await query;
    return results as unknown as AuditLog[];
  }

  /**
   * Get audit logs by entity type
   * @param entityType The entity type (e.g., "order", "user", etc.)
   * @param limit Optional maximum number of results to return
   * @returns Array of audit log entries
   */
  async getByEntityType(
    entityType: string,
    limit?: number
  ): Promise<AuditLog[]> {
    const query = db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityType, entityType))
      .orderBy(desc(auditLogs.timestamp));

    if (limit) {
      const results = await query.limit(limit);
      return results as unknown as AuditLog[];
    }

    const results = await query;
    return results as unknown as AuditLog[];
  }

  /**
   * Get audit logs by entity ID
   * @param entityId The entity ID
   * @param limit Optional maximum number of results to return
   * @returns Array of audit log entries
   */
  async getByEntityId(entityId: string, limit?: number): Promise<AuditLog[]> {
    const query = db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entityId, entityId))
      .orderBy(desc(auditLogs.timestamp));

    if (limit) {
      const results = await query.limit(limit);
      return results as unknown as AuditLog[];
    }

    const results = await query;
    return results as unknown as AuditLog[];
  }

  /**
   * Get audit logs by action
   * @param action The action (e.g., "CREATE", "UPDATE", "DELETE")
   * @param limit Optional maximum number of results to return
   * @returns Array of audit log entries
   */
  async getByAction(action: string, limit?: number): Promise<AuditLog[]> {
    const query = db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, action))
      .orderBy(desc(auditLogs.timestamp));

    if (limit) {
      const results = await query.limit(limit);
      return results as unknown as AuditLog[];
    }

    const results = await query;
    return results as unknown as AuditLog[];
  }
  /**
   * Get audit logs with complex filtering
   * @param filters Object containing filter criteria
   * @param limit Optional maximum number of results to return
   * @returns Array of audit log entries
   */
  async getFiltered(
    filters: {
      userId?: number;
      action?: string;
      entityType?: string;
      entityId?: string;
      startDate?: Date;
      endDate?: Date;
    },
    limit?: number
  ): Promise<AuditLog[]> {
    // Start with empty conditions array
    const conditions = [];

    // Add conditions based on filters
    if (filters.userId) {
      conditions.push(eq(auditLogs.userId, filters.userId));
    }

    if (filters.action) {
      conditions.push(eq(auditLogs.action, filters.action));
    }

    if (filters.entityType) {
      conditions.push(eq(auditLogs.entityType, filters.entityType));
    }

    if (filters.entityId) {
      conditions.push(eq(auditLogs.entityId, filters.entityId));
    }

    if (filters.startDate) {
      conditions.push(sql`${auditLogs.timestamp} >= ${filters.startDate}`);
    }

    if (filters.endDate) {
      conditions.push(sql`${auditLogs.timestamp} <= ${filters.endDate}`);
    }

    // Build the query based on conditions
    let query;
    if (conditions.length > 0) {
      query = db
        .select()
        .from(auditLogs)
        .where(and(...conditions));
    } else {
      query = db.select().from(auditLogs);
    }

    // Add ordering
    query = query.orderBy(desc(auditLogs.timestamp));

    // Apply limit if specified
    if (limit) {
      const results = await query.limit(limit);
      return results as unknown as AuditLog[];
    }

    const results = await query;
    return results as unknown as AuditLog[];
  }

  /**
   * Get the most recent audit logs
   * @param limit Maximum number of results to return (default: 50)
   * @returns Array of recent audit log entries
   */
  async getRecent(limit: number = 50): Promise<AuditLog[]> {
    const results = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.timestamp))
      .limit(limit);

    return results as unknown as AuditLog[];
  }
}
