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

  const { data: user, refetch: refetchUser } = useQuery<User>({
    queryKey: ["/api/user/profile"],
    enabled: !!firebaseUser && !guestUser,
    retry: false,
  });

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = onAuthStateChange((user) => {
      console.log("Auth state changed:", user?.email);
      setGuestUser(null);
      window.localStorage.removeItem("guest");
      setFirebaseUser(user);
      setLoading(false);
      if (user) {
        // Trigger user profile refetch when auth state changes
        setTimeout(() => refetchUser(), 100);
      }
    });

    return unsubscribe;
  }, [refetchUser]);

  const handleSetGuestUser = (user: User | null) => {
    setFirebaseUser(null);
    setGuestUser(user);
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
