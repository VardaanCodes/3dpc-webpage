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
  role: text("role").notNull().default("USER"),
  suspended: boolean("suspended").default(false),
  fileUploadsUsed: integer("file_uploads_used").default(0),
  notificationPreferences: jsonb("notification_preferences").default({}),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clubs = pgTable("clubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(),
  contactEmail: text("contact_email"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().unique(),
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
  files: jsonb("files").default([]),
  status: text("status").notNull().default("submitted"),
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
  status: text("status").notNull().default("created"),
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
  entityType: text("entity_type").notNull(),
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

export const insertOrderSchema = createInsertSchema(orders)
  .omit({
    id: true,
    orderId: true,
    submittedAt: true,
    updatedAt: true,
  })
  .extend({
    eventDeadline: z
      .union([z.string(), z.date()])
      .optional()
      .nullable()
      .transform((val) => {
        if (!val) return null;
        if (typeof val === "string") {
          const date = new Date(val);
          return isNaN(date.getTime()) ? null : date;
        }
        return val;
      }),
    estimatedCompletionTime: z
      .union([z.string(), z.date()])
      .optional()
      .nullable()
      .transform((val) => {
        if (!val) return null;
        if (typeof val === "string") {
          const date = new Date(val);
          return isNaN(date.getTime()) ? null : date;
        }
        return val;
      }),
    actualCompletionTime: z
      .union([z.string(), z.date()])
      .optional()
      .nullable()
      .transform((val) => {
        if (!val) return null;
        if (typeof val === "string") {
          const date = new Date(val);
          return isNaN(date.getTime()) ? null : date;
        }
        return val;
      }),
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

// Select schemas
export const selectUserSchema = createSelectSchema(users);
export const selectClubSchema = createSelectSchema(clubs);
export const selectOrderSchema = createSelectSchema(orders);
export const selectBatchSchema = createSelectSchema(batches);
export const selectAuditLogSchema = createSelectSchema(auditLogs);
export const selectSystemConfigSchema = createSelectSchema(systemConfig);

// Enums for type safety
export const UserRole = z.enum(["USER", "ADMIN", "SUPERADMIN", "GUEST"]);

export const OrderStatus = {
  SUBMITTED: "submitted",
  APPROVED: "approved",
  STARTED: "started",
  FINISHED: "finished",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

export const BatchStatus = {
  CREATED: "created",
  APPROVED: "approved",
  STARTED: "started",
  FINISHED: "finished",
};
