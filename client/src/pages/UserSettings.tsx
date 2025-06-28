/** @format */

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";

interface NotificationPreferences {
  orderApproved: boolean;
  orderStarted: boolean;
  orderCompleted: boolean;
  orderFailed: boolean;
  orderCancelled: boolean;
}

export function UserSettings() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    orderApproved: true,
    orderStarted: true,
    orderCompleted: true,
    orderFailed: true,
    orderCancelled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const response = await fetch("/api/user/notification-preferences");
      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error("Failed to load notification preferences:", error);
      setMessage({
        type: "error",
        text: "Failed to load notification preferences",
      });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/user/notification-preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        setMessage({
          type: "success",
          text: "Notification preferences saved successfully!",
        });
        setTimeout(() => setMessage(null), 3000);
      } else {
        throw new Error("Failed to save preferences");
      }
    } catch (error) {
      console.error("Failed to save notification preferences:", error);
      setMessage({
        type: "error",
        text: "Failed to save notification preferences",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreferenceChange = (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  if (loading) {
    return (
      <div className="p-6 bg-slate-800 rounded-lg">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-slate-700 rounded w-2/3"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const preferenceLabels = {
    orderApproved: "Order Approved",
    orderStarted: "Order Started",
    orderCompleted: "Order Completed",
    orderFailed: "Order Failed",
    orderCancelled: "Order Cancelled",
  };

  const preferenceDescriptions = {
    orderApproved:
      "Receive emails when your order is approved and moves to the queue",
    orderStarted: "Receive emails when printing of your order begins",
    orderCompleted:
      "Receive emails when your order is finished and ready for pickup",
    orderFailed: "Receive emails if your order fails during printing",
    orderCancelled: "Receive emails if your order is cancelled",
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">User Settings</h1>
        <p className="text-slate-300">
          Manage your notification preferences and account settings
        </p>
      </div>

      {/* User Profile Section */}
      <div className="bg-slate-800 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Profile Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Email
            </label>
            <div className="text-white bg-slate-700 px-3 py-2 rounded-md">
              {user?.email || "Not available"}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Display Name
            </label>
            <div className="text-white bg-slate-700 px-3 py-2 rounded-md">
              {user?.displayName || "Not set"}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Role
            </label>
            <div className="text-white bg-slate-700 px-3 py-2 rounded-md capitalize">
              {user?.role?.toLowerCase() || "User"}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              File Uploads Used
            </label>
            <div className="text-white bg-slate-700 px-3 py-2 rounded-md">
              {user?.fileUploadsUsed || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences Section */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Email Notification Preferences
        </h2>
        <p className="text-slate-300 mb-6">
          Choose which email notifications you'd like to receive about your 3D
          printing orders.
        </p>

        {message && (
          <div
            className={`p-4 rounded-md mb-6 ${
              message.type === "success"
                ? "bg-green-900/50 border border-green-500 text-green-200"
                : "bg-red-900/50 border border-red-500 text-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          {Object.entries(preferenceLabels).map(([key, label]) => (
            <div key={key} className="flex items-start space-x-3">
              <div className="flex items-center h-5">
                <input
                  id={key}
                  type="checkbox"
                  checked={preferences[key as keyof NotificationPreferences]}
                  onChange={(e) =>
                    handlePreferenceChange(
                      key as keyof NotificationPreferences,
                      e.target.checked
                    )
                  }
                  className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500 focus:ring-2"
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor={key}
                  className="text-white font-medium cursor-pointer"
                >
                  {label}
                </label>
                <p className="text-sm text-slate-400 mt-1">
                  {
                    preferenceDescriptions[
                      key as keyof typeof preferenceDescriptions
                    ]
                  }
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={savePreferences}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  );
}
