/** @format */

import admin from "firebase-admin";
import {
  FieldValue,
  CollectionReference,
  DocumentData,
  Query,
  Timestamp,
} from "firebase-admin/firestore";

// Helper function to get Firestore instance safely
export const getFirestore = () => {
  if (!admin.apps.length) {
    throw new Error("Firebase Admin SDK not initialized");
  }
  return admin.firestore();
};

// Helper function to check if Firebase is available
export const isFirebaseAvailable = () => {
  try {
    return admin.apps.length > 0;
  } catch {
    return false;
  }
};

// Collection getter functions that check Firebase availability
export const getUsersCollection = (): CollectionReference<DocumentData> => {
  return getFirestore().collection("users");
};

export const getOrdersCollection = (): CollectionReference<DocumentData> => {
  return getFirestore().collection("orders");
};

export const getBatchesCollection = (): CollectionReference<DocumentData> => {
  return getFirestore().collection("batches");
};

export const getAuditLogsCollection = (): CollectionReference<DocumentData> => {
  return getFirestore().collection("auditLogs");
};

export const getSystemConfigCollection =
  (): CollectionReference<DocumentData> => {
    return getFirestore().collection("systemConfig");
  };

// Legacy exports for backward compatibility (will throw if Firebase not available)
export const usersCollection = new Proxy(
  {} as CollectionReference<DocumentData>,
  {
    get(target, prop) {
      return getUsersCollection()[
        prop as keyof CollectionReference<DocumentData>
      ];
    },
  }
);

export const ordersCollection = new Proxy(
  {} as CollectionReference<DocumentData>,
  {
    get(target, prop) {
      return getOrdersCollection()[
        prop as keyof CollectionReference<DocumentData>
      ];
    },
  }
);

export const batchesCollection = new Proxy(
  {} as CollectionReference<DocumentData>,
  {
    get(target, prop) {
      return getBatchesCollection()[
        prop as keyof CollectionReference<DocumentData>
      ];
    },
  }
);

export const auditLogsCollection = new Proxy(
  {} as CollectionReference<DocumentData>,
  {
    get(target, prop) {
      return getAuditLogsCollection()[
        prop as keyof CollectionReference<DocumentData>
      ];
    },
  }
);

export const systemConfigCollection = new Proxy(
  {} as CollectionReference<DocumentData>,
  {
    get(target, prop) {
      return getSystemConfigCollection()[
        prop as keyof CollectionReference<DocumentData>
      ];
    },
  }
);

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
