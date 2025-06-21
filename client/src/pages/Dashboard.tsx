/** @format */

import { useLocation } from "wouter";
import { SubmitPrint } from "./SubmitPrint";
import { QueueStatus } from "./QueueStatus";
import { Guidelines } from "./Guidelines";
import { Contact } from "./Contact";
import { AdminDashboard } from "./AdminDashboard";
import { useAuth } from "@/components/AuthProvider";

export function Dashboard() {
  const [location] = useLocation();
  const { user } = useAuth();

  const renderContent = () => {
    switch (location) {
      case "/submit":
        return <SubmitPrint />;
      case "/queue":
        return <QueueStatus />;
      case "/guidelines":
        return <Guidelines />;
      case "/contact":
        return <Contact />;
      case "/admin":
        if (user?.role === "admin" || user?.role === "superadmin") {
          return <AdminDashboard />;
        }
        return <QueueStatus />; // Fallback for unauthorized users
      default:
        return <SubmitPrint />; // Default to submit print
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen bg-slate-900">
      {renderContent()}
    </main>
  );
}
