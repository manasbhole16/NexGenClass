import { apiClient } from './client';

export const analyticsApi = {
  getStudentAnalytics: async (roomId?: string): Promise<any> => {
    const endpoint = roomId ? `/api/analytics/student/classroom/${roomId}` : '/api/analytics/student';
    const res = await apiClient.get(endpoint);
    return res.data;
  },

  getClassroomAnalytics: async (roomId: string): Promise<any> => {
    const res = await apiClient.get(`/api/analytics/class/${roomId}`);
    return res.data;
  },
};
