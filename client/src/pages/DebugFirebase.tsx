/** @format */

import React, { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { getEnvironmentInfo } from "@/lib/environment";

interface FirebaseDebugInfo {
  authDomain: string | undefined;
  projectId: string | undefined;
  apiKey: string | undefined;
  appId: string | undefined;
  environment: any;
  authReady: boolean;
  connectionTest: "pending" | "success" | "failed";
  connectionError?: string;
}

export default function DebugFirebase() {
  const [debugInfo, setDebugInfo] = useState<FirebaseDebugInfo>({
    authDomain: "",
    projectId: "",
    apiKey: "",
    appId: "",
    environment: {},
    authReady: false,
    connectionTest: "pending",
  });

  useEffect(() => {
    const info: FirebaseDebugInfo = {
      authDomain: auth.app.options.authDomain,
      projectId: auth.app.options.projectId,
      apiKey: auth.app.options.apiKey ? "present" : "missing",
      appId: auth.app.options.appId,
      environment: getEnvironmentInfo(),
      authReady: !!auth.currentUser !== undefined,
      connectionTest: "pending",
    };

    setDebugInfo(info);

    // Test Firebase connection
    const testConnection = async () => {
      try {
        // Try to access Firebase auth service
        await auth.authStateReady();
        setDebugInfo((prev) => ({ ...prev, connectionTest: "success" }));
      } catch (error: any) {
        console.error("Firebase connection test failed:", error);
        setDebugInfo((prev) => ({
          ...prev,
          connectionTest: "failed",
          connectionError: error.message,
        }));
      }
    };

    testConnection();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Firebase Debug Information</h1>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Environment</h2>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
            {JSON.stringify(debugInfo.environment, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Firebase Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong>Auth Domain:</strong>
              <span
                className={
                  debugInfo.authDomain ? "text-green-600" : "text-red-600"
                }
              >
                {debugInfo.authDomain || "Missing"}
              </span>
            </div>
            <div>
              <strong>Project ID:</strong>
              <span
                className={
                  debugInfo.projectId ? "text-green-600" : "text-red-600"
                }
              >
                {debugInfo.projectId || "Missing"}
              </span>
            </div>
            <div>
              <strong>API Key:</strong>
              <span
                className={
                  debugInfo.apiKey === "present"
                    ? "text-green-600"
                    : "text-red-600"
                }
              >
                {debugInfo.apiKey}
              </span>
            </div>
            <div>
              <strong>App ID:</strong>
              <span
                className={debugInfo.appId ? "text-green-600" : "text-red-600"}
              >
                {debugInfo.appId || "Missing"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Connection Test</h2>
          <div className="flex items-center space-x-2">
            <span>Status:</span>
            <span
              className={
                debugInfo.connectionTest === "success"
                  ? "text-green-600"
                  : debugInfo.connectionTest === "failed"
                  ? "text-red-600"
                  : "text-yellow-600"
              }
            >
              {debugInfo.connectionTest}
            </span>
          </div>
          {debugInfo.connectionError && (
            <div className="mt-2 p-4 bg-red-50 border border-red-200 rounded">
              <strong>Error:</strong> {debugInfo.connectionError}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            {!debugInfo.authDomain && (
              <li className="text-red-600">
                Set VITE_FIREBASE_AUTH_DOMAIN environment variable
              </li>
            )}
            {!debugInfo.projectId && (
              <li className="text-red-600">
                Set VITE_FIREBASE_PROJECT_ID environment variable
              </li>
            )}
            {debugInfo.apiKey === "missing" && (
              <li className="text-red-600">
                Set VITE_FIREBASE_API_KEY environment variable
              </li>
            )}
            {debugInfo.connectionTest === "failed" && (
              <li className="text-red-600">
                Check Firebase project settings and network connectivity
              </li>
            )}
            {debugInfo.connectionTest === "success" && (
              <li className="text-green-600">
                Firebase is properly configured and accessible
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
