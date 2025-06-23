/** @format */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface AppConfig {
  fileDownloadDays: number;
  maxFileSize: number;
  allowedFileTypes: string[];
  queueRefreshInterval: number;
  maxFilesPerSubmission: number;
  maxFilesPerPeriod: number;
}

const defaultConfig: AppConfig = {
  fileDownloadDays: 30,
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedFileTypes: [".stl", ".obj", ".3mf", ".gcode"],
  queueRefreshInterval: 30000, // 30 seconds
  maxFilesPerSubmission: 5,
  maxFilesPerPeriod: 25,
};

export function useAppConfig() {
  const queryClient = useQueryClient();

  // Try to get config from server first, fallback to localStorage
  const { data: serverConfig } = useQuery({
    queryKey: ["/api/system/config/app"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/system/config/app");
        if (response.ok) {
          const data = await response.json();
          return data.value || defaultConfig;
        }
        return null;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const [localConfig, setLocalConfig] = useState<AppConfig>(() => {
    const stored = localStorage.getItem("app-config");
    return stored ? { ...defaultConfig, ...JSON.parse(stored) } : defaultConfig;
  });

  // Use server config if available, otherwise use local config
  const config = serverConfig || localConfig;

  const updateConfigMutation = useMutation({
    mutationFn: async (updates: Partial<AppConfig>) => {
      const newConfig = { ...config, ...updates };

      // Try to save to server first
      try {
        const response = await fetch("/api/system/config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          },
          body: JSON.stringify({
            key: "app",
            value: newConfig,
            description: "Application configuration settings",
          }),
        });

        if (response.ok) {
          // If server save successful, invalidate cache
          queryClient.invalidateQueries({
            queryKey: ["/api/system/config/app"],
          });
          return newConfig;
        }
      } catch (error) {
        console.warn(
          "Failed to save config to server, using localStorage fallback"
        );
      }

      // Fallback to localStorage
      setLocalConfig(newConfig);
      localStorage.setItem("app-config", JSON.stringify(newConfig));
      return newConfig;
    },
  });

  const updateConfig = (updates: Partial<AppConfig>) => {
    updateConfigMutation.mutate(updates);
  };

  // Sync localStorage when server config changes
  useEffect(() => {
    if (serverConfig) {
      localStorage.setItem("app-config", JSON.stringify(serverConfig));
    }
  }, [serverConfig]);

  return {
    config,
    updateConfig,
    isLoading: updateConfigMutation.isPending,
    error: updateConfigMutation.error,
  };
}
