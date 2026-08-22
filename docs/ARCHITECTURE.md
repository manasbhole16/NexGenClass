# NexGenClass 2.0 — System Architecture

NexGenClass is an enterprise-grade academic operating system built using a decoupled client-server architecture with real-time bidirectional communication channels.

---

## 1. High-Level System Architecture Diagram

```
+-------------------------------------------------------------------------------+
|                                 CLIENT LAYER                                  |
|                                                                               |
|   +-------------------------------+       +-------------------------------+   |
|   |       React 19 Web SPA        |       |    React Native Mobile App    |   |
|   |  (Tailwind v4, Framer Motion) |       | (TypeScript, React Navigation)|   |
|   +---------------+---------------+       +---------------+---------------+   |
+-------------------|---------------------------------------|-------------------+
                    |                                       |
           REST API | (HTTPS / Bearer)             REST API | (HTTPS / Bearer)
          Socket.IO | (WSS)                       Socket.IO | (WSS)
                    |                                       |
+-------------------|---------------------------------------|-------------------+
|                   v                                       v                   |
|                              API & REALTIME GATEWAY                           |
|   +-----------------------------------------------------------------------+   |
|   |                     Express.js REST Application                       |   |
|   |  - RBAC & JWT Authentication Middleware                               |   |
|   |  - Input Validation & IDOR Protection Filters                         |   |
|   |  - Formula Injection & Path Traversal Sanitizers                      |   |
|   +-----------------------------------+-----------------------------------+   |
|                                       |                                       |
|   +-----------------------------------+-----------------------------------+   |
|   |                     Socket.IO Signaling Engine                        |   |
|   |  - Classroom Broadcasting & Notification Dispatch                     |   |
|   |  - WebRTC Peer Signaling (Mesh topology)                              |   |
|   |  - Vector Whiteboard Synchronization                                  |   |
|   +-----------------------------------+-----------------------------------+   |
+---------------------------------------|---------------------------------------+
                                        |
+---------------------------------------v---------------------------------------+
|                                SERVICE LAYER                                  |
|                                                                               |
|   +-------------------+  +-------------------+  +-------------------------+   |
|   | Plagiarism Engine |  | AI Copilot Router |  | Notification Dispatcher |   |
|   | - Token & N-gram  |  | - NVIDIA NIM / AI |  | - Dedup & Read Matrix   |   |
|   | - Phrase Overlap  |  | - Local Engine   |  | - In-App / Push Ready   |   |
|   +-------------------+  +-------------------+  +-------------------------+   |
+---------------------------------------|---------------------------------------+
                                        |
+---------------------------------------v---------------------------------------+
|                              PERSISTENCE LAYER                                |
|                                                                               |
|   +-----------------------------------+  +--------------------------------+   |
|   |        MongoDB Database           |  |      File Storage System       |   |
|   | - 13 Indexed Core Schemas         |  | - Canonical File Repository    |   |
|   | - Mongoose Connection Pooling     |  | - Local / S3 Cloud Abstraction |   |
|   +-----------------------------------+  +--------------------------------+   |
+-------------------------------------------------------------------------------+
```

---

## 2. Authentication & Authorization Flow

1. **Credentials Dispatch**: Client issues `POST /api/auth/login` or `register`.
2. **Password Verification**: Scrypt/Bcrypt hashing with salted rounds.
3. **Session Token Generation**: Signed JWT token containing `id`, `email`, and expiry timestamp.
4. **Dual Transport**:
   - **Web Browsers**: Delivered via HTTP-only `token` cookie with dynamic `SameSite` flags.
   - **Mobile Clients**: Delivered in response body for hardware-encrypted storage (`expo-secure-store`) and passed via `Authorization: Bearer <token>` headers.
5. **Authoritative Server-Side RBAC**: Every controller inspects `req.user.role` against classroom rosters to verify permissions before processing operations.

---

## 3. Data Flow & Classroom Isolation

### Multi-Tenant Isolation
- All resources (`Task`, `Submission`, `Quiz`, `Attendance`, `File`, `LiveSession`, `PlagiarismReport`) reference a canonical `Room` identifier.
- When an operation is attempted, the backend queries the `Room` record:
  - **Instructors**: Must be listed as `owner` or `teachers` of that classroom.
  - **Students**: Must be listed in the `members` array of that classroom.
- Any attempt to access a foreign classroom's data is rejected with `HTTP 403 Forbidden`.

---

## 4. Plagiarism Detection Architecture

```
Student Submissions
         |
         v
[Text Normalization Pipeline]
  - Lowercase conversion
  - Whitespace collapsing
  - Punctuation stripping
         |
         v
[Deterministic Similarity Engine]
  ├── Token Jaccard Containment Index
  ├── 3-gram Word Sequence Matching
  └── Phrase Overlap Window (>= 5 words)
         |
         v
[Academic Integrity Sanitizer]
  - Peer Student Name Masking ("Classroom Peer")
  - CSV Formula Injection Shield (=, +, -, @ prepended with ')
         |
         v
PlagiarismReport Document
```

---

## 5. Live Virtual Classroom & Collaborative Whiteboard

- **Signaling Layer**: Handled via Socket.IO room events (`webrtc:offer`, `webrtc:answer`, `webrtc:ice-candidate`).
- **Media Transport**: Peer-to-peer WebRTC mesh for real-time video/audio and screen sharing.
- **Collaborative Whiteboard**: Vector drawing actions (`draw`, `erase`, `line`, `rect`, `clear`) serialized into coordinate arrays and broadcast to all connected classroom sockets.
- **Automated Attendance Integration**: When the instructor clicks "End Session", connected socket durations are aggregated into an Attendance 2.0 session record.
