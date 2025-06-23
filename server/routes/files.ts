/** @format */

import express, { Request, Response, NextFunction } from "express";
import multer from "multer";
import { netlifyBlobsService } from "../netlifyBlobs";
import { FilesRepository } from "../repositories/files";
import admin from "firebase-admin";
import { auditLogsCollection, ordersCollection } from "../firestore";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { users, orders } from "../../shared/schema";

const router = express.Router();
const filesRepository = new FilesRepository();

// Set up multer for in-memory file storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB limit
  },
  fileFilter: (req, file, cb) => {
    // Check allowed file types
    const allowedTypes = [
      "application/vnd.ms-pki.stl",
      "application/object",
      "model/stl",
      "model/obj",
    ];
    const allowedExtensions = [".stl", ".obj"];

    const fileExt = file.originalname.toLowerCase().split(".").pop();

    if (allowedExtensions.includes(`.${fileExt}`)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only STL and OBJ files are allowed."));
    }
  },
});

// Verify authentication middleware
const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);

    // Fetch user from database to get complete user info
    const userResults = await db
      .select()
      .from(users)
      .where(eq(users.email, decodedToken.email!))
      .limit(1);

    if (userResults.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }

    const user = userResults[0];
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      fileUploadsUsed: user.fileUploadsUsed,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ error: "Invalid authentication token" });
  }
};

// Create API routes
router.post(
  "/upload",
  authenticateUser,
  upload.single("file"),
  async (req, res) => {
    try {
      const file = req.file;
      const { email } = req.user as any;
      const { orderId, description } = req.body;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Get user ID from database based on email (Firebase auth UID is not used in postgres)
      const userResult = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (!userResult.length) {
        return res.status(404).json({ error: "User not found" });
      }

      const userDbId = userResult[0].id;

      // Upload file using the repository
      const fileMetadata = await filesRepository.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype || `application/${file.originalname.split(".").pop()}`,
        file.size,
        userDbId,
        orderId ? parseInt(orderId, 10) : undefined
      );

      // Log the upload in audit logs (still using Firestore for now)
      // This will be migrated to PostgreSQL audit logs in the future
      await auditLogsCollection.add({
        userId: email,
        action: "UPLOAD",
        entityType: "FILE",
        entityId: fileMetadata.id,
        details: `File ${fileMetadata.fileName} uploaded${
          orderId ? ` for order ${orderId}` : ""
        }`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.json({
        success: true,
        file: fileMetadata,
      });
    } catch (error: any) {
      console.error("File upload error:", error);
      res
        .status(500)
        .json({ error: "File upload failed", details: error.message });
    }
  }
);

// Get a file
router.get("/files/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Get file metadata first
    const metadata = await filesRepository.getFileMetadata(id);

    if (!metadata) {
      return res.status(404).json({ error: "File not found" });
    }

    // Generate a signed URL for the file that expires in 15 minutes
    const signedUrl = await filesRepository.getSignedUrl(id, 15);

    res.json({
      file: metadata,
      url: signedUrl,
    });
  } catch (error: any) {
    console.error("Error retrieving file:", error);
    res.status(500).json({ error: "Could not retrieve file" });
  }
});

// Delete a file
router.delete("/files/:id", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { email } = req.user as any;

    // Get file metadata first
    const metadata = await filesRepository.getFileMetadata(id);

    if (!metadata) {
      return res.status(404).json({ error: "File not found" });
    }

    // Check if user has permission to delete this file
    // For example, check if it's their file or they have admin role
    // TODO: Implement proper permission checks

    // Delete the file
    const success = await filesRepository.deleteFile(id, metadata.orderId);

    if (!success) {
      return res.status(500).json({ error: "Failed to delete file" });
    }

    // Log the deletion in audit logs (still using Firestore for now)
    await auditLogsCollection.add({
      userId: email,
      action: "DELETE",
      entityType: "FILE",
      entityId: id,
      details: `File ${metadata.fileName} deleted`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error: any) {
    console.error("File deletion error:", error);
    res
      .status(500)
      .json({ error: "File deletion failed", details: error.message });
  }
});

// Download a file
router.get("/files/:id/download", authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, role, id: userId } = req.user as any;

    // Get file metadata first
    const metadata = await filesRepository.getFileMetadata(id);

    if (!metadata) {
      return res.status(404).json({ error: "File not found" });
    }

    // Check if file is associated with an order and verify permissions
    if (metadata.orderId) {
      const orderResult = await db
        .select()
        .from(orders)
        .where(eq(orders.id, metadata.orderId))
        .limit(1);

      if (!orderResult.length) {
        return res.status(404).json({ error: "Associated order not found" });
      }

      const order = orderResult[0];

      // Check if user owns the order or is admin
      if (
        order.userId !== userId &&
        !["ADMIN", "SUPERADMIN"].includes(role?.toUpperCase() || "")
      ) {
        return res.status(403).json({ error: "Access denied" });
      }

      // Check file expiration (default 30 days, configurable)
      if (order.submittedAt) {
        const submittedDate = new Date(order.submittedAt);
        const expiryDate = new Date(submittedDate);
        expiryDate.setDate(expiryDate.getDate() + 30); // TODO: Make configurable

        if (new Date() > expiryDate) {
          return res.status(410).json({
            error: "File has expired and is no longer available for download",
          });
        }
      }
    }

    // Get the file data from Netlify Blobs
    const fileData = await filesRepository.getFileData(id);

    if (!fileData) {
      return res.status(404).json({ error: "File data not found" });
    }

    // Log the download in audit logs
    await auditLogsCollection.add({
      userId: email,
      action: "DOWNLOAD",
      entityType: "FILE",
      entityId: id,
      details: `File ${metadata.fileName} downloaded`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Set headers for file download
    res.setHeader(
      "Content-Type",
      metadata.contentType || "application/octet-stream"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${metadata.fileName}"`
    );
    res.setHeader("Content-Length", metadata.size.toString());

    // Send the file data
    res.send(Buffer.from(fileData));
  } catch (error: any) {
    console.error("File download error:", error);
    res.status(500).json({ error: "Failed to download file" });
  }
});

// List files for an order
router.get("/files/order/:orderId", authenticateUser, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Check permission to access this order's files
    // TODO: Implement proper permission checks

    // Get files for the order
    const files = await filesRepository.getFilesByOrderId(
      parseInt(orderId, 10)
    );

    res.json({
      files,
    });
  } catch (error: any) {
    console.error("Error listing files:", error);
    res.status(500).json({ error: "Could not list files" });
  }
});

export default router;
