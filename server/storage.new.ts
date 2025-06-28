/** @format */

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
} from "../shared/schema";
import { z } from "zod";
import { RepositoryStorage } from "./storage/repositoryStorage";

export type User = z.infer<typeof selectUserSchema>;
export type Club = any;
export type Order = any;
export type Batch = any;
export type AuditLog = any;
export type SystemConfig = any;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertClub = z.infer<typeof insertClubSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertBatch = z.infer<typeof insertBatchSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;

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

// Create and export an instance of the RepositoryStorage
export const storage = new RepositoryStorage();
