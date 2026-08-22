export type UserRole = 'student' | 'teacher';

export interface User {
  _id: string;
  fullname: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user: User;
  message?: string;
}

export interface Room {
  _id: string;
  name: string;
  code: string;
  owner: User | string;
  members: (User | string)[];
  section?: string;
  subject?: string;
  description?: string;
  banner?: string;
  topics?: { _id: string; name: string; order: number }[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'Backlog' | 'Todo' | 'In Progress' | 'Done';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  dueDate?: string;
  maxMarks?: number;
  taskType?: 'assignment' | 'material' | 'announcement';
  topic?: string;
  room?: string | Room;
  owner: User | string;
  attachments?: {
    fileUrl: string;
    fileName: string;
    fileType: string;
  }[];
  rubric?: {
    criterion: string;
    points: number;
    description?: string;
  }[];
  isDraft?: boolean;
  createdAt: string;
}

export interface Submission {
  _id: string;
  taskId: string | Task;
  studentId: string | User;
  roomId: string | Room;
  status: 'submitted' | 'graded' | 'late' | 'draft' | 'unsubmitted';
  content?: string;
  grade?: string;
  marksAwarded?: number;
  feedback?: string;
  teacherFeedback?: string;
  submittedAt?: string;
  attachments?: {
    fileUrl: string;
    fileName: string;
    fileType: string;
  }[];
}

export interface Quiz {
  _id: string;
  title: string;
  description?: string;
  roomId: string | Room;
  isDraft: boolean;
  totalMarks?: number;
  durationMinutes?: number;
  questionsCount?: number;
}

export interface AttendanceSummary {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendancePercentage: number;
  belowThreshold: boolean;
}

export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  entityType?: string;
  entityId?: string;
  roomId?: string;
}

export interface FileItem {
  _id: string;
  originalName: string;
  mimeType: string;
  extension: string;
  size: number;
  url: string;
  category: string;
  createdAt: string;
}

export interface PlagiarismReport {
  _id: string;
  overallSimilarityPercent: number;
  exactMatchPercent: number;
  phraseMatchPercent: number;
  category: 'low' | 'moderate' | 'high' | 'very_high';
  confidence: 'low' | 'medium' | 'high';
  analyzedWordCount: number;
  matchedSubmissions?: {
    studentName: string;
    similarityPercent: number;
  }[];
}
