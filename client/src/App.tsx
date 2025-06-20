import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Navigation } from "@/components/Navigation";
import { Dashboard } from "@/pages/Dashboard";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import SuperAdminDashboard from "@/pages/SuperAdminDashboard";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/login" component={Login} />
      
      {/* Protected routes */}
      <Route path="/submit">
        <ProtectedRoute>
          <Navigation />
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/queue">
        <ProtectedRoute>
          <Navigation />
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/guidelines">
        <ProtectedRoute>
          <Navigation />
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/contact">
        <ProtectedRoute>
          <Navigation />
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin">
        <ProtectedRoute requiredRole="ADMIN">
          <Navigation />
          <Dashboard />
        </ProtectedRoute>
      </Route>

      <Route path="/superadmin">
        <ProtectedRoute requiredRole="SUPERADMIN">
          <Navigation />
          <SuperAdminDashboard />
        </ProtectedRoute>
      </Route>
      
      {/* Default redirect to submit */}
      <Route path="/">
        <ProtectedRoute>
          <Navigation />
          <Dashboard />
        </ProtectedRoute>
      </Route>
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <div className="min-h-screen bg-slate-900">
            <Toaster />
            <Router />
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
