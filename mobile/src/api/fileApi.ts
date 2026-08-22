import { apiClient } from './client';
import { FileItem } from '../types';

export const fileApi = {
  getClassroomFiles: async (roomId: string): Promise<{ files: FileItem[] }> => {
    const res = await apiClient.get(`/api/files/rooms/${roomId}`);
    return res.data;
  },

  getFileDetails: async (fileId: string): Promise<{ file: FileItem }> => {
    const res = await apiClient.get(`/api/files/${fileId}`);
    return res.data;
  },

  uploadFile: async (formData: FormData): Promise<any> => {
    const res = await apiClient.post('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  deleteFile: async (fileId: string): Promise<any> => {
    const res = await apiClient.delete(`/api/files/${fileId}`);
    return res.data;
  },
};
