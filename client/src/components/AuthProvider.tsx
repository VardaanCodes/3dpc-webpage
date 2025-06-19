import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { type User as FirebaseUser } from "firebase/auth";
import { onAuthStateChange, handleRedirectResult } from "@/lib/auth";
import { type User } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  user: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: user } = useQuery<User>({
    queryKey: ["/api/user/profile"],
    enabled: !!firebaseUser,
  });

  useEffect(() => {
    // Handle redirect result on app load
    handleRedirectResult().catch(console.error);

    // Set up auth state listener
    const unsubscribe = onAuthStateChange((user) => {
      setFirebaseUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ firebaseUser, user: user || null, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
