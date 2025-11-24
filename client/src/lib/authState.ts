/**
 * Simple auth state manager to prevent infinite loops and race conditions
 *
 * @format
 */

let isAuthenticating = false;
let lastAuthUser: string | null = null;

export const authStateManager = {
  setAuthenticating: (value: boolean) => {
    isAuthenticating = value;
  },

  isAuthenticating: () => isAuthenticating,

  setLastAuthUser: (email: string | null) => {
    lastAuthUser = email;
  },

  getLastAuthUser: () => lastAuthUser,

  shouldAttemptRegistration: (email: string | null) => {
    if (!email) return false;
    if (isAuthenticating) return false;
    if (lastAuthUser === email) return false;
    return true;
  },

  reset: () => {
    isAuthenticating = false;
    lastAuthUser = null;
  },
};
