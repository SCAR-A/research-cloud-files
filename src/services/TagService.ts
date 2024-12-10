import api from './api';

export interface Tags {
  projectTypes: string[];
  pythonVersions: string[];
}

export async function getTags(): Promise<Tags> {
  try {
    const response = await api.get<Tags>('/tags');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch tags:', error);
    throw error;
  }
}

export async function addTag(tagname: string, tagtype: 'projectType' | 'pythonVersion'): Promise<void> {
  try {
    await api.post('/tags', { tagname, tagtype });
  } catch (error) {
    console.error('Failed to add tag:', error);
    throw error;
  }
}

export async function deleteTag(tagname: string, tagtype: 'projectType' | 'pythonVersion'): Promise<void> {
  try {
    await api.delete('/tags', { params: { tagname, tagtype } });
  } catch (error) {
    console.error('Failed to delete tag:', error);
    throw error;
  }
}

export async function updateTags(tags: Tags): Promise<Tags> {
  try {
    const response = await api.put<Tags>('/tags', tags);
    return response.data;
  } catch (error) {
    console.error('Failed to update tags:', error);
    throw error;
  }
}