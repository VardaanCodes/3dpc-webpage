/** @format */

const {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
} = require("drizzle-orm/pg-core");
const { createInsertSchema, createSelectSchema } = require("drizzle-zod");
const { z } = require("zod");

const users = pgTable("users", {
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

const clubs = pgTable("clubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  code: text("code").notNull().unique(), // e.g., "RC" for Robotics Club
  contactEmail: text("contact_email"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

const orders = pgTable("orders", {
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

const batches = pgTable("batches", {
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

const auditLogs = pgTable("audit_logs", {
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

const systemConfig = pgTable("system_config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLogin: true,
});

const insertClubSchema = createInsertSchema(clubs).omit({
  id: true,
  createdAt: true,
});

const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  orderId: true,
  submittedAt: true,
  updatedAt: true,
});

const insertBatchSchema = createInsertSchema(batches).omit({
  id: true,
  batchNumber: true,
  createdAt: true,
});

const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

const insertSystemConfigSchema = createInsertSchema(systemConfig).omit({
  id: true,
  updatedAt: true,
});

// Select schemas
const selectUserSchema = createSelectSchema(users);
const selectClubSchema = createSelectSchema(clubs);
const selectOrderSchema = createSelectSchema(orders);
const selectBatchSchema = createSelectSchema(batches);
const selectAuditLogSchema = createSelectSchema(auditLogs);
const selectSystemConfigSchema = createSelectSchema(systemConfig);

// Enums for type safety
const UserRole = z.enum(["USER", "ADMIN", "SUPERADMIN", "GUEST"]);

const OrderStatus = {
  SUBMITTED: "submitted",
  APPROVED: "approved",
  STARTED: "started",
  FINISHED: "finished",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

const BatchStatus = {
  CREATED: "created",
  APPROVED: "approved",
  STARTED: "started",
  FINISHED: "finished",
};

module.exports = {
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
  UserRole,
  OrderStatus,
  BatchStatus,
};
