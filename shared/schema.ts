/** @format */

import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  photoURL: text("photo_url"),
  role: text("role").notNull().default("USER"), // USER, ADMIN, SUPERADMIN, GUEST
  suspended: boolean("suspended").default(false),
  fileUploadsUsed: integer("file_uploads_used").default(0),
  notificationPreferences: jsonb("notification_preferences").default({}),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clubs = pgTable("clubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(), // e.g., "RC" for Robotics Club
  contactEmail: text("contact_email"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().unique(), // Format: #<ClubCode><AY><PrintNumber>
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  clubId: integer("club_id").references(() => clubs.id),
  projectName: text("project_name").notNull(),
  eventDeadline: timestamp("event_deadline"),
  material: text("material").default("PLA"),
  color: text("color").default("White"),
  providingFilament: boolean("providing_filament").default(false),
  specialInstructions: text("special_instructions"),
  files: jsonb("files").default([]), // Array of file metadata
  status: text("status").notNull().default("submitted"), // submitted, approved, started, finished, failed, cancelled
  batchId: integer("batch_id").references(() => batches.id),
  estimatedCompletionTime: timestamp("estimated_completion_time"),
  actualCompletionTime: timestamp("actual_completion_time"),
  failureReason: text("failure_reason"),
  cancellationReason: text("cancellation_reason"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const batches = pgTable("batches", {
  id: serial("id").primaryKey(),
  batchNumber: text("batch_number").notNull().unique(),
  name: text("name"),
  status: text("status").notNull().default("created"), // created, approved, started, finished
  createdById: integer("created_by_id")
    .references(() => users.id)
    .notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  estimatedDuration: integer("estimated_duration_hours"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(), // order, batch, user, system
  entityId: text("entity_id"),
  details: jsonb("details").default({}),
  reason: text("reason"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

export const insertClubSchema = createInsertSchema(clubs).omit({
  id: true,
  createdAt: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  orderId: true,
  submittedAt: true,
  updatedAt: true,
}).extend({
  eventDeadline: z.union([z.string(), z.date()]).optional(),
  estimatedCompletionTime: z.union([z.string(), z.date()]).optional(),
  actualCompletionTime: z.union([z.string(), z.date()]).optional(),
});

export const insertBatchSchema = createInsertSchema(batches).omit({
  id: true,
  batchNumber: true,
  createdAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export const insertSystemConfigSchema = createInsertSchema(systemConfig).omit({
  id: true,
  updatedAt: true,
});

// Select schemas and types
export const selectUserSchema = createSelectSchema(users);
export const selectClubSchema = createSelectSchema(clubs);
export const selectOrderSchema = createSelectSchema(orders).extend({
  eventDeadline: z.union([z.string(), z.date()]).nullable(),
  estimatedCompletionTime: z.union([z.string(), z.date()]).nullable(),
  actualCompletionTime: z.union([z.string(), z.date()]).nullable(),
  submittedAt: z.union([z.string(), z.date()]).nullable(),
  updatedAt: z.union([z.string(), z.date()]).nullable(),
});
export const selectBatchSchema = createSelectSchema(batches);
export const selectAuditLogSchema = createSelectSchema(auditLogs);
export const selectSystemConfigSchema = createSelectSchema(systemConfig);

// Type exports
export type User = z.infer<typeof selectUserSchema>;
export type Club = z.infer<typeof selectClubSchema>;
export type Order = z.infer<typeof selectOrderSchema>;
export type Batch = z.infer<typeof selectBatchSchema>;
export type AuditLog = z.infer<typeof selectAuditLogSchema>;
export type SystemConfig = z.infer<typeof selectSystemConfigSchema>;

// Insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertClub = z.infer<typeof insertClubSchema>;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type InsertBatch = z.infer<typeof insertBatchSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;

// Enums for type safety
export const UserRole = z.enum(["USER", "ADMIN", "SUPERADMIN", "GUEST"]);
export type UserRole = z.infer<typeof UserRole>;

export const OrderStatus = {
  SUBMITTED: "submitted",
  APPROVED: "approved",
  STARTED: "started",
  FINISHED: "finished",
  FAILED: "failed",
  CANCELLED: "cancelled",
} as const;

export const BatchStatus = {
  CREATED: "created",
  APPROVED: "approved",
  STARTED: "started",
  FINISHED: "finished",
} as const;

// Special types for API responses
export type OrderWithDetails = Order & {
  club?: Club;
  user?: User;
  batch?: Batch;
};
