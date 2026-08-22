import { apiClient } from './client';
import { NotificationItem } from '../types';

export const notificationApi = {
  getNotifications: async (): Promise<{ notifications: NotificationItem[]; unreadCount: number }> => {
    const res = await apiClient.get('/api/notifications');
    return res.data;
  },

  markAsRead: async (id: string): Promise<any> => {
    const res = await apiClient.patch(`/api/notifications/${id}/read`);
    return res.data;
  },

  markAllAsRead: async (): Promise<any> => {
    const res = await apiClient.post('/api/notifications/mark-all-read');
    return res.data;
  },

  deleteNotification: async (id: string): Promise<any> => {
    const res = await apiClient.delete(`/api/notifications/${id}`);
    return res.data;
  },
};
