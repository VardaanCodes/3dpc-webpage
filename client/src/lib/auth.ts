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

const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  hd: "smail.iitm.ac.in", // Domain restriction
});

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    console.log("Popup sign-in successful:", result.user.email);

    // Register user immediately after successful popup
    await registerUser(result.user);
    return result;
  } catch (error) {
    console.error("Sign in error:", error);
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
    if (emailDomain !== "smail.iitm.ac.in") {
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
