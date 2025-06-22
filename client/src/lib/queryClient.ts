/** @format */

import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { UserRole } from "../../../shared/schema";
import { auth } from "./firebase";
import { isProduction, isNetlify, getEnvironmentInfo } from "./environment";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorText;
    try {
      const errorData = await res.json();
      errorText = errorData.message || errorData.error || res.statusText;
    } catch {
      errorText = (await res.text()) || res.statusText;
    }

    const error = new Error(`${res.status}: ${errorText}`);
    (error as any).status = res.status;
    throw error;
  }
}

// Get the appropriate API base URL based on environment
function getApiBaseUrl(): string {
  if (typeof window === "undefined") return "";

  // In development, use local server
  if (!isProduction() && window.location.hostname === "localhost") {
    return "http://localhost:5000";
  }

  // In production/Netlify, use current origin
  return window.location.origin;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response> {
  const user = auth.currentUser;

  // Guest user check
  if (!user && window.localStorage.getItem("guest")) {
    const guestUser = JSON.parse(window.localStorage.getItem("guest") || "{}");
    if (guestUser.role === UserRole.enum.GUEST) {
      if (method !== "GET") {
        console.log("Guest user tried to make a non-GET request. Blocked.");
        return new Response(
          JSON.stringify({ message: "Guest action blocked" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }
  }

  const headers: Record<string, string> = data
    ? { "Content-Type": "application/json" }
    : {};

  // Add Firebase ID token if user is authenticated
  if (user) {
    try {
      const idToken = await user.getIdToken();
      headers["Authorization"] = `Bearer ${idToken}`;

      // Add user email for debugging in serverless environment
      if (user.email) {
        headers["X-User-Email"] = user.email;
      }
    } catch (error) {
      console.warn("Failed to get Firebase ID token:", error);
    }
  }

  // Construct full URL
  const fullUrl = url.startsWith("http") ? url : `${getApiBaseUrl()}${url}`;

  console.log(`API Request: ${method} ${fullUrl}`, {
    hasAuth: !!headers["Authorization"],
    environment: getEnvironmentInfo(),
  });

  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  console.log(`API Response: ${method} ${fullUrl} -> ${res.status}`);

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers: Record<string, string> = {};

    // Add Firebase ID token if user is authenticated
    try {
      if (auth.currentUser) {
        const idToken = await auth.currentUser.getIdToken();
        headers["Authorization"] = `Bearer ${idToken}`;

        // Add user email for debugging
        if (auth.currentUser.email) {
          headers["X-User-Email"] = auth.currentUser.email;
        }
      }
    } catch (error) {
      console.warn("Failed to get Firebase ID token for query:", error);
    }

    // Construct full URL for queries
    const queryUrl = queryKey[0] as string;
    const fullUrl = queryUrl.startsWith("http")
      ? queryUrl
      : `${getApiBaseUrl()}${queryUrl}`;

    console.log(`Query: ${fullUrl}`, {
      hasAuth: !!headers["Authorization"],
      environment: getEnvironmentInfo(),
    });

    const res = await fetch(fullUrl, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.log("Query returned 401, returning null");
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Don't retry mutations on client errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 2 times for server errors
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
  },
});
