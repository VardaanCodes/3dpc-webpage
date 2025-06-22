/** @format */

import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { orders, clubs } from "../../shared/schema";
import type { Order, InsertOrder } from "../storage";

/**
 * Repository for order-related database operations
 */
export class OrdersRepository {
  /**
   * Get an order by its ID
   * @param id The order ID
   * @returns The order or undefined if not found
   */
  async getById(id: number): Promise<Order | undefined> {
    const results = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);
    return results[0];
  }

  /**
   * Get all orders submitted by a specific user
   * @param userId The user ID
   * @returns Array of orders
   */
  async getByUserId(userId: number): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.submittedAt));
  }

  /**
   * Get all orders for a specific club
   * @param clubId The club ID
   * @returns Array of orders
   */
  async getByClubId(clubId: number): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.clubId, clubId))
      .orderBy(desc(orders.submittedAt));
  }

  /**
   * Get all orders with a specific status
   * @param status The order status
   * @returns Array of orders
   */
  async getByStatus(status: string): Promise<Order[]> {
    return await db
      .select()
      .from(orders)
      .where(eq(orders.status, status))
      .orderBy(desc(orders.submittedAt));
  }
  /**
   * Create a new order
   * @param orderData The order data
   * @returns The created order with ID
   */
  async create(orderData: InsertOrder): Promise<Order> {
    // Generate a unique order ID if not provided
    // Format: #<ClubCode><AY><PrintNumber>
    let orderId = "";

    // Try to get club code if clubId is provided
    if (orderData.clubId) {
      const clubResult = await db
        .select({ code: clubs.code })
        .from(clubs)
        .where(eq(clubs.id, orderData.clubId))
        .limit(1);

      if (clubResult.length > 0) {
        const clubCode = clubResult[0].code;
        // Get current academic year (e.g., "23" for 2023-2024)
        const currentYear = new Date().getFullYear();
        const academicYear = String(currentYear).substring(2);

        // Get count of existing orders for this club + year to determine print number
        const orderCount = await db
          .select({ count: sql`count(*)` })
          .from(orders)
          .where(eq(orders.clubId, orderData.clubId));

        const printNumber = (orderCount[0].count as number) + 1;

        // Format: #RC23001 (Robotics Club, 2023, order #1)
        orderId = `#${clubCode}${academicYear}${String(printNumber).padStart(
          3,
          "0"
        )}`;
      }
    }

    // If we couldn't generate a club-specific ID, create a generic one
    if (!orderId) {
      // Format: #GEN23001 (Generic, 2023, sequential number)
      const currentYear = new Date().getFullYear();
      const academicYear = String(currentYear).substring(2);

      const orderCount = await db.select({ count: sql`count(*)` }).from(orders);

      const printNumber = (orderCount[0].count as number) + 1;
      orderId = `#GEN${academicYear}${String(printNumber).padStart(3, "0")}`;
    }

    // Add the generated order ID and timestamps
    const orderWithId = {
      ...orderData,
      orderId,
      submittedAt: new Date(),
      updatedAt: new Date(),
    };

    const results = await db.insert(orders).values(orderWithId).returning();
    return results[0];
  }

  /**
   * Update an order
   * @param id The order ID
   * @param updates The fields to update
   * @returns The updated order
   */
  async update(id: number, updates: Partial<Order>): Promise<Order> {
    // Automatically set the updatedAt timestamp
    const updatedOrder = {
      ...updates,
      updatedAt: new Date(),
    };

    const results = await db
      .update(orders)
      .set(updatedOrder)
      .where(eq(orders.id, id))
      .returning();

    if (results.length === 0) {
      throw new Error(`Order with ID ${id} not found`);
    }

    return results[0];
  }

  /**
   * Delete an order
   * @param id The order ID
   * @returns True if order was deleted, false otherwise
   */
  async delete(id: number): Promise<boolean> {
    const result = await db
      .delete(orders)
      .where(eq(orders.id, id))
      .returning({ id: orders.id });

    return result.length > 0;
  }

  /**
   * Get an order by its order ID (not primary key)
   * @param orderId The unique order ID string
   * @returns The order or undefined if not found
   */
  async getByOrderId(orderId: string): Promise<Order | undefined> {
    const results = await db
      .select()
      .from(orders)
      .where(eq(orders.orderId, orderId))
      .limit(1);
    return results[0];
  }

  /**
   * Get all orders
   * @returns Array of all orders
   */
  async getAll(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.submittedAt));
  }
}
