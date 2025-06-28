/** @format */

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

interface NotificationPreferences {
  orderApproved: boolean;
  orderStarted: boolean;
  orderCompleted: boolean;
  orderFailed: boolean;
  orderCancelled: boolean;
}

export class NotificationService {
  private emailProvider: string;
  private apiKey: string;

  constructor() {
    // Use environment variables to configure email service
    this.emailProvider = process.env.EMAIL_PROVIDER || "resend"; // Default to Resend
    this.apiKey = process.env.EMAIL_API_KEY || "";
  }

  /**
   * Send order status update notification
   */
  async sendOrderStatusUpdate(
    userEmail: string,
    userName: string,
    orderDetails: {
      orderId: string;
      projectName: string;
      status: string;
      previousStatus?: string;
      reason?: string;
    },
    preferences?: NotificationPreferences
  ): Promise<boolean> {
    // Check if user wants this type of notification
    if (
      preferences &&
      !this.shouldSendNotification(orderDetails.status, preferences)
    ) {
      console.log(
        `Notification skipped for ${userEmail} - preference disabled for ${orderDetails.status}`
      );
      return true;
    }

    try {
      const template = this.getEmailTemplate(
        orderDetails.status,
        userName,
        orderDetails
      );

      switch (this.emailProvider) {
        case "resend":
          return await this.sendWithResend(userEmail, template);
        case "sendgrid":
          return await this.sendWithSendGrid(userEmail, template);
        case "nodemailer":
          return await this.sendWithNodemailer(userEmail, template);
        default:
          console.error(`Unsupported email provider: ${this.emailProvider}`);
          return false;
      }
    } catch (error) {
      console.error("Failed to send notification:", error);
      return false;
    }
  }

  /**
   * Check if notification should be sent based on user preferences
   */
  private shouldSendNotification(
    status: string,
    preferences: NotificationPreferences
  ): boolean {
    switch (status.toLowerCase()) {
      case "approved":
        return preferences.orderApproved;
      case "started":
        return preferences.orderStarted;
      case "finished":
      case "completed":
        return preferences.orderCompleted;
      case "failed":
        return preferences.orderFailed;
      case "cancelled":
        return preferences.orderCancelled;
      default:
        return false;
    }
  }

  /**
   * Generate email template based on status
   */
  private getEmailTemplate(
    status: string,
    userName: string,
    orderDetails: any
  ): EmailTemplate {
    const baseUrl =
      process.env.NETLIFY_SITE_URL ||
      process.env.SITE_URL ||
      "http://localhost:3000";

    switch (status.toLowerCase()) {
      case "approved":
        return {
          subject: `✅ Print Request Approved - ${orderDetails.projectName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #10b981;">🎉 Great News, ${userName}!</h2>
              <p>Your print request has been approved and will be processed soon.</p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0;">Order Details:</h3>
                <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
                <p><strong>Project:</strong> ${orderDetails.projectName}</p>
                <p><strong>Status:</strong> Approved</p>
              </div>
              
              <p>You'll receive another notification when printing begins.</p>
              
              <a href="${baseUrl}/orders" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                View Order Status
              </a>
              
              <p style="color: #6b7280; font-size: 14px;">
                Best regards,<br>
                3DPC Team
              </p>
            </div>
          `,
          text: `Great News, ${userName}!\n\nYour print request has been approved.\n\nOrder ID: ${orderDetails.orderId}\nProject: ${orderDetails.projectName}\nStatus: Approved\n\nView your order: ${baseUrl}/orders\n\nBest regards,\n3DPC Team`,
        };

      case "started":
        return {
          subject: `🚀 Printing Started - ${orderDetails.projectName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #3b82f6;">🚀 Printing in Progress!</h2>
              <p>Hi ${userName}, your 3D print job has started!</p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0;">Order Details:</h3>
                <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
                <p><strong>Project:</strong> ${orderDetails.projectName}</p>
                <p><strong>Status:</strong> Printing Started</p>
              </div>
              
              <p>We'll notify you when your print is complete!</p>
              
              <a href="${baseUrl}/orders" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                Track Progress
              </a>
              
              <p style="color: #6b7280; font-size: 14px;">
                Best regards,<br>
                3DPC Team
              </p>
            </div>
          `,
          text: `Hi ${userName},\n\nYour 3D print job has started!\n\nOrder ID: ${orderDetails.orderId}\nProject: ${orderDetails.projectName}\nStatus: Printing Started\n\nTrack progress: ${baseUrl}/orders\n\nBest regards,\n3DPC Team`,
        };

      case "finished":
      case "completed":
        return {
          subject: `✨ Print Complete - ${orderDetails.projectName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #10b981;">✨ Print Completed Successfully!</h2>
              <p>Excellent news, ${userName}! Your 3D print is ready for pickup.</p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0;">Order Details:</h3>
                <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
                <p><strong>Project:</strong> ${orderDetails.projectName}</p>
                <p><strong>Status:</strong> Ready for Pickup</p>
              </div>
              
              <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
                <p style="margin: 0;"><strong>📍 Pickup Instructions:</strong></p>
                <p style="margin: 5px 0 0 0;">Please visit the 3DPC lab during operating hours to collect your print.</p>
              </div>
              
              <a href="${baseUrl}/orders" style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                View Order Details
              </a>
              
              <p style="color: #6b7280; font-size: 14px;">
                Thank you for using 3DPC!<br>
                Best regards,<br>
                3DPC Team
              </p>
            </div>
          `,
          text: `Excellent news, ${userName}!\n\nYour 3D print is ready for pickup.\n\nOrder ID: ${orderDetails.orderId}\nProject: ${orderDetails.projectName}\nStatus: Ready for Pickup\n\nPickup Instructions: Please visit the 3DPC lab during operating hours.\n\nView order: ${baseUrl}/orders\n\nBest regards,\n3DPC Team`,
        };

      case "failed":
        return {
          subject: `⚠️ Print Issue - ${orderDetails.projectName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ef4444;">⚠️ Print Encountered an Issue</h2>
              <p>Hi ${userName}, unfortunately there was an issue with your print job.</p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0;">Order Details:</h3>
                <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
                <p><strong>Project:</strong> ${orderDetails.projectName}</p>
                <p><strong>Status:</strong> Failed</p>
                ${
                  orderDetails.reason
                    ? `<p><strong>Reason:</strong> ${orderDetails.reason}</p>`
                    : ""
                }
              </div>
              
              <div style="background: #fef2f2; padding: 15px; border-radius: 6px; border-left: 4px solid #ef4444; margin: 20px 0;">
                <p style="margin: 0;"><strong>Next Steps:</strong></p>
                <p style="margin: 5px 0 0 0;">Our team will review the issue and contact you with options to resolve this.</p>
              </div>
              
              <a href="${baseUrl}/orders" style="display: inline-block; background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                View Order Details
              </a>
              
              <p style="color: #6b7280; font-size: 14px;">
                We apologize for the inconvenience.<br>
                Best regards,<br>
                3DPC Team
              </p>
            </div>
          `,
          text: `Hi ${userName},\n\nUnfortunately there was an issue with your print job.\n\nOrder ID: ${
            orderDetails.orderId
          }\nProject: ${orderDetails.projectName}\nStatus: Failed\n${
            orderDetails.reason ? `Reason: ${orderDetails.reason}\n` : ""
          }\nOur team will review and contact you with options.\n\nView order: ${baseUrl}/orders\n\nBest regards,\n3DPC Team`,
        };

      case "cancelled":
        return {
          subject: `❌ Print Request Cancelled - ${orderDetails.projectName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #6b7280;">❌ Print Request Cancelled</h2>
              <p>Hi ${userName}, your print request has been cancelled.</p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0;">Order Details:</h3>
                <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
                <p><strong>Project:</strong> ${orderDetails.projectName}</p>
                <p><strong>Status:</strong> Cancelled</p>
                ${
                  orderDetails.reason
                    ? `<p><strong>Reason:</strong> ${orderDetails.reason}</p>`
                    : ""
                }
              </div>
              
              <p>If you believe this was in error, please contact the 3DPC team.</p>
              
              <a href="${baseUrl}/submit" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                Submit New Request
              </a>
              
              <p style="color: #6b7280; font-size: 14px;">
                Best regards,<br>
                3DPC Team
              </p>
            </div>
          `,
          text: `Hi ${userName},\n\nYour print request has been cancelled.\n\nOrder ID: ${
            orderDetails.orderId
          }\nProject: ${orderDetails.projectName}\nStatus: Cancelled\n${
            orderDetails.reason ? `Reason: ${orderDetails.reason}\n` : ""
          }\nIf you believe this was in error, please contact us.\n\nSubmit new request: ${baseUrl}/submit\n\nBest regards,\n3DPC Team`,
        };

      default:
        return {
          subject: `📋 Order Update - ${orderDetails.projectName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>📋 Order Status Update</h2>
              <p>Hi ${userName}, there's an update on your print request.</p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 10px 0;">Order Details:</h3>
                <p><strong>Order ID:</strong> ${orderDetails.orderId}</p>
                <p><strong>Project:</strong> ${orderDetails.projectName}</p>
                <p><strong>Status:</strong> ${status}</p>
              </div>
              
              <a href="${baseUrl}/orders" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
                View Order Details
              </a>
              
              <p style="color: #6b7280; font-size: 14px;">
                Best regards,<br>
                3DPC Team
              </p>
            </div>
          `,
          text: `Hi ${userName},\n\nOrder Status Update\n\nOrder ID: ${orderDetails.orderId}\nProject: ${orderDetails.projectName}\nStatus: ${status}\n\nView order: ${baseUrl}/orders\n\nBest regards,\n3DPC Team`,
        };
    }
  }

  /**
   * Send email using Resend
   */
  private async sendWithResend(
    email: string,
    template: EmailTemplate
  ): Promise<boolean> {
    if (!this.apiKey) {
      console.error("Resend API key not configured");
      return false;
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.FROM_EMAIL || "noreply@3dpc.com",
          to: [email],
          subject: template.subject,
          html: template.html,
          text: template.text,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Resend API error:", error);
        return false;
      }

      console.log(`Email sent successfully to ${email}`);
      return true;
    } catch (error) {
      console.error("Failed to send email with Resend:", error);
      return false;
    }
  }

  /**
   * Send email using SendGrid (placeholder)
   */
  private async sendWithSendGrid(
    email: string,
    template: EmailTemplate
  ): Promise<boolean> {
    // Implementation would use @sendgrid/mail
    console.log("SendGrid integration not implemented yet");
    return false;
  }

  /**
   * Send email using Nodemailer (placeholder)
   */
  private async sendWithNodemailer(
    email: string,
    template: EmailTemplate
  ): Promise<boolean> {
    // Implementation would use nodemailer
    console.log("Nodemailer integration not implemented yet");
    return false;
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
