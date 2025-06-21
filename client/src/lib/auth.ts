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

    // Configure provider for better reliability
    provider.addScope("email");
    provider.addScope("profile");

    const result = await signInWithPopup(auth, provider);
    console.log("Popup sign-in successful:", result.user.email);

    // Don't register user here - let the AuthProvider handle it
    // when the auth state changes to prevent race conditions
    return result;
  } catch (error: any) {
    console.error("Sign in error:", error);

    // Handle specific popup errors that might cause loops
    if (error.code === "auth/popup-closed-by-user") {
      throw new Error("Sign-in was cancelled. Please try again.");
    } else if (error.code === "auth/network-request-failed") {
      throw new Error(
        "Network error. Please check your connection and try again."
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
    const response = await apiRequest("POST", "/api/user/register", userData);
    const user = await response.json();
    console.log("Registration successful:", user);
    return user;
  } catch (error) {
    console.error("User registration error:", error);
    throw error;
  }
}
