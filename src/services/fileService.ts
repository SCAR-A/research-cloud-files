import api from './api';

export interface FileItem {
  id: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  download_count: number;
  project_type: string;
  python_version: string;
  created_at: string;
}

export interface PaginationInfo {
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}

export interface FileListResponse {
  files: FileItem[];
  pagination: PaginationInfo;
}

export interface FileListParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  order?: 'asc' | 'desc';
  project_type?: string;
  python_version?: string;
}

export async function uploadFile(
  file: File, 
  metadata: { project_type?: string; python_version?: string }, 
  onProgress?: (progress: number) => void
) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata.project_type) {
      formData.append('project_type', metadata.project_type);
    }
    if (metadata.python_version) {
      formData.append('python_version', metadata.python_version);
    }

    const response = await api.post('/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      },
    });

    return response.data;
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
}

export async function getFiles(params: FileListParams = {}) {
  try {
    const response = await api.get<FileListResponse>('/files', { params });
    return response.data;
  } catch (error) {
    console.error('Get files error:', error);
    throw error;
  }
}

export async function getFileById(id: string) {
  try {
    const response = await api.get(`/files/${id}`);
    return response.data;
  } catch (error) {
    console.error('Get file error:', error);
    throw error;
  }
}

export async function deleteFile(id: string) {
  try {
    const response = await api.delete(`/files/${id}`);
    return response.data;
  } catch (error) {
    console.error('Delete file error:', error);
    throw error;
  }
}

export async function downloadFile(id: string) {
  try {
    const response = await api.get(`/files/${id}/download`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Download file error:', error);
    throw error;
  }
}