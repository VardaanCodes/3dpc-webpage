import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { useAuth } from "@/components/AuthProvider";
import { type Order, type Club, type User as AppUser } from "@shared/schema";
import { Clock, Play, CheckCircle, AlertTriangle, FileCode, Download } from "lucide-react";
import { format } from "date-fns";

interface OrderWithDetails extends Order {
  club?: Club;
  user?: AppUser;
}

export function QueueStatus() {
  const { user } = useAuth();
  
  const { data: orders = [], isLoading } = useQuery<OrderWithDetails[]>({
    queryKey: ["/api/orders"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats/user"],
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
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
        <h2 className="text-3xl font-bold text-white mb-2">Your Print Queue</h2>
        <p className="text-gray-400">Track the status of your submitted print requests.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Clock className="text-yellow-500 text-2xl h-8 w-8" />
              <div>
                <p className="text-2xl font-bold text-white">{stats?.pending || 0}</p>
                <p className="text-sm text-gray-400">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <Play className="text-cyan-500 text-2xl h-8 w-8" />
              <div>
                <p className="text-2xl font-bold text-white">{stats?.inProgress || 0}</p>
                <p className="text-sm text-gray-400">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="text-green-500 text-2xl h-8 w-8" />
              <div>
                <p className="text-2xl font-bold text-white">{stats?.completed || 0}</p>
                <p className="text-sm text-gray-400">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="text-red-500 text-2xl h-8 w-8" />
              <div>
                <p className="text-2xl font-bold text-white">{stats?.failed || 0}</p>
                <p className="text-sm text-gray-400">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Orders Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Orders</CardTitle>
          <CardDescription>Your print requests and their current status</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <div className="text-center py-12">
              <FileCode className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No print requests yet</h3>
              <p className="text-gray-400 mb-4">Submit your first 3D print request to get started!</p>
              <Button className="bg-cyan-500 hover:bg-cyan-600">
                Submit Your First Print
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Files
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-cyan-400 font-mono text-sm">{order.orderId}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-white">{order.projectName}</p>
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
                          <FileCode className="text-cyan-500 h-4 w-4" />
                          <span className="text-sm text-white">
                            {Array.isArray(order.files) ? order.files.length : 0} files
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300">
                          {order.status === "finished" ? (
                            <>
                              <Download className="mr-1 h-4 w-4" />
                              Download
                            </>
                          ) : (
                            "View Details"
                          )}
                        </Button>
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
