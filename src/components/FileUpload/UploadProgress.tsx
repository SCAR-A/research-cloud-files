import React from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { formatFileSize } from '../../utils/fileUtils';

interface UploadProgressProps {
  fileName: string;
  fileSize: number;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export function UploadProgress({
  fileName,
  fileSize,
  progress,
  status,
  error,
}: UploadProgressProps) {
  return (
    <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow">
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-900">{fileName}</span>
          <span className="text-sm text-gray-500">{formatFileSize(fileSize)}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              status === 'error'
                ? 'bg-red-500'
                : status === 'success'
                ? 'bg-green-500'
                : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
      <div className="flex-shrink-0">
        {status === 'uploading' && (
          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
        )}
        {status === 'success' && (
          <CheckCircle className="h-5 w-5 text-green-500" />
        )}
        {status === 'error' && (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
      </div>
    </div>
  );
}