/** @format */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Download, Trash2, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FileData {
  id: string;
  fileName: string;
  contentType: string;
  size: number;
  uploadedBy: number;
  orderId?: number;
  createdAt: string;
  expiresAt?: string;
}

interface FileManagerProps {
  orderId?: number;
}

export function FileManager({ orderId }: FileManagerProps) {
  const [selectedFile, setSelectedFile] = useState<FileData | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query for files
  const { data: files = [], isLoading } = useQuery<FileData[]>({
    queryKey: orderId ? ["/api/files/order", orderId] : ["/api/files"],
    queryFn: async () => {
      const endpoint = orderId ? `/api/files/order/${orderId}` : "/api/files";
      const response = await apiRequest("GET", endpoint);
      const data = await response.json();
      return data.files || [];
    },
  });

  const downloadFile = async (fileId: string, fileName: string) => {
    try {
      const response = await apiRequest("GET", `/api/files/download/${fileId}`);

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download started",
        description: `${fileName} is being downloaded.`,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download the file.",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading files...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">
          {orderId ? `Files for Order #${orderId}` : "File Management"}
        </h2>
        <Badge variant="outline" className="text-white">
          {files.length} file(s)
        </Badge>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No files found.</div>
      ) : (
        <div className="bg-slate-800 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-gray-300">File Name</TableHead>
                <TableHead className="text-gray-300">Type</TableHead>
                <TableHead className="text-gray-300">Size</TableHead>
                <TableHead className="text-gray-300">Uploaded</TableHead>
                <TableHead className="text-gray-300">Expires</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.map((file) => (
                <TableRow key={file.id} className="border-slate-700">
                  <TableCell className="text-white font-medium">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4 text-cyan-400" />
                      <span>{file.fileName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    <Badge variant="secondary" className="text-xs">
                      {file.contentType.split("/").pop()?.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {formatFileSize(file.size)}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {formatDate(file.createdAt)}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {file.expiresAt ? formatDate(file.expiresAt) : "N/A"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFile(file)}
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-slate-800 border-slate-700">
                          <DialogHeader>
                            <DialogTitle className="text-white">
                              File Details
                            </DialogTitle>
                          </DialogHeader>
                          {selectedFile && (
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium text-gray-300">
                                  File Name
                                </label>
                                <p className="text-white">
                                  {selectedFile.fileName}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-300">
                                  Content Type
                                </label>
                                <p className="text-white">
                                  {selectedFile.contentType}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-300">
                                  Size
                                </label>
                                <p className="text-white">
                                  {formatFileSize(selectedFile.size)}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-300">
                                  Uploaded By
                                </label>
                                <p className="text-white">
                                  User ID: {selectedFile.uploadedBy}
                                </p>
                              </div>
                              {selectedFile.orderId && (
                                <div>
                                  <label className="text-sm font-medium text-gray-300">
                                    Order ID
                                  </label>
                                  <p className="text-white">
                                    {selectedFile.orderId}
                                  </p>
                                </div>
                              )}
                              <div>
                                <label className="text-sm font-medium text-gray-300">
                                  Created At
                                </label>
                                <p className="text-white">
                                  {formatDate(selectedFile.createdAt)}
                                </p>
                              </div>
                              {selectedFile.expiresAt && (
                                <div>
                                  <label className="text-sm font-medium text-gray-300">
                                    Expires At
                                  </label>
                                  <p className="text-white">
                                    {formatDate(selectedFile.expiresAt)}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => downloadFile(file.id, file.fileName)}
                        className="text-green-400 hover:text-green-300"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
