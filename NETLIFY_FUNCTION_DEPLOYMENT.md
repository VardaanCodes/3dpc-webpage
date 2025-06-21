<!-- @format -->

# Netlify Function Deployment Guide

This guide explains how the serverless functions are set up for this project on Netlify.

## Function Architecture

The project uses a self-contained Netlify function approach for the server-side code. Instead of building the server code separately and then importing it into the function, we've inlined the necessary server code directly in the function.

This approach avoids issues with relative imports in the Netlify deployment environment, which was causing 502 errors and infinite login loops.

## Key Files

- `netlify/functions/server/server.js`: This is the main serverless function that handles all the API routes. It's a self-contained Express application that's wrapped with `serverless-http`.

- `netlify.toml`: Configures the Netlify build process and function settings. Note the `node_bundler = "esbuild"` setting for better compatibility.

## Build Process

The build process is defined in `package.json` under the `build:netlify` script. It:

1. Builds the client-side application with Vite
2. Runs a script to prepare the serverless function

## Authentication Flow

The authentication flow:

1. User signs in with Firebase Authentication
2. On successful sign-in, the client sends the Firebase token to the serverless function in the `Authorization` header
3. The function middleware verifies the token and extracts the user information
4. If the user doesn't exist in the database, the client attempts to register the user by calling `/api/user/register`
5. Once registered, the user can access protected routes

## Troubleshooting

If you encounter 502 errors or infinite login loops:

1. Check the function logs in Netlify
2. Ensure the serverless function is correctly bundled
3. Verify that all necessary dependencies are available to the function
4. Check for any relative imports that might not resolve correctly in the Netlify environment

## Security Considerations

- The serverless function handles user authentication and authorization
- Role-based access control is implemented through middleware
- Firebase tokens are verified server-side to prevent unauthorized access
- Session management is handled with express-session

## Further Reading

- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [Express.js Documentation](https://expressjs.com/)
- [Serverless-HTTP Package](https://github.com/dougmoscrop/serverless-http)
