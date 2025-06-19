import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Order, type Club, type User as AppUser, OrderStatus } from "@shared/schema";
import { 
  Layers, 
  Download, 
  CheckSquare, 
  Eye, 
  Check, 
  X, 
  Play, 
  Clock,
  CheckCircle,
  AlertTriangle,
  FileCode,
  Users
} from "lucide-react";
import { format } from "date-fns";

interface OrderWithDetails extends Order {
  club?: Club;
  user?: AppUser;
}

export function AdminDashboard() {
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders"],
  });

  const { data: batches = [] } = useQuery({
    queryKey: ["/api/batches"],
  });

  const { data: adminStats } = useQuery({
    queryKey: ["/api/stats/admin"],
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ orderId, updates }: { orderId: number; updates: any }) => {
      const response = await apiRequest("PATCH", `/api/orders/${orderId}`, updates);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/admin"] });
      toast({
        title: "Order updated successfully",
        description: "The order status has been updated.",
      });
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: async (data: { name: string; orderIds: number[] }) => {
      const response = await apiRequest("POST", "/api/batches", {
        name: data.name,
        status: "created"
      });
      const batch = await response.json();
      
      // Update selected orders to be part of this batch
      await Promise.all(
        data.orderIds.map(orderId =>
          apiRequest("PATCH", `/api/orders/${orderId}`, { batchId: batch.id })
        )
      );
      
      return batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/batches"] });
      setSelectedOrders([]);
      toast({
        title: "Batch created successfully",
        description: "Selected orders have been grouped into a new batch.",
      });
    },
    onError: (error) => {
      toast({
        title: "Batch creation failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredOrders = orders.filter(order => {
    if (statusFilter === "all") return true;
    return order.status === statusFilter;
  });

  const handleOrderSelection = (orderId: number, checked: boolean) => {
    if (checked) {
      setSelectedOrders([...selectedOrders, orderId]);
    } else {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(filteredOrders.map(order => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleApproveOrder = (orderId: number) => {
    updateOrderMutation.mutate({
      orderId,
      updates: { status: OrderStatus.APPROVED, reason: "Approved by admin" }
    });
  };

  const handleRejectOrder = (orderId: number) => {
    updateOrderMutation.mutate({
      orderId,
      updates: { 
        status: OrderStatus.CANCELLED, 
        cancellationReason: "Rejected by admin",
        reason: "Order rejected"
      }
    });
  };

  const handleStartOrder = (orderId: number) => {
    updateOrderMutation.mutate({
      orderId,
      updates: { status: OrderStatus.STARTED, reason: "Print started" }
    });
  };

  const handleCreateBatch = () => {
    if (selectedOrders.length === 0) {
      toast({
        title: "No orders selected",
        description: "Please select at least one order to create a batch.",
        variant: "destructive",
      });
      return;
    }

    const batchName = `Batch_${new Date().toISOString().split('T')[0]}_${selectedOrders.length}orders`;
    createBatchMutation.mutate({
      name: batchName,
      orderIds: selectedOrders
    });
  };

  const handleBulkApprove = () => {
    if (selectedOrders.length === 0) {
      toast({
        title: "No orders selected",
        description: "Please select at least one order to approve.",
        variant: "destructive",
      });
      return;
    }

    selectedOrders.forEach(orderId => {
      updateOrderMutation.mutate({
        orderId,
        updates: { status: OrderStatus.APPROVED, reason: "Bulk approved by admin" }
      });
    });
    setSelectedOrders([]);
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-slate-800 border-slate-700">
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-8 bg-slate-700 rounded mb-2"></div>
                  <div className="h-4 bg-slate-700 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Administrative Dashboard</h2>
        <p className="text-gray-400">Manage print queue, process orders, and handle batch operations.</p>
      </div>

      {/* Admin Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={handleCreateBatch}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
              disabled={selectedOrders.length === 0}
            >
              <Layers className="mr-2 h-4 w-4" />
              Create New Batch ({selectedOrders.length})
            </Button>
            <Button 
              onClick={handleBulkApprove}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={selectedOrders.length === 0}
            >
              <CheckSquare className="mr-2 h-4 w-4" />
              Bulk Approve ({selectedOrders.length})
            </Button>
            <Button 
              variant="outline" 
              className="w-full border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white"
            >
              <Download className="mr-2 h-4 w-4" />
              Export Queue Data
            </Button>
          </CardContent>
        </Card>

        {/* Queue Statistics */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Queue Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Pending</span>
              <span className="text-yellow-400 font-medium">{adminStats?.totalPending || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">In Progress</span>
              <span className="text-cyan-400 font-medium">{adminStats?.inProgress || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Batches Active</span>
              <span className="text-green-400 font-medium">{adminStats?.batchesActive || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Avg. Processing</span>
              <span className="text-gray-300">{adminStats?.avgProcessingTime || "N/A"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Batch Management */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">Active Batches</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {batches.length === 0 ? (
              <p className="text-gray-400 text-sm">No active batches</p>
            ) : (
              batches.slice(0, 3).map((batch: any) => (
                <div key={batch.id} className="flex items-center justify-between bg-slate-900 rounded-lg p-3">
                  <div>
                    <p className="text-sm font-medium text-white">{batch.name}</p>
                    <p className="text-xs text-gray-400">Status: {batch.status}</p>
                  </div>
                  <Play className="text-cyan-500 h-4 w-4" />
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Admin Queue Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">All Print Orders</CardTitle>
              <CardDescription>Manage and process all print requests</CardDescription>
            </div>
            <div className="flex items-center space-x-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-slate-900 border-slate-600 text-white w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="started">Started</SelectItem>
                  <SelectItem value="finished">Finished</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <FileCode className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No orders found</h3>
              <p className="text-gray-400">No orders match the current filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <Checkbox
                        checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Checkbox
                          checked={selectedOrders.includes(order.id)}
                          onCheckedChange={(checked) => handleOrderSelection(order.id, checked as boolean)}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-white">{order.projectName}</p>
                          <p className="text-xs text-cyan-400 font-mono">{order.orderId}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm text-white">{order.user?.displayName}</p>
                          <p className="text-xs text-gray-400">{order.club?.name || "No club"}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <OrderStatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {format(new Date(order.submittedAt), "MMM dd, yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {order.status === OrderStatus.SUBMITTED && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleApproveOrder(order.id)}
                                className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRejectOrder(order.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {order.status === OrderStatus.APPROVED && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStartOrder(order.id)}
                              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
