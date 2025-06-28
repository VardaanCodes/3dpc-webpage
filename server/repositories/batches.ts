/** @format */

import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { batches } from "../../shared/schema";
import { createSelectSchema } from "drizzle-zod";

// Create a select schema for batches
const selectBatchSchema = createSelectSchema(batches);
export type Batch = typeof selectBatchSchema._type;

/**
 * Repository for batch-related database operations
 */
export class BatchesRepository {
  /**
   * Get a batch by its ID
   * @param id The batch ID
   * @returns The batch or undefined if not found
   */
  async getById(id: number): Promise<Batch | undefined> {
    const results = await db
      .select()
      .from(batches)
      .where(eq(batches.id, id))
      .limit(1);
    return results[0];
  }

  /**
   * Get a batch by its batch number
   * @param batchNumber The batch number
   * @returns The batch or undefined if not found
   */
  async getByBatchNumber(batchNumber: string): Promise<Batch | undefined> {
    const results = await db
      .select()
      .from(batches)
      .where(eq(batches.batchNumber, batchNumber))
      .limit(1);
    return results[0];
  }

  /**
   * Get all batches
   * @returns Array of all batches
   */
  async getAll(): Promise<Batch[]> {
    return await db.select().from(batches).orderBy(desc(batches.createdAt));
  }

  /**
   * Get batches by status
   * @param status The batch status to filter by
   * @returns Array of batches with the specified status
   */
  async getByStatus(status: string): Promise<Batch[]> {
    return await db
      .select()
      .from(batches)
      .where(eq(batches.status, status))
      .orderBy(desc(batches.createdAt));
  }

  /**
   * Get batches created by a specific user
   * @param createdById The user ID who created the batches
   * @returns Array of batches created by the user
   */
  async getByCreatedBy(createdById: number): Promise<Batch[]> {
    return await db
      .select()
      .from(batches)
      .where(eq(batches.createdById, createdById))
      .orderBy(desc(batches.createdAt));
  }

  /**
   * Create a new batch
   * @param batchData The batch data
   * @returns The created batch with ID
   */
  async create(batchData: {
    batchNumber: string;
    name?: string;
    status?: string;
    createdById: number;
    estimatedDuration?: number;
  }): Promise<Batch> {
    const results = await db.insert(batches).values(batchData).returning();
    return results[0];
  }

  /**
   * Update a batch
   * @param id The batch ID
   * @param updates The fields to update
   * @returns The updated batch
   */
  async update(id: number, updates: Partial<Batch>): Promise<Batch> {
    const results = await db
      .update(batches)
      .set(updates)
      .where(eq(batches.id, id))
      .returning();

    if (results.length === 0) {
      throw new Error(`Batch with ID ${id} not found`);
    }

    return results[0];
  }

  /**
   * Mark a batch as started
   * @param id The batch ID
   * @param startedAt Optional timestamp for when the batch was started (defaults to now)
   * @returns The updated batch
   */
  async markAsStarted(
    id: number,
    startedAt: Date = new Date()
  ): Promise<Batch> {
    const results = await db
      .update(batches)
      .set({
        status: "started",
        startedAt,
      })
      .where(eq(batches.id, id))
      .returning();

    if (results.length === 0) {
      throw new Error(`Batch with ID ${id} not found`);
    }

    return results[0];
  }

  /**
   * Mark a batch as completed
   * @param id The batch ID
   * @param completedAt Optional timestamp for when the batch was completed (defaults to now)
   * @returns The updated batch
   */
  async markAsCompleted(
    id: number,
    completedAt: Date = new Date()
  ): Promise<Batch> {
    const results = await db
      .update(batches)
      .set({
        status: "finished",
        completedAt,
      })
      .where(eq(batches.id, id))
      .returning();

    if (results.length === 0) {
      throw new Error(`Batch with ID ${id} not found`);
    }

    return results[0];
  }

  /**
   * Generate a new batch number
   * @returns A new unique batch number
   */
  async generateBatchNumber(): Promise<string> {
    // Get the current year
    const currentYear = new Date().getFullYear().toString().slice(-2);

    // Find the latest batch for this year
    const latestBatches = await db
      .select()
      .from(batches)
      .where(eq(batches.batchNumber, `BATCH-${currentYear}-%`))
      .orderBy(desc(batches.id))
      .limit(1);

    let batchNumber = 1;

    if (latestBatches.length > 0) {
      const lastBatchNumber = latestBatches[0].batchNumber;
      const matches = lastBatchNumber.match(/BATCH-\d{2}-(\d+)/);

      if (matches && matches[1]) {
        batchNumber = parseInt(matches[1], 10) + 1;
      }
    }

    // Format: BATCH-YY-XXX where YY is the year and XXX is a sequential number
    return `BATCH-${currentYear}-${batchNumber.toString().padStart(3, "0")}`;
  }
}
