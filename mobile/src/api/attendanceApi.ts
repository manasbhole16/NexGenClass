import { apiClient } from './client';

export const attendanceApi = {
  getStudentAttendanceSummary: async (): Promise<any> => {
    const res = await apiClient.get('/api/attendance/student');
    return res.data;
  },

  getRoomAttendanceSessions: async (roomId: string): Promise<any> => {
    const res = await apiClient.get(`/api/attendance/room/${roomId}/sessions`);
    return res.data;
  },

  markAttendance: async (payload: { roomId: string; date: string; records: any[] }): Promise<any> => {
    const res = await apiClient.post('/api/attendance', payload);
    return res.data;
  },
};
