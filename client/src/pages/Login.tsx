/** @format */

import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/components/AuthProvider";
import { signInWithGoogle, signInAsGuest } from "@/lib/auth";
import { auth } from "@/lib/firebase";
import { Printer, Chrome, AlertCircle, Loader2 } from "lucide-react";
import { getEnvironmentInfo } from "@/lib/environment";
import { AuthDebugger } from "@/lib/authDebugger";

export default function Login() {
  const { firebaseUser, loading, setGuestUser } = useAuth();
  const [, setLocation] = useLocation();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  
  // Check if user is stuck in registration loop
  const [registrationAttempts, setRegistrationAttempts] = useState(0);
  const maxRegistrationAttempts = 3;

  console.log("Login component state:", {
    firebaseUser: firebaseUser?.email,
    loading,
    isSigningIn,
    environment: getEnvironmentInfo(),
  });
  
  // Monitor registration attempts
  useEffect(() => {
    if (firebaseUser && !loading && registrationAttempts < maxRegistrationAttempts) {
      const timer = setTimeout(() => {
        setRegistrationAttempts(prev => prev + 1);
      }, 5000); // Wait 5 seconds before considering it a failed attempt
      
      return () => clearTimeout(timer);
    }
  }, [firebaseUser, loading, registrationAttempts]);
  
  // Show registration error if too many attempts
  useEffect(() => {
    if (registrationAttempts >= maxRegistrationAttempts && firebaseUser && !loading) {
      setRegistrationError("Registration is taking longer than expected. There may be an issue with the server.");
    }  }, [registrationAttempts, firebaseUser, loading]);
  
  const handleRetryRegistration = async () => {
    try {
      setRegistrationError(null);
      setRegistrationAttempts(0);
      
      if (firebaseUser) {
        const { registerUser } = await import("@/lib/auth");
        await registerUser(firebaseUser);
        // If successful, the auth state will update and redirect
      }
    } catch (error: any) {
      console.error("Manual registration retry failed:", error);
      setRegistrationError(`Registration failed: ${error.message}`);
    }
  };

  // If user is stuck, show registration error and retry option
  if (firebaseUser && !loading && registrationError) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4">
          <Card className="bg-slate-800 border-slate-700 shadow-xl">
            <CardHeader>
              <CardTitle className="text-white text-center">Registration Issue</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-red-600 bg-red-900/20">
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  {registrationError}
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Button 
                  onClick={handleRetryRegistration}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Retry Registration
                </Button>
                
                <Button 
                  onClick={() => {
                    setGuestUser(signInAsGuest());
                    setLocation("/submit");
                  }}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Continue as Guest
                </Button>
                
                <Button 
                  onClick={async () => {
                    await auth.signOut();
                    setRegistrationError(null);
                    setRegistrationAttempts(0);
                  }}
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-white"
                >
                  Sign Out and Try Again
                </Button>
              </div>
              
              <div className="text-xs text-slate-400 text-center">
                Signed in as: {firebaseUser.email}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  
  // Redirect if already authenticated
  useEffect(() => {
                <AlertCircle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">
                  {registrationError}
                </AlertDescription>
              </Alert>
              
              <div className="space-y-2">
                <Button 
                  onClick={handleRetryRegistration}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Retry Registration
                </Button>
                
                <Button 
                  onClick={() => {
                    setGuestUser(signInAsGuest());
                    setLocation("/submit");
                  }}
                  variant="outline"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Continue as Guest
                </Button>
                
                <Button 
                  onClick={() => {
                    auth.signOut();
                    setRegistrationError(null);
                    setRegistrationAttempts(0);
                  }}
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-white"
                >
                  Sign Out and Try Again
                </Button>
              </div>
              
              <div className="text-xs text-slate-400 text-center">
                Signed in as: {firebaseUser.email}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
    console.log("Login useEffect triggered:", {
      loading,
      firebaseUser: firebaseUser?.email,
      isSigningIn,
    });

    AuthDebugger.log("Login useEffect", {
      loading,
      hasFirebaseUser: !!firebaseUser,
      firebaseUserEmail: firebaseUser?.email,
      isSigningIn,
    });

    if (!loading && firebaseUser && !isSigningIn) {
      console.log("Redirecting to /submit...");
      AuthDebugger.log("Redirecting to /submit", {
        firebaseUserEmail: firebaseUser.email,
      });

      // Add a small delay to prevent rapid redirects
      const timer = setTimeout(() => {
        setLocation("/submit");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loading, firebaseUser, setLocation, isSigningIn]);
  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setError(null);

      console.log("Starting sign-in process...");
      AuthDebugger.log("Sign-in process started", getEnvironmentInfo());

      const result = await signInWithGoogle();
      console.log("Sign-in result:", result.user.email);

      AuthDebugger.log("Sign-in successful", {
        userEmail: result.user.email,
        userId: result.user.uid,
      });

      // Don't redirect here - let the useEffect handle it
      // after authentication state is properly set
      console.log("Sign in successful, waiting for auth state...");
    } catch (error: any) {
      console.error("Sign in error:", error);

      AuthDebugger.log("Sign-in error", {
        error: error.message,
        code: error.code,
        stack: error.stack,
      });

      let errorMessage = "Failed to sign in. Please try again.";

      if (error.code === "auth/unauthorized-domain") {
        errorMessage =
          "This domain is not authorized. Please add this domain to your Firebase project's authorized domains.";
      } else if (error.code === "auth/popup-blocked") {
        errorMessage =
          "Pop-up was blocked. Please allow pop-ups and try again.";
      } else if (
        error.code === "auth/cancelled-popup-request" ||
        error.code === "auth/popup-closed-by-user"
      ) {
        errorMessage = "Sign-in was cancelled. Please try again.";
      } else if (error.code === "auth/network-request-failed") {
        errorMessage =
          "Network error. Please check your connection and try again.";
      } else if (error.message?.includes("@smail.iitm.ac.in")) {
        errorMessage =
          "Please use your @smail.iitm.ac.in email address to sign in.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleGuestSignIn = async () => {
    try {
      const guestUser = await signInAsGuest();
      setGuestUser(guestUser);
      setLocation("/submit");
    } catch (error) {
      setError("Failed to sign in as guest.");
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
            <h1 className="text-3xl font-bold text-white">
              The 3DPC Official Queue
            </h1>
          </div>
          <p className="text-gray-400 text-center max-w-sm mx-auto">
            The official 3DPC platform for submitting, tracking, and managing
            your 3D printing requests.
          </p>
        </div>

        {/* Login Card */}
        <Card className="bg-slate-800 border-slate-700 shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-white text-xl">
              Sign In to Continue
            </CardTitle>
            <CardDescription className="text-gray-400">
              Use your IIT Madras Google account to access the print queue. If
              you are facing any issues, contact the 3DPC
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
                <h4 className="text-sm font-medium text-white mb-2">
                  Authentication Requirements
                </h4>
                <ul className="text-xs text-gray-400 space-y-1 text-left">
                  <li>• Must use your @smail.iitm.ac.in email address</li>
                  <li>
                    • Account will be automatically created on first login
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>{" "}
        </Card>

        {/* Demo Mode Section */}
        <div className="mt-6 text-center">
          <Card className="bg-slate-800 border-slate-700 shadow-xl">
            <CardHeader>
              <CardTitle className="text-white">Experience the Demo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-400">
                In the light of open-sourcing our project (thanks to Netlify for
                inspiring and supporting open source), we are offering a demo
                version of our site.
              </p>{" "}
              <Button
                onClick={handleGuestSignIn}
                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-medium py-3 text-base transition-colors"
              >
                Login as Guest
              </Button>{" "}
              <div className="flex justify-between items-center text-xs">
                <Link to="/readme" className="text-cyan-500 hover:underline">
                  Readme for Demo Features
                </Link>
                <a
                  href="https://www.netlify.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-500 hover:underline flex items-center space-x-1"
                >
                  <img
                    src="https://www.netlify.com/assets/badges/netlify-badge-dark.svg"
                    alt="Netlify"
                    className="h-10"
                  />
                  <span>Powered by Netlify</span>
                </a>
              </div>{" "}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
