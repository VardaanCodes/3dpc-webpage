import { 
  users, clubs, orders, batches, auditLogs, systemConfig,
  type User, type InsertUser,
  type Club, type InsertClub,
  type Order, type InsertOrder,
  type Batch, type InsertBatch,
  type AuditLog, type InsertAuditLog,
  type SystemConfig, type InsertSystemConfig
} from "@shared/schema";

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
  
  // Orders
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByOrderId(orderId: string): Promise<Order | undefined>;
  getUserOrders(userId: number): Promise<Order[]>;
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
  getAuditLogs(filters?: { userId?: number; entityType?: string; action?: string }): Promise<AuditLog[]>;
  
  // System Config
  getSystemConfig(key: string): Promise<SystemConfig | undefined>;
  setSystemConfig(config: InsertSystemConfig): Promise<SystemConfig>;
  getAllSystemConfig(): Promise<SystemConfig[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private clubs: Map<number, Club> = new Map();
  private orders: Map<number, Order> = new Map();
  private batches: Map<number, Batch> = new Map();
  private auditLogs: Map<number, AuditLog> = new Map();
  private systemConfigs: Map<string, SystemConfig> = new Map();
  
  private currentUserId = 1;
  private currentClubId = 1;
  private currentOrderId = 1;
  private currentBatchId = 1;
  private currentAuditLogId = 1;
  private currentSystemConfigId = 1;
  private currentOrderNumber = 1;

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed clubs
    const defaultClubs = [
      { name: "Robotics Club", code: "RC", contactEmail: "robotics@college.edu", isActive: true },
      { name: "Engineering Club", code: "EC", contactEmail: "engineering@college.edu", isActive: true },
      { name: "Maker Space", code: "MS", contactEmail: "makerspace@college.edu", isActive: true },
      { name: "Computer Science Society", code: "CSS", contactEmail: "css@college.edu", isActive: true },
    ];

    defaultClubs.forEach(club => {
      const id = this.currentClubId++;
      this.clubs.set(id, { 
        ...club, 
        id, 
        createdAt: new Date() 
      });
    });

    // Seed system config
    const defaultConfigs = [
      { key: "file_upload_limit", value: 10, description: "Maximum files per user per period" },
      { key: "file_retention_days", value: 90, description: "Days to retain uploaded files" },
      { key: "max_file_size_mb", value: 50, description: "Maximum file size in MB" },
      { key: "allowed_file_types", value: [".stl", ".gcode"], description: "Allowed file extensions" },
    ];

    defaultConfigs.forEach(config => {
      const id = this.currentSystemConfigId++;
      this.systemConfigs.set(config.key, {
        ...config,
        id,
        updatedBy: null,
        updatedAt: new Date()
      });
    });
  }

  // Users
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = {
      ...insertUser,
      id,
      lastLogin: new Date(),
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Clubs
  async getAllClubs(): Promise<Club[]> {
    return Array.from(this.clubs.values()).filter(club => club.isActive);
  }

  async getClub(id: number): Promise<Club | undefined> {
    return this.clubs.get(id);
  }

  async getClubByCode(code: string): Promise<Club | undefined> {
    return Array.from(this.clubs.values()).find(club => club.code === code);
  }

  async createClub(insertClub: InsertClub): Promise<Club> {
    const id = this.currentClubId++;
    const club: Club = {
      ...insertClub,
      id,
      createdAt: new Date(),
    };
    this.clubs.set(id, club);
    return club;
  }

  async searchClubs(query: string): Promise<Club[]> {
    const clubs = Array.from(this.clubs.values()).filter(club => 
      club.isActive && 
      club.name.toLowerCase().includes(query.toLowerCase())
    );
    return clubs;
  }

  // Orders
  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrderByOrderId(orderId: string): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find(order => order.orderId === orderId);
  }

  async getUserOrders(userId: number): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(order => order.userId === userId)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values())
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(order => order.status === status)
      .sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = this.currentOrderId++;
    const club = insertOrder.clubId ? this.clubs.get(insertOrder.clubId) : null;
    const clubCode = club?.code || "XX";
    const currentYear = new Date().getFullYear().toString().slice(-2);
    const orderNumber = this.currentOrderNumber++;
    const orderId = `#${clubCode}${currentYear}${orderNumber.toString().padStart(3, '0')}`;
    
    const order: Order = {
      ...insertOrder,
      id,
      orderId,
      submittedAt: new Date(),
      updatedAt: new Date(),
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrder(id: number, updates: Partial<Order>): Promise<Order> {
    const order = this.orders.get(id);
    if (!order) throw new Error("Order not found");
    
    const updatedOrder = { 
      ...order, 
      ...updates, 
      updatedAt: new Date() 
    };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  // Batches
  async getBatch(id: number): Promise<Batch | undefined> {
    return this.batches.get(id);
  }

  async getAllBatches(): Promise<Batch[]> {
    return Array.from(this.batches.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getBatchesByStatus(status: string): Promise<Batch[]> {
    return Array.from(this.batches.values())
      .filter(batch => batch.status === status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createBatch(insertBatch: InsertBatch): Promise<Batch> {
    const id = this.currentBatchId++;
    const batchNumber = `BATCH${Date.now()}`;
    
    const batch: Batch = {
      ...insertBatch,
      id,
      batchNumber,
      createdAt: new Date(),
    };
    this.batches.set(id, batch);
    return batch;
  }

  async updateBatch(id: number, updates: Partial<Batch>): Promise<Batch> {
    const batch = this.batches.get(id);
    if (!batch) throw new Error("Batch not found");
    
    const updatedBatch = { ...batch, ...updates };
    this.batches.set(id, updatedBatch);
    return updatedBatch;
  }

  // Audit Logs
  async createAuditLog(insertLog: InsertAuditLog): Promise<AuditLog> {
    const id = this.currentAuditLogId++;
    const log: AuditLog = {
      ...insertLog,
      id,
      timestamp: new Date(),
    };
    this.auditLogs.set(id, log);
    return log;
  }

  async getAuditLogs(filters?: { userId?: number; entityType?: string; action?: string }): Promise<AuditLog[]> {
    let logs = Array.from(this.auditLogs.values());
    
    if (filters) {
      if (filters.userId) logs = logs.filter(log => log.userId === filters.userId);
      if (filters.entityType) logs = logs.filter(log => log.entityType === filters.entityType);
      if (filters.action) logs = logs.filter(log => log.action === filters.action);
    }
    
    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // System Config
  async getSystemConfig(key: string): Promise<SystemConfig | undefined> {
    return this.systemConfigs.get(key);
  }

  async setSystemConfig(insertConfig: InsertSystemConfig): Promise<SystemConfig> {
    const existing = this.systemConfigs.get(insertConfig.key);
    const id = existing?.id || this.currentSystemConfigId++;
    
    const config: SystemConfig = {
      ...insertConfig,
      id,
      updatedAt: new Date(),
    };
    this.systemConfigs.set(insertConfig.key, config);
    return config;
  }

  async getAllSystemConfig(): Promise<SystemConfig[]> {
    return Array.from(this.systemConfigs.values());
  }
}

export const storage = new MemStorage();
