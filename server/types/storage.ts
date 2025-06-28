/** @format */

import {
  User,
  Club,
  Order,
  Batch,
  AuditLog,
  SystemConfig,
} from "../../shared/schema";

/**
 * Interface for storage operations across the application
 * This abstraction allows for switching between different storage implementations
 */
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: Omit<User, "id" | "createdAt">): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;

  // Club operations
  getAllClubs(): Promise<Club[]>;
  getClub(id: number): Promise<Club | undefined>;
  createClub(club: Omit<Club, "id" | "createdAt">): Promise<Club>;
  updateClub(id: number, updates: Partial<Club>): Promise<Club>;

  // Order operations
  getOrder(id: number): Promise<Order | undefined>;
  getAllOrders(): Promise<Order[]>;
  getOrdersByUser(userId: number): Promise<Order[]>;
  getOrdersByClub(clubId: number): Promise<Order[]>;
  getOrdersByStatus(status: string): Promise<Order[]>;
  createOrder(
    order: Omit<Order, "id" | "submittedAt" | "updatedAt">
  ): Promise<Order>;
  updateOrder(id: number, updates: Partial<Order>): Promise<Order>;
  updateOrderWithNotification(
    id: number,
    updates: Partial<Order>
  ): Promise<Order>;

  // Batch operations
  getAllBatches(): Promise<Batch[]>;
  createBatch(batch: Omit<Batch, "id" | "createdAt">): Promise<Batch>;
  updateBatch(id: number, updates: Partial<Batch>): Promise<Batch>;

  // Audit log operations
  createAuditLog(log: Omit<AuditLog, "id" | "timestamp">): Promise<AuditLog>;
  getAuditLogs(
    filters?: Partial<AuditLog>,
    limit?: number
  ): Promise<AuditLog[]>;

  // System configuration
  getSystemConfig(key: string): Promise<SystemConfig | undefined>;
  getAllSystemConfig(): Promise<SystemConfig[]>;
  setSystemConfig(config: any): Promise<SystemConfig>;
  updateSystemConfig(
    key: string,
    value: any,
    updatedBy: number
  ): Promise<SystemConfig>;

  // File operations
  getFileById(id: string): Promise<{ data: Blob; metadata: any } | null>;
  deleteFile(id: string, orderId?: number): Promise<boolean>;
}
