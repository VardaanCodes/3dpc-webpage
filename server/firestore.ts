/** @format */

import admin from "firebase-admin";
import {
  FieldValue,
  CollectionReference,
  DocumentData,
  Query,
  Timestamp,
} from "firebase-admin/firestore";

// Initialize Firestore
const db = admin.firestore();

// Collection References
export const usersCollection = db.collection("users");
export const ordersCollection = db.collection("orders");
export const batchesCollection = db.collection("batches");
export const auditLogsCollection = db.collection("auditLogs");
export const systemConfigCollection = db.collection("systemConfig");

// Helper functions for Firestore operations
export const firestoreTimestamp = FieldValue.serverTimestamp;

// Firestore Types
export type FirestoreDoc<T = DocumentData> = T & {
  id: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

// Type for query conditions
export type QueryCondition = [string, FirebaseFirestore.WhereFilterOp, any];

export async function getDocumentById<T = DocumentData>(
  collection: CollectionReference<DocumentData>,
  id: string
): Promise<FirestoreDoc<T> | null> {
  try {
    const doc = await collection.doc(id).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() } as FirestoreDoc<T>;
  } catch (error) {
    console.error(`Error getting document ${id}:`, error);
    throw error;
  }
}

export async function createDocument<T = DocumentData>(
  collection: CollectionReference<DocumentData>,
  data: T,
  id: string | null = null
): Promise<string> {
  try {
    const docRef = id ? collection.doc(id) : collection.doc();
    const timestamp = firestoreTimestamp();

    await docRef.set({
      ...data,
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    return docRef.id;
  } catch (error) {
    console.error("Error creating document:", error);
    throw error;
  }
}

export async function updateDocument<T = DocumentData>(
  collection: CollectionReference<DocumentData>,
  id: string,
  data: Partial<T>
): Promise<boolean> {
  try {
    const docRef = collection.doc(id);
    await docRef.update({
      ...data,
      updatedAt: firestoreTimestamp(),
    });
    return true;
  } catch (error) {
    console.error(`Error updating document ${id}:`, error);
    throw error;
  }
}

export async function deleteDocument(
  collection: CollectionReference<DocumentData>,
  id: string
): Promise<boolean> {
  try {
    await collection.doc(id).delete();
    return true;
  } catch (error) {
    console.error(`Error deleting document ${id}:`, error);
    throw error;
  }
}

export async function queryDocuments<T = DocumentData>(
  collection: CollectionReference<DocumentData>,
  conditions: QueryCondition[] = [],
  orderBy: [string, "asc" | "desc"] | string | null = null,
  limit: number | null = null
): Promise<FirestoreDoc<T>[]> {
  try {
    let query: Query<DocumentData> = collection;

    // Apply conditions (where clauses)
    conditions.forEach((condition) => {
      const [field, operator, value] = condition;
      query = query.where(field, operator, value);
    });

    // Apply orderBy if provided
    if (orderBy) {
      const [field, direction = "asc"] = Array.isArray(orderBy)
        ? orderBy
        : [orderBy, "asc"];
      query = query.orderBy(field, direction);
    }

    // Apply limit if provided
    if (limit) {
      query = query.limit(limit);
    }

    const snapshot = await query.get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as FirestoreDoc<T>[];
  } catch (error) {
    console.error("Error querying documents:", error);
    throw error;
  }
}
