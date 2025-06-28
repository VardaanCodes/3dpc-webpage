# 3DPC Website Development Roadmap

This document outlines the remaining features and tasks required to complete the 3DPC Print Queue Management Website, based on the initial PRD and current implementation status.

---

## ✅ Critical Issues Resolved (Priority 0)

### ✅ Admin API Endpoints in Netlify Function
**Status:** ✅ **RESOLVED**
- The Netlify serverless function (`netlify/functions/server/server.js`) has all required admin PATCH endpoints
- Available endpoints include:
  - ✅ `PATCH /api/orders/:id` (order updates)
  - ✅ `PATCH /api/orders/:id/status` (status updates)
  - ✅ `PATCH /api/batches/:id` (batch updates)
  - ✅ `PATCH /api/users/:id` (user updates)

### ✅ Frontend File Upload Connected to Backend
**Status:** ✅ **RESOLVED**  
- The `FileUpload` component auto-uploads files to `/api/files/upload` when added
- Files are properly uploaded to Netlify Blobs with metadata stored in database
- `SubmitPrint` component correctly handles uploaded file metadata and prevents submission until uploads complete

---

## ✅ Priority 1: Complete Netlify Blobs File Upload Integration

### ✅ 1.1. Frontend Implementation (`SubmitPrint.tsx`) 

-   **Objective:** Connect the file upload component to the backend API and associate uploaded files with a print request.
-   **Tasks:**
    1.  ✅ **Create a File Upload API Service:** Backend endpoint `/api/files/upload` exists and is functional
    2.  ✅ **Integrate with `FileUpload` Component:** The `FileUpload` component auto-uploads files when added via the `uploadFile` function
    3.  ✅ **Manage Upload State:**
        -   ✅ Track the upload progress for each file (uploading, completed, error)
        -   ✅ Display progress indicators and error messages within the `FileUpload` component
    4.  ✅ **Store Uploaded File Metadata:** File metadata including `uploadedFileId` is stored in component state
    5.  ✅ **Modify Order Submission:** `SubmitPrint` includes uploaded file metadata in the payload sent to `/api/orders` and prevents submission until uploads complete

### 1.2. Backend Implementation (API Routes & Services) ✅

-   **Objective:** Create the necessary API endpoints to handle file uploads and link them to orders.
-   **Tasks:**
    1.  ✅ **Create File Upload Endpoint:**
        -   ✅ Implement a new `POST /api/files/upload` route.
        -   ✅ Use `multer` to process `multipart/form-data` requests and handle the file stream in memory.
        -   ✅ In the route handler, use the `netlifyBlobsService` to upload the file buffer to Netlify Blobs.
        -   ✅ After a successful upload, store the file's metadata in the `files` table using the `FilesRepository`.
        -   ✅ Return the newly created file metadata to the client.
    2.  ✅ **Update Order Creation Logic:**
        -   ✅ Modify the `POST /api/orders` endpoint to accept an array of file IDs in its request body.
        -   ✅ When a new order is created, associate the provided file IDs with the order by updating the `files` JSONB column in the `orders` table.

### 1.3. File Viewing and Downloading ✅

-   **Objective:** Ensure users can view and download files associated with their orders.
-   **Tasks:**
    1.  ✅ **Verify `OrderDetailsDialog.tsx`:** The dialog correctly fetches and displays the list of files from the order's `files` array.
    2.  ✅ **Implement Secure Downloads:**
        -   ✅ Download links in the dialog point to the correct backend endpoint (`/api/files/:id/download`).
        -   ✅ The backend route includes permission checks to ensure only the order owner or an admin can download the file.
        -   ✅ The route fetches the file from Netlify Blobs and streams it back to the user with the correct `Content-Disposition` and `Content-Type` headers.

---

## ❌ Priority 2: Notification System

-   **Objective:** Implement email notifications for key order status changes.

### ❌ 2.1. Backend Notification Service

-   **Tasks:**
    1.  ❌ **Choose & Configure a Service:** Integrate an email-sending service like **Nodemailer** or a third-party provider (e.g., SendGrid, Resend).
    2.  ❌ **Create a `NotificationService`:** Develop a service class that abstracts the logic for sending different types of emails (e.g., `sendOrderStatusUpdate`, `sendPrintFailureAlert`).
    3.  ❌ **Integrate with Order Logic:** In the `OrdersRepository` or a higher-level service, call the `NotificationService` whenever an order's status is updated (e.g., `APPROVED`, `STARTED`, `FINISHED`, `FAILED`).
    4.  ❌ **Develop Email Templates:** Create simple, clear HTML email templates for each notification type.

### ❌ 2.2. User Preferences

-   **Tasks:**
    1.  ❌ **Implement API Endpoints:** Create `GET` and `PUT` endpoints for `/api/user/notification-preferences` to allow users to manage their settings.
    2.  ❌ **Build Frontend UI:** Add a section in the user's profile or a new settings page where they can toggle different notification types on or off.
    3.  ❌ **Update Notification Service:** The `NotificationService` must check a user's preferences before sending an email.

---

## ❌ Priority 3: Advanced Analytics & Reporting

-   **Objective:** Expand the dashboard capabilities to provide deeper insights into printing operations.

### ❌ 3.1. Backend Data Aggregation

-   **Tasks:**
    1.  ❌ **Develop Advanced SQL Queries:** Create new functions in the repositories to aggregate data for:
        -   Material and color usage statistics.
        -   Print success/failure rates per club or user.
        -   Average print times and queue wait times.
    2.  ❌ **Create New API Endpoints:** Expose this aggregated data through new endpoints (e.g., `/api/stats/materials`, `/api/stats/printer-usage`).

### ❌ 3.2. Frontend Visualization

-   **Tasks:**
    1.  ❌ **Integrate Charts:** Use the existing `recharts` library to add new charts and graphs to the `AdminDashboard` and `SuperAdminDashboard` pages.
    2.  ❌ **Build Analytics Components:** Create new reusable components for displaying key metrics, data tables, and reports.
    3.  ❌ **Implement Report Export:** Add a feature to allow admins to export analytics data as a CSV file.

---

## ⏳ Priority 4: Automated File Cleanup

-   **Objective:** Implement a scheduled task to automatically delete expired files from Netlify Blobs.

### ⏳ 4.1. Create a Scheduled Function

-   **Tasks:**
    1.  ❌ **Define a Netlify Scheduled Function:** Configure a function in `netlify.toml` to run on a schedule (e.g., daily at midnight).
    2.  ✅ **Implement Cleanup Logic:** The `filesRepository.cleanupExpiredFiles()` method exists and can:
        -   ✅ List all blobs in the store.
        -   ✅ For each blob, check its `expiresAt` metadata.
        -   ✅ If the file is expired, delete it from the blob store and remove its reference from the corresponding order in the database.

---

## ⏳ Priority 5: UI/UX Polish & Refinements (Ongoing)

-   **Objective:** Improve the overall user experience and application stability.

### ⏳ 5.1. Frontend Enhancements

-   **Tasks:**
    1.  ⏳ **Granular Loading States:** Add more specific loading indicators (e.g., skeleton loaders for tables and cards) to reduce perceived wait times.
    2.  ⏳ **Improved Error Handling:** Provide more user-friendly and context-specific error messages for API failures.
    3.  ❌ **Accessibility Audit:** Review the application for accessibility issues (e.g., keyboard navigation, screen reader support, color contrast) and implement fixes.
    4.  ❌ **User Profile Page:** Create a dedicated page where users can view their profile information and manage settings.

---

## 📊 Implementation Status Summary

### ✅ **COMPLETED (Major Features)**
- **File Upload System**: Complete Netlify Blobs integration with frontend upload, progress tracking, and backend storage
- **Admin API Endpoints**: All CRUD operations for orders, batches, and users are implemented in both dev server and Netlify function
- **Order Management**: Full order lifecycle from submission to completion with file associations
- **User Management**: Role-based access control (USER, ADMIN, SUPERADMIN) with proper authentication
- **Batch Management**: Grouping orders into batches for efficient processing
- **File Security**: Secure file downloads with permission checks and expiration handling

### ⏳ **IN PROGRESS**
- **UI/UX Improvements**: Loading states and error handling enhancements
- **File Cleanup Scheduling**: Logic exists, needs Netlify scheduled function configuration

### ❌ **PENDING IMPLEMENTATION**
- **Notification System**: Email notifications for order status changes
- **Advanced Analytics**: Detailed reporting and data visualization
- **User Profile Page**: Settings and notification preferences
- **Accessibility Audit**: WCAG compliance review and fixes

### 🎯 **Next Priority Actions**
1. **Implement Notification System** - Critical for user experience
2. **Create User Profile Page** - Enable notification preferences management
3. **Set up Netlify Scheduled Function** - Automate file cleanup
4. **Add Advanced Analytics** - Provide deeper insights for admins

---

**Last Updated:** June 28, 2025  
**Overall Progress:** ~70% Complete (Core functionality fully operational)
