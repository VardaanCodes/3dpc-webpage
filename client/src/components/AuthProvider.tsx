/** @format */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { type User as FirebaseUser } from "firebase/auth";
import { onAuthStateChange } from "@/lib/auth";
import { type User } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { authStateManager } from "@/lib/authState";
import { AuthDebugger } from "@/lib/authDebugger";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  setGuestUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  user: null,
  loading: true,
  setGuestUser: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestUser, setGuestUser] = useState<User | null>(null);
  const { data: user, refetch: refetchUser, error: userError } = useQuery<User>({
    queryKey: ["/api/user/profile"],
    enabled: !!firebaseUser && !guestUser,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 or 401 errors
      if (error?.status === 404 || error?.status === 401) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });// Handle user registration when Firebase user is available but backend user is not
  useEffect(() => {
    const userEmail = firebaseUser?.email || null;

    AuthDebugger.log("Registration effect triggered", {
      hasFirebaseUser: !!firebaseUser,
      hasUser: !!user,
      hasGuestUser: !!guestUser,
      userEmail,
      shouldAttempt: authStateManager.shouldAttemptRegistration(userEmail),
    });

    if (
      firebaseUser &&
      !user &&
      !guestUser &&
      authStateManager.shouldAttemptRegistration(userEmail)
    ) {
      console.log("Attempting user registration for:", userEmail);
      AuthDebugger.log("Starting user registration", { userEmail });

      authStateManager.setAuthenticating(true);
      authStateManager.setLastAuthUser(userEmail);

      const registerUserAsync = async () => {
        const timeoutId = setTimeout(() => {
          console.warn("Registration timeout, resetting auth state");
          AuthDebugger.log("Registration timeout", { userEmail });
          authStateManager.reset();
          authStateManager.setAuthenticating(false);
        }, 15000); // 15 second timeout

        try {
          const { registerUser } = await import("@/lib/auth");
          await registerUser(firebaseUser);
          AuthDebugger.log("User registration successful", { userEmail });
          clearTimeout(timeoutId);
          // Refetch user profile after successful registration
          setTimeout(() => refetchUser(), 1000);
        } catch (error) {
          clearTimeout(timeoutId);
          console.error("User registration failed:", error);
          AuthDebugger.log("User registration failed", {
            userEmail,
            error: error instanceof Error ? error.message : error,
          });
          
          // For specific errors, don't retry
          if (error instanceof Error) {
            if (error.message.includes('404') || error.message.includes('Network Error')) {
              console.error("Critical registration error - not retrying:", error.message);
              // Don't reset state to prevent retries
              authStateManager.setAuthenticating(false);
              return;
            }
          }
          
          // Reset state on other errors so user can try again
          authStateManager.reset();
        } finally {
          authStateManager.setAuthenticating(false);
        }
      };

      registerUserAsync();
    }
  }, [firebaseUser, user, guestUser, refetchUser]);
  useEffect(() => {
    let mounted = true;

    AuthDebugger.log("Auth state listener setup", {});

    // Set up auth state listener
    const unsubscribe = onAuthStateChange(async (user) => {
      if (!mounted) return;

      console.log("Auth state changed:", user?.email);

      AuthDebugger.log("Auth state changed", {
        userEmail: user?.email,
        hasUser: !!user,
        mounted,
      });

      setGuestUser(null);
      window.localStorage.removeItem("guest");
      setFirebaseUser(user);
      authStateManager.reset(); // Reset auth state manager on auth change

      if (user) {
        // Add a small delay to ensure Firebase user is fully set
        setTimeout(() => {
          if (mounted) {
            AuthDebugger.log("Refetching user profile", {
              userEmail: user.email,
            });
            refetchUser();
          }
        }, 200);
      }

      setLoading(false);
    });

    return () => {
      mounted = false;
      AuthDebugger.log("Auth state listener cleanup", {});
      unsubscribe();
    };
  }, [refetchUser]);

  const handleSetGuestUser = (user: User | null) => {
    setFirebaseUser(null);
    setGuestUser(user);
    authStateManager.reset();
    if (user) {
      window.localStorage.setItem("guest", JSON.stringify(user));
    } else {
      window.localStorage.removeItem("guest");
    }
    setLoading(false);
  };

  const currentUser = guestUser || user;

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user: currentUser || null,
        loading,
        setGuestUser: handleSetGuestUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
