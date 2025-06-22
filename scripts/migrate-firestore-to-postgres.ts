/** @format */

import * as dotenv from "dotenv";
import { db } from "../server/db";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";

// Load environment variables
dotenv.config();

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  } catch (error) {
    console.error("Firebase admin initialization error", error);
  }
}

const firestore = getFirestore();

/**
 * Migrate users from Firestore to PostgreSQL
 */
async function migrateUsers() {
  console.log("Migrating users...");
  const usersSnapshot = await firestore.collection("users").get();

  if (usersSnapshot.empty) {
    console.log("No users to migrate");
    return;
  }

  console.log(`Found ${usersSnapshot.size} users to migrate`);

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();

    // Check if user already exists in Postgres
    const existingUser = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, userData.email))
      .limit(1);

    if (existingUser.length > 0) {
      console.log(`User ${userData.email} already exists, skipping`);
      continue;
    }

    try {
      // Map Firestore data to PostgreSQL schema
      const newUser = {
        email: userData.email,
        displayName: userData.displayName || userData.email.split("@")[0],
        photoURL: userData.photoURL || null,
        role: userData.role || "USER",
        suspended: userData.suspended || false,
        fileUploadsUsed: userData.fileUploadsUsed || 0,
        notificationPreferences: userData.notificationPreferences || {},
        lastLogin: userData.lastLogin
          ? new Date(userData.lastLogin.toDate())
          : null,
        // Use the Firestore ID as a field to maintain reference
        firebaseId: userDoc.id,
      };

      const [result] = await db
        .insert(schema.users)
        .values(newUser)
        .returning();
      console.log(`Migrated user ${userData.email} with ID ${result.id}`);
    } catch (error) {
      console.error(`Error migrating user ${userData.email}:`, error);
    }
  }
}

/**
 * Migrate clubs from Firestore to PostgreSQL
 */
async function migrateClubs() {
  console.log("Migrating clubs...");
  const clubsSnapshot = await firestore.collection("clubs").get();

  if (clubsSnapshot.empty) {
    console.log("No clubs to migrate");
    return;
  }

  console.log(`Found ${clubsSnapshot.size} clubs to migrate`);

  for (const clubDoc of clubsSnapshot.docs) {
    const clubData = clubDoc.data();

    // Check if club already exists in Postgres
    const existingClub = await db
      .select()
      .from(schema.clubs)
      .where(eq(schema.clubs.name, clubData.name))
      .limit(1);

    if (existingClub.length > 0) {
      console.log(`Club ${clubData.name} already exists, skipping`);
      continue;
    }

    try {
      // Map Firestore data to PostgreSQL schema
      const newClub = {
        name: clubData.name,
        description: clubData.description || null,
        contactEmail: clubData.contactEmail || null,
        logoUrl: clubData.logoUrl || null,
        active: clubData.active !== false, // Default to true if not specified
        // Use the Firestore ID as a field to maintain reference
        firebaseId: clubDoc.id,
      };

      const [result] = await db
        .insert(schema.clubs)
        .values(newClub)
        .returning();
      console.log(`Migrated club ${clubData.name} with ID ${result.id}`);
    } catch (error) {
      console.error(`Error migrating club ${clubData.name}:`, error);
    }
  }
}

/**
 * Migrate orders from Firestore to PostgreSQL
 */
async function migrateOrders() {
  console.log("Migrating orders...");
  const ordersSnapshot = await firestore.collection("orders").get();

  if (ordersSnapshot.empty) {
    console.log("No orders to migrate");
    return;
  }

  console.log(`Found ${ordersSnapshot.size} orders to migrate`);

  // Create a map of Firebase IDs to PostgreSQL IDs
  const userMap = new Map();
  const clubMap = new Map();

  // Get all users
  const users = await db.select().from(schema.users);
  for (const user of users) {
    if ((user as any).firebaseId) {
      userMap.set((user as any).firebaseId, user.id);
    }
  }

  // Get all clubs
  const clubs = await db.select().from(schema.clubs);
  for (const club of clubs) {
    if ((club as any).firebaseId) {
      clubMap.set((club as any).firebaseId, club.id);
    }
  }

  for (const orderDoc of ordersSnapshot.docs) {
    const orderData = orderDoc.data();

    try {
      // Get PostgreSQL IDs for user and club
      const userId = userMap.get(orderData.userId);
      const clubId = clubMap.get(orderData.clubId);

      if (!userId) {
        console.error(`User not found for order ${orderDoc.id}, skipping`);
        continue;
      }

      if (!clubId) {
        console.error(`Club not found for order ${orderDoc.id}, skipping`);
        continue;
      }

      // Map Firestore data to PostgreSQL schema
      const newOrder = {
        userId,
        clubId,
        projectName: orderData.projectName,
        eventDeadline: orderData.eventDeadline
          ? new Date(orderData.eventDeadline.toDate())
          : null,
        status: orderData.status || "SUBMITTED",
        fileUrls: orderData.fileUrls || [],
        material: orderData.material || "PLA",
        color: orderData.color || "DEFAULT",
        specialInstructions: orderData.specialInstructions || null,
        providingFilament: orderData.providingFilament || false,
        submittedAt: orderData.submittedAt
          ? new Date(orderData.submittedAt.toDate())
          : new Date(),
        updatedAt: orderData.updatedAt
          ? new Date(orderData.updatedAt.toDate())
          : new Date(),
        // Use the Firestore ID as a field to maintain reference
        firebaseId: orderDoc.id,
      };

      const [result] = await db
        .insert(schema.orders)
        .values(newOrder)
        .returning();
      console.log(`Migrated order ${orderDoc.id} with ID ${result.id}`);
    } catch (error) {
      console.error(`Error migrating order ${orderDoc.id}:`, error);
    }
  }
}

/**
 * Main migration function
 */
async function migrateData() {
  try {
    console.log("Starting data migration from Firestore to PostgreSQL...");

    // Migrate in order of dependencies
    await migrateUsers();
    await migrateClubs();
    await migrateOrders();
    // Add more migration functions as needed

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run the migration
migrateData();
