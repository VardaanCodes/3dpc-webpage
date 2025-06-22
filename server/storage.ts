/** @format */

// Define Json type consistent across all storage implementations
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

import {
  users,
  clubs,
  orders,
  batches,
  auditLogs,
  systemConfig,
  insertUserSchema,
  insertClubSchema,
  insertOrderSchema,
  insertBatchSchema,
  insertAuditLogSchema,
  insertSystemConfigSchema,
  selectUserSchema,
  selectClubSchema,
  selectOrderSchema,
  selectBatchSchema,
  selectAuditLogSchema,
  selectSystemConfigSchema,
  User,
  Club,
  Order,
  Batch,
  AuditLog,
  SystemConfig,
  InsertUser,
  InsertClub,
  InsertOrder,
  InsertBatch,
  InsertAuditLog,
  InsertSystemConfig,
} from "../shared/schema";
import { RepositoryStorage } from "./storage/repositoryStorage";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;

  // Clubs
  getAllClubs(): Promise<Club[]>;
  getClub(id: number): Promise<Club | undefined>;
  getClubByCode(code: string): Promise<Club | undefined>;
  createClub(club: InsertClub): Promise<Club>;
  searchClubs(query: string): Promise<Club[]>;
  updateClub(id: number, updates: Partial<Club>): Promise<Club>;

  // Orders
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByOrderId(orderId: string): Promise<Order | undefined>;
  getUserOrders(userId: number): Promise<Order[]>;
  getOrdersByUser(userId: number): Promise<Order[]>;
  getOrdersByClub(clubId: number): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  getOrdersByStatus(status: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: number, updates: Partial<Order>): Promise<Order>;

  // Batches
  getBatch(id: number): Promise<Batch | undefined>;
  getAllBatches(): Promise<Batch[]>;
  getBatchesByStatus(status: string): Promise<Batch[]>;
  createBatch(batch: InsertBatch): Promise<Batch>;
  updateBatch(id: number, updates: Partial<Batch>): Promise<Batch>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: {
    userId?: number;
    entityType?: string;
    action?: string;
  }): Promise<AuditLog[]>;

  // System Config
  getSystemConfig(key: string): Promise<SystemConfig | undefined>;
  setSystemConfig(config: InsertSystemConfig): Promise<SystemConfig>;
  getAllSystemConfig(): Promise<SystemConfig[]>;
  updateSystemConfig(
    key: string,
    value: any,
    updatedBy: number
  ): Promise<SystemConfig>;
}

// Export types for use in other files
export type {
  User,
  Club,
  Order,
  Batch,
  AuditLog,
  SystemConfig,
  InsertUser,
  InsertClub,
  InsertOrder,
  InsertBatch,
  InsertAuditLog,
  InsertSystemConfig,
};

// Create and export an instance of the RepositoryStorage
export const storage = new RepositoryStorage();
