<!-- @format -->

# Netlify Deployment Guide

This guide explains how to deploy this application on Netlify, focusing on the serverless function implementation.

## The Problem

When deploying the server as an ES Module (using `import` statements and `import.meta.url`), we encountered an error in the Netlify environment:

```
TypeError: The "path" argument must be of type string or an instance of URL. Received undefined
```

This occurred because Netlify's serverless function environment doesn't fully support ES Modules, specifically `import.meta.url` was undefined, causing `fileURLToPath(import.meta.url)` to fail.

## The Solution

We've implemented a two-pronged approach:

1. **CommonJS Implementation**: Created a simplified server using CommonJS syntax (`require()` instead of `import`) in `netlify/functions/server/server-cjs.js`. This avoids the ES Module features that cause problems in Netlify's environment.

2. **Deployment Script**: Created a deployment script (`deploy-netlify.js`) that:
   - Builds the client application
   - Copies the CommonJS server implementation to `server.js` so Netlify uses it

## Deployment Steps

1. **Local Development**: Use the standard development workflow:

   ```
   pnpm run dev
   ```

2. **Netlify Deployment**: The build command in Netlify settings should be:

   ```
   pnpm run build:netlify
   ```

   This will:

   - Build the client application
   - Set up the serverless function correctly

## Configuration

The following files are essential for deployment:

- **netlify.toml**: Configures redirects, build settings, and function options
- **netlify/functions/server/server-cjs.js**: The CommonJS implementation of our server
- **netlify/functions/server/package.json**: Defines dependencies for the serverless function
- **deploy-netlify.js**: The script that prepares everything for deployment

## Troubleshooting

If you encounter 502 errors after deployment:

1. **Check Netlify Function Logs**: In the Netlify dashboard, go to Functions and check the logs
2. **Verify External Dependencies**: Make sure all required packages are listed in `external_node_modules` in netlify.toml
3. **Test Locally**: Use Netlify CLI to test functions locally:
   ```
   netlify dev
   ```

### Common Deployment Errors

#### ES Module vs CommonJS Issues

This project's `package.json` has `"type": "module"`, which means:
- All `.js` files are treated as ES modules by default
- They must use `import` instead of `require`
- The `deploy-netlify.js` script uses ES module syntax
- But `netlify/functions/server/server-cjs.js` uses CommonJS syntax

If you see errors about `require is not defined in ES module scope`:
- Make sure your build scripts use ES module syntax (with `import`)
- Alternatively, rename your scripts to have `.cjs` extension for CommonJS files

## Module System in this Project

This project uses a mixed module system approach:

1. **Main Project (ES Modules)**:
   - `package.json` has `"type": "module"` 
   - All deployment and build scripts use ES module syntax with `import`
   - The `deploy-netlify.js` script uses ES module syntax

2. **Netlify Function (CommonJS)**:
   - The serverless function uses CommonJS syntax with `require()`
   - Located at `netlify/functions/server/server-cjs.js`
   - Has its own `package.json` with `"type": "commonjs"`
   - This approach avoids the ES module compatibility issues in Netlify's runtime

During deployment, the `deploy-netlify.js` script copies the CommonJS implementation to the main `server.js` file so that Netlify can properly execute it.

## Authentication Flow

The authentication flow works as follows:

1. User signs in with Firebase Authentication in the frontend
2. The Firebase token is sent with API requests in the Authorization header
3. The serverless function validates the token and identifies the user
4. If the user doesn't exist in the database, they are automatically registered

This approach allows for seamless authentication without relying on server-side sessions, which is ideal for serverless architectures.

## Role-Based Access Control

Role-based access control is implemented through middleware that checks the user's role against the required role for a specific route. The current role hierarchy is:

```
["GUEST", "USER", "ADMIN", "SUPERADMIN"]
```

Higher roles have access to routes restricted to lower roles.

## Further Reading

- [Netlify Functions](https://docs.netlify.com/functions/overview/)
- [Netlify CLI](https://docs.netlify.com/cli/get-started/)
- [Serverless Express](https://github.com/vendia/serverless-express)
