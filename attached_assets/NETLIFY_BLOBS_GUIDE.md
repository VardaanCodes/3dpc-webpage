<!-- @format -->

# Netlify Blobs Integration Guide

This guide explains how to use Netlify Blobs for file storage in conjunction with a PostgreSQL database for the 3DPC Print Queue Management Website.

## Overview

In our hybrid approach:

- Netlify Blobs handles the actual file storage (STL files, GCode files, etc.)
- PostgreSQL database stores metadata about the files (references, ownership, etc.)

This approach gives us the benefits of both systems:

- Efficient binary file storage with Netlify Blobs
- Queryable and relational file metadata with PostgreSQL

## Setting Up Netlify Blobs

Netlify Blobs is already configured in the project. The implementation is in `server/netlifyBlobs.ts`. The service is designed to:

1. Store files uploaded by users
2. Generate secure URLs for downloading files
3. Support file deletion when no longer needed
4. Handle file metadata storage in the database

## Database Schema for File Metadata

The database schema includes tables that reference files stored in Netlify Blobs:

```typescript
// In shared/schema.ts
export const orderFiles = pgTable("order_files", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, {
    onDelete: "cascade",
  }),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  contentType: text("content_type").notNull(),
  blobKey: text("blob_key").notNull(), // Key in Netlify Blobs
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});
```

## File Upload Implementation

Here's how to implement file uploads with Netlify Blobs and PostgreSQL:

1. Create a repository for file operations:

```typescript
// server/repositories/files.ts
import { eq } from "drizzle-orm";
import { db } from "../db";
import { orderFiles } from "../../shared/schema";

export class FilesRepository {
  async createFileRecord(fileData) {
    const results = await db.insert(orderFiles).values(fileData).returning();
    return results[0];
  }

  async getFilesByOrderId(orderId) {
    return await db
      .select()
      .from(orderFiles)
      .where(eq(orderFiles.orderId, orderId));
  }

  async deleteFile(id) {
    const result = await db
      .delete(orderFiles)
      .where(eq(orderFiles.id, id))
      .returning({ blobKey: orderFiles.blobKey });

    return result[0]?.blobKey;
  }
}
```

2. Create a service that combines Netlify Blobs with database operations:

```typescript
// server/services/fileService.ts
import { NetlifyBlobsService } from "../netlifyBlobs";
import { FilesRepository } from "../repositories/files";

export class FileService {
  private blobsService: NetlifyBlobsService;
  private filesRepository: FilesRepository;

  constructor() {
    this.blobsService = new NetlifyBlobsService();
    this.filesRepository = new FilesRepository();
  }

  async uploadFile(file, orderId) {
    // 1. Upload the file to Netlify Blobs
    const blobKey = `orders/${orderId}/${file.name}`;
    await this.blobsService.uploadFile(blobKey, file.buffer, file.mimetype);

    // 2. Store file metadata in the database
    const fileRecord = await this.filesRepository.createFileRecord({
      orderId,
      fileName: file.name,
      fileSize: file.size,
      contentType: file.mimetype,
      blobKey,
    });

    return fileRecord;
  }

  async getFilesByOrderId(orderId) {
    const files = await this.filesRepository.getFilesByOrderId(orderId);

    // Generate temporary download URLs for each file
    return Promise.all(
      files.map(async (file) => {
        const downloadUrl = await this.blobsService.getDownloadUrl(
          file.blobKey
        );
        return {
          ...file,
          downloadUrl,
        };
      })
    );
  }

  async deleteFile(fileId) {
    // 1. Get the blob key from the database
    const blobKey = await this.filesRepository.deleteFile(fileId);

    if (!blobKey) {
      throw new Error("File not found");
    }

    // 2. Delete the file from Netlify Blobs
    await this.blobsService.deleteFile(blobKey);

    return true;
  }
}
```

## API Routes for File Operations

Implement API routes that use the file service:

```typescript
// server/routes/files.ts
import express from "express";
import multer from "multer";
import { FileService } from "../services/fileService";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const fileService = new FileService();

// Upload a file for an order
router.post(
  "/orders/:orderId/files",
  upload.single("file"),
  async (req, res) => {
    try {
      const orderId = parseInt(req.params.orderId);
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const fileRecord = await fileService.uploadFile(file, orderId);
      return res.status(201).json(fileRecord);
    } catch (error) {
      console.error("Error uploading file:", error);
      return res.status(500).json({ error: "File upload failed" });
    }
  }
);

// Get all files for an order
router.get("/orders/:orderId/files", async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId);
    const files = await fileService.getFilesByOrderId(orderId);
    return res.json(files);
  } catch (error) {
    console.error("Error getting files:", error);
    return res.status(500).json({ error: "Failed to retrieve files" });
  }
});

// Delete a file
router.delete("/files/:fileId", async (req, res) => {
  try {
    const fileId = parseInt(req.params.fileId);
    await fileService.deleteFile(fileId);
    return res.status(204).send();
  } catch (error) {
    console.error("Error deleting file:", error);
    return res.status(500).json({ error: "Failed to delete file" });
  }
});

export default router;
```

## Client-Side File Upload Component

Here's an example of how to implement a file upload component in React:

```tsx
// client/src/components/FileUpload.tsx
import React, { useState } from "react";
import { Button } from "./ui/button";
import { Alert } from "./ui/alert";
import { Progress } from "./ui/progress";
import { useParams } from "react-router-dom";
import axios from "axios";

export function FileUpload() {
  const { orderId } = useParams();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      await axios.post(`/api/orders/${orderId}/files`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1)
          );
          setProgress(percentCompleted);
        },
      });

      setSuccess(true);
      setFile(null);
      // Optionally refresh file list here
    } catch (err) {
      setError("Upload failed. Please try again.");
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-4">
        <input
          type="file"
          id="file-upload"
          accept=".stl,.gcode"
          onChange={handleFileChange}
          disabled={uploading}
          className="sr-only"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer px-4 py-2 border rounded-md bg-gray-100 hover:bg-gray-200"
        >
          Select File
        </label>
        <span className="text-sm text-gray-600">
          {file ? file.name : "No file selected"}
        </span>
        <Button onClick={handleUpload} disabled={!file || uploading}>
          Upload
        </Button>
      </div>

      {uploading && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-gray-600">{progress}% complete</p>
        </div>
      )}

      {error && <Alert variant="destructive">{error}</Alert>}

      {success && <Alert variant="success">File uploaded successfully!</Alert>}
    </div>
  );
}
```

## Best Practices

1. **Security**:

   - Always validate file types and sizes before uploading
   - Use authentication and authorization for file access
   - Set appropriate expiration times for download URLs

2. **Performance**:

   - Use stream processing for large files
   - Implement chunked uploads for very large files
   - Consider implementing a CDN for frequently accessed files

3. **Maintenance**:

   - Implement a cleanup job to remove orphaned files
   - Monitor storage usage to avoid hitting limits
   - Create backups of critical files

4. **User Experience**:
   - Show upload progress to users
   - Allow cancellation of uploads
   - Provide clear error messages for failed uploads

## Conclusion

This hybrid approach leverages the strengths of both Netlify Blobs and PostgreSQL:

- Netlify Blobs efficiently handles binary file storage
- PostgreSQL provides robust querying capabilities for file metadata

By combining these technologies, we create a scalable and maintainable file storage solution for the 3DPC Print Queue Management Website.
