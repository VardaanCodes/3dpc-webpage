<!-- @format -->

# Email Notification System Setup Guide

## Problem Description

The 3DPC notification system is fully implemented with comprehensive email templates and service integration, but requires manual configuration of email service provider credentials to become operational. The NotificationService supports multiple providers (Resend, SendGrid, Nodemailer) but needs API keys and environment setup.

## Prerequisites

- [x] NotificationService class implemented in `server/services/NotificationService.ts`
- [x] Email templates for all order status updates (approved, started, finished, failed, cancelled)
- [x] Integration points in admin order management endpoints
- [ ] Email service provider account and API key
- [ ] Environment variables configured in Netlify
- [ ] Testing and validation of email delivery

## Environment Setup

### Option 1: Resend (Recommended)

1. Create account at [resend.com](https://resend.com)
2. Generate API key from dashboard
3. Add environment variables in Netlify:
   ```
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_xxxxxxxxxxxx
   FROM_EMAIL=noreply@yourdomain.com
   SITE_URL=https://your-3dpc-site.netlify.app
   ```

### Option 2: SendGrid

1. Create account at [sendgrid.com](https://sendgrid.com)
2. Generate API key with Mail Send permissions
3. Add environment variables:
   ```
   EMAIL_PROVIDER=sendgrid
   SENDGRID_API_KEY=SG.xxxxxxxxxxxx
   FROM_EMAIL=noreply@yourdomain.com
   SITE_URL=https://your-3dpc-site.netlify.app
   ```

### Option 3: Nodemailer (Custom SMTP)

1. Configure your SMTP server details
2. Add environment variables:
   ```
   EMAIL_PROVIDER=nodemailer
   SMTP_HOST=smtp.yourdomain.com
   SMTP_PORT=587
   SMTP_USER=your-email@yourdomain.com
   SMTP_PASS=your-password
   FROM_EMAIL=noreply@yourdomain.com
   SITE_URL=https://your-3dpc-site.netlify.app
   ```

## Implementation Steps

### Step 1: Choose Email Provider

Based on requirements and budget:

- **Resend**: Modern API, good free tier, easy setup
- **SendGrid**: Enterprise-grade, extensive features
- **Nodemailer**: Custom SMTP, full control

### Step 2: Configure Environment Variables

In Netlify Dashboard:

1. Go to Site Settings → Environment Variables
2. Add the required variables for your chosen provider
3. Redeploy the site to pick up new environment variables

### Step 3: Complete SendGrid Implementation (if using SendGrid)

Update `NotificationService.ts`:

```typescript
private async sendWithSendGrid(
  email: string,
  template: EmailTemplate
): Promise<boolean> {
  if (!this.apiKey) {
    console.error("SendGrid API key not configured");
    return false;
  }

  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(this.apiKey);

    const msg = {
      to: email,
      from: process.env.FROM_EMAIL || "noreply@3dpc.com",
      subject: template.subject,
      text: template.text,
      html: template.html,
    };

    await sgMail.send(msg);
    console.log(`Email sent successfully to ${email} via SendGrid`);
    return true;
  } catch (error) {
    console.error("Failed to send email with SendGrid:", error);
    return false;
  }
}
```

### Step 4: Complete Nodemailer Implementation (if using Nodemailer)

Update `NotificationService.ts`:

```typescript
private async sendWithNodemailer(
  email: string,
  template: EmailTemplate
): Promise<boolean> {
  try {
    const nodemailer = require('nodemailer');

    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.FROM_EMAIL || "noreply@3dpc.com",
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully to ${email} via Nodemailer`);
    return true;
  } catch (error) {
    console.error("Failed to send email with Nodemailer:", error);
    return false;
  }
}
```

### Step 5: Install Required Dependencies

If using SendGrid or Nodemailer, install dependencies:

```bash
# For SendGrid
npm install @sendgrid/mail

# For Nodemailer
npm install nodemailer
npm install @types/nodemailer --save-dev
```

## Testing Instructions

### Local Testing

1. Set up environment variables in `.env` file:

   ```bash
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=your_test_key
   FROM_EMAIL=test@yourdomain.com
   SITE_URL=http://localhost:3000
   ```

2. Test notification sending:

   ```bash
   # Start the development server
   npm run dev

   # Create a test order and update its status via admin dashboard
   # Check console logs for email sending attempts
   ```

### Production Testing

1. Deploy with environment variables configured
2. Create a test order as a student user
3. Update order status via admin dashboard
4. Verify emails are received at the student's email address
5. Check Netlify function logs for any errors

## Common Issues & Troubleshooting

### Issue 1: "Email provider not configured" error

**Cause**: Environment variables not properly set
**Solution**:

- Verify environment variables are set in Netlify Dashboard
- Check spelling of variable names
- Redeploy site after adding variables

### Issue 2: Authentication errors with email provider

**Cause**: Invalid API key or credentials
**Solution**:

- Regenerate API key from provider dashboard
- Verify API key has correct permissions
- Check for any typos in the API key

### Issue 3: Emails not being received

**Cause**: Email delivery issues or spam filtering
**Solution**:

- Check spam/junk folders
- Verify FROM_EMAIL domain is properly configured
- Use a verified domain with your email provider
- Check provider's delivery logs

### Issue 4: Template rendering issues

**Cause**: Missing environment variables in templates
**Solution**:

- Ensure SITE_URL is properly configured
- Check that all template variables are defined
- Test email templates with sample data

## Next Steps

After successful email configuration:

1. **Enable User Preference Management**: Students can configure notification preferences via user settings
2. **Set Up Email Monitoring**: Monitor email delivery rates and bounce rates
3. **Implement Email Queuing**: For high-volume scenarios, consider implementing email queuing
4. **Add Email Analytics**: Track open rates and click-through rates if needed

## Additional Resources

- [Resend Documentation](https://resend.com/docs)
- [SendGrid Node.js Documentation](https://docs.sendgrid.com/for-developers/sending-email/nodejs)
- [Nodemailer Documentation](https://nodemailer.com/about/)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
