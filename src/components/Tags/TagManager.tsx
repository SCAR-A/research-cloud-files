import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Save } from 'lucide-react';
import { TagInput } from './TagInput';
import { updateTags } from '../../services/TagService';

interface TagManagerProps {
  projectTypes: string[];
  pythonVersions: string[];
  onUpdate: (newTags: { projectTypes: string[], pythonVersions: string[] }) => void;
}

export function TagManager({ projectTypes, pythonVersions, onUpdate }: TagManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newProjectType, setNewProjectType] = useState('');
  const [newPythonVersion, setNewPythonVersion] = useState('');
  const [editedProjectTypes, setEditedProjectTypes] = useState(projectTypes);
  const [editedPythonVersions, setEditedPythonVersions] = useState(pythonVersions);

  const handleSave = () => {
    try {
      const updatedTags = {
        projectTypes: editedProjectTypes,
        pythonVersions: editedPythonVersions
      };
      updateTags(updatedTags);
      onUpdate(updatedTags);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update tags:', error);
    }
  };

  const handleAddProjectType = () => {
    if (newProjectType && !editedProjectTypes.includes(newProjectType)) {
      setEditedProjectTypes([...editedProjectTypes, newProjectType]);
      setNewProjectType('');
    }
  };

  const handleAddPythonVersion = () => {
    if (newPythonVersion && !editedPythonVersions.includes(newPythonVersion)) {
      setEditedPythonVersions([...editedPythonVersions, newPythonVersion]);
      setNewPythonVersion('');
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">标签管理</h3>
        {!isEditing ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsEditing(true)}
            className="px-3 py-1 text-sm text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
          >
            编辑标签
          </motion.button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSave}
            className="inline-flex items-center px-3 py-1 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-1" />
            保存
          </motion.button>
        )}
      </div>

      <div className="space-y-4">
        {/* 项目类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            项目类型
          </label>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {editedProjectTypes.map((type) => (
                  <motion.span
                    key={type}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {type}
                    {isEditing && (
                      <button
                        onClick={() => setEditedProjectTypes(editedProjectTypes.filter(t => t !== type))}
                        className="ml-1 p-0.5 hover:bg-blue-200 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
            {isEditing && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProjectType}
                  onChange={(e) => setNewProjectType(e.target.value)}
                  placeholder="输入新项目类型..."
                  className="flex-1 px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddProjectType()}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddProjectType}
                  className="inline-flex items-center px-3 py-1 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                </motion.button>
              </div>
            )}
          </div>
        </div>

        {/* Python版本 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Python版本
          </label>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <AnimatePresence>
                {editedPythonVersions.map((version) => (
                  <motion.span
                    key={version}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {version}
                    {isEditing && (
                      <button
                        onClick={() => setEditedPythonVersions(editedPythonVersions.filter(v => v !== version))}
                        className="ml-1 p-0.5 hover:bg-green-200 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
            {isEditing && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPythonVersion}
                  onChange={(e) => setNewPythonVersion(e.target.value)}
                  placeholder="输入新Python版本..."
                  className="flex-1 px-3 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddPythonVersion()}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddPythonVersion}
                  className="inline-flex items-center px-3 py-1 text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  <Plus className="w-4 h-4" />
                </motion.button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}