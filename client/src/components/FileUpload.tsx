/** @format */

import { useState, useCallback } from "react";
import { Upload, X, FileCode, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

interface FileData {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  uploadStatus?: 'pending' | 'uploading' | 'completed' | 'error';
  uploadProgress?: number;
  uploadedFileId?: string;
  errorMessage?: string;
}

interface FileUploadProps {
  onFilesChange: (files: FileData[]) => void;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
}

export function FileUpload({
  onFilesChange,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  acceptedTypes = [".stl", ".gcode"],
}: FileUploadProps) {
  const [files, setFiles] = useState<FileData[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File "${file.name}" is too large. Maximum size is ${
        maxFileSize / 1024 / 1024
      }MB.`;
    }

    // Check file type
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!acceptedTypes.includes(fileExtension)) {
      return `File "${
        file.name
      }" has an unsupported format. Accepted formats: ${acceptedTypes.join(
        ", "
      )}`;
    }

    return null;
  };

  const uploadFile = async (fileData: FileData): Promise<void> => {
    try {
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === fileData.id 
          ? { ...f, uploadStatus: 'uploading', uploadProgress: 0 }
          : f
      ));

      const formData = new FormData();
      formData.append('file', fileData.file);

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      // Update file with uploaded metadata
      setFiles(prev => prev.map(f => 
        f.id === fileData.id 
          ? { 
              ...f, 
              uploadStatus: 'completed', 
              uploadProgress: 100,
              uploadedFileId: result.file.id 
            }
          : f
      ));

    } catch (error) {
      console.error('File upload error:', error);
      setFiles(prev => prev.map(f => 
        f.id === fileData.id 
          ? { 
              ...f, 
              uploadStatus: 'error', 
              uploadProgress: 0,
              errorMessage: error instanceof Error ? error.message : 'Upload failed' 
            }
          : f
      ));
    }
  };

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      setError(null);
      const fileArray = Array.from(newFiles);

      // Check total file count
      if (files.length + fileArray.length > maxFiles) {
        setError(`Cannot add more files. Maximum is ${maxFiles} files total.`);
        return;
      }

      const validFiles: FileData[] = [];
      const errors: string[] = [];

      fileArray.forEach((file) => {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(validationError);
        } else {
          const fileData: FileData = {
            id: `${file.name}-${Date.now()}-${Math.random()}`,
            name: file.name,
            size: file.size,
            type: file.type,
            file,
            uploadStatus: 'pending',
          };
          validFiles.push(fileData);
        }
      });

      if (errors.length > 0) {
        setError(errors[0]); // Show first error
        return;
      }

      const updatedFiles = [...files, ...validFiles];
      setFiles(updatedFiles);
      onFilesChange(updatedFiles);

      // Auto-upload files
      validFiles.forEach(fileData => {
        uploadFile(fileData);
      });
    },
    [files, maxFiles, maxFileSize, acceptedTypes, onFilesChange]
  );

  const removeFile = (fileId: string) => {
    const updatedFiles = files.filter((f) => f.id !== fileId);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
    setError(null);
  };

  const retryUpload = (fileId: string) => {
    const fileData = files.find(f => f.id === fileId);
    if (fileData) {
      uploadFile(fileData);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      addFiles(e.target.files);
    }
    e.target.value = "";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileStatusIcon = (status?: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="text-green-500 h-4 w-4" />;
      case 'uploading':
        return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-500"></div>;
      case 'error':
        return <AlertCircle className="text-red-500 h-4 w-4" />;
      default:
        return <FileCode className="text-cyan-500 h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? "border-cyan-500 bg-slate-700"
            : "border-slate-600 hover:border-cyan-500"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-300 mb-2">
          Drop your files here
        </p>
        <p className="text-sm text-gray-400 mb-4">or click to browse</p>

        <input
          type="file"
          multiple
          accept={acceptedTypes.join(",")}
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
        />

        <Button
          asChild
          variant="outline"
          className="bg-cyan-500 hover:bg-cyan-600 text-white border-cyan-500"
        >
          <label htmlFor="file-upload" className="cursor-pointer">
            Browse Files
          </label>
        </Button>

        <p className="text-xs text-gray-400 mt-4">
          Supported formats: {acceptedTypes.join(", ")}
          <br />
          Max file size: {maxFileSize / 1024 / 1024}MB per file
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-white">Files</h3>
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between bg-slate-800 rounded-lg p-3"
            >
              <div className="flex items-center space-x-3">
                {getFileStatusIcon(file.uploadStatus)}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-white">
                      {file.name}
                    </span>
                    {file.uploadStatus === 'completed' && (
                      <span className="text-xs text-green-400">✓ Uploaded</span>
                    )}
                    {file.uploadStatus === 'error' && (
                      <span className="text-xs text-red-400">✗ Failed</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <p className="text-xs text-gray-400">
                      {formatFileSize(file.size)}
                    </p>
                    {file.uploadStatus === 'uploading' && (
                      <p className="text-xs text-cyan-400">Uploading...</p>
                    )}
                    {file.uploadStatus === 'error' && file.errorMessage && (
                      <p className="text-xs text-red-400">{file.errorMessage}</p>
                    )}
                  </div>
                  {file.uploadStatus === 'uploading' && (
                    <Progress value={file.uploadProgress || 0} className="w-full mt-1 h-1" />
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {file.uploadStatus === 'error' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => retryUpload(file.id)}
                    className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/20"
                  >
                    Retry
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress */}
      <div className="bg-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Upload Limits</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Files Used</span>
            <span className="text-white font-medium">
              {files.length}/{maxFiles}
            </span>
          </div>
          <Progress
            value={(files.length / maxFiles) * 100}
            className="w-full"
          />
          <p className="text-xs text-gray-400">
            Files are automatically uploaded and will be associated with your print request.
          </p>
        </div>
      </div>
    </div>
  );
}
