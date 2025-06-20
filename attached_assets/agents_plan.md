## Implementation Plan

### Phase 1: Enhance Authentication and Role-Based Access (Completed)
**Step 1.1: Configure Environment & RBAC:**
- Set up `.env` file with `ADMIN_EMAILS` and `SUPERADMIN_EMAILS`
- Updated `client/src/lib/auth.ts` to assign roles (STUDENT, ADMIN, SUPERADMIN) based on email

**Step 1.2: Implement Server-Side Authentication:**
- Installed `firebase-admin` package
- Created `server/firebaseAdmin.ts` to initialize Firebase Admin SDK
- Implemented global auth middleware in `server/index.ts`

**Step 1.3: Update Client-Side Routing & Navigation:**
- Updated `client/src/components/ProtectedRoute.tsx` for role-based routing
- Modified `client/src/components/Navigation.tsx` to conditionally show admin links

---

### Phase 2: Implement Admin and Super Admin Dashboards (Completed)
**Step 2.1: Create Super Admin Page & Route:**
- Created `client/src/pages/SuperAdminDashboard.tsx`
- Added protected route in `client/src/App.tsx`

**Step 2.2: Enhance Admin Dashboard:**
- Updated `client/src/pages/AdminDashboard.tsx` with print queue view
- Added controls for job management (approve/cancel/update)

**Step 2.3: Implement Super Admin Features:**
- SuperAdminDashboard will handle:
  - System configuration (file upload limits)
  - User management (suspensions)
  - Admin role assignments

---

## Upcoming Work
### Phase 3: Backend Development for Core Features
**Step 3.1: Develop Notification Service:**
- Create `server/notifications.ts` with Nodemailer integration
- Add API endpoints for order event notifications

**Step 3.2: Implement Audit Trail:**
- Create `AuditLogs` Firestore collection
- Log administrative actions with timestamps/admin IDs

**Step 3.3: Implement Analytics Collection:**
- Create `Analytics` Firestore collection
- Develop scheduled cloud functions for metrics aggregation

**Step 3.4: Implement File Management Policies:**
- Create `SystemConfig` Firestore collection
- Enhance upload logic with config limits
- Create retention policy cleanup function

---

### Phase 4: Frontend Polish and Feature Completion
**Step 4.1: Enhance Order Submission Form:**
- Update `client/src/pages/SubmitPrint.tsx` with:
  - Club name autocomplete
  - Event deadlines
  - Material/color preferences

**Step 4.2: Implement User-Facing Features:**
- Add "File Limit Odometer" to navigation bar
- Create user profile page for notification preferences

**Step 4.3: Implement Export Functionality:**
- Add CSV export buttons to admin dashboards
- Create backend endpoint for CSV conversion/download
