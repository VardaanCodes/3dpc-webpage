/** @format */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Download,
  TrendingUp,
  Clock,
  Target,
  FileBarChart,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TimelineData {
  [date: string]: {
    submitted: number;
    completed: number;
    failed: number;
  };
}

interface MaterialData {
  [material: string]: {
    total: number;
    colors: { [color: string]: number };
    completed: number;
  };
}

interface PerformanceData {
  avgProcessingTime: number;
  successRate: number;
  totalProcessed: number;
  totalFailed: number;
  processingTimeDistribution: {
    [range: string]: number;
  };
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export function Analytics() {
  const [period, setPeriod] = useState("30d");
  const [exportType, setExportType] = useState("orders");
  const { toast } = useToast();

  const { data: timelineData, isLoading: timelineLoading } =
    useQuery<TimelineData>({
      queryKey: ["/api/analytics/orders/timeline", period],
      queryFn: () =>
        apiRequest(
          "GET",
          `/api/analytics/orders/timeline?period=${period}`
        ).then((res) => res.json()),
    });

  const { data: materialData, isLoading: materialLoading } =
    useQuery<MaterialData>({
      queryKey: ["/api/analytics/materials"],
      queryFn: () =>
        apiRequest("GET", "/api/analytics/materials").then((res) => res.json()),
    });

  const { data: performanceData, isLoading: performanceLoading } =
    useQuery<PerformanceData>({
      queryKey: ["/api/analytics/performance"],
      queryFn: () =>
        apiRequest("GET", "/api/analytics/performance").then((res) =>
          res.json()
        ),
    });

  const handleExport = async () => {
    try {
      const response = await fetch(
        `/api/analytics/export/csv?type=${exportType}&period=${period}`
      );
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exportType}_${period}_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Export successful",
        description: "Data has been downloaded as CSV file.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Transform timeline data for chart
  const timelineChartData = timelineData
    ? Object.entries(timelineData)
        .map(([date, data]) => ({
          date: new Date(date).toLocaleDateString(),
          submitted: data.submitted,
          completed: data.completed,
          failed: data.failed,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  // Transform material data for chart
  const materialChartData = materialData
    ? Object.entries(materialData).map(([material, data]) => ({
        material,
        total: data.total,
        completed: data.completed,
        successRate:
          data.total > 0 ? ((data.completed / data.total) * 100).toFixed(1) : 0,
      }))
    : [];

  // Transform processing time distribution for chart
  const processingTimeChartData = performanceData
    ? Object.entries(performanceData.processingTimeDistribution).map(
        ([range, count]) => ({
          range,
          count,
        })
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">
            Analytics & Reporting
          </h2>
          <p className="text-slate-300">
            Detailed insights into 3D printing operations
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={exportType} onValueChange={setExportType}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="orders">Orders</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={handleExport}
            className="bg-green-600 hover:bg-green-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Avg Processing Time
            </CardTitle>
            <Clock className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {performanceData
                ? `${performanceData.avgProcessingTime} days`
                : "-"}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Success Rate
            </CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {performanceData ? `${performanceData.successRate}%` : "-"}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Total Processed
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {performanceData ? performanceData.totalProcessed : "-"}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Total Failed
            </CardTitle>
            <FileBarChart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {performanceData ? performanceData.totalFailed : "-"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Timeline Chart */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Order Timeline</CardTitle>
            <CardDescription className="text-slate-300">
              Orders submitted, completed, and failed over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {timelineLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timelineChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "6px",
                    }}
                    labelStyle={{ color: "#F3F4F6" }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="submitted"
                    stroke="#06B6D4"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="completed"
                    stroke="#10B981"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="failed"
                    stroke="#EF4444"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Material Usage Chart */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Material Usage</CardTitle>
            <CardDescription className="text-slate-300">
              Orders by material type and success rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            {materialLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={materialChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="material" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "6px",
                    }}
                    labelStyle={{ color: "#F3F4F6" }}
                  />
                  <Legend />
                  <Bar dataKey="total" fill="#06B6D4" />
                  <Bar dataKey="completed" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Processing Time Distribution */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">
              Processing Time Distribution
            </CardTitle>
            <CardDescription className="text-slate-300">
              How long orders typically take to complete
            </CardDescription>
          </CardHeader>
          <CardContent>
            {performanceLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={processingTimeChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ range, percent }) =>
                      `${range}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {processingTimeChartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "6px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Material Color Breakdown */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Material Details</CardTitle>
            <CardDescription className="text-slate-300">
              Popular colors by material type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {materialData &&
                Object.entries(materialData).map(([material, data]) => (
                  <div
                    key={material}
                    className="border border-slate-600 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-white">{material}</h4>
                      <span className="text-sm text-slate-300">
                        {data.total} orders
                      </span>
                    </div>
                    <div className="space-y-1">
                      {Object.entries(data.colors)
                        .slice(0, 3)
                        .map(([color, count]) => (
                          <div
                            key={color}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-slate-300">{color}</span>
                            <span className="text-slate-400">{count}</span>
                          </div>
                        ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-slate-600">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-300">Success Rate</span>
                        <span className="text-green-400">
                          {data.total > 0
                            ? `${((data.completed / data.total) * 100).toFixed(
                                1
                              )}%`
                            : "0%"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
