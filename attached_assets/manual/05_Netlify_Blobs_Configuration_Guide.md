<!-- @format -->

# Netlify Blobs Configuration Guide

## 🚨 IMMEDIATE ACTION REQUIRED

If you're seeing the error "The environment has not been configured to use Netlify Blobs", follow these steps **immediately**:

### Quick Fix Steps

1. **Go to your Netlify Dashboard**

   - Visit [https://app.netlify.com](https://app.netlify.com)
   - Select your site (3dpc-webpage)

2. **Add Environment Variables**

   - Go to **Site Settings** → **Environment Variables**
   - Click **Add a variable**
   - Add these two variables:

   ```bash
   Variable 1:
   Key: NETLIFY_SITE_ID
   Value: [Your Site ID - found in Site Settings → General]

   Variable 2:
   Key: NETLIFY_ACCESS_TOKEN
   Value: [Create a new personal access token]
   ```

3. **Get Your Site ID**

   - In your site settings, go to **General**
   - Copy the **Site ID** (looks like: `12345678-1234-1234-1234-123456789abc`)

4. **Create Access Token**

   - Go to **User Settings** → **Applications** → **Personal access tokens**
   - Click **New access token**
   - Name: "Blobs File Upload"
   - Scopes: Select **All** or at minimum `sites:read` and `sites:write`
   - Click **Generate token**
   - Copy the token immediately (you won't see it again)

5. **Set Environment Variables**

   - Back in your site's Environment Variables section
   - Add `NETLIFY_SITE_ID` with your site ID
   - Add `NETLIFY_ACCESS_TOKEN` with your access token
   - **Important**: Set both for **All deploy contexts**

6. **Trigger a New Deploy**
   - Go to **Deploys** tab
   - Click **Trigger deploy** → **Clear cache and deploy site**
   - Wait for deployment to complete
   - Test file upload functionality

### Verification

After deployment, the serverless function logs should show:

```
Initializing Netlify Blobs store: file-uploads
Environment variables check:
- NETLIFY_SITE_ID: true
- NETLIFY_ACCESS_TOKEN: true
- CONTEXT: production
Netlify Blobs store initialized successfully
```

If you still see `false` for either variable, double-check they're set correctly.

## Error Description

When attempting to upload files, you may encounter this error:

```json
{
  "error": "File upload failed",
  "details": "The environment has not been configured to use Netlify Blobs. To use it manually, supply the following properties when creating a store: siteID, token"
}
```

## Root Cause

This error occurs because the Netlify Blobs service is not properly configured with the required environment variables or the environment detection is failing in the serverless function.

## Solution Overview

Netlify Blobs requires either:

1. **Automatic configuration** (when deployed on Netlify with proper context)
2. **Manual configuration** with `siteID` and `token` parameters

## Manual Configuration Steps

### Step 1: Get Required Values

#### Get Site ID

1. Go to your Netlify dashboard
2. Select your site
3. Go to **Site Settings** → **General**
4. Copy the **Site ID** (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

#### Get Access Token

1. Go to **User Settings** → **Applications** → **Personal access tokens**
2. Click **New access token**
3. Give it a name like "Blobs Access"
4. Select the scopes: `sites:read` and `sites:write`
5. Copy the generated token

### Step 2: Configure Environment Variables

Add these environment variables to your Netlify site:

```bash
NETLIFY_SITE_ID=your-site-id-here
NETLIFY_ACCESS_TOKEN=your-access-token-here
```

#### In Netlify Dashboard:

1. Go to **Site Settings** → **Environment Variables**
2. Add `NETLIFY_SITE_ID` with your site ID
3. Add `NETLIFY_ACCESS_TOKEN` with your access token

### Step 3: Update Code Configuration

The Netlify Blobs service needs to be configured to use these environment variables when automatic detection fails.

#### In `server/netlifyBlobs.ts`:

```typescript
private getStoreInstance() {
  // Try automatic configuration first
  try {
    return getStore(this.storeName);
  } catch (error) {
    // Fallback to manual configuration
    console.log("Using manual Netlify Blobs configuration");
    return getStore(this.storeName, {
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_ACCESS_TOKEN,
    });
  }
}
```

#### In serverless function:

```javascript
// Configure Netlify Blobs with fallback
const getBlobStore = (storeName) => {
  try {
    return getStore(storeName);
  } catch (error) {
    console.log("Using manual Netlify Blobs configuration");
    return getStore(storeName, {
      siteID: process.env.NETLIFY_SITE_ID,
      token: process.env.NETLIFY_ACCESS_TOKEN,
    });
  }
};
```

### Step 4: Verify Configuration

After making these changes:

1. **Redeploy your site**
2. **Test file upload** functionality
3. **Check logs** for any remaining configuration issues

## Alternative Solutions

### Option 1: Use Different Storage Provider

If Netlify Blobs continues to have issues, consider switching to:

- **AWS S3** with presigned URLs
- **Cloudinary** for file uploads
- **Firebase Storage**

### Option 2: Local File Storage (Development Only)

For development, you can temporarily use local file storage:

```javascript
// Development fallback
if (process.env.NODE_ENV === "development") {
  // Use multer with disk storage
  const storage = multer.diskStorage({
    destination: "./uploads/",
    filename: (req, file, cb) => {
      cb(null, Date.now() + "-" + file.originalname);
    },
  });
}
```

## Security Considerations

1. **Never expose access tokens** in client-side code
2. **Use environment variables** for all sensitive configuration
3. **Limit token permissions** to only required scopes
4. **Rotate tokens regularly** for security

## Troubleshooting

### Common Issues

1. **Invalid Site ID Format**

   - Ensure it's the full UUID format
   - Check it matches exactly from Netlify dashboard

2. **Token Permissions**

   - Verify token has `sites:read` and `sites:write` scopes
   - Ensure token is not expired

3. **Environment Variables**
   - Check they're set in Netlify dashboard
   - Verify variable names match exactly
   - Redeploy after adding variables

### Debug Commands

```javascript
// Add to your serverless function for debugging
console.log("Site ID:", process.env.NETLIFY_SITE_ID);
console.log("Has Token:", !!process.env.NETLIFY_ACCESS_TOKEN);
console.log("Environment:", process.env.NODE_ENV);
```

## Implementation Priority

1. **Immediate**: Add manual configuration fallback
2. **Short-term**: Verify environment variables are set
3. **Long-term**: Consider alternative storage solutions if issues persist

This configuration ensures reliable file upload functionality across all deployment environments.
