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

// Create a select schema for orders
const selectOrderSchema = z.object({
  id: z.number(),
  orderId: z.string(),
  userId: z.number(),
  clubId: z.number().optional().nullable(),
  projectName: z.string(),
  eventDeadline: z.date().optional().nullable(),
  material: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  providingFilament: z.boolean().optional().nullable(),
  specialInstructions: z.string().optional().nullable(),
  files: z.any().optional(),
  status: z.string(),
  batchId: z.number().optional().nullable(),
  estimatedCompletionTime: z.date().optional().nullable(),
  actualCompletionTime: z.date().optional().nullable(),
  failureReason: z.string().optional().nullable(),
  cancellationReason: z.string().optional().nullable(),
  submittedAt: z.date().optional(),
  updatedAt: z.date().optional(),
});

// Types
export type User = z.infer<typeof schema.selectUserSchema>;
export type InsertUser = z.infer<typeof schema.insertUserSchema>;
export type InsertClub = z.infer<typeof schema.insertClubSchema>;
export type Order = z.infer<typeof selectOrderSchema>;
export type InsertOrder = z.infer<typeof schema.insertOrderSchema>;
export type InsertBatch = z.infer<typeof schema.insertBatchSchema>;
export type InsertAuditLog = z.infer<typeof schema.insertAuditLogSchema>;
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
  private convertNullToUndefined<T>(obj: T): T {
    if (obj === null || obj === undefined) {
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

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.usersRepo.getById(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return this.usersRepo.getByEmail(email);
  }

  async createUser(user: InsertUser): Promise<User> {
    // Convert any null values to undefined to match repository expectations
    const safeUser = this.convertNullToUndefined(user);
    // Ensure lastLogin is included as required by the repository
    if (!("lastLogin" in safeUser)) {
      (safeUser as any).lastLogin = undefined;
    }
    return this.usersRepo.create(safeUser as any);
  }
  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    return this.usersRepo.update(id, this.convertNullToUndefined(updates));
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

  async createClub(club: InsertClub): Promise<Club> {
    return this.clubsRepo.create(this.convertNullToUndefined(club) as any);
  }

  async searchClubs(query: string): Promise<Club[]> {
    return this.clubsRepo.search(query);
  }
  // Missing method required by IStorage interface
  async updateClub(id: number, updates: Partial<Club>): Promise<Club> {
    return this.clubsRepo.update(id, this.convertNullToUndefined(updates));
  }

  // Order operations
  async getOrder(id: number): Promise<Order | undefined> {
    return this.ordersRepo.getById(id);
  }
  async getOrderByOrderId(orderId: string): Promise<Order | undefined> {
    // Now we can use the new method from OrdersRepository
    return this.ordersRepo.getByOrderId(orderId);
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    return this.ordersRepo.getByUserId(userId);
  }

  // Required by IStorage
  async getOrdersByUser(userId: number): Promise<Order[]> {
    return this.ordersRepo.getByUserId(userId);
  }

  // Required by IStorage
  async getOrdersByClub(clubId: number): Promise<Order[]> {
    return this.ordersRepo.getByClubId(clubId);
  }

  async getAllOrders(): Promise<Order[]> {
    // Now we can use the new getAll method
    return this.ordersRepo.getAll();
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    return this.ordersRepo.getByStatus(status);
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    return this.ordersRepo.create(this.convertNullToUndefined(order) as any);
  }

  async updateOrder(id: number, updates: Partial<Order>): Promise<Order> {
    return this.ordersRepo.update(id, this.convertNullToUndefined(updates));
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
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    // Assuming method is create like other repos
    return this.auditLogsRepo.create(this.convertNullToUndefined(log) as any);
  }
  async getAuditLogs(filters?: {
    userId?: number;
    entityType?: string;
    action?: string;
  }): Promise<AuditLog[]> {
    // Using getFiltered which is available in AuditLogsRepository
    return this.auditLogsRepo.getFiltered(
      this.convertNullToUndefined(filters || {})
    );
  }

  // System config operations
  async getSystemConfig(key: string): Promise<SystemConfig | undefined> {
    return this.systemRepo.getByKey(key);
  }
  async setSystemConfig(config: InsertSystemConfig): Promise<SystemConfig> {
    const safeConfig = this.convertNullToUndefined(config);
    return this.systemRepo.set(
      safeConfig.key,
      safeConfig.value,
      safeConfig.updatedBy || 0,
      safeConfig.description as string | undefined
    );
  }

  async getAllSystemConfig(): Promise<SystemConfig[]> {
    return this.systemRepo.getAll();
  }

  // Required by IStorage interface
  async updateSystemConfig(
    key: string,
    value: any,
    updatedBy: number
  ): Promise<SystemConfig> {
    // Using the set method since it handles both creation and updates
    return this.systemRepo.set(key, value, updatedBy);
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
