import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Upload, Settings } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { TagInput } from '../Tags/TagInput';
import { TagManager } from '../Tags/TagManager';
import { getTags, updateTags } from '../../services/tagService';
import { formatFileSize } from '../../utils/fileUtils';
import { uploadFile } from '../../services/fileService';

interface FileUploadFormProps {
  onUploadStart: (file: File) => string;
  onUploadProgress: (id: string, progress: number) => void;
  onUploadSuccess: (id: string) => void;
  onUploadError: (id: string, error: string) => void;
}

export function FileUploadForm({
  onUploadStart,
  onUploadProgress,
  onUploadSuccess,
  onUploadError
}: FileUploadFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [projectTypes, setProjectTypes] = useState<string[]>([]);
  const [pythonVersion, setPythonVersion] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [tags, setTags] = useState<{ projectTypes: string[], pythonVersions: string[] }>({
    projectTypes: [],
    pythonVersions: []
  });

  useEffect(() => {
    const loadTags = async () => {
      const tagsData = await getTags();
      setTags(tagsData);
    };
    loadTags();
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: async (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        setSelectedFile(acceptedFiles[0]);
      }
    },
    maxSize: 100 * 1024 * 1024,
    multiple: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || isUploading) return;

    setIsUploading(true);
    const uploadId = onUploadStart(selectedFile);

    try {
      await uploadFile(
        selectedFile,
        {
          project_types: projectTypes,
          python_version: pythonVersion
        },
        (progress) => onUploadProgress(uploadId, progress)
      );

      onUploadSuccess(uploadId);
      setSelectedFile(null);
      setProjectTypes([]);
      setPythonVersion('');
    } catch (error) {
      onUploadError(uploadId, error instanceof Error ? error.message : '上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTagsUpdate = (newTags: { projectTypes: string[], pythonVersions: string[] }) => {
    setTags(newTags);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-12 gap-4">
          {/* 文件上传区域 */}
          <div className="col-span-12">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer
                ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}
                ${selectedFile ? 'bg-green-50' : ''}`}
            >
              <input {...getInputProps()} />
              <div className="text-center">
                <Upload className={`mx-auto h-12 w-12 ${
                  isDragActive ? 'text-blue-400' : 
                  selectedFile ? 'text-green-400' : 'text-gray-400'
                }`} />
                <p className="mt-2 text-sm font-medium text-gray-900">
                  {selectedFile ? selectedFile.name : '点击或拖拽文件到此处上传'}
                </p>
                {selectedFile && (
                  <p className="mt-1 text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                )}
              </div>
            </div>
          </div>

          {/* 标签选择区域 */}
          <div className="col-span-12">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">标签选择</h3>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => setShowTagManager(!showTagManager)}
                className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
              >
                <Settings className="w-4 h-4 mr-1" />
                管理标签
              </motion.button>
            </div>

            {showTagManager && (
              <div className="mb-4">
                <TagManager
                  projectTypes={tags.projectTypes}
                  pythonVersions={tags.pythonVersions}
                  onUpdate={handleTagsUpdate}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  项目类型（可多选）
                </label>
                <TagInput
                  tags={projectTypes}
                  suggestions={tags.projectTypes}
                  onAddTag={(tag) => setProjectTypes([...projectTypes, tag])}
                  onRemoveTag={(tag) => setProjectTypes(projectTypes.filter(t => t !== tag))}
                  placeholder="选择或输入项目类型..."
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Python版本
                </label>
                <TagInput
                  tags={pythonVersion ? [pythonVersion] : []}
                  suggestions={tags.pythonVersions}
                  onAddTag={(tag) => setPythonVersion(tag)}
                  onRemoveTag={() => setPythonVersion('')}
                  placeholder="选择版本..."
                  maxTags={1}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 上传按钮 */}
        <div className="flex justify-end">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!selectedFile || isUploading}
            className={`px-4 py-2 rounded-lg shadow-sm text-sm font-medium text-white 
              ${!selectedFile || isUploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }`}
          >
            {isUploading ? '上传中...' : '开始上传'}
          </motion.button>
        </div>
      </form>
    </div>
  );
}