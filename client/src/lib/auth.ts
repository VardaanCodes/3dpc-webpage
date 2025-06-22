/** @format */

import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "./firebase";
import { apiRequest } from "./queryClient";
import { UserRole, type User } from "../../../shared/schema";
import { isProduction, getEnvironmentInfo } from "./environment";

const provider = new GoogleAuthProvider();
// Only restrict domain in production
if (isProduction()) {
  provider.setCustomParameters({
    hd: "smail.iitm.ac.in", // Domain restriction
  });
}

console.log("Auth environment info:", getEnvironmentInfo());

export async function signInWithGoogle() {
  try {
    console.log("Starting Google sign-in...");
    console.log("Auth domain:", auth.app.options.authDomain);
    console.log("Project ID:", auth.app.options.projectId);

    // Configure provider for better reliability
    provider.addScope("email");
    provider.addScope("profile");

    // Clear any cached auth state that might cause issues
    await auth.signOut().catch(() => {});

    const result = await signInWithPopup(auth, provider);
    console.log("Popup sign-in successful:", result.user.email);

    // Don't register user here - let the AuthProvider handle it
    // when the auth state changes to prevent race conditions
    return result;
  } catch (error: any) {
    console.error("Sign in error:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);

    // Handle specific Firebase auth errors
    if (error.code === "auth/internal-error") {
      console.error("Firebase internal error - checking configuration:");
      console.error("Current auth config:", {
        authDomain: auth.app.options.authDomain,
        projectId: auth.app.options.projectId,
        apiKey: auth.app.options.apiKey ? "present" : "missing",
      });
      throw new Error(
        "Authentication service is not properly configured. Please check Firebase settings and try again."
      );
    } else if (error.code === "auth/popup-closed-by-user") {
      throw new Error("Sign-in was cancelled. Please try again.");
    } else if (error.code === "auth/network-request-failed") {
      throw new Error(
        "Network error. Please check your connection and try again."
      );
    } else if (error.code === "auth/configuration-not-found") {
      throw new Error(
        "Authentication is not properly configured. Please contact support."
      );
    } else if (error.code === "auth/popup-blocked") {
      throw new Error(
        "Pop-up was blocked by your browser. Please allow pop-ups for this site and try again."
      );
    }

    throw error;
  }
}

export function signInAsGuest(): User {
  const guestUser: User = {
    id: 0, // Mock ID
    email: "guest@example.com",
    displayName: "Guest User",
    photoURL: null,
    role: UserRole.enum.GUEST,
    suspended: false,
    fileUploadsUsed: 0,
    notificationPreferences: {},
    lastLogin: new Date(),
    createdAt: new Date(),
  };

  return guestUser;
}

export function logout() {
  return signOut(auth);
}

export function onAuthStateChange(
  callback: (user: FirebaseUser | null) => void
) {
  return onAuthStateChanged(auth, callback);
}

export async function registerUser(firebaseUser: FirebaseUser) {
  try {
    console.log("Registering user:", firebaseUser.email);

    // Extract domain from email
    const emailDomain = firebaseUser.email?.split("@")[1];

    // Only check domain in production
    if (isProduction() && emailDomain !== "smail.iitm.ac.in") {
      throw new Error("Only @smail.iitm.ac.in email addresses are allowed");
    }

    const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "").split(",");
    const superAdminEmails = (
      import.meta.env.VITE_SUPERADMIN_EMAILS || ""
    ).split(",");
    let role = "USER";
    if (superAdminEmails.includes(firebaseUser.email!)) {
      role = "SUPERADMIN";
    } else if (adminEmails.includes(firebaseUser.email!)) {
      role = "ADMIN";
    }

    const userData = {
      email: firebaseUser.email!,
      displayName:
        firebaseUser.displayName || firebaseUser.email!.split("@")[0],
      photoURL: firebaseUser.photoURL,
      role,
    };

    console.log("Sending registration data:", userData);

    try {
      const response = await apiRequest("POST", "/api/user/register", userData);
      const user = await response.json();
      console.log("Registration successful:", user);
      return user;
    } catch (apiError: any) {
      console.error("API registration error:", apiError);

      // Handle specific error cases
      if (apiError.status === 404) {
        throw new Error(
          "Registration service is not available. Please try again later."
        );
      } else if (apiError.status === 500) {
        throw new Error(
          "Server error during registration. Please try again later."
        );
      } else if (apiError.status === 400) {
        throw new Error(
          `Registration failed: ${apiError.message || "Invalid user data"}`
        );
      } else if (apiError.message?.includes("Network Error")) {
        throw new Error(
          "Network error during registration. Please check your connection and try again."
        );
      }

      // Re-throw the original error if we don't know how to handle it
      throw apiError;
    }
  } catch (error) {
    console.error("User registration error:", error);
    throw error;
  }
}
