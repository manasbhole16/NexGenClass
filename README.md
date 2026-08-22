# NexGenClass 2.0 — Unified Academic Management & Collaboration Platform

NexGenClass is a production-grade, full-stack educational and academic management platform built to bridge the gap between instructors and students through real-time collaboration, interactive assessments, AI-driven academic assistance, attendance intelligence, live virtual classrooms, canonical file management, academic integrity verification, and cross-platform native mobile clients.

---

## 1. Overview
NexGenClass delivers an all-in-one institutional LMS with a futuristic glassmorphic UI. Designed as an academic operating system, it provides seamless multi-tenant classroom partitioning, role-based workflows for teachers and students, instant live WebRTC video classrooms, automated and manual grading with rubrics, deterministic plagiarism detection, and an AI academic copilot with exam-integrity safeguards.

---

## 2. Platform Features

- **Google Classroom Core UI**: Stream announcements with rich comments, people roster, grades ledger, and unique 6-character class join codes.
- **Classwork & Assignments 2.0**: Topic categorization, multi-file reference attachments, structured rubric grading criteria, draft/published workflows, and late submission flags.
- **Interactive Quiz 2.0**: Timed attempts, MCQ and short-answer evaluation, instant or deferred results release, and question banks.
- **Attendance Intelligence 2.0**: Session tracking (Lecture/Lab), student personal percentage dashboards, classroom attendance matrix, and automated threshold alerts (< 75%).
- **Unified Academic Planner 2.0**: Kanban task management, aggregated multi-source calendar deadlines (assignments, quizzes, attendance), and agenda views.
- **Performance Analytics 2.0**: Student mastery charts, grade distribution histograms, at-risk student early-warning signals, and sanitized CSV data exports.
- **Unified Notifications 2.0**: In-app notification center, real-time Socket.IO dispatch, user preferences, and deduplication keys.
- **File & Document Management 2.0**: Canonical file repository, path traversal neutralization, dangerous binary filtering, and streaming download/preview.
- **AI Academic Copilot 2.0**: Context-aware document summarization, student Q&A with exam-safety deflection, personalized study plans, and teacher rubric drafting.
- **Live Classrooms & Collaborative Whiteboard 2.0**: WebRTC mesh video/audio, screen sharing, live chat, interactive vector whiteboard canvas, and automatic attendance calculation on session termination.
- **Plagiarism Detection & Academic Integrity 2.0**: Deterministic similarity engine (token containment, 3-grams, phrase overlap), peer privacy masking, and CSV formula injection shields.
- **Cross-Platform Mobile Client**: React Native + TypeScript native mobile application with secure token storage and role-based navigation.

---

## 3. Architecture Overview
NexGenClass employs a decoupled client-server architecture:
- **Client Layer**: React 19 SPA (Web) and React Native / Expo (Mobile).
- **Transport Layer**: REST API with JWT / Bearer tokens and bidirectional Socket.IO WebSockets.
- **Gateway & API Layer**: Node.js & Express with authoritative server-side RBAC and IDOR filters.
- **Engine Layer**: Deterministic Plagiarism Engine, AI Provider Router, and WebRTC Signaling.
- **Persistence Layer**: MongoDB with compound indexes and canonical file storage.

*For complete architectural diagrams, refer to [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).*

---

## 4. Technology Stack

### Frontend (Web)
- **Framework**: React 19, Vite
- **Styling**: Tailwind CSS v4, Framer Motion, Glassmorphism UI
- **Data Visualization**: Chart.js, React-Chartjs-2
- **Icons & UI Utilities**: Lucide React, `@dnd-kit/core`, `@dnd-kit/sortable`
- **Real-time**: Socket.IO Client, HTML5 Canvas WebRTC

### Mobile Client (Native)
- **Framework**: React Native 0.74.2, Expo 51, TypeScript
- **Navigation**: React Navigation (Bottom Tabs & Native Stack)
- **Storage & Security**: `expo-secure-store`
- **HTTP & Realtime**: Axios, Socket.IO Client

### Backend & Database
- **Runtime**: Node.js, Express.js
- **Database**: MongoDB 6.0+, Mongoose ORM
- **Authentication**: JWT (JSON Web Tokens), Cookie-Parser, bcryptjs
- **File & Document Processing**: Multer, Stream I/O, Document text parsers
- **Real-time & Signaling**: Socket.IO 4.8+

---

## 5. Web Application
The web client is built with React 19 and Vite, styled with Tailwind CSS v4 and Framer Motion. It includes responsive views for both Desktop and Tablet screen sizes, dark mode theming, and multi-tab state synchronization.

---

## 6. Mobile Application
The mobile application in `mobile/` is built with React Native and TypeScript. It features:
- Secure device token persistence using `expo-secure-store`.
- Native bottom-tab navigation for Dashboard, Planner, AI Copilot, Notifications, and Profile.
- Dedicated mobile assignment turn-in flow and classroom stream.

---

## 7. Backend API
The Express backend provides modular REST endpoints under `/api/` protected by custom JWT authentication, server-side RBAC, and IDOR filters.

*For complete endpoint documentation, refer to [docs/API.md](docs/API.md).*

---

## 8. Database & Indexes
NexGenClass utilizes MongoDB with 13 collections:
- `User`, `Room`, `Task`, `Submission`, `Quiz`, `Question`, `Attempt`, `Attendance`, `Notification`, `File`, `AIConversation`, `LiveSession`, `PlagiarismReport`.
- Compound indexes cover all high-frequency query patterns without redundant index overhead.

---

## 9. AI Academic Copilot
The AI service supports external OpenAI/NVIDIA NIM models with automatic fallback to an internal deterministic local engine. Built-in academic integrity filters intercept direct exam answer requests and provide conceptual explanations instead.

---

## 10. Live Classroom & WebRTC
Real-time virtual classrooms feature WebRTC mesh peer connections for video/audio, screen sharing, in-class chat, and vector canvas whiteboard drawing. Sessions automatically record attendance when terminated.

---

## 11. File Management
Uploaded documents and media are managed through a canonical repository with path traversal sanitization (`path.basename()`) and dangerous executable blocking (`.exe`, `.sh`, `.bat`, `.msi`, `.php`).

---

## 12. Plagiarism Detection & Academic Integrity
Deterministic similarity computation analyzes token containment (Jaccard index), 3-word n-gram sequences, and phrase overlaps (>= 5 words). Peer student names are masked as `"Classroom Peer"` in student-facing reports.

---

## 13. Security Guarantees
- **Authoritative Server-Side RBAC**: Every controller independently validates user permissions.
- **Strict IDOR Defenses**: Users cannot read, tamper with, or delete submissions, attempts, files, or notifications belonging to others.
- **Formula Injection Shield**: CSV exports sanitize leading `=`, `+`, `-`, or `@` trigger characters.
- **Dual Transport Authentication**: Cookies for web browsers, Bearer tokens for mobile clients.
- **Production Headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`.

---

## 14. Installation & Local Setup

### Prerequisites
- Node.js (v18+)
- MongoDB running locally or MongoDB Atlas connection string

### 1. Backend Setup
```bash
cd backend
npm install
cp ../.env.example .env
# Configure PORT, MONGO_URI, and JWT_SECRET in .env
npm start
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### 3. Mobile Client Setup
```bash
cd mobile
npm install
npm start
```

---

## 15. Environment Configuration
See [`.env.example`](.env.example) for a complete template of required environment variables.

---

## 16. Development Workflow
- Backend runs on `http://localhost:3000`
- Frontend runs on `http://localhost:5173`
- Health check available at `http://localhost:3000/api/health`

---

## 17. Automated Testing Suite

Run all automated test suites from the project root:

```bash
# Phase 1: Core Classroom Flow
node backend/tests/test_classroom_flow.js

# Phase 2: Classwork 2.0
node backend/tests/test_classwork_2.js

# Phase 3: Quiz 2.0
node backend/tests/test_quiz_2.js

# Phase 4: Attendance 2.0
node backend/tests/test_attendance_2.js

# Phase 5: Academic Planner 2.0
node backend/tests/test_planner_2.js

# Phase 6: Analytics 2.0
node backend/tests/test_analytics_2.js

# Phase 7: Unified Notifications 2.0
node backend/tests/test_notifications_2.js

# Phase 8: File Management 2.0
node backend/tests/test_files_2.js

# Phase 9: AI Academic Copilot 2.0
node backend/tests/test_ai_2.js

# Phase 10: Live Classroom & Whiteboard 2.0
node backend/tests/test_live_class_2.js

# Phase 11: Plagiarism Detection 2.0
node backend/tests/test_plagiarism_2.js

# Phase 12: Platform QA & Security Hardening 2.0
node backend/tests/test_phase12_qa.js

# Phase 13: React Native Mobile Integration 2.0
node backend/tests/test_mobile_app_13.js
```

---

## 18. Production Deployment
NexGenClass supports Docker Compose orchestration and standalone Linux (PM2 + Nginx) deployment.

*Refer to [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for full deployment instructions.*

---

## 19. Mobile Build Instructions
To build release APKs and IPAs with Expo EAS:
```bash
cd mobile
npx eas-cli build --platform android --profile preview
npx eas-cli build --platform ios --profile production
```

---

## 20. API Documentation
Comprehensive API documentation for all REST endpoints and Socket.IO events is available in [docs/API.md](docs/API.md).

---

## 21. Project Structure
```text
NexGenClass/
├── backend/            # Express REST API, Mongoose Schemas, Socket.IO
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── tests/
├── frontend/           # React 19 + Vite Web Application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── theme/
├── mobile/             # React Native + Expo Mobile Application
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── navigation/
│   │   ├── screens/
│   │   └── store/
├── docs/               # System Documentation
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── DEMO_GUIDE.md
│   └── PRODUCTION_CHECKLIST.md
├── docker-compose.yml  # Multi-container Docker orchestration
├── .env.example        # Environment variable template
└── README.md
```

---

## 22. Known Limitations
- WebRTC mesh topology is optimal for classroom sizes up to 10–12 video participants. Enterprise scaling for larger webinars can be connected to an SFU (Selective Forwarding Unit) media server.
- External AI models fall back to the built-in deterministic local engine when `AI_API_KEY` is not provided.

---

## 23. Future Roadmap
- Integration of TURN server relay configuration for restrictive NAT networks.
- Push notification APNs/FCM delivery keys integration for native mobile push.
