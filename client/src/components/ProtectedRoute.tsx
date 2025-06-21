/** @format */

import { useAuth } from "./AuthProvider";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export function ProtectedRoute({
  children,
  requiredRole,
}: ProtectedRouteProps) {
  const { firebaseUser, user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !firebaseUser && !user) {
      setLocation("/login");
    }
  }, [loading, firebaseUser, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!firebaseUser && !user) {
    return null;
  }

  if (user && user.role === "GUEST") {
    return <>{children}</>;
  }

  // Allow access if Firebase user exists, even if backend user is still loading
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (requiredRole) {
    const userRole = user.role;
    let hasAccess = false;
    if (requiredRole === "admin") {
      if (userRole === "ADMIN" || userRole === "SUPERADMIN") {
        hasAccess = true;
      }
    } else if (requiredRole === "superadmin") {
      if (userRole === "SUPERADMIN") {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">
              Access Denied
            </h1>
            <p className="text-gray-400">
              You don't have permission to access this page.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
