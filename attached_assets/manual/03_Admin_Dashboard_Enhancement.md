<!-- @format -->

# Admin Dashboard Notification Integration Guide

## Problem Description

The admin dashboard is functional with CRUD operations, filtering, and analytics, but admin order status updates are not yet connected to the notification system. This means when admins update order statuses, users don't receive email notifications about their order progress.

## Prerequisites

- [x] Admin dashboard implemented in `client/src/pages/AdminDashboard.tsx`
- [x] Order management API endpoints functional
- [x] NotificationService class implemented
- [x] Email notification system configured (see `02_Email_Notification_System_Setup.md`)
- [ ] Admin actions connected to notification triggers
- [ ] Bulk operation error handling enhanced
- [ ] Advanced filtering features implemented

## Environment Setup

Ensure email notification system is already configured with:

```env
EMAIL_PROVIDER=resend  # or sendgrid/nodemailer
RESEND_API_KEY=your_api_key
FROM_EMAIL=noreply@yourdomain.com
SITE_URL=https://your-3dpc-site.netlify.app
```

## Implementation Steps

### Step 1: Update Order Status Update Endpoint

Modify the order status update endpoint in `netlify/functions/server/server.js` to trigger notifications:

```javascript
app.patch(
  "/api/orders/:id/status",
  requireAuth,
  requireRole(["ADMIN", "SUPERADMIN"]),
  async (req, res) => {
    try {
      if (!req.user) return res.status(401).json({ message: "Unauthorized" });

      const database = await initializeDatabase();
      const { orders, auditLogs, users } = require("./schema.js");
      const { eq } = require("drizzle-orm");

      const orderId = parseInt(req.params.id);
      const { status, reason } = req.body;

      // Validate status
      const validStatuses = [
        "submitted",
        "approved",
        "started",
        "finished",
        "failed",
        "cancelled",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid order status" });
      }

      // Get current order details
      const currentOrder = await database
        .select()
        .from(orders)
        .where(eq(orders.id, orderId))
        .limit(1);

      if (currentOrder.length === 0) {
        return res.status(404).json({ message: "Order not found" });
      }

      const order = currentOrder[0];
      const previousStatus = order.status;

      // Update the order status
      const updatedOrders = await database
        .update(orders)
        .set({
          status,
          updatedAt: new Date(),
          ...(status === "failed" && reason && { failureReason: reason }),
          ...(status === "cancelled" &&
            reason && { cancellationReason: reason }),
          ...(status === "finished" && { actualCompletionTime: new Date() }),
        })
        .where(eq(orders.id, orderId))
        .returning();

      // Get user details for notification
      const userResult = await database
        .select()
        .from(users)
        .where(eq(users.id, order.userId))
        .limit(1);

      if (userResult.length > 0) {
        const user = userResult[0];

        // Import and use notification service
        const { notificationService } = require("./NotificationService.js");

        // Send notification
        const emailSent = await notificationService.sendOrderStatusUpdate(
          user.email,
          user.displayName,
          {
            orderId: order.orderId,
            projectName: order.projectName,
            status,
            previousStatus,
            reason,
          },
          user.notificationPreferences
        );

        console.log(
          `Notification ${emailSent ? "sent" : "failed"} for order ${
            order.orderId
          }`
        );
      }

      // Create audit log
      await database.insert(auditLogs).values({
        userId: req.user.id,
        action: "order_status_updated",
        entityType: "order",
        entityId: orderId.toString(),
        details: {
          status,
          previousStatus,
          reason,
          notificationSent: emailSent,
        },
        reason: reason || null,
        timestamp: new Date(),
      });

      res.json(updatedOrders[0]);
    } catch (error) {
      console.error("Order status update error:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  }
);
```

### Step 2: Add NotificationService to Netlify Function

Copy the NotificationService to the Netlify function directory:

```javascript
// Create netlify/functions/server/NotificationService.js
// Copy the content from server/services/NotificationService.ts
// Convert TypeScript types to JavaScript equivalents

class NotificationService {
  constructor() {
    this.emailProvider = process.env.EMAIL_PROVIDER || "resend";
    this.apiKey = process.env.RESEND_API_KEY || "";
  }

  async sendOrderStatusUpdate(
    userEmail,
    userName,
    orderDetails,
    preferences = {}
  ) {
    // Copy implementation from TypeScript version
    // ... (implementation details)
  }

  // ... (rest of the methods)
}

module.exports = { notificationService: new NotificationService() };
```

### Step 3: Enhance Bulk Operations with Error Handling

Update the admin dashboard to provide better feedback for bulk operations:

```typescript
// In client/src/pages/AdminDashboard.tsx
const handleBulkStatusUpdate = async (
  orderIds: number[],
  newStatus: string,
  reason?: string
) => {
  setIsLoading(true);
  const results = { success: [], failed: [] };

  try {
    // Process orders individually for better error handling
    for (const orderId of orderIds) {
      try {
        await apiRequest("PATCH", `/api/orders/${orderId}/status`, {
          status: newStatus,
          reason,
        });
        results.success.push(orderId);
      } catch (error) {
        console.error(`Failed to update order ${orderId}:`, error);
        results.failed.push({ orderId, error: error.message });
      }
    }

    // Show detailed results
    if (results.success.length > 0) {
      toast.success(`Successfully updated ${results.success.length} orders`);
    }

    if (results.failed.length > 0) {
      toast.error(
        `Failed to update ${results.failed.length} orders. Check console for details.`
      );
      console.error("Bulk update failures:", results.failed);
    }

    // Refresh the orders list
    await refetch();
  } catch (error) {
    toast.error("Bulk operation failed");
    console.error("Bulk update error:", error);
  } finally {
    setIsLoading(false);
    setSelectedOrders([]);
  }
};
```

### Step 4: Add Advanced Filtering Features

Enhance the admin dashboard with more filtering options:

```typescript
// Add to AdminDashboard.tsx
const [filters, setFilters] = useState({
  status: "",
  club: "",
  dateRange: { start: "", end: "" },
  material: "",
  priority: "",
});

const filteredOrders = useMemo(() => {
  if (!orders) return [];

  return orders.filter((order) => {
    // Status filter
    if (filters.status && order.status !== filters.status) return false;

    // Club filter
    if (filters.club && order.club?.name !== filters.club) return false;

    // Date range filter
    if (filters.dateRange.start) {
      const orderDate = new Date(order.submittedAt);
      const startDate = new Date(filters.dateRange.start);
      if (orderDate < startDate) return false;
    }

    if (filters.dateRange.end) {
      const orderDate = new Date(order.submittedAt);
      const endDate = new Date(filters.dateRange.end);
      if (orderDate > endDate) return false;
    }

    // Material filter
    if (filters.material && order.material !== filters.material) return false;

    return true;
  });
}, [orders, filters]);
```

### Step 5: Add Manual Notification Trigger

Add a manual notification button for admins:

```typescript
// Add to AdminDashboard.tsx
const handleManualNotification = async (order: Order) => {
  try {
    const response = await apiRequest(
      "POST",
      `/api/orders/${order.id}/notify`,
      {
        type: "manual",
        message: "Admin manual notification",
      }
    );

    if (response.ok) {
      toast.success("Notification sent successfully");
    } else {
      toast.error("Failed to send notification");
    }
  } catch (error) {
    console.error("Manual notification error:", error);
    toast.error("Failed to send notification");
  }
};
```

## Testing Instructions

### Local Testing

1. Start the development server: `npm run dev`
2. Login as an admin user
3. Navigate to Admin Dashboard
4. Update an order status and verify:
   - Order status changes in database
   - Console shows notification attempt
   - Email is sent (check logs)

### Production Testing

1. Deploy the updated code
2. Create a test order as a student
3. Update the order status via admin dashboard
4. Verify the student receives email notification
5. Check Netlify function logs for notification status

## Common Issues & Troubleshooting

### Issue 1: NotificationService not found in Netlify function

**Cause**: NotificationService not properly imported or copied
**Solution**:

- Ensure NotificationService.js exists in netlify/functions/server/
- Verify require() path is correct
- Check for any TypeScript conversion errors

### Issue 2: Notifications not triggering on status updates

**Cause**: Missing notification call in status update endpoint
**Solution**:

- Verify the status update endpoint includes notification logic
- Check that email provider environment variables are available
- Test notification service independently

### Issue 3: Bulk operations timing out

**Cause**: Processing too many orders simultaneously
**Solution**:

- Implement batch processing with smaller chunks
- Add timeout handling and retry logic
- Show progress indicators for long operations

### Issue 4: Filter performance issues with large datasets

**Cause**: Client-side filtering of large order lists
**Solution**:

- Implement server-side filtering
- Add pagination for large datasets
- Use database indexes for filtered columns

## Next Steps

After completing this integration:

1. **Implement Advanced Analytics**: Add more detailed reporting and charts
2. **Add User Assignment**: Allow admins to assign orders to specific team members
3. **Implement Order Comments**: Add comment system for admin-student communication
4. **Add Notification Templates**: Allow admins to customize notification messages
5. **Implement Batch Processing**: Optimize for handling large numbers of orders

## Additional Resources

- [React Hook Form Documentation](https://react-hook-form.com/)
- [TanStack Query Error Handling](https://tanstack.com/query/latest/docs/react/guides/error-handling)
- [Shadcn/ui Toast Component](https://ui.shadcn.com/docs/components/toast)
