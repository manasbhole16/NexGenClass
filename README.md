# NexGenClass — Unified Academic Platform 2.0

NexGenClass is a production-grade, full-stack educational and academic management platform built to bridge the gap between teachers and students through real-time collaboration, interactive assessments, AI academic assistance, attendance intelligence, live virtual classrooms, document management, and academic integrity verification.

---

## 🚀 Completed Phases Overview

1. **Phase 1 — Google Classroom Core UI & Realtime Stream**
   - Classroom navigation, Stream announcements, People roster, Grades, Teacher/Student RBAC, and Socket.IO synchronization.
2. **Phase 2 — Classwork / Assignments 2.0**
   - Topics, assignments, multi-file attachments, rubric evaluation, draft/publish workflows, and late-submission tracking.
3. **Phase 3 — Quiz & Assessment 2.0**
   - Question bank, MCQ/short-answer questions, automated/manual grading, timed attempts, and score analytics.
4. **Phase 4 — Attendance Intelligence 2.0**
   - Session marking (lecture/lab), student personal attendance dashboard, classroom attendance matrix, and threshold early warning alerts.
5. **Phase 5 — Unified Academic Planner 2.0**
   - Personal Kanban task management, cross-module academic agenda aggregation, and calendar deadlines.
6. **Phase 6 — Analytics 2.0**
   - Academic performance insights, grade distribution histograms, student mastery charts, and CSV exports.
7. **Phase 7 — Unified Notifications 2.0**
   - Real-time in-app notification center, user preferences, deduplication keys, and private recipient dispatch.
8. **Phase 8 — File & Document Management 2.0**
   - Canonical file repository, path traversal protection, dangerous extension blocking, streaming downloads, and resource reuse.
9. **Phase 9 — AI Academic Copilot 2.0**
   - Document summarization, contextual Q&A, study guide/plan generation, active exam anti-cheating deflection, and instructor rubric drafting.
10. **Phase 10 — Live Virtual Classrooms & Collaborative Whiteboard 2.0**
    - WebRTC signaling, screen sharing, classroom chat, vector whiteboard canvas, and automatic attendance generation.
11. **Phase 11 — Plagiarism Detection & Academic Integrity 2.0**
    - Deterministic similarity engine (token, n-gram, phrase overlap), side-by-side evidence viewer, CSV formula injection defense, and instructor reviews.
12. **Phase 12 — Platform QA, Performance & Security Hardening 2.0**
    - Complete cross-module regression test suite, IDOR defenses, database index optimizations, and production build readiness.
13. **Phase 13 — Mobile App / React Native 2.0**
    - Cross-platform native mobile client built with React Native, TypeScript, React Navigation, Secure Storage, and Socket.IO. Supports student & teacher role-based dashboards, classroom stream, assignment submissions, rubric grading, AI study assistant, planner agenda, and push notification ready.

---

## 🛠 Tech Stack

### Frontend
- **Framework**: React 19, Vite
- **Styling**: Tailwind CSS v4, Framer Motion, Glassmorphism UI
- **Icons & Visuals**: Lucide React, Chart.js, React-Chartjs-2
- **Drag-and-Drop**: `@dnd-kit/core`, `@dnd-kit/sortable`
- **Real-time & Live**: Socket.IO Client, WebSockets, HTML5 Canvas WebRTC

### Backend
- **Environment**: Node.js, Express.js
- **Database**: MongoDB, Mongoose ORM
- **Authentication**: JWT (JSON Web Tokens), Cookie-Parser, bcryptjs
- **Real-time**: Socket.IO Server
- **File Management & Text Extraction**: Multer, Stream-based I/O, Document text parsers
- **Security & Integrity**: In-memory LRU caching, CSV sanitizer, Rate limiters

---

## 🏃 Getting Started

### 1. Prerequisites
- Node.js (v18+ recommended)
- MongoDB running locally or MongoDB Atlas URI

### 2. Backend Setup
```bash
cd backend
npm install
cp ../.env.example .env
# Configure MONGO_URI, JWT_SECRET, and PORT in .env
npm start
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 4. Mobile Client Setup (React Native)
```bash
cd mobile
npm install
# Configure API_BASE_URL in src/constants/config.ts or .env
npm start
# To run on Android:
npm run android
# To run on iOS:
npm run ios
```

### 5. Running Production Build
```bash
cd frontend
npm run build
```

---

## 🧪 Automated Test Suites

Run the automated test suites from the root directory:

```bash
# Phase 13: React Native Mobile Integration
node backend/tests/test_mobile_app_13.js

# Phase 12: Platform QA & Security
node backend/tests/test_phase12_qa.js

# Phase 11: Plagiarism Detection 2.0
node backend/tests/test_plagiarism_2.js

# Phase 10: Live Virtual Classroom & Whiteboard 2.0
node backend/tests/test_live_class_2.js

# Phase 9: AI Academic Copilot 2.0
node backend/tests/test_ai_2.js

# Phase 8: File & Document Management 2.0
node backend/tests/test_files_2.js

# Phase 7: Unified Notifications 2.0
node backend/tests/test_notifications_2.js

# Phase 6: Analytics 2.0
node backend/tests/test_analytics_2.js

# Phase 5: Unified Academic Planner 2.0
node backend/tests/test_planner_2.js

# Phase 4: Attendance 2.0
node backend/tests/test_attendance_2.js

# Phase 3: Quiz 2.0
node backend/tests/test_quiz_2.js

# Phase 2: Classwork 2.0 Regression
node backend/tests/test_classwork_2.js

# Phase 1: Core Classroom Flow
node backend/tests/test_classroom_flow.js
```

---

## 🔒 Security & Privacy Guarantees

- **Authentication & JWT**: Strictly enforced with HTTP-only cookies and automatic expiration checks.
- **Server-Side RBAC**: Every single resource creation, modification, or grading operation is verified server-side.
- **Strict IDOR Defenses**: Users cannot read, tamper with, or delete submissions, attempts, files, notifications, or AI conversations belonging to others.
- **File Upload Protection**: Path traversal sanitized via `path.basename()`; dangerous binaries blocked.
- **Formula Injection Defense**: All exported spreadsheets sanitize leading `=`, `+`, `-`, or `@` trigger characters.
- **Academic Integrity Safety**: Active exam answer requests are deflected; student identities are masked in peer plagiarism reports.
