/** @format */

import { eq, SQL, ilike } from "drizzle-orm";
import { db } from "../db";
import { clubs } from "../../shared/schema";
import { createSelectSchema } from "drizzle-zod";

// Create a select schema for clubs if not already defined
const selectClubSchema = createSelectSchema(clubs);
export type Club = typeof selectClubSchema._type;

/**
 * Repository for club-related database operations
 */
export class ClubsRepository {
  /**
   * Get a club by its ID
   * @param id The club ID
   * @returns The club or undefined if not found
   */
  async getById(id: number): Promise<Club | undefined> {
    const results = await db
      .select()
      .from(clubs)
      .where(eq(clubs.id, id))
      .limit(1);
    return results[0];
  }

  /**
   * Get a club by its code
   * @param code The club code (e.g., "RC" for Robotics Club)
   * @returns The club or undefined if not found
   */
  async getByCode(code: string): Promise<Club | undefined> {
    const results = await db
      .select()
      .from(clubs)
      .where(eq(clubs.code, code))
      .limit(1);
    return results[0];
  }

  /**
   * Get all clubs
   * @param includeInactive Whether to include inactive clubs (default: false)
   * @returns Array of clubs
   */
  async getAll(includeInactive: boolean = false): Promise<Club[]> {
    if (!includeInactive) {
      return await db.select().from(clubs).where(eq(clubs.isActive, true));
    }

    return await db.select().from(clubs);
  }

  /**
   * Create a new club
   * @param clubData The club data
   * @returns The created club with ID
   */
  async create(clubData: {
    name: string;
    code: string;
    contactEmail?: string;
    isActive?: boolean;
  }): Promise<Club> {
    const results = await db.insert(clubs).values(clubData).returning();
    return results[0];
  }

  /**
   * Update a club
   * @param id The club ID
   * @param updates The fields to update
   * @returns The updated club
   */
  async update(id: number, updates: Partial<Club>): Promise<Club> {
    const results = await db
      .update(clubs)
      .set(updates)
      .where(eq(clubs.id, id))
      .returning();

    if (results.length === 0) {
      throw new Error(`Club with ID ${id} not found`);
    }

    return results[0];
  }

  /**
   * Search for clubs by name
   * @param query The search query
   * @returns Array of matching clubs
   */
  async search(query: string): Promise<Club[]> {
    // Using ILIKE for case-insensitive search
    return await db
      .select()
      .from(clubs)
      .where(ilike(clubs.name, `%${query}%`));
  }
}
