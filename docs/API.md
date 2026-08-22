# NexGenClass 2.0 — REST API & WebSocket Reference

This document provides a comprehensive reference for all production REST API endpoints and Socket.IO events in the NexGenClass academic platform.

---

## Table of Contents
1. [Authentication & Profile (`/api/auth`)](#1-authentication--profile-apiauth)
2. [Classrooms & Stream (`/api/rooms`)](#2-classrooms--stream-apirooms)
3. [Classwork & Tasks (`/api/tasks`)](#3-classwork--tasks-apitasks)
4. [Submissions & Grading (`/api/submissions`)](#4-submissions--grading-apisubmissions)
5. [Quizzes & Assessments (`/api/quiz`)](#5-quizzes--assessments-apiquiz)
6. [Attendance Intelligence (`/api/attendance`)](#6-attendance-intelligence-apiattendance)
7. [Academic Planner & Agenda (`/api/calendar`)](#7-academic-planner--agenda-apicalendar)
8. [Classroom & Student Analytics (`/api/analytics`)](#8-classroom--student-analytics-apianalytics)
9. [Unified Notifications (`/api/notifications`)](#9-unified-notifications-apinotifications)
10. [File & Document Management (`/api/files`)](#10-file--document-management-apifiles)
11. [AI Academic Copilot (`/api/ai`)](#11-ai-academic-copilot-apiai)
12. [Live Classrooms & Sessions (`/api/live-sessions`)](#12-live-classrooms--sessions-apilive-sessions)
13. [Plagiarism Detection (`/api/plagiarism`)](#13-plagiarism-detection-apiplagiarism)
14. [Health Check (`/api/health`)](#14-health-check-apihealth)
15. [Socket.IO Real-time Events](#15-socketio-real-time-events)

---

## 1. Authentication & Profile (`/api/auth`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | None | Public | Register new student or teacher account. Returns JWT cookie and Bearer token. |
| `POST` | `/api/auth/login` | None | Public | Authenticate user credentials. |
| `GET` | `/api/auth/logout` | Optional | Any | Clears session cookie and invalidates client session. |
| `GET` | `/api/auth/profile` | Required | Any | Retrieves authenticated user profile and role details. |

---

## 2. Classrooms & Stream (`/api/rooms`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/rooms/my-rooms` | Required | Any | List all classrooms owned or enrolled by the user. |
| `POST` | `/api/rooms/create` | Required | Teacher | Create a new classroom with auto-generated 6-character join code. |
| `POST` | `/api/rooms/join` | Required | Any | Join a classroom using its unique join code. |
| `GET` | `/api/rooms/:roomId` | Required | Member | Retrieve classroom metadata, member roster, and topic list. |
| `GET` | `/api/rooms/:roomId/announcements` | Required | Member | Retrieve Stream announcements with comments. |
| `POST` | `/api/rooms/:roomId/announcements` | Required | Member/Teacher | Post announcement to classroom Stream. |

---

## 3. Classwork & Tasks (`/api/tasks`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/tasks?roomId=:roomId` | Required | Member | List assignments for a classroom (filters drafts for students). |
| `GET` | `/api/tasks/:taskId` | Required | Member | Retrieve assignment details, rubric criteria, and attachments. |
| `POST` | `/api/tasks` | Required | Teacher/User | Create assignment (Teacher) or personal planner task (Student). |
| `PUT` | `/api/tasks/:taskId` | Required | Teacher/Owner | Update assignment details, due date, or rubric. |
| `DELETE` | `/api/tasks/:taskId` | Required | Teacher/Owner | Delete assignment. |

---

## 4. Submissions & Grading (`/api/submissions`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/submissions/:taskId` | Required | Student | Turn in assignment submission with text or file attachments. |
| `GET` | `/api/submissions/task/:taskId/student` | Required | Student | Retrieve student's own submission and grade. |
| `GET` | `/api/submissions/task/:taskId` | Required | Teacher | List all student submissions for an assignment. |
| `POST` | `/api/submissions/:submissionId/grade` | Required | Teacher | Grade submission with rubric scores and feedback. |

---

## 5. Quizzes & Assessments (`/api/quiz`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/quiz?roomId=:roomId` | Required | Member | List published classroom quizzes (teachers see drafts). |
| `GET` | `/api/quiz/:quizId` | Required | Member | Retrieve quiz questions without answer keys (for active attempts). |
| `POST` | `/api/quiz` | Required | Teacher | Create assessment quiz with questions and timer options. |
| `POST` | `/api/quiz/:quizId/submit` | Required | Student | Submit quiz attempt answers for automated evaluation. |
| `GET` | `/api/quiz/:quizId/results` | Required | Student/Teacher | Retrieve attempt results, score breakdown, and solutions if released. |

---

## 6. Attendance Intelligence (`/api/attendance`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/attendance/student` | Required | Student | Retrieve student attendance summary and course percentage breakdown. |
| `GET` | `/api/attendance/room/:roomId/sessions` | Required | Teacher | Retrieve full attendance matrix for a classroom. |
| `POST` | `/api/attendance` | Required | Teacher | Record classroom attendance session for lecture/lab. |
| `GET` | `/api/attendance/room/:roomId/export` | Required | Teacher | Export attendance matrix as sanitized CSV report. |

---

## 7. Academic Planner & Agenda (`/api/calendar`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/calendar/agenda` | Required | Any | Retrieve aggregated academic agenda (Due Today, Tomorrow, This Week). |
| `GET` | `/api/calendar/events` | Required | Any | Retrieve chronological calendar feed filtered by eventType. |

---

## 8. Classroom & Student Analytics (`/api/analytics`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/analytics/student` | Required | Student | Personal academic performance metrics and attendance trends. |
| `GET` | `/api/analytics/class/:roomId` | Required | Teacher | Classroom grade distribution, attendance averages, and at-risk students. |
| `GET` | `/api/analytics/class/:roomId/export` | Required | Teacher | Export classroom analytics summary to CSV. |

---

## 9. Unified Notifications (`/api/notifications`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/notifications` | Required | Any | Fetch user's notification stream and unread count. |
| `PATCH` | `/api/notifications/:id/read` | Required | Owner | Mark specific notification as read. |
| `POST` | `/api/notifications/mark-all-read` | Required | Any | Mark all unread notifications as read. |
| `DELETE` | `/api/notifications/:id` | Required | Owner | Delete notification from user inbox. |

---

## 10. File & Document Management (`/api/files`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/files/rooms/:roomId` | Required | Member | List files uploaded to classroom resource bank. |
| `POST` | `/api/files/upload` | Required | Any | Upload document or media file with path sanitization. |
| `GET` | `/api/files/:fileId` | Required | Member | Stream file download or preview content. |
| `DELETE` | `/api/files/:fileId` | Required | Owner/Teacher | Soft-delete file while preserving historical records. |

---

## 11. AI Academic Copilot (`/api/ai`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `POST` | `/api/ai/ask` | Required | Any | Context-aware Q&A over classroom resources (exam-safety deflection active). |
| `POST` | `/api/ai/summarize` | Required | Member | Generate concise or detailed summary of an authorized document. |
| `POST` | `/api/ai/study-plan` | Required | Student | Generate personalized weekly academic study plan. |
| `POST` | `/api/ai/generate-rubric` | Required | Teacher | AI-assisted generation of grading rubric criteria. |

---

## 12. Live Classrooms & Sessions (`/api/live-sessions`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/live-sessions/rooms/:roomId/current` | Required | Member | Get active live video session state for a classroom. |
| `POST` | `/api/live-sessions/rooms/:roomId` | Required | Teacher | Schedule new live virtual classroom session. |
| `POST` | `/api/live-sessions/:sessionId/start` | Required | Teacher | Transition session to `live` status. |
| `POST` | `/api/live-sessions/:sessionId/join` | Required | Member | Record participant join and connect to signaling. |
| `POST` | `/api/live-sessions/:sessionId/end` | Required | Teacher | Terminate live session and automatically generate attendance record. |

---

## 13. Plagiarism Detection (`/api/plagiarism`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/plagiarism/submissions/:submissionId` | Required | Owner/Teacher | View originality report with peer masking for students. |
| `POST` | `/api/plagiarism/submissions/:submissionId/analyze`| Required | Teacher | Execute similarity scan on a specific submission. |
| `GET` | `/api/plagiarism/tasks/:taskId` | Required | Teacher | Task-wide plagiarism matrix and similarity distribution. |
| `POST` | `/api/plagiarism/tasks/:taskId/analyze` | Required | Teacher | Batch analyze all student submissions for an assignment. |
| `GET` | `/api/plagiarism/tasks/:taskId/export` | Required | Teacher | Export plagiarism audit report as sanitized CSV. |

---

## 14. Health Check (`/api/health`)

| Method | Endpoint | Auth | Role | Description |
|---|---|---|---|---|
| `GET` | `/api/health` | None | Public | Returns server status, uptime, database connectivity state, and version. |

---

## 15. Socket.IO Real-time Events

### Room Channels
- `joinRoom`: Subscribes socket to classroom updates (`{ roomId, userId, fullname }`)
- `leaveRoom`: Unsubscribes socket from classroom channel
- `joinUser`: Subscribes socket to private user channel (`{ userId }`)

### Live Classroom & WebRTC Signaling
- `webrtc:offer`: Relays SDP offer to peer (`{ sessionId, targetUserId, offer, senderId }`)
- `webrtc:answer`: Relays SDP answer to peer (`{ sessionId, targetUserId, answer, senderId }`)
- `webrtc:ice-candidate`: Relays ICE candidate (`{ sessionId, targetUserId, candidate, senderId }`)
- `live:chat-message`: Broadcasts in-class chat message to session participants
- `live:hand-raised` / `live:hand-lowered`: Participant interaction indicators
- `live:whiteboard-operation`: Synchronizes collaborative canvas drawing vectors
- `live:whiteboard-clear`: Clears collaborative canvas for session participants
