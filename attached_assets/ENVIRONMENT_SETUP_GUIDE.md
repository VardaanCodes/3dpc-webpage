<!-- @format -->

# Environment Setup Guide for 3DPC Website

This guide provides comprehensive instructions for setting up environment variables and deploying the 3DPC website with full frontend-backend integration.

## Required Environment Variables

### Firebase Configuration (Client-side)

Add these to your Netlify site settings under "Environment variables":

```bash
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Firebase Admin (Server-side)

```bash
# Base64-encoded Firebase service account key JSON
FIREBASE_ADMIN_SERVICE_ACCOUNT_KEY=base64_encoded_service_account_key
```

To generate the base64 encoded key:

1. Download your service account key JSON from Firebase Console
2. Convert to base64: `base64 -w 0 serviceAccountKey.json`
3. Use the output as the environment variable value

### Database Configuration

```bash
# Neon PostgreSQL connection string
DATABASE_URL=postgresql://username:password@host/database?sslmode=require
```

### Authentication & Authorization

```bash
# Session secret for Express sessions
SESSION_SECRET=your_secure_random_string_min_32_chars

# Admin email addresses (comma-separated)
VITE_ADMIN_EMAILS=admin1@smail.iitm.ac.in,admin2@smail.iitm.ac.in

# Super admin email addresses (comma-separated)
VITE_SUPERADMIN_EMAILS=superadmin@smail.iitm.ac.in
```

### Netlify Configuration (for automated deployment)

```bash
# Optional: For automated deployment scripts
NETLIFY_AUTH_TOKEN=your_netlify_auth_token
NETLIFY_SITE_ID=your_site_id
```

## Netlify Deployment Setup

### 1. Site Configuration

1. Connect your GitHub repository to Netlify
2. Set build command: `pnpm run build:netlify`
3. Set publish directory: `dist/client`
4. Set node version: `18` (in Build & Deploy > Environment)

### 2. Environment Variables Setup

Go to Site settings > Environment variables and add all the variables listed above.

### 3. Build Settings

The `netlify.toml` file is already configured with:

- Proper redirects for API routes
- Function configuration
- Security headers
- CORS settings

### 4. Database Setup (Neon)

1. Create a new Neon project
2. Create a database
3. Get the connection string from Neon dashboard
4. Add it as `DATABASE_URL` environment variable
5. Run migrations (they will run automatically during build)

## Local Development Setup

### 1. Environment File

Create a `.env` file in the project root:

```bash
# Copy all the environment variables from above
# Use your actual values, not the placeholders

# For local development, you can use the same Firebase config
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
# ... etc

# Database URL for local development
DATABASE_URL=postgresql://username:password@localhost/3dpc_dev

# Local session secret
SESSION_SECRET=local_dev_secret_at_least_32_characters_long

# Admin emails for testing
VITE_ADMIN_EMAILS=test@smail.iitm.ac.in
VITE_SUPERADMIN_EMAILS=superadmin@smail.iitm.ac.in
```

### 2. Firebase Service Account

For local development, you can either:

1. Use the base64 encoded key in `.env`
2. Or place `serviceAccountKey.json` in project root (already configured)

### 3. Development Commands

```bash
# Install dependencies
pnpm install

# Run development server (client + API)
pnpm run dev

# Build for production
pnpm run build:netlify

# Run local Netlify functions
netlify dev
```

## Deployment Process

### Manual Deployment

```bash
# Build and deploy manually
npm run build:netlify
netlify deploy --prod
```

### Automatic Deployment

1. Push to main branch
2. Netlify will automatically build and deploy
3. Check deployment logs for any issues

## Troubleshooting

### Common Issues

1. **Firebase Authentication Errors**

   - Check that all Firebase environment variables are set correctly
   - Ensure Firebase project has Google authentication enabled
   - Verify domain is added to Firebase authorized domains

2. **Database Connection Errors**

   - Verify DATABASE_URL is correct
   - Check Neon project is active and accessible
   - Ensure SSL mode is enabled in connection string

3. **Build Failures**

   - Check Node.js version is 18+
   - Verify all dependencies are installed
   - Check for TypeScript errors in build logs

4. **API Endpoints Not Working**

   - Check that functions are deploying correctly
   - Verify redirects in netlify.toml
   - Check function logs in Netlify dashboard

5. **CORS Issues**
   - Verify CORS headers in netlify.toml
   - Check that frontend is making requests to correct API endpoints
   - Ensure credentials are included in API requests

### Debug Tools

1. **Check API Health**
   Visit `your-site.netlify.app/api/health` to verify API is working

2. **Function Logs**
   Check Netlify dashboard > Functions > View logs

3. **Browser Developer Tools**
   Check Network tab for API request/response details

4. **Firebase Console**
   Check Authentication tab for user login issues

## Security Considerations

1. **Environment Variables**

   - Never commit sensitive keys to git
   - Use different keys for development and production
   - Regularly rotate secrets

2. **Database Security**

   - Use connection pooling for better performance
   - Ensure SSL connections are enforced
   - Regularly update dependencies

3. **API Security**
   - All API endpoints require authentication except public ones
   - Rate limiting is configured in netlify.toml
   - Input validation is implemented server-side

## Performance Optimization

1. **Build Optimization**

   - Code splitting is enabled
   - Assets are optimized during build
   - Serverless functions use external dependencies for faster cold starts

2. **Caching Strategy**

   - Static assets cached by CDN
   - API responses cached appropriately
   - Database connection pooling for better performance

3. **Monitoring**
   - Use Netlify Analytics for traffic insights
   - Monitor function execution time
   - Set up error tracking for production issues

## Support

For deployment issues:

1. Check this guide first
2. Review Netlify deployment logs
3. Check Firebase and Neon service status
4. Contact support if needed with specific error messages

For development issues:

1. Ensure local environment matches production configuration
2. Check that all services (Firebase, Neon) are accessible
3. Verify all dependencies are installed correctly
