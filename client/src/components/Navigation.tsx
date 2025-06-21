/** @format */

import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "./AuthProvider";
import { logout } from "@/lib/auth";
import { UserRole } from "@shared/schema";
import { Printer, Plus, List, Book, Mail, LogOut, Menu } from "lucide-react";
import { useState } from "react";

export function Navigation() {
  const [, setLocation] = useLocation();
  const { user, firebaseUser, setGuestUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/submit", label: "Submit Print", icon: Plus },
    { path: "/queue", label: "Queue Status", icon: List },
    { path: "/guidelines", label: "Guidelines", icon: Book },
    { path: "/contact", label: "Contact", icon: Mail },
  ];

  // Add admin panel for admin/superadmin/guest users
  if (
    user?.role === UserRole.enum.ADMIN ||
    user?.role === UserRole.enum.SUPERADMIN ||
    user?.role === UserRole.enum.GUEST
  ) {
    navItems.splice(2, 0, {
      path: "/admin",
      label: "Admin Dashboard",
      icon: List,
    });
  }

  if (
    user?.role === UserRole.enum.SUPERADMIN ||
    user?.role === UserRole.enum.GUEST
  ) {
    navItems.splice(3, 0, {
      path: "/superadmin",
      label: "Super Admin",
      icon: List,
    });
  }

  const handleLogout = async () => {
    try {
      if (user?.role === UserRole.enum.GUEST) {
        setGuestUser(null);
      } else {
        await logout();
      }
      setLocation("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Printer className="text-cyan-500 text-2xl" />
              <h1 className="text-xl font-bold text-white">3DPC Queue</h1>
            </div>
          </div>

          {/* Navigation Tabs - Desktop */}
          <nav className="hidden md:flex space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    isActive
                      ? "text-white border-cyan-500"
                      : "text-gray-300 hover:text-white border-transparent hover:border-cyan-500"
                  }`}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Profile */}
          <div className="flex items-center space-x-4">
            {/* File Limit Indicator - Desktop */}
            <div className="hidden md:flex items-center space-x-2 text-sm">
              <span className="text-gray-400">Files:</span>
              <span className="text-cyan-500 font-medium">
                {user?.fileUploadsUsed || 0}
              </span>
              <span className="text-gray-400">/</span>
              <span className="text-gray-300">10</span>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="w-10 h-10 border-2 border-cyan-500">
                  <AvatarImage src={firebaseUser?.photoURL || undefined} />
                  <AvatarFallback className="bg-slate-700 text-white">
                    {user?.displayName?.charAt(0).toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <Badge
                  variant="secondary"
                  className="absolute -top-1 -right-1 bg-cyan-500 text-white text-xs h-5 w-5 flex items-center justify-center p-0"
                >
                  {user?.fileUploadsUsed || 0}
                </Badge>
              </div>

              <div className="hidden md:block">
                <p className="text-sm font-medium text-white">
                  {user?.displayName}
                </p>
                <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
              </div>
            </div>

            <Button
              variant="destructive"
              size="sm"
              onClick={handleLogout}
              className="hidden md:flex"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-700">
            <nav className="flex overflow-x-auto px-4 py-2 space-x-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex flex-col items-center space-y-1 px-3 py-2 text-xs font-medium transition-colors ${
                      isActive
                        ? "text-cyan-500"
                        : "text-gray-400 hover:text-white"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <button
                onClick={handleLogout}
                className="flex flex-col items-center space-y-1 px-3 py-2 text-xs font-medium text-gray-400 hover:text-white transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
