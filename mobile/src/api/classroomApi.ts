import { apiClient } from './client';
import { Room } from '../types';

export const classroomApi = {
  getMyClassrooms: async (): Promise<{ rooms: Room[] }> => {
    const res = await apiClient.get('/api/rooms/my-rooms');
    return res.data;
  },

  getClassroomDetails: async (roomId: string): Promise<{ room: Room }> => {
    const res = await apiClient.get(`/api/rooms/${roomId}`);
    return res.data;
  },

  createClassroom: async (payload: { name: string; section?: string; subject?: string; description?: string }): Promise<{ room: Room }> => {
    const res = await apiClient.post('/api/rooms/create', payload);
    return res.data;
  },

  joinClassroom: async (code: string): Promise<{ room: Room }> => {
    const res = await apiClient.post('/api/rooms/join', { code });
    return res.data;
  },

  getStreamPosts: async (roomId: string): Promise<any> => {
    const res = await apiClient.get(`/api/rooms/${roomId}/announcements`);
    return res.data;
  },

  createStreamPost: async (roomId: string, payload: { content: string; attachments?: any[] }): Promise<any> => {
    const res = await apiClient.post(`/api/rooms/${roomId}/announcements`, payload);
    return res.data;
  },
};
