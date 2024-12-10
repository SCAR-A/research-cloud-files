import React, { useState, useCallback } from 'react';
import { FileUploadZone } from './components/FileUpload/FileUploadZone';
import { UploadProgress } from './components/FileUpload/UploadProgress';
import { FileList } from './components/FileList/FileList';

interface UploadStatus {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

function App() {
  const [uploads, setUploads] = useState<UploadStatus[]>([]);
  const [shouldRefreshList, setShouldRefreshList] = useState(false);

  const handleUploadStart = useCallback((file: File) => {
    const uploadId = Math.random().toString(36).substring(7);
    setUploads(prev => [...prev, {
      id: uploadId,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      status: 'uploading'
    }]);
    return uploadId;
  }, []);

  const handleUploadProgress = useCallback((id: string, progress: number) => {
    setUploads(prev => prev.map(upload => 
      upload.id === id ? { ...upload, progress } : upload
    ));
  }, []);

  const handleUploadSuccess = useCallback((id: string) => {
    setUploads(prev => prev.map(upload => 
      upload.id === id ? { ...upload, status: 'success', progress: 100 } : upload
    ));
    setShouldRefreshList(true);
    
    // 3秒后移除上传状态显示
    setTimeout(() => {
      setUploads(prev => prev.filter(upload => upload.id !== id));
    }, 3000);
  }, []);

  const handleUploadError = useCallback((id: string, error: string) => {
    setUploads(prev => prev.map(upload => 
      upload.id === id ? { ...upload, status: 'error', error } : upload
    ));
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">文件管理系统</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <FileUploadZone
            onUploadStart={handleUploadStart}
            onUploadProgress={handleUploadProgress}
            onUploadSuccess={handleUploadSuccess}
            onUploadError={handleUploadError}
          />
          {uploads.length > 0 && (
            <div className="mt-8 space-y-4">
              {uploads.map((upload) => (
                <UploadProgress
                  key={upload.id}
                  fileName={upload.fileName}
                  fileSize={upload.fileSize}
                  progress={upload.progress}
                  status={upload.status}
                  error={upload.error}
                />
              ))}
            </div>
          )}
          <div className="mt-8">
            <FileList key={shouldRefreshList ? 'refresh' : 'normal'} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;