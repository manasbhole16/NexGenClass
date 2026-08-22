import { apiClient } from './client';
import { Quiz } from '../types';

export const quizApi = {
  getClassroomQuizzes: async (roomId: string): Promise<{ quizzes: Quiz[] }> => {
    const res = await apiClient.get(`/api/quiz?roomId=${roomId}`);
    return res.data;
  },

  getQuizDetails: async (quizId: string): Promise<{ quiz: any; questions: any[] }> => {
    const res = await apiClient.get(`/api/quiz/${quizId}`);
    return res.data;
  },

  submitQuizAttempt: async (quizId: string, answers: any): Promise<any> => {
    const res = await apiClient.post(`/api/quiz/${quizId}/submit`, { answers });
    return res.data;
  },

  getQuizResults: async (quizId: string): Promise<any> => {
    const res = await apiClient.get(`/api/quiz/${quizId}/results`);
    return res.data;
  },
};
