<!-- @format -->

# 3DPC Website - Netlify Deployment Guide

This document provides instructions on how to deploy this 3DPC website to Netlify.

## Prerequisites

1. A Netlify account
2. Git installed on your machine
3. Firebase project (for authentication and storage)
4. Database (if using Neon DB or similar)

## Deployment Steps

### 1. Prepare Your Environment Variables

Copy the `.env.netlify` file and update it with your actual values:

```
# Firebase configuration
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-app.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id

# Session configuration
SESSION_SECRET=change_this_to_a_secure_random_value_in_production

# Database configuration - if you're using Neon DB
DATABASE_URL=your_database_connection_string

# Other settings
NODE_ENV=production
```

### 2. Deploy to Netlify

#### Option 1: Connect to Git Repository (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
2. Log in to your Netlify account
3. Click "New site from Git"
4. Choose your Git provider and repository
5. In the build settings:
   - Build command: `pnpm run build:netlify`
   - Publish directory: `dist/client`
6. Click "Show advanced" and add your environment variables from `.env.netlify`
7. Click "Deploy site"

#### Option 2: Manual Deploy

1. Run `pnpm run build:netlify` locally
2. Drag and drop the `dist/client` folder to Netlify's deploy area
3. Add your environment variables in the Netlify dashboard

### 3. Configure Redirects and Functions

The `netlify.toml` file already includes necessary redirects and function configurations:

```toml
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/server/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 4. Verify Deployment

1. Once deployed, check that your site is working correctly
2. Test all functionality, especially API calls and authentication
3. Check the Netlify function logs if you encounter any issues with the server-side code

## Troubleshooting

- **API calls not working**: Check that the `/api/*` redirect is working correctly and your serverless function is deployed properly
- **Authentication issues**: Verify your Firebase configuration in environment variables
- **Database connectivity**: Check your database connection string and ensure your Netlify function has network access to your database

## Local Development

To run the site locally:

```bash
pnpm install
pnpm run dev
```

This will start both the client and server in development mode.
