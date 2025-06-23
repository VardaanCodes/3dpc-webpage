/** @format */

import { IStorage } from "../types/storage";
import { UsersRepository } from "../repositories/users";
import { OrdersRepository } from "../repositories/orders";
import { ClubsRepository, Club } from "../repositories/clubs";
import { BatchesRepository, Batch } from "../repositories/batches";
import { AuditLogsRepository, AuditLog } from "../repositories/auditLogs";
import { SystemConfigRepository, SystemConfig } from "../repositories/system";
import { FilesRepository } from "../repositories/files";
import * as schema from "../../shared/schema";
import { z } from "zod";

// Define Json type compatible with all repositories
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

// Create a select schema for orders that matches the IStorage interface
const selectOrderSchema = z.object({
  id: z.number(),
  orderId: z.string(),
  userId: z.number(),
  clubId: z.number().nullable(),
  projectName: z.string(),
  eventDeadline: z.string().nullable(),
  material: z.string().nullable(),
  color: z.string().nullable(),
  providingFilament: z.boolean().nullable(),
  specialInstructions: z.string().nullable(),
  files: z.custom<Json>().nullable(),
  status: z.string(),
  batchId: z.number().nullable(),
  estimatedCompletionTime: z.string().nullable(),
  actualCompletionTime: z.string().nullable(),
  failureReason: z.string().nullable(),
  cancellationReason: z.string().nullable(),
  submittedAt: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

// Types
export type User = z.infer<typeof schema.selectUserSchema> & {
  notificationPreferences: Json;
};
export type InsertUser = z.infer<typeof schema.insertUserSchema>;
export type InsertClub = z.infer<typeof schema.insertClubSchema>;
export type Order = z.infer<typeof selectOrderSchema>;
export type InsertOrder = z.infer<typeof schema.insertOrderSchema>;
export type InsertBatch = z.infer<typeof schema.insertBatchSchema>;
export type InsertAuditLog = z.infer<typeof schema.insertAuditLogSchema> & {
  reason?: string | null;
};
export type InsertSystemConfig = z.infer<
  typeof schema.insertSystemConfigSchema
>;

/**
 * Storage implementation that uses the repository pattern to interact with the database
 */
export class RepositoryStorage implements IStorage {
  private usersRepo: UsersRepository;
  private ordersRepo: OrdersRepository;
  private clubsRepo: ClubsRepository;
  private batchesRepo: BatchesRepository;
  private auditLogsRepo: AuditLogsRepository;
  private systemRepo: SystemConfigRepository;
  private filesRepo: FilesRepository;
  constructor() {
    // Initialize all repositories
    this.usersRepo = new UsersRepository();
    this.ordersRepo = new OrdersRepository();
    this.clubsRepo = new ClubsRepository();
    this.batchesRepo = new BatchesRepository();
    this.auditLogsRepo = new AuditLogsRepository();
    this.systemRepo = new SystemConfigRepository();
    this.filesRepo = new FilesRepository();
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
    const user = await this.usersRepo.getById(id);
    if (!user) return undefined;

    // Ensure notificationPreferences is correctly typed
    return {
      ...user,
      notificationPreferences: this.ensureJsonType(
        user.notificationPreferences
      ),
    };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await this.usersRepo.getByEmail(email);
    if (!user) return undefined;

    // Ensure notificationPreferences is correctly typed
    return {
      ...user,
      notificationPreferences: this.ensureJsonType(
        user.notificationPreferences
      ),
    };
  }

  async createUser(user: Omit<User, "id" | "createdAt">): Promise<User> {
    // Convert any null values to undefined to match repository expectations
    const safeUser = this.convertNullToUndefined(user);
    // Ensure lastLogin is included as required by the repository
    if (!("lastLogin" in safeUser)) {
      (safeUser as any).lastLogin = undefined;
    }

    const createdUser = await this.usersRepo.create(safeUser as any);

    // Ensure notificationPreferences is correctly typed
    return {
      ...createdUser,
      notificationPreferences: this.ensureJsonType(
        createdUser.notificationPreferences
      ),
    };
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const updatedUser = await this.usersRepo.update(
      id,
      this.convertNullToUndefined(updates)
    );

    // Ensure notificationPreferences is correctly typed
    return {
      ...updatedUser,
      notificationPreferences: this.ensureJsonType(
        updatedUser.notificationPreferences
      ),
    };
  }

  async getAllUsers(): Promise<User[]> {
    const users = await this.usersRepo.getAll();

    // Ensure notificationPreferences is correctly typed for all users
    return users.map((user) => ({
      ...user,
      notificationPreferences: this.ensureJsonType(
        user.notificationPreferences
      ),
    }));
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
    const dateFields: (keyof Order)[] = [
      "eventDeadline",
      "estimatedCompletionTime",
      "actualCompletionTime",
      "submittedAt",
      "updatedAt",
    ];

    for (const field of dateFields) {
      const value = updates[field];
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

    return {
      ...result,
      details: this.ensureJsonType(result.details),
    };
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

    return logs.map((log) => ({
      ...log,
      details: this.ensureJsonType(log.details),
    }));
  }
  // System config operations
  async getSystemConfig(key: string): Promise<SystemConfig | undefined> {
    const config = await this.systemRepo.getByKey(key);
    if (!config) return undefined;

    return {
      ...config,
      value: this.ensureJsonType(config.value),
    };
  }

  async setSystemConfig(config: InsertSystemConfig): Promise<SystemConfig> {
    const safeConfig = this.convertNullToUndefined(config);
    const result = await this.systemRepo.set(
      safeConfig.key,
      this.ensureJsonType(safeConfig.value),
      safeConfig.updatedBy || 0,
      safeConfig.description as string | undefined
    );

    return {
      ...result,
      value: this.ensureJsonType(result.value),
    };
  }

  async getAllSystemConfig(): Promise<SystemConfig[]> {
    const configs = await this.systemRepo.getAll();

    return configs.map((config) => ({
      ...config,
      value: this.ensureJsonType(config.value),
    }));
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

    return {
      ...result,
      value: this.ensureJsonType(result.value),
    };
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
}

// Export a singleton instance
export const repositoryStorage = new RepositoryStorage();
