import { apiClient } from './client';
import { Task, Submission } from '../types';

export const taskApi = {
  getClassroomTasks: async (roomId: string): Promise<{ tasks: Task[] }> => {
    const res = await apiClient.get(`/api/tasks?roomId=${roomId}`);
    return res.data;
  },

  getTaskDetails: async (taskId: string): Promise<{ task: Task }> => {
    const res = await apiClient.get(`/api/tasks/${taskId}`);
    return res.data;
  },

  createTask: async (payload: Partial<Task> & { roomId?: string }): Promise<{ task: Task }> => {
    const res = await apiClient.post('/api/tasks', payload);
    return res.data;
  },

  submitAssignment: async (taskId: string, payload: { content?: string; attachments?: any[] }): Promise<{ submission: Submission }> => {
    const res = await apiClient.post(`/api/submissions/${taskId}`, payload);
    return res.data;
  },

  getStudentSubmission: async (taskId: string): Promise<{ submission: Submission | null }> => {
    const res = await apiClient.get(`/api/submissions/task/${taskId}/student`);
    return res.data;
  },

  getTaskSubmissions: async (taskId: string): Promise<{ submissions: Submission[] }> => {
    const res = await apiClient.get(`/api/submissions/task/${taskId}`);
    return res.data;
  },

  gradeSubmission: async (submissionId: string, payload: { marksAwarded: number; feedback?: string }): Promise<any> => {
    const res = await apiClient.post(`/api/submissions/${submissionId}/grade`, payload);
    return res.data;
  },
};
