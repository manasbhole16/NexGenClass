import { apiClient } from './client';

export const plannerApi = {
  getPlannerAgenda: async (): Promise<any> => {
    const res = await apiClient.get('/api/calendar/agenda');
    return res.data;
  },

  getPlannerEvents: async (params?: { start?: string; end?: string; eventType?: string }): Promise<any> => {
    const query = params ? `?eventType=${params.eventType || 'all'}` : '';
    const res = await apiClient.get(`/api/calendar/events${query}`);
    return res.data;
  },

  createPersonalTask: async (payload: { title: string; dueDate?: string; priority?: string }): Promise<any> => {
    const res = await apiClient.post('/api/tasks', { ...payload, roomId: null });
    return res.data;
  },
};
