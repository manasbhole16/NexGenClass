import { apiClient } from './client';
import { PlagiarismReport } from '../types';

export const plagiarismApi = {
  getSubmissionReport: async (submissionId: string): Promise<{ report: PlagiarismReport | null }> => {
    const res = await apiClient.get(`/api/plagiarism/submissions/${submissionId}`);
    return res.data;
  },

  analyzeSubmission: async (submissionId: string): Promise<{ report: PlagiarismReport }> => {
    const res = await apiClient.post(`/api/plagiarism/submissions/${submissionId}/analyze`);
    return res.data;
  },

  getTaskPlagiarismOverview: async (taskId: string): Promise<any> => {
    const res = await apiClient.get(`/api/plagiarism/tasks/${taskId}`);
    return res.data;
  },

  batchAnalyzeTask: async (taskId: string): Promise<any> => {
    const res = await apiClient.post(`/api/plagiarism/tasks/${taskId}/analyze`);
    return res.data;
  },
};
