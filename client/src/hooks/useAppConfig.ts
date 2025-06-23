/** @format */

import { useState, useEffect } from "react";

interface AppConfig {
  fileDownloadDays: number;
  maxFileSize: number;
  allowedFileTypes: string[];
  queueRefreshInterval: number;
}

const defaultConfig: AppConfig = {
  fileDownloadDays: 30,
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedFileTypes: [".stl", ".obj", ".3mf", ".gcode"],
  queueRefreshInterval: 30000, // 30 seconds
};

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig>(() => {
    const stored = localStorage.getItem("app-config");
    return stored ? { ...defaultConfig, ...JSON.parse(stored) } : defaultConfig;
  });

  const updateConfig = (updates: Partial<AppConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    localStorage.setItem("app-config", JSON.stringify(newConfig));
  };

  return { config, updateConfig };
}
