/** @format */

import { eq } from "drizzle-orm";
import { db } from "../db";
import { systemConfig } from "../../shared/schema";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Define JSON type for the system config value
type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

// Create a select schema for system config
const selectSystemConfigSchema = createSelectSchema(systemConfig);
type SystemConfigRaw = z.infer<typeof selectSystemConfigSchema>;
export type SystemConfig = Omit<SystemConfigRaw, "value"> & { value: Json };

/**
 * Repository for system configuration
 */
export class SystemConfigRepository {
  /**
   * Get a system configuration value by key
   * @param key The configuration key
   * @returns The configuration object or undefined if not found
   */
  async getByKey(key: string): Promise<SystemConfig | undefined> {
    const results = await db
      .select()
      .from(systemConfig)
      .where(eq(systemConfig.key, key))
      .limit(1);

    return results[0] as SystemConfig | undefined;
  }

  /**
   * Get all system configuration values
   * @returns Array of all system configurations
   */
  async getAll(): Promise<SystemConfig[]> {
    const results = await db.select().from(systemConfig);
    return results as SystemConfig[];
  }

  /**
   * Set a system configuration value
   * If the key exists, it updates the value; otherwise, it creates a new entry
   * @param key The configuration key
   * @param value The configuration value (can be any JSON-serializable value)
   * @param updatedBy The user ID of who updated this value
   * @param description Optional description of what this configuration does
   * @returns The updated or created configuration
   */
  async set(
    key: string,
    value: Json,
    updatedBy: number,
    description?: string
  ): Promise<SystemConfig> {
    const existing = await this.getByKey(key);

    if (existing) {
      // Update existing configuration
      const results = await db
        .update(systemConfig)
        .set({
          value,
          updatedBy,
          updatedAt: new Date(),
        })
        .where(eq(systemConfig.key, key))
        .returning();
      return results[0] as SystemConfig;
    } else {
      // Create new configuration
      const results = await db
        .insert(systemConfig)
        .values({
          key,
          value,
          updatedBy,
          description: description || `Configuration for ${key}`,
        })
        .returning();
      return results[0] as SystemConfig;
    }
  }

  /**
   * Delete a system configuration
   * @param key The configuration key to delete
   * @returns True if deleted, false if not found
   */
  async delete(key: string): Promise<boolean> {
    const result = await db
      .delete(systemConfig)
      .where(eq(systemConfig.key, key))
      .returning({ key: systemConfig.key });
    return result.length > 0;
  }

  /**
   * Bulk set multiple configuration values at once
   * @param configs Array of configuration objects
   * @param updatedBy The user ID of who updated these values
   * @returns Array of updated or created configurations
   */
  async bulkSet(
    configs: Array<{ key: string; value: Json; description?: string }>,
    updatedBy: number
  ): Promise<SystemConfig[]> {
    const results: SystemConfig[] = [];

    // Using a transaction to ensure all updates are atomic
    await db.transaction(async (tx) => {
      for (const config of configs) {
        const existing = await tx
          .select()
          .from(systemConfig)
          .where(eq(systemConfig.key, config.key))
          .limit(1);

        if (existing.length) {
          // Update existing configuration
          const result = await tx
            .update(systemConfig)
            .set({
              value: config.value,
              updatedBy,
              updatedAt: new Date(),
              description: config.description || existing[0].description,
            })
            .where(eq(systemConfig.key, config.key))
            .returning();
          results.push(result[0] as SystemConfig);
        } else {
          // Create new configuration
          const result = await tx
            .insert(systemConfig)
            .values({
              key: config.key,
              value: config.value,
              updatedBy,
              description:
                config.description || `Configuration for ${config.key}`,
            })
            .returning();
          results.push(result[0] as SystemConfig);
        }
      }
    });

    return results;
  }
}
