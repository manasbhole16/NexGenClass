import { apiClient } from './client';

export const liveApi = {
  getCurrentSession: async (roomId: string): Promise<any> => {
    const res = await apiClient.get(`/api/live-sessions/rooms/${roomId}/current`);
    return res.data;
  },

  scheduleLiveSession: async (roomId: string, payload: { title: string; scheduledStartTime?: string }): Promise<any> => {
    const res = await apiClient.post(`/api/live-sessions/rooms/${roomId}`, payload);
    return res.data;
  },

  startLiveSession: async (sessionId: string): Promise<any> => {
    const res = await apiClient.post(`/api/live-sessions/${sessionId}/start`);
    return res.data;
  },

  joinLiveSession: async (sessionId: string): Promise<any> => {
    const res = await apiClient.post(`/api/live-sessions/${sessionId}/join`);
    return res.data;
  },

  leaveLiveSession: async (sessionId: string): Promise<any> => {
    const res = await apiClient.post(`/api/live-sessions/${sessionId}/leave`);
    return res.data;
  },

  endLiveSession: async (sessionId: string): Promise<any> => {
    const res = await apiClient.post(`/api/live-sessions/${sessionId}/end`);
    return res.data;
  },
};
