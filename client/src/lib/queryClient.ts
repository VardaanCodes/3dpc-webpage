/** @format */

import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { UserRole } from "../../../shared/schema";
import { auth } from "./firebase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
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
    const idToken = await user.getIdToken();
    headers["Authorization"] = `Bearer ${idToken}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

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
      }
    } catch (error) {
      // Continue without token if Firebase is not available
    }

    const res = await fetch(queryKey[0] as string, {
      headers,
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
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
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
