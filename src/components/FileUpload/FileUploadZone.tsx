import React, { useCallback } from 'react';
import { Upload } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { uploadFile } from '../../services/fileService';
import { formatFileSize } from '../../utils/fileUtils';

interface FileUploadZoneProps {
  onUploadStart: (file: File) => string;
  onUploadProgress: (id: string, progress: number) => void;
  onUploadSuccess: (id: string) => void;
  onUploadError: (id: string, error: string) => void;
}

export function FileUploadZone({
  onUploadStart,
  onUploadProgress,
  onUploadSuccess,
  onUploadError
}: FileUploadZoneProps) {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const uploadId = onUploadStart(file);
      
      try {
        await uploadFile(file, (progress) => {
          onUploadProgress(uploadId, progress);
        });
        
        onUploadSuccess(uploadId);
      } catch (error) {
        onUploadError(uploadId, error instanceof Error ? error.message : '上传失败');
      }
    }
  }, [onUploadStart, onUploadProgress, onUploadSuccess, onUploadError]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  return (
    <div
      {...getRootProps()}
      className={`border-4 border-dashed rounded-lg h-48 flex items-center justify-center transition-colors ${
        isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
      }`}
    >
      <input {...getInputProps()} />
      <div className="text-center px-6">
        <Upload className={`mx-auto h-12 w-12 ${isDragActive ? 'text-blue-400' : 'text-gray-400'}`} />
        <p className="mt-4 text-lg font-medium text-gray-900">
          {isDragActive ? '释放文件以上传' : '点击或拖拽文件到此处上传'}
        </p>
        <p className="mt-2 text-sm text-gray-500">
          支持任意文件类型，单个文件最大 {formatFileSize(100 * 1024 * 1024)}
        </p>
      </div>
    </div>
  );
}