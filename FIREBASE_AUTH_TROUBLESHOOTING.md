# Firebase Authentication Troubleshooting Guide

## Issue: `auth/internal-error` on Netlify

This error occurs when Firebase cannot properly authenticate users, typically due to configuration issues in production environments.

## Root Causes and Solutions

### 1. Missing or Incorrect Environment Variables

**Problem**: Firebase configuration variables are missing or contain placeholder values.

**Solution**: 
1. Go to your Netlify dashboard
2. Navigate to **Site Settings > Environment Variables**
3. Set the following variables with your actual Firebase values:
   ```
   VITE_FIREBASE_API_KEY=your_actual_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

**How to find these values**:
- Go to your Firebase Console
- Select your project
- Click the gear icon ⚙️ > Project Settings
- Scroll down to "Your apps" section
- Copy the config values from your web app

### 2. Incorrect Auth Domain Configuration

**Problem**: The `authDomain` doesn't match your Firebase project or custom domain setup.

**Solution**:
- If using Firebase hosting: `your-project-id.firebaseapp.com`
- If using custom domain: Make sure it's properly configured in Firebase Console > Authentication > Settings > Authorized domains

### 3. Content Security Policy (CSP) Issues

**Problem**: Your CSP headers block Firebase authentication requests.

**Solution**: Update your `netlify.toml` CSP to include Firebase domains:
```toml
Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googleapis.com https://*.gstatic.com https://apis.google.com; connect-src 'self' https://*.googleapis.com https://*.firebase.googleapis.com https://*.firebaseio.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://accounts.google.com; frame-src https://accounts.google.com;"
```

### 4. Google OAuth Configuration Issues

**Problem**: Google OAuth is not properly configured for your domain.

**Solution**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **APIs & Services > Credentials**
4. Find your OAuth 2.0 Client ID
5. Add your Netlify domain to **Authorized JavaScript origins**:
   - `https://your-site-name.netlify.app`
6. Add to **Authorized redirect URIs**:
   - `https://your-site-name.netlify.app/__/auth/handler`

### 5. Firebase Project Configuration

**Problem**: Firebase project settings don't match your deployment environment.

**Solution**:
1. In Firebase Console > Authentication > Settings
2. Add your Netlify domain to **Authorized domains**:
   - `your-site-name.netlify.app`
3. Make sure **Google** provider is enabled in **Sign-in method** tab

## Debugging Steps

### 1. Use the Debug Page
Visit `/debug` on your deployed site to check Firebase configuration status.

### 2. Check Browser Console
Look for specific error messages:
- `auth/internal-error`: Configuration or network issue
- `auth/popup-blocked`: Browser blocking popups
- `auth/network-request-failed`: Network connectivity
- `auth/configuration-not-found`: Missing Firebase config

### 3. Verify Environment Variables
Run the config check script:
```bash
npm run check:firebase
```

### 4. Test in Different Environments
- Test locally with `npm run dev`
- Test preview deployment
- Test production deployment

## Quick Fix Checklist

- [ ] All Firebase environment variables are set in Netlify
- [ ] Firebase project has your domain in authorized domains
- [ ] Google OAuth client has your domain in authorized origins
- [ ] CSP headers allow Firebase domains
- [ ] Firebase project is active and billing is enabled (if required)
- [ ] Browser allows popups for your site

## Still Having Issues?

1. Check the browser network tab for failed requests
2. Verify your Firebase project status in Firebase Console
3. Test with a fresh incognito/private browser window
4. Check if your site is correctly linked to the Firebase project

## Environment-Specific Notes

### Development
- Uses `localhost:5000` as authorized domain
- May use Firebase emulator for testing

### Production (Netlify)
- Must use actual Firebase project
- Requires proper domain authorization
- Environment variables must be set in Netlify dashboard

### Testing
- Use Firebase Auth emulator for automated testing
- Mock authentication for unit tests
