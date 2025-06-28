/** @format */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { OrderStatusBadge } from "@/components/OrderStatusBadge";
import { useAppConfig } from "@/hooks/useAppConfig";
import { type Order, type Club, type User as AppUser } from "@shared/schema";
import {
  Eye,
  Download,
  Calendar,
  User,
  Users,
  FileText,
  Package,
  Palette,
  MessageSquare,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";

interface OrderWithDetails extends Order {
  club?: Club;
  user?: AppUser;
}

interface OrderDetailsDialogProps {
  order: OrderWithDetails;
  children?: React.ReactNode;
}

export function OrderDetailsDialog({
  order,
  children,
}: OrderDetailsDialogProps) {
  const [open, setOpen] = useState(false);
  const { config } = useAppConfig();
  const { data: files = [] } = useQuery<any[]>({
    queryKey: [`/api/orders/${order.id}/files`],
    enabled: open,
  });
  const handleDownloadFile = async (fileId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/files/${fileId}/download`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
      });

      if (!response.ok) {
        if (response.status === 410) {
          throw new Error(
            "File has expired and is no longer available for download"
          );
        } else if (response.status === 404) {
          throw new Error("File not found");
        } else if (response.status === 403) {
          throw new Error(
            "Access denied - you don't have permission to download this file"
          );
        }
        throw new Error("Failed to download file");
      }

      // Get the blob from the response
      const blob = await response.blob();

      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the object URL
      window.URL.revokeObjectURL(url);

      // Show success message
      // toast({ title: "Download started", description: `Downloading ${fileName}` });
    } catch (error) {
      console.error("Error downloading file:", error);
      // Show error message
      // toast({
      //   title: "Download failed",
      //   description: error instanceof Error ? error.message : "Unknown error occurred",
      //   variant: "destructive"
      // });
    }
  };

  const isFileExpired = (submittedAt: string) => {
    const submitted = new Date(submittedAt);
    const expiryDate = new Date(submitted);
    expiryDate.setDate(expiryDate.getDate() + config.fileDownloadDays);
    return new Date() > expiryDate;
  };

  const getExpiryDate = (submittedAt: string) => {
    const submitted = new Date(submittedAt);
    const expiryDate = new Date(submitted);
    expiryDate.setDate(expiryDate.getDate() + config.fileDownloadDays);
    return expiryDate;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="ghost"
            size="sm"
            className="text-cyan-400 hover:text-cyan-300"
          >
            <Eye className="mr-1 h-4 w-4" />
            View Details
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-cyan-500" />
            <span>Order Details</span>
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Complete information for order {order.orderId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Header */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-white">
                {order.projectName}
              </h3>
              <p className="text-sm text-cyan-400 font-mono">{order.orderId}</p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          <Separator className="bg-slate-700" />

          {/* Order Information Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Submitted by</p>
                  <p className="text-white">
                    {order.user?.displayName || "Unknown User"}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Club/Team</p>
                  <p className="text-white">{order.club?.name || "No club"}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Submitted</p>{" "}
                  <p className="text-white">
                    {order.submittedAt
                      ? format(
                          new Date(order.submittedAt),
                          "MMMM dd, yyyy 'at' h:mm a"
                        )
                      : "Unknown"}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Package className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Material</p>
                  <p className="text-white">{order.material}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Palette className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-400">Color</p>
                  <p className="text-white">{order.color}</p>
                </div>
              </div>

              {order.eventDeadline && (
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-400">Event Deadline</p>
                    <p className="text-white">
                      {format(new Date(order.eventDeadline), "MMMM dd, yyyy")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Special Instructions */}
          {order.specialInstructions && (
            <>
              <Separator className="bg-slate-700" />
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4 text-gray-400" />
                  <h4 className="text-sm font-medium text-gray-400">
                    Special Instructions
                  </h4>
                </div>
                <p className="text-white bg-slate-900 p-3 rounded-lg">
                  {order.specialInstructions}
                </p>
              </div>
            </>
          )}

          {/* File Attachments */}
          <Separator className="bg-slate-700" />
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <h4 className="text-sm font-medium text-gray-400">
                Attached Files ({files.length})
              </h4>
            </div>{" "}
            {files.length === 0 ? (
              <p className="text-gray-500 text-sm">No files attached</p>
            ) : (
              <div className="space-y-2">
                {files.map((file: any) => {
                  const expired = isFileExpired(
                    order.submittedAt || new Date().toISOString()
                  );
                  const expiryDate = getExpiryDate(
                    order.submittedAt || new Date().toISOString()
                  );
                  const daysUntilExpiry = Math.ceil(
                    (expiryDate.getTime() - new Date().getTime()) /
                      (1000 * 60 * 60 * 24)
                  );

                  return (
                    <div
                      key={file.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        expired
                          ? "bg-red-900/20 border-red-800"
                          : daysUntilExpiry <= 7
                          ? "bg-yellow-900/20 border-yellow-800"
                          : "bg-slate-900 border-slate-700"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <FileText className="h-4 w-4 text-cyan-500" />
                        <div>
                          <p className="text-sm font-medium text-white">
                            {file.fileName}
                          </p>
                          <div className="flex items-center space-x-2 text-xs text-gray-400">
                            <span>
                              {(file.size / 1024 / 1024).toFixed(2)} MB
                            </span>
                            <span>•</span>
                            <span>
                              Uploaded{" "}
                              {format(
                                new Date(file.createdAt || order.submittedAt),
                                "MMM dd, yyyy"
                              )}
                            </span>
                            {!expired && (
                              <>
                                <span>•</span>
                                <span
                                  className={
                                    daysUntilExpiry <= 7
                                      ? "text-yellow-400"
                                      : "text-gray-400"
                                  }
                                >
                                  {daysUntilExpiry > 0
                                    ? `Expires in ${daysUntilExpiry} days`
                                    : "Expires today"}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {expired && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-red-900 text-red-300 border-red-800"
                          >
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Expired
                          </Badge>
                        )}
                        {!expired && daysUntilExpiry <= 7 && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-yellow-900 text-yellow-300 border-yellow-800"
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            Expires soon
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleDownloadFile(file.id, file.fileName)
                          }
                          disabled={expired}
                          className="text-cyan-400 hover:text-cyan-300 disabled:text-gray-500"
                          title={expired ? "File has expired" : "Download file"}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* File expiration notice */}
            <div className="mt-4 p-3 bg-slate-900 rounded-lg border border-slate-700">
              <div className="flex items-start space-x-2">
                <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                <div className="text-xs text-gray-400">
                  <p className="font-medium mb-1">File Download Policy</p>
                  <p>
                    Files are available for download for{" "}
                    {config.fileDownloadDays} days after submission.
                    {files.some((file: any) =>
                      isFileExpired(
                        order.submittedAt || new Date().toISOString()
                      )
                    ) && (
                      <span className="text-red-400">
                        {" "}
                        Some files have expired and are no longer available.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Providing Filament Badge */}
          {order.providingFilament && (
            <div className="flex items-center space-x-2">
              <Badge className="bg-green-900 text-green-300 border-green-800">
                Providing Own Filament
              </Badge>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
