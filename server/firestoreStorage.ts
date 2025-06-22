/** @format */

import { IStorage } from "./storage";
import {
  firestoreTimestamp,
  usersCollection,
  ordersCollection,
  batchesCollection,
  auditLogsCollection,
  systemConfigCollection,
} from "./firestore";

/**
 * Implementation of the Storage interface using Firebase Firestore
 */
export class FirestoreStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    try {
      const querySnapshot = await usersCollection
        .where("id", "==", id)
        .limit(1)
        .get();
      if (querySnapshot.empty) {
        return undefined;
      }

      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as User;
    } catch (error) {
      console.error(`Error getting user ${id}:`, error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const querySnapshot = await usersCollection
        .where("email", "==", email)
        .limit(1)
        .get();
      if (querySnapshot.empty) {
        return undefined;
      }

      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as User;
    } catch (error) {
      console.error(`Error getting user by email ${email}:`, error);
      throw error;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const userData = {
        ...user,
        createdAt: firestoreTimestamp(),
        lastLogin: firestoreTimestamp(),
      };

      const docRef = await usersCollection.add(userData);
      const newUser = { id: docRef.id, ...userData } as User;

      // Log the creation
      await this.createAuditLog({
        userId: parseInt(docRef.id),
        action: "CREATE",
        entityType: "USER",
        entityId: docRef.id,
        details: `User ${user.email} created`,
      });

      return newUser;
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    try {
      const querySnapshot = await usersCollection
        .where("id", "==", id)
        .limit(1)
        .get();
      if (querySnapshot.empty) {
        throw new Error(`User with ID ${id} not found`);
      }

      const docRef = querySnapshot.docs[0].ref;

      const updateData = {
        ...updates,
        updatedAt: firestoreTimestamp(),
      };

      await docRef.update(updateData);

      // Get the updated user
      const updatedDoc = await docRef.get();
      const updatedUser = { id: updatedDoc.id, ...updatedDoc.data() } as User;

      // Log the update
      await this.createAuditLog({
        userId: id,
        action: "UPDATE",
        entityType: "USER",
        entityId: docRef.id,
        details: `User ${id} updated: ${Object.keys(updates).join(", ")}`,
      });

      return updatedUser;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  }

  // Clubs
  async getAllClubs(): Promise<Club[]> {
    try {
      const querySnapshot = await clubsCollection.get();
      return querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Club)
      );
    } catch (error) {
      console.error("Error getting all clubs:", error);
      throw error;
    }
  }

  async getClub(id: number): Promise<Club | undefined> {
    try {
      const querySnapshot = await clubsCollection
        .where("id", "==", id)
        .limit(1)
        .get();
      if (querySnapshot.empty) {
        return undefined;
      }

      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Club;
    } catch (error) {
      console.error(`Error getting club ${id}:`, error);
      throw error;
    }
  }

  async getClubByCode(code: string): Promise<Club | undefined> {
    try {
      const querySnapshot = await clubsCollection
        .where("code", "==", code)
        .limit(1)
        .get();
      if (querySnapshot.empty) {
        return undefined;
      }

      const doc = querySnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Club;
    } catch (error) {
      console.error(`Error getting club by code ${code}:`, error);
      throw error;
    }
  }

  async createClub(club: InsertClub): Promise<Club> {
    try {
      const clubData = {
        ...club,
        createdAt: firestoreTimestamp(),
      };

      const docRef = await clubsCollection.add(clubData);
      return { id: docRef.id, ...clubData } as Club;
    } catch (error) {
      console.error("Error creating club:", error);
      throw error;
    }
  }

  async searchClubs(query: string): Promise<Club[]> {
    try {
      // Firestore doesn't support direct text search,
      // so we'll need to implement a more complex solution in a real app
      // For now, we'll just get all clubs and filter
      const querySnapshot = await clubsCollection.get();

      const clubs = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as Club)
      );

      // Simple client-side filtering - this should be improved for production
      return clubs.filter(
        (club) =>
          club.name.toLowerCase().includes(query.toLowerCase()) ||
          club.code.toLowerCase().includes(query.toLowerCase())
      );
    } catch (error) {
      console.error(`Error searching clubs with query ${query}:`, error);
      throw error;
    }
  }

  // Orders implementation would go here...
  // Batches implementation would go here...

  // Audit Logs
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    try {
      const logData = {
        ...log,
        timestamp: firestoreTimestamp(),
      };

      const docRef = await auditLogsCollection.add(logData);
      return { id: docRef.id, ...logData } as AuditLog;
    } catch (error) {
      console.error("Error creating audit log:", error);
      throw error;
    }
  }

  async getAuditLogs(filters?: {
    userId?: number;
    entityType?: string;
    action?: string;
  }): Promise<AuditLog[]> {
    try {
      let query = auditLogsCollection.orderBy("timestamp", "desc");

      if (filters?.userId) {
        query = query.where("userId", "==", filters.userId);
      }

      if (filters?.entityType) {
        query = query.where("entityType", "==", filters.entityType);
      }

      if (filters?.action) {
        query = query.where("action", "==", filters.action);
      }

      const querySnapshot = await query.get();
      return querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as AuditLog)
      );
    } catch (error) {
      console.error("Error getting audit logs:", error);
      throw error;
    }
  }

  // System Config
  async getSystemConfig(key: string): Promise<SystemConfig | undefined> {
    try {
      const doc = await systemConfigCollection.doc(key).get();
      if (!doc.exists) {
        return undefined;
      }

      return { id: doc.id, ...doc.data() } as SystemConfig;
    } catch (error) {
      console.error(`Error getting system config ${key}:`, error);
      throw error;
    }
  }

  async setSystemConfig(config: InsertSystemConfig): Promise<SystemConfig> {
    try {
      const key = config.key;
      await systemConfigCollection.doc(key).set({
        ...config,
        updatedAt: firestoreTimestamp(),
      });

      const doc = await systemConfigCollection.doc(key).get();
      return { id: doc.id, ...doc.data() } as SystemConfig;
    } catch (error) {
      console.error(`Error setting system config ${config.key}:`, error);
      throw error;
    }
  }

  async getAllSystemConfig(): Promise<SystemConfig[]> {
    try {
      const querySnapshot = await systemConfigCollection.get();
      return querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as SystemConfig)
      );
    } catch (error) {
      console.error("Error getting all system configs:", error);
      throw error;
    }
  }
}
