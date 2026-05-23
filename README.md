# NexGenClass

> "Just as antigravity counteracts downward force, this module is designed to counteract the 'downward pull' of academic failure. By analyzing attendance dips and quiz patterns in real-time, the system 'lifts' at-risk students back to safety by alerting teachers before the student fails, essentially defying the gravity of traditional academic dropout rates."

NexGenClass is a modern, full-stack educational platform built to bridge the gap between teachers and students through real-time analytics, interactive quizzes, and dynamic task management. The project is designed with a futuristic, glassmorphism aesthetic, ensuring an engaging user experience.

## ✨ Key Features

- **Role-Based Access Control**: Separate dashboards and functionalities for Teachers and Students.
- **Interactive Quizzes**:
  - Teachers can create, manage, and assign quizzes.
  - Students can take quizzes with real-time timers.
  - Automated evaluation and grade calculations.
- **Student Analytics Dashboard**:
  - Global and classroom-level insights.
  - Visualized data for quiz performances and attendance trends.
  - Early-warning system to identify at-risk students.
- **Kanban Task Manager**:
  - Futuristic neon aesthetic drag-and-drop boards.
  - Real-time task status updates (To Do, In Progress, Done).
- **Real-Time Communication**: Multi-tab sync and real-time alerts powered by Socket.io.

## 🛠 Tech Stack

### Frontend
- **Framework**: React 19, Vite
- **Styling**: Tailwind CSS (v4), Framer Motion, Glassmorphism UI
- **Routing**: React Router DOM
- **Data Visualization**: Chart.js, React-Chartjs-2
- **Drag-and-Drop**: @dnd-kit/core, @dnd-kit/sortable
- **Real-time**: Socket.io-client

### Backend
- **Environment**: Node.js, Express.js
- **Database**: MongoDB, Mongoose
- **Authentication**: JWT (JSON Web Tokens), bcrypt
- **Real-time**: Socket.io
- **Utilities**: Multer (file uploads), Nodemailer (emails), Node-cron (scheduled tasks)

## 📂 Project Structure

```text
NexGenClass/
├── frontend/          # React + Vite application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   └── index.css
│   └── package.json
└── backend/           # Node.js + Express backend
    ├── controllers/
    ├── models/
    ├── routes/
    ├── middleware/
    ├── services/
    ├── app.js
    ├── server.js
    └── package.json
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)

### 1. Clone the repository
```bash
git clone <repository-url>
cd NexGenClass
```

### 2. Setup the Backend
```bash
cd backend
npm install
```
- Create a `.env` file in the `backend` directory with your environment variables (e.g., `PORT`, `MONGODB_URI`, `JWT_SECRET`).
- Start the backend server:
```bash
npm start
```

### 3. Setup the Frontend
```bash
cd ../frontend
npm install
```
- Start the development server:
```bash
npm run dev
```

## 📝 License

This project is licensed under the ISC License.
