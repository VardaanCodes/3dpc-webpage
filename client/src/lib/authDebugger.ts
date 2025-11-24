/**
 * Debug utilities for authentication issues
 *
 * @format
 */

export class AuthDebugger {
  private static logs: Array<{ timestamp: Date; event: string; data: any }> =
    [];

  static log(event: string, data?: any) {
    const logEntry = {
      timestamp: new Date(),
      event,
      data,
    };

    this.logs.push(logEntry);
    console.log(`[AUTH DEBUG] ${event}:`, data);

    // Keep only last 50 logs
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(-50);
    }
  }

  static getLogs() {
    return [...this.logs];
  }

  static clearLogs() {
    this.logs = [];
  }

  static exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  static getAuthState() {
    return {
      url: typeof window !== "undefined" ? window.location.href : "unknown",
      userAgent:
        typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      cookies: typeof document !== "undefined" ? document.cookie : "unknown",
      localStorage:
        typeof localStorage !== "undefined"
          ? Object.keys(localStorage).reduce((acc, key) => {
              acc[key] = localStorage.getItem(key);
              return acc;
            }, {} as Record<string, string | null>)
          : {},
      environment: {
        NODE_ENV: import.meta.env.NODE_ENV,
        PROD: import.meta.env.PROD,
        DEV: import.meta.env.DEV,
      },
    };
  }
}

// Global debug function
(window as any).authDebug = {
  logs: () => AuthDebugger.getLogs(),
  export: () => AuthDebugger.exportLogs(),
  state: () => AuthDebugger.getAuthState(),
  clear: () => AuthDebugger.clearLogs(),
};
