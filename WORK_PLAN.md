# WORK PLAN: NexGen Task Manager

## 🎯 Goal
Build a high-performance, futuristic Kanban task manager with a neon aesthetic, featuring drag-and-drop boards and real-time updates.

## 🛠 Tech Stack
- **Frontend**: React, Tailwind V4, Framer Motion, `@dnd-kit/core` & `@dnd-kit/sortable`.
- **Backend**: Node.js, Express, MongoDB, Mongoose.
- **Auth**: Existing JWT + Bcrypt setup.

## 📅 Phases & Tasks

### 🧠 Phase 1: Backend Infrastructure (API & DB)
1.  **Task Model** (`backend/models/task-model.js`)
    - Fields: `title` (String), `description` (String), `status` (Enum: 'Todo', 'InProgress', 'Done'), `priority` (Enum: 'Low', 'Medium', 'High'), `userId` (Ref), `order` (Number).
2.  **Task Controller** (`backend/controllers/taskController.js`)
    - `createTask`: Add new task.
    - `getTasks`: Fetch all tasks for logged-in user.
    - `updateTask`: Update status, order, or content.
    - `deleteTask`: Remove task.
3.  **Task Routes** (`backend/routes/taskRouter.js`)
    - `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`.
    - Protect all routes with auth middleware.

### 🎨 Phase 2: Frontend Board Foundation
1.  **Install Dependencies**
    - `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
2.  **Board Layout** (`frontend/src/pages/BoardPage.jsx`)
    - Create a horizontal scrolling layout for columns.
    - Define default columns: "To Do", "In Progress", "Done".
3.  **Components**
    - `ColumnContainer`: Droppable area for tasks.
    - `TaskCard`: Draggable glassmorphism card component with priority indicators.

### ⚡️ Phase 3: Interactions & logic
1.  **Drag and Drop Implementation**
    - Implement `DndContext` and `DragOverlay`.
    - Handle `onDragEnd` to update local state optimistically.
    - Send API request to persist new order/status.
2.  **Task Operations**
    - **Create**: "Add Task" button in each column.
    - **Edit**: Click card to open modal/inline edit.
    - **Delete**: Hover action or drop into "Trash" zone.

### ✨ Phase 4: Polish & Advanced Features
1.  **Animations**
    - Use `framer-motion` `layout` prop for smooth reordering animations.
    - Entrance animations for new tasks.
2.  **Keyboard Shortcuts**
    - `Cmd/Ctrl + N`: New Task.
    - `Esc`: Close modal.
3.  **Real-time (Optional)**
    - Add polling or Socket.io for multi-tab sync.

## 📂 File Structure
```
mainone/
├── backend/
│   ├── models/
│   │   └── task-model.js
│   ├── controllers/
│   │   └── taskController.js
│   └── routes/
│       └── taskRouter.js
└── frontend/
    └── src/
        ├── components/
        │   └── board/
        │       ├── Board.jsx
        │       ├── Column.jsx
        │       └── TaskCard.jsx
        └── pages/
            └── BoardPage.jsx
```
