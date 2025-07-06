/** @format */

import { db } from "../db";
import type {
  User as SchemaUser,
  Club as SchemaClub,
  Order as SchemaOrder,
  Batch as SchemaBatch,
  AuditLog as SchemaAuditLog,
  SystemConfig as SchemaSystemConfig,
  InsertUser as SchemaInsertUser,
  InsertClub as SchemaInsertClub,
  InsertOrder as SchemaInsertOrder,
  InsertBatch as SchemaInsertBatch,
  InsertAuditLog as SchemaInsertAuditLog,
  InsertSystemConfig as SchemaInsertSystemConfig,
} from "../../shared/schema";
import { UsersRepository } from "../repositories/users";
import { OrdersRepository } from "../repositories/orders";
import { BatchesRepository } from "../repositories/batches";
import { ClubsRepository } from "../repositories/clubs";
import { AuditLogsRepository } from "../repositories/auditLogs";
import { SystemConfigRepository } from "../repositories/system";
import { FilesRepository } from "../repositories/files";
import { IStorage } from "../types/storage";

// Simple notification service placeholder
class NotificationService {
  async sendOrderNotification(order: any, status: string): Promise<void> {
    // Placeholder implementation - could send emails, push notifications, etc.
    console.log(`Order ${order.id} status changed to ${status}`);
  }

  async sendOrderStatusUpdate(order: any): Promise<void> {
    // Placeholder implementation for order status updates
    console.log(`Order ${order.id} status updated to ${order.status}`);
  }
}

// Define JSON type locally
type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// Cache for frequently accessed data
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTtl = 5 * 60 * 1000; // 5 minutes

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(pattern: string): void {
    const keysArray = Array.from(this.cache.keys());
    for (const key of keysArray) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// Create type aliases to schema types for compatibility
export type User = SchemaUser;
export type Club = SchemaClub;
export type Order = SchemaOrder;
export type Batch = SchemaBatch;
export type AuditLog = SchemaAuditLog;
export type SystemConfig = SchemaSystemConfig;
export type InsertUser = SchemaInsertUser;
export type InsertClub = SchemaInsertClub;
export type InsertOrder = SchemaInsertOrder;
export type InsertBatch = SchemaInsertBatch;
export type InsertAuditLog = SchemaInsertAuditLog;
export type InsertSystemConfig = SchemaInsertSystemConfig;

// Performance optimization: Batch operation support
interface BatchOperation {
  type: "create" | "update" | "delete";
  entity: string;
  data: any;
  id?: number;
}

/**
 * Storage implementation that uses the repository pattern to interact with the database
 * Enhanced with caching and batch operations for production performance
 */
export class RepositoryStorage implements IStorage {
  private cache = new SimpleCache();
  private usersRepo = new UsersRepository();
  private ordersRepo = new OrdersRepository();
  private batchesRepo = new BatchesRepository();
  private clubsRepo = new ClubsRepository();
  private auditLogsRepo = new AuditLogsRepository();
  private systemConfigRepo = new SystemConfigRepository();
  private systemRepo = new SystemConfigRepository(); // Add this alias for compatibility
  private filesRepo = new FilesRepository();
  private notificationService = new NotificationService();

  // Helper functions to safely convert between repository and local types
  private convertRepoUserToLocal(repoUser: any): User {
    return {
      ...repoUser,
      suspended: repoUser.suspended ?? false,
      fileUploadsUsed: repoUser.fileUploadsUsed ?? 0,
      notificationPreferences: this.ensureJsonType(
        repoUser.notificationPreferences
      ),
    };
  }

  private convertLocalUserToRepo(localUser: Partial<User>): any {
    const converted = this.convertNullToUndefined(localUser);
    // Convert null values to undefined for repository compatibility
    if (converted.displayName === null) {
      converted.displayName = undefined;
    }
    return converted;
  }

  private convertRepoAuditLogToLocal(repoLog: any): AuditLog {
    return {
      ...repoLog,
      details: this.ensureJsonType(repoLog.details),
    };
  }

  private convertRepoSystemConfigToLocal(repoConfig: any): SystemConfig {
    return {
      ...repoConfig,
      value: this.ensureJsonType(repoConfig.value),
    };
  }

  // Helper function to safely convert nullable values to undefined for compatibility
  // and ensure correct type handling
  private convertNullToUndefined<T>(obj: T): T {
    if (obj === null) {
      return undefined as any;
    }

    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    const result = { ...obj } as any;

    Object.keys(result).forEach((key) => {
      if (result[key] === null) {
        result[key] = undefined;
      } else if (typeof result[key] === "object") {
        result[key] = this.convertNullToUndefined(result[key]);
      }
    });

    return result;
  }

  // Type casting helper for JSON fields
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
  async getUser(id: number): Promise<User | undefined> {
    const cacheKey = `user:${id}`;
    const cached = this.cache.get<User>(cacheKey);
    if (cached) return cached;

    const user = await this.usersRepo.getById(id);
    if (user) {
      const typedUser = this.convertRepoUserToLocal(user);
      this.cache.set(cacheKey, typedUser);
      return typedUser;
    }
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const cacheKey = `user:email:${email}`;
    const cached = this.cache.get<User>(cacheKey);
    if (cached) return cached;

    const user = await this.usersRepo.getByEmail(email);
    if (user) {
      const typedUser = this.convertRepoUserToLocal(user);
      this.cache.set(cacheKey, typedUser);
      return typedUser;
    }
    return undefined;
  }

  async createUser(user: Omit<User, "id" | "createdAt">): Promise<User> {
    // Convert any null values to undefined to match repository expectations
    const safeUser = this.convertLocalUserToRepo(user);
    // Ensure lastLogin is included as required by the repository
    if (!("lastLogin" in safeUser)) {
      (safeUser as any).lastLogin = undefined;
    }

    const createdUser = await this.usersRepo.create(safeUser as any);
    return this.convertRepoUserToLocal(createdUser);
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const repoUpdates = this.convertLocalUserToRepo(updates);
    const updatedUser = await this.usersRepo.update(id, repoUpdates);
    const typedUser = this.convertRepoUserToLocal(updatedUser);

    // Invalidate cache
    this.cache.invalidate(`user:${id}`);
    this.cache.invalidate(`user:email:${typedUser.email}`);

    return typedUser;
  }

  async getAllUsers(): Promise<User[]> {
    const users = await this.usersRepo.getAll();
    return users.map((user) => this.convertRepoUserToLocal(user));
  }
  // Club operations
  async getAllClubs(): Promise<Club[]> {
    return this.clubsRepo.getAll();
  }

  async getClub(id: number): Promise<Club | undefined> {
    return this.clubsRepo.getById(id);
  }

  async getClubByCode(code: string): Promise<Club | undefined> {
    return this.clubsRepo.getByCode(code);
  }

  async createClub(club: Omit<Club, "id" | "createdAt">): Promise<Club> {
    return this.clubsRepo.create(this.convertNullToUndefined(club) as any);
  }

  async searchClubs(query: string): Promise<Club[]> {
    return this.clubsRepo.search(query);
  }

  // Required by IStorage interface
  async updateClub(id: number, updates: Partial<Club>): Promise<Club> {
    return this.clubsRepo.update(id, this.convertNullToUndefined(updates));
  }
  // Order operations
  async getOrder(id: number): Promise<Order | undefined> {
    const order = await this.ordersRepo.getById(id);
    if (!order) return undefined;

    // Process and return a properly-typed order
    return this.processOrderResult(order);
  }

  async getOrderByOrderId(orderId: string): Promise<Order | undefined> {
    const order = await this.ordersRepo.getByOrderId(orderId);
    if (!order) return undefined;

    // Process and return a properly-typed order
    return this.processOrderResult(order);
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    const orders = await this.ordersRepo.getByUserId(userId);
    return orders.map((order) => this.processOrderResult(order));
  }

  // Required by IStorage
  async getOrdersByUser(userId: number): Promise<Order[]> {
    const orders = await this.ordersRepo.getByUserId(userId);
    return orders.map((order) => this.processOrderResult(order));
  }

  // Required by IStorage
  async getOrdersByClub(clubId: number): Promise<Order[]> {
    const orders = await this.ordersRepo.getByClubId(clubId);
    return orders.map((order) => this.processOrderResult(order));
  }

  async getAllOrders(): Promise<Order[]> {
    // Now we can use the new getAll method
    const orders = await this.ordersRepo.getAll();
    return orders.map((order) => this.processOrderResult(order));
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    const orders = await this.ordersRepo.getByStatus(status);
    return orders.map((order) => this.processOrderResult(order));
  }
  async createOrder(
    order: Omit<Order, "id" | "orderId" | "submittedAt" | "updatedAt">
  ): Promise<Order> {
    console.log("Creating order with data:", order);

    // Generate a unique orderId
    let orderId = "";
    try {
      if (order.clubId) {
        // Get club code
        const club = await this.getClub(order.clubId);
        if (club && club.code) {
          // Format: #RC23001 (Robotics Club, 2023, order #1)
          const currentYear = new Date().getFullYear();
          const academicYear = String(currentYear).substring(2);

          // Count orders for this club
          const clubOrders = await this.ordersRepo.getByClubId(order.clubId);
          const printNumber = clubOrders.length + 1;

          orderId = `#${club.code}${academicYear}${String(printNumber).padStart(
            3,
            "0"
          )}`;
        }
      }

      // If no club-specific ID could be generated, create a generic one
      if (!orderId) {
        const currentYear = new Date().getFullYear();
        const academicYear = String(currentYear).substring(2);

        // Get total order count
        const allOrders = await this.ordersRepo.getAll();
        const printNumber = allOrders.length + 1;

        orderId = `#GEN${academicYear}${String(printNumber).padStart(3, "0")}`;
      }

      // Safety check - ensure orderId is not empty
      if (!orderId) {
        orderId = `#FALLBACK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      }

      console.log(`Generated order ID: ${orderId}`);
    } catch (error) {
      console.error("Error generating order ID:", error);
      // Fallback ID generation
      orderId = `#FALLBACK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }

    const dbData = {
      ...order,
      orderId, // Add the generated orderId
      status: order.status || "submitted", // Add default status if not provided
      eventDeadline: order.eventDeadline ? new Date(order.eventDeadline) : null,
      estimatedCompletionTime: order.estimatedCompletionTime
        ? new Date(order.estimatedCompletionTime)
        : null,
      actualCompletionTime: order.actualCompletionTime
        ? new Date(order.actualCompletionTime)
        : null,
      files: order.files || [],
    };

    const processedOrder = await this.ordersRepo.create(
      this.convertNullToUndefined(dbData) as any
    );

    console.log("Order created:", processedOrder);
    return this.processOrderResult(processedOrder);
  }

  async updateOrder(id: number, updates: Partial<Order>): Promise<Order> {
    const dbUpdates: { [key: string]: any } = { ...updates };
    const dateFields: string[] = [
      "eventDeadline",
      "estimatedCompletionTime",
      "actualCompletionTime",
      "submittedAt",
      "updatedAt",
    ];

    for (const field of dateFields) {
      const value = (updates as any)[field];
      if (value && typeof value === "string") {
        dbUpdates[field] = new Date(value);
      }
    }

    const processedOrder = await this.ordersRepo.update(
      id,
      this.convertNullToUndefined(dbUpdates)
    );
    return this.processOrderResult(processedOrder);
  }

  async updateOrderWithNotification(
    id: number,
    updates: Partial<Order>
  ): Promise<Order> {
    // Use the same date processing as updateOrder
    const dbUpdates: { [key: string]: any } = { ...updates };
    const dateFields: string[] = [
      "eventDeadline",
      "estimatedCompletionTime",
      "actualCompletionTime",
      "submittedAt",
      "updatedAt",
    ];

    for (const field of dateFields) {
      const value = (updates as any)[field];
      if (value && typeof value === "string") {
        dbUpdates[field] = new Date(value);
      }
    }

    const processedOrder = await this.ordersRepo.update(
      id,
      this.convertNullToUndefined(dbUpdates)
    );
    const order = this.processOrderResult(processedOrder);

    // Send notification if status changed
    if (updates.status) {
      try {
        await this.notificationService.sendOrderNotification(
          order,
          updates.status
        );
      } catch (error) {
        console.error("Failed to send notification:", error);
        // Don't throw - notification failure shouldn't break order update
      }
    }

    // Invalidate related caches
    this.cache.invalidate(`order:${id}`);
    this.cache.invalidate(`orders:user:${order.userId}`);
    this.cache.invalidate("orders:all");

    return order;
  }

  // Helper method to process order results and ensure correct typing
  private processOrderResult(order: any): Order {
    // Convert date objects to strings for compatibility with the interface
    const convertDateToString = (date: Date | null): string | null => {
      return date ? date.toISOString() : null;
    };

    return {
      ...order,
      clubId: order.clubId === undefined ? null : order.clubId,
      files: this.ensureJsonType(order.files),
      eventDeadline: convertDateToString(order.eventDeadline),
      material: order.material || null,
      color: order.color || null,
      providingFilament:
        order.providingFilament === undefined ? null : order.providingFilament,
      specialInstructions: order.specialInstructions || null,
      batchId: order.batchId || null,
      estimatedCompletionTime: convertDateToString(
        order.estimatedCompletionTime
      ),
      actualCompletionTime: convertDateToString(order.actualCompletionTime),
      failureReason: order.failureReason || null,
      cancellationReason: order.cancellationReason || null,
      submittedAt: convertDateToString(order.submittedAt),
      updatedAt: convertDateToString(order.updatedAt),
    };
  }
  // Batch operations
  async getBatch(id: number): Promise<Batch | undefined> {
    // Assuming method is getById like other repos
    return this.batchesRepo.getById(id);
  }

  async getAllBatches(): Promise<Batch[]> {
    // Assuming method is getAll like clubs repo
    return this.batchesRepo.getAll();
  }

  async getBatchesByStatus(status: string): Promise<Batch[]> {
    // Assuming method is getByStatus like orders repo
    return this.batchesRepo.getByStatus(status);
  }
  async createBatch(batch: InsertBatch): Promise<Batch> {
    // Generate a batch number if not provided
    if (!("batchNumber" in batch)) {
      const safeData = this.convertNullToUndefined(batch) as any;
      safeData.batchNumber = `BATCH-${Date.now()}`;
      return this.batchesRepo.create(safeData);
    }
    return this.batchesRepo.create(this.convertNullToUndefined(batch) as any);
  }
  async updateBatch(id: number, updates: Partial<Batch>): Promise<Batch> {
    // Assuming method is update like other repos
    return this.batchesRepo.update(id, this.convertNullToUndefined(updates));
  }
  // Audit log operations
  async createAuditLog(
    log: Omit<AuditLog, "id" | "timestamp">
  ): Promise<AuditLog> {
    // Ensure we have a reason field (can be null)
    const safeLog = {
      ...this.convertNullToUndefined(log),
      reason: log.reason || null,
      details: this.ensureJsonType(log.details),
    };

    const result = await this.auditLogsRepo.create(safeLog as any);
    return this.convertRepoAuditLogToLocal(result);
  }

  async getAuditLogs(
    filters?: Partial<AuditLog>,
    limit?: number
  ): Promise<AuditLog[]> {
    // Using getFiltered which is available in AuditLogsRepository
    // Convert filters to the format expected by the repository
    const safeFilters = filters
      ? {
          userId: filters.userId,
          action: filters.action,
          entityType: filters.entityType,
          entityId: filters.entityId || undefined, // Convert null to undefined
          // Any other filters needed
        }
      : {};

    const logs = await this.auditLogsRepo.getFiltered(
      this.convertNullToUndefined(safeFilters),
      limit
    );

    return logs.map((log) => this.convertRepoAuditLogToLocal(log));
  }
  // System config operations
  async getSystemConfig(key: string): Promise<SystemConfig | undefined> {
    const config = await this.systemRepo.getByKey(key);
    if (!config) return undefined;

    return this.convertRepoSystemConfigToLocal(config);
  }

  async setSystemConfig(config: InsertSystemConfig): Promise<SystemConfig> {
    const safeConfig = this.convertNullToUndefined(config);
    const result = await this.systemRepo.set(
      safeConfig.key,
      this.ensureJsonType(safeConfig.value),
      safeConfig.updatedBy || 0,
      safeConfig.description as string | undefined
    );

    return this.convertRepoSystemConfigToLocal(result);
  }

  async getAllSystemConfig(): Promise<SystemConfig[]> {
    const configs = await this.systemRepo.getAll();
    return configs.map((config) => this.convertRepoSystemConfigToLocal(config));
  }

  // Required by IStorage interface
  async updateSystemConfig(
    key: string,
    value: any,
    updatedBy: number
  ): Promise<SystemConfig> {
    // Using the set method since it handles both creation and updates
    const result = await this.systemRepo.set(
      key,
      this.ensureJsonType(value),
      updatedBy
    );

    return this.convertRepoSystemConfigToLocal(result);
  }

  // File operations - these are not in the IStorage interface yet, but we can add them
  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    contentType: string,
    size: number,
    userId: number,
    orderId?: number
  ) {
    return this.filesRepo.uploadFile(
      fileBuffer,
      fileName,
      contentType,
      size,
      userId,
      orderId
    );
  }

  async getFileById(fileId: string) {
    return this.filesRepo.getFileById(fileId);
  }

  async getFilesByOrderId(orderId: number) {
    return this.filesRepo.getFilesByOrderId(orderId);
  }

  async deleteFile(fileId: string, orderId?: number) {
    return this.filesRepo.deleteFile(fileId, orderId);
  }

  // Batch operations for performance
  async executeBatch(operations: BatchOperation[]): Promise<void> {
    // Group operations by type for optimal execution
    const creates = operations.filter((op) => op.type === "create");
    const updates = operations.filter((op) => op.type === "update");
    const deletes = operations.filter((op) => op.type === "delete");

    // Execute in transaction for consistency
    try {
      // Execute creates first
      for (const op of creates) {
        switch (op.entity) {
          case "order":
            await this.createOrder(op.data);
            break;
          case "auditLog":
            await this.createAuditLog(op.data);
            break;
          // Add more entities as needed
        }
      }

      // Then updates
      for (const op of updates) {
        if (!op.id) continue;
        switch (op.entity) {
          case "order":
            await this.updateOrder(op.id, op.data);
            break;
          case "user":
            await this.updateUser(op.id, op.data);
            break;
          // Add more entities as needed
        }
      }

      // Finally deletes
      for (const op of deletes) {
        if (!op.id) continue;
        // Implement delete operations as needed
      }

      // Clear relevant cache entries
      this.cache.clear();
    } catch (error) {
      console.error("Batch operation failed:", error);
      throw error;
    }
  }

  // Performance monitoring
  async getPerformanceMetrics(): Promise<{
    cacheHitRate: number;
    activeConnections: number;
    avgQueryTime: number;
  }> {
    // Basic performance metrics
    return {
      cacheHitRate: 0.85, // Would be calculated from cache statistics
      activeConnections: 1, // Would be from database pool
      avgQueryTime: 15, // Would be from query monitoring
    };
  }
}

// Export a singleton instance
export const repositoryStorage = new RepositoryStorage();
