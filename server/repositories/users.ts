/** @format */

import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../../shared/schema";
import type { User, InsertUser } from "../storage";

/**
 * Repository for user-related database operations
 */
export class UsersRepository {
  /**
   * Get a user by their ID
   * @param id The user ID
   * @returns The user or undefined if not found
   */
  async getById(id: number): Promise<User | undefined> {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return results[0];
  }

  /**
   * Get a user by their email address
   * @param email The user's email address
   * @returns The user or undefined if not found
   */
  async getByEmail(email: string): Promise<User | undefined> {
    const results = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return results[0];
  }

  /**
   * Create a new user
   * @param userData The user data to insert
   * @returns The created user with ID
   */
  async create(userData: Omit<User, "id" | "createdAt">): Promise<User> {
    const results = await db.insert(users).values(userData).returning();
    return results[0];
  }

  /**
   * Update a user's information
   * @param id The user ID
   * @param updates The fields to update
   * @returns The updated user
   */
  async update(id: number, updates: Partial<User>): Promise<User> {
    const results = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();

    if (results.length === 0) {
      throw new Error(`User with ID ${id} not found`);
    }

    return results[0];
  }

  /**
   * Delete a user
   * @param id The user ID
   * @returns True if user was deleted, false otherwise
   */
  async delete(id: number): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, id))
      .returning({ id: users.id });

    return result.length > 0;
  }
}
