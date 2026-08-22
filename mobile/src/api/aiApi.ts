import { apiClient } from './client';

export const aiApi = {
  askAssistant: async (payload: { question: string; fileId?: string; conversationId?: string }): Promise<any> => {
    const res = await apiClient.post('/api/ai/ask', payload);
    return res.data;
  },

  summarizeDocument: async (fileId: string, summaryType = 'standard'): Promise<any> => {
    const res = await apiClient.post('/api/ai/summarize', { fileId, summaryType });
    return res.data;
  },

  generateStudyPlan: async (subject: string, hoursPerWeek = 10): Promise<any> => {
    const res = await apiClient.post('/api/ai/study-plan', { subject, hoursPerWeek });
    return res.data;
  },

  generateRubric: async (title: string, criteriaCount = 3): Promise<any> => {
    const res = await apiClient.post('/api/ai/generate-rubric', { title, criteriaCount });
    return res.data;
  },
};
