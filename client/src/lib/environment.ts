/**
 * Environment configuration utilities
 *
 * @format
 */

export const isProduction = () => {
  return import.meta.env.PROD || import.meta.env.NODE_ENV === "production";
};

export const isDevelopment = () => {
  return import.meta.env.DEV || import.meta.env.NODE_ENV === "development";
};

export const isNetlify = () => {
  return (
    typeof window !== "undefined" &&
    window.location.hostname.includes("netlify.app")
  );
};

export const getEnvironmentInfo = () => {
  return {
    isProduction: isProduction(),
    isDevelopment: isDevelopment(),
    isNetlify: isNetlify(),
    hostname:
      typeof window !== "undefined" ? window.location.hostname : "unknown",
  };
};
