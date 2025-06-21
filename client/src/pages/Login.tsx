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
import { Printer, Chrome, AlertCircle, Loader2 } from "lucide-react";

export default function Login() {
  const { firebaseUser, loading, setGuestUser } = useAuth();
  const [, setLocation] = useLocation();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      let errorMessage = "Failed to sign in. Please try again.";

      if (error.code === "auth/unauthorized-domain") {
        errorMessage =
          "This domain is not authorized. Please add this domain to your Firebase project's authorized domains.";
      } else if (error.code === "auth/popup-blocked") {
        errorMessage =
          "Pop-up was blocked. Please allow pop-ups and try again.";
      } else if (error.code === "auth/cancelled-popup-request") {
        errorMessage = "Sign-in was cancelled. Please try again.";
      }

      setError(errorMessage);
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
