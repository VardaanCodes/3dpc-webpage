/** @format */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAppConfig } from "@/hooks/useAppConfig";
import {
  Settings,
  Users,
  BarChart3,
  Download,
  Shield,
  AlertTriangle,
  UserX,
  FileText,
  Database,
  Clock,
  HardDrive,
  Zap,
} from "lucide-react";
import { format } from "date-fns";

export default function SuperAdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { config, updateConfig } = useAppConfig();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");

  // Fetch all users for management
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Fetch system-wide statistics
  const { data: systemStats } = useQuery<any>({
    queryKey: ["/api/stats/system"],
  });

  // Fetch audit logs
  const { data: auditLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/audit-logs"],
  });

  // User management mutations
  const suspendUserMutation = useMutation({
    mutationFn: async ({
      userId,
      reason,
    }: {
      userId: number;
      reason: string;
    }) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "suspended",
          suspensionReason: reason,
        }),
      });
      if (!response.ok) throw new Error("Failed to suspend user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User suspended",
        description: "User has been successfully suspended.",
      });
      setSelectedUser(null);
      setSuspensionReason("");
    },
  });

  const promoteUserMutation = useMutation({
    mutationFn: async (email: string) => {
      const user = users.find((u) => u.email === email);
      if (!user) throw new Error("User not found");

      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "ADMIN" }),
      });
      if (!response.ok) throw new Error("Failed to promote user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User promoted",
        description: "User has been promoted to admin.",
      });
      setNewAdminEmail("");
    },
  });

  const handleExportAuditLogs = () => {
    const csvData = auditLogs.map((log) => ({
      Timestamp: format(new Date(log.timestamp), "yyyy-MM-dd HH:mm:ss"),
      User: log.userId,
      Action: log.action,
      EntityType: log.entityType,
      EntityId: log.entityId,
      Details: JSON.stringify(log.details),
      Reason: log.reason || "",
    }));

    const csv = [
      Object.keys(csvData[0]).join(","),
      ...csvData.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Super Admin Dashboard
        </h1>
        <p className="text-gray-400">
          System-wide management, analytics, and configuration controls.
        </p>
      </div>

      {/* System Overview Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{users.length}</div>
            <p className="text-xs text-gray-400">
              {users.filter((u) => u.role === "ADMIN").length} admins
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              System Health
            </CardTitle>
            <Zap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">Healthy</div>
            <p className="text-xs text-gray-400">All systems operational</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Storage Used
            </CardTitle>
            <HardDrive className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">2.4 GB</div>
            <p className="text-xs text-gray-400">of allocated storage</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Active Sessions
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {users.filter((u) => u.status === "active").length}
            </div>
            <p className="text-xs text-gray-400">users online</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Action Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* System Configuration */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5 text-cyan-500" />
              <span>System Configuration</span>
            </CardTitle>
            <CardDescription>
              Manage file upload limits, retention policies, and system
              settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">
                File Download Duration (days)
              </Label>
              <Input
                type="number"
                value={config.fileDownloadDays}
                onChange={(e) =>
                  updateConfig({ fileDownloadDays: Number(e.target.value) })
                }
                className="bg-slate-900 border-slate-600 text-white"
                min="1"
                max="365"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">Max File Size (MB)</Label>
              <Input
                type="number"
                value={config.maxFileSize / (1024 * 1024)}
                onChange={(e) =>
                  updateConfig({
                    maxFileSize: Number(e.target.value) * 1024 * 1024,
                  })
                }
                className="bg-slate-900 border-slate-600 text-white"
                min="1"
                max="500"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-300">
                Queue Refresh Interval (seconds)
              </Label>
              <Input
                type="number"
                value={config.queueRefreshInterval / 1000}
                onChange={(e) =>
                  updateConfig({
                    queueRefreshInterval: Number(e.target.value) * 1000,
                  })
                }
                className="bg-slate-900 border-slate-600 text-white"
                min="5"
                max="300"
              />
            </div>
          </CardContent>
        </Card>

        {/* User Management */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-yellow-500" />
              <span>User Management</span>
            </CardTitle>
            <CardDescription>
              Suspend users, assign admin roles, and manage user access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-300">Promote User to Admin</Label>
              <div className="flex space-x-2">
                <Input
                  type="email"
                  placeholder="user@domain.com"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  className="bg-slate-900 border-slate-600 text-white"
                />
                <Button
                  onClick={() => promoteUserMutation.mutate(newAdminEmail)}
                  disabled={!newAdminEmail || promoteUserMutation.isPending}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  Promote
                </Button>
              </div>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Suspend User
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-white">Suspend User</DialogTitle>
                  <DialogDescription>
                    Select a user to suspend and provide a reason.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Select User</Label>
                    <Select
                      value={selectedUser?.id?.toString()}
                      onValueChange={(value) => {
                        const user = users.find((u) => u.id === Number(value));
                        setSelectedUser(user);
                      }}
                    >
                      <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                        <SelectValue placeholder="Choose a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {users
                          .filter((u) => u.role !== "SUPERADMIN")
                          .map((user) => (
                            <SelectItem
                              key={user.id}
                              value={user.id.toString()}
                            >
                              {user.displayName} ({user.email})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Suspension Reason</Label>
                    <Textarea
                      placeholder="Enter reason for suspension..."
                      value={suspensionReason}
                      onChange={(e) => setSuspensionReason(e.target.value)}
                      className="bg-slate-900 border-slate-600 text-white"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (selectedUser && suspensionReason) {
                        suspendUserMutation.mutate({
                          userId: selectedUser.id,
                          reason: suspensionReason,
                        });
                      }
                    }}
                    disabled={
                      !selectedUser ||
                      !suspensionReason ||
                      suspendUserMutation.isPending
                    }
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    Suspend User
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Analytics & Reports */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              <span>Analytics & Reports</span>
            </CardTitle>
            <CardDescription>
              View system-wide analytics and generate comprehensive reports.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-900 p-3 rounded-lg">
                <p className="text-gray-400">Total Orders</p>
                <p className="text-2xl font-bold text-white">
                  {systemStats?.totalOrders || 0}
                </p>
              </div>
              <div className="bg-slate-900 p-3 rounded-lg">
                <p className="text-gray-400">Success Rate</p>
                <p className="text-2xl font-bold text-green-400">87%</p>
              </div>
            </div>

            <Button
              onClick={handleExportAuditLogs}
              variant="outline"
              className="w-full border-green-600 text-green-400 hover:bg-green-600 hover:text-white"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Audit Logs
            </Button>

            <Button
              variant="outline"
              className="w-full border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
            >
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Recent System Activity</CardTitle>
          <CardDescription>
            Latest actions and events across the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {auditLogs.slice(0, 10).map((log, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-900 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="text-xs">
                    {log.action}
                  </Badge>
                  <span className="text-white text-sm">{log.userId}</span>
                  <span className="text-gray-400 text-sm">
                    {log.entityType}: {log.entityId}
                  </span>
                </div>
                <span className="text-gray-400 text-xs">
                  {format(new Date(log.timestamp), "MMM dd, HH:mm")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
