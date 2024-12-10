import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUploadForm } from './FileUploadForm';
import { UploadProgress } from './UploadProgress';

interface UploadStatus {
  id: string;
  fileName: string;
  fileSize: number;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export function UploadModal({ isOpen, onClose, onUploadSuccess }: UploadModalProps) {
  const [uploads, setUploads] = useState<UploadStatus[]>([]);

  // Reset uploads when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setUploads([]);
    }
  }, [isOpen]);

  const handleUploadStart = (file: File) => {
    const uploadId = Math.random().toString(36).substring(7);
    setUploads(prev => [...prev, {
      id: uploadId,
      fileName: file.name,
      fileSize: file.size,
      progress: 0,
      status: 'uploading'
    }]);
    return uploadId;
  };

  const handleUploadProgress = (id: string, progress: number) => {
    setUploads(prev => prev.map(upload => 
      upload.id === id ? { ...upload, progress } : upload
    ));
  };

  const handleUploadSuccess = (id: string) => {
    setUploads(prev => prev.map(upload => 
      upload.id === id ? { ...upload, status: 'success', progress: 100 } : upload
    ));
    onUploadSuccess();
    
    // Close modal after a short delay
    setTimeout(() => {
      onClose();
    }, 100);
  };

  const handleUploadError = (id: string, error: string) => {
    setUploads(prev => prev.map(upload => 
      upload.id === id ? { ...upload, status: 'error', error } : upload
    ));
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <Dialog.Title as="div" className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    上传文件
                  </h3>
                  <button
                    onClick={onClose}
                    className="rounded-full p-1 hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </Dialog.Title>

                <div className="max-h-[calc(100vh-200px)] overflow-y-auto pr-2 -mr-2">
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <FileUploadForm
                      onUploadStart={handleUploadStart}
                      onUploadProgress={handleUploadProgress}
                      onUploadSuccess={handleUploadSuccess}
                      onUploadError={handleUploadError}
                    />
                  </motion.div>

                  <AnimatePresence>
                    {uploads.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6 space-y-4"
                      >
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
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}