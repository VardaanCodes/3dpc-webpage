import { useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/components/AuthProvider";
import { signInWithGoogle, handleRedirectResult } from "@/lib/auth";
import { Printer, Chrome, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";

export default function Login() {
  const { firebaseUser, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Handle redirect result when component mounts
    handleRedirectResult().catch((error) => {
      console.error("Redirect error:", error);
      setError("Authentication failed. Please try again.");
      setIsSigningIn(false);
    });
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && firebaseUser) {
      setLocation("/submit");
    }
  }, [loading, firebaseUser, setLocation]);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setError(null);
      await signInWithGoogle();
    } catch (error: any) {
      console.error("Sign in error:", error);
      setError(error.message || "Failed to sign in. Please try again.");
      setIsSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-cyan-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Printer className="text-cyan-500 text-4xl h-12 w-12" />
            <h1 className="text-3xl font-bold text-white">3DPC Queue</h1>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome to the 3D Printing Club Queue
          </h2>
          <p className="text-gray-400 text-center max-w-sm mx-auto">
            Your one-stop platform for submitting, tracking, and managing your 3D printing requests. 
            Streamline your projects from idea to reality.
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-slate-800 border-slate-700 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-white text-xl">Sign In to Continue</CardTitle>
            <CardDescription className="text-gray-400">
              Use your college Google account to access the print queue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-3 text-base transition-colors"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Chrome className="mr-3 h-5 w-5" />
                  Sign in with Google
                </>
              )}
            </Button>

            <div className="text-center space-y-4">
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                <h4 className="text-sm font-medium text-white mb-2">Authentication Requirements</h4>
                <ul className="text-xs text-gray-400 space-y-1 text-left">
                  <li>• Must use your @college.edu email address</li>
                  <li>• Account will be automatically created on first login</li>
                  <li>• Only authorized college accounts can access the system</li>
                </ul>
              </div>

              <p className="text-xs text-gray-500">
                By signing in, you agree to follow the 3D printing guidelines and club policies.
                Contact 3dpc@college.edu for support.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Info */}
        <div className="mt-8 grid grid-cols-2 gap-4 text-center">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-cyan-500 text-2xl font-bold mb-1">24/7</div>
            <div className="text-xs text-gray-400">Queue Access</div>
          </div>
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <div className="text-cyan-500 text-2xl font-bold mb-1">1-7</div>
            <div className="text-xs text-gray-400">Days Processing</div>
          </div>
        </div>
      </div>
    </div>
  );
}
