# ConnectSphere

> **"Meet. Collaborate. Get Things Done."**

A production-grade, full-stack real-time video conferencing and interactive collaboration platform engineered for the **CodeAlpha Full Stack Development Internship (Task 4)**.

---

## ?? Badges & Project Status

- **Status**: Complete & Verified (Phases 1 through 10)
- **Automated Tests**: **101 / 101 Passed (100% Pass Rate)**
- **Architecture**: WebRTC Mesh + Socket.IO + Express + React 18 + Prisma ORM
- **Security**: DTLS-SRTP Media Encryption, Bcrypt, JWT, Helmet, Strict CORS, Zod Validation

---

## ?? CodeAlpha Task 4 — Core Requirements Compliance

ConnectSphere implements **every single requirement** specified for CodeAlpha Full Stack Internship Task 4, accompanied by modern SaaS features:

| CodeAlpha Requirement | ConnectSphere Implementation | Status |
| :--- | :--- | :--- |
| **1. Multi-user video calling** | Browser-native WebRTC mesh with DTLS-SRTP encryption, dynamic grid layout, audio indicator, active speaker highlight, camera toggling, and connection health diagnostics. | ? Completed |
| **2. Screen sharing** | Native 
avigator.mediaDevices.getDisplayMedia screen capture with track replacement and auto-restoration upon termination. | ? Completed |
| **3. File sharing** | Secure upload dropzone powered by Multer with 15MB file size limits, executable filtering (.exe, .bat, .cmd, etc.), path traversal defenses, download endpoints, and delete permissions. | ? Completed |
| **4. Collaborative whiteboard** | HTML5 Canvas whiteboard modal featuring pen, eraser, geometric shapes (rectangle, circle, line), color palette, stroke width adjustments, undo history, clear canvas, PNG image export, and real-time Socket.IO synchronization. | ? Completed |
| **5. Data encryption / security** | Native WebRTC DTLS-SRTP media stream encryption, bcrypt password hashing with 10 salt rounds, signed JWT access tokens, HTTP security headers (Helmet), CORS whitelisting, and strict Zod input validation. | ? Completed |
| **6. User authentication** | Full authentication pipeline: secure registration, login, JWT token management, automatic session restoration, and authenticated API / Socket middleware. | ? Completed |

---

## ?? Advanced Production Features (Beyond Task 4 Requirements)

ConnectSphere goes beyond basic video calls with a comprehensive collaboration and productivity suite:

1. **Smart Workspace Drawer**:
   - **Real-Time Meeting Chat**: Live messaging with auto-scroll, message timestamps, and sender identification.
   - **Collaborative Notes**: Live-synced meeting notepad formatted with Markdown support.
   - **Interactive Agenda**: Real-time meeting agenda with checkable item statuses for agenda tracking.
   - **Action Items Tracker**: Task checklist with assignees, due dates, and instant completion toggles.
2. **AI-Powered Meeting Intelligence (Zero Cost NLP Engine)**:
   - **Executive Summaries**: Synthesizes agenda, notes, and discussion flow into professional bulleted executive briefs.
   - **Key Discussion & Decisions Extraction**: Automatically captures decisions made during the conference.
   - **Sentiment & Engagement Analytics**: Analyzes team sentiment (POSITIVE, CONSTRUCTIVE, ANALYTICAL, NEUTRAL) and engagement scoring.
   - **Contextual Q&A Assistant**: In-meeting AI chatbot that answers questions regarding the ongoing discussion.
   - **Automated Task Extractor**: Scans chat messages for commitments ("I will...", "Let me handle...") and creates action items with one click.
3. **Interactive Audience Engagement**:
   - **Live Polls**: Real-time poll creator, multi-choice voting, live percentage bars, and host closing controls.
   - **Floating Emoji Reactions**: Live animated emoji particles (??, ??, ??, ??, ??, ??) floating across peer screens.
4. **Meeting Management & Controls**:
   - Human-readable room codes (CONNECT-XXXXXX).
   - Pre-join hardware preview modal (test camera & microphone before entering).
   - In-call participant drawer with presence indicators.
   - Keyboard shortcuts (Ctrl+D for audio mute, Ctrl+E for camera).
   - Meeting summary dashboard with duration tracking, participant counts, and host management.

---

## ??? Architecture & Technology Stack

### Frontend (client)
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom responsive UI and dark/light themes
- **Icons**: Lucide React
- **Real-Time Client**: Socket.IO Client
- **Media Engine**: Native WebRTC RTCPeerConnection and Canvas API

### Backend (server)
- **Runtime**: Node.js & TypeScript
- **Web Framework**: Express.js
- **Signaling Server**: Socket.IO (room-based presence, signaling, chat, whiteboard, and reactions)
- **Database & ORM**: Prisma ORM with SQLite (dev.db) for development; PostgreSQL/Neon-ready for production
- **Security & Utilities**:
  - cryptjs for salted password hashing
  - jsonwebtoken for secure stateless tokens
  - helmet for HTTP response security headers
  - cors for origin control
  - multer for secure file sharing
  - zod for type-safe schema validation

---

## ?? Repository Structure

`
CodeAlpha_ConnectSphere/
+-- client/                     # Frontend React application
¦   +-- public/                 # Static assets
¦   +-- src/
¦   ¦   +-- components/
¦   ¦   ¦   +-- auth/           # Login & Register forms
¦   ¦   ¦   +-- collaboration/  # Chat, Files, Whiteboard, Notes, Agenda, Tasks, Polls, AI
¦   ¦   ¦   +-- common/         # Navbar, ThemeToggle, ProtectedRoute
¦   ¦   ¦   +-- dashboard/      # Create Meeting, Join Meeting, History, MeetingSummaryModal
¦   ¦   ¦   +-- meeting/        # VideoGrid, VideoTile, MeetingControls, FloatingReactions, PreJoinModal
¦   ¦   +-- contexts/           # AuthContext & ThemeContext
¦   ¦   +-- hooks/              # useMeetingSocket, useWebRTC
¦   ¦   +-- pages/              # HomePage, LoginPage, RegisterPage, DashboardPage, MeetingRoomPage
¦   ¦   +-- services/           # REST clients (api, meetingApi, collaborationApi, aiApi, pollApi, socketService)
¦   ¦   +-- App.tsx             # Route configuration
¦   ¦   +-- main.tsx            # Application entry point
¦   +-- package.json
¦   +-- vite.config.ts
¦
+-- server/                     # Backend Node.js / Express application
¦   +-- prisma/
¦   ¦   +-- schema.prisma       # Prisma relational schema (User, Meeting, Participant, Chat, File, Poll, etc.)
¦   +-- src/
¦   ¦   +-- config/             # Environment & configuration settings
¦   ¦   +-- controllers/        # Express controllers (auth, meeting)
¦   ¦   +-- middleware/         # authMiddleware, validationMiddleware
¦   ¦   +-- routes/             # authRoutes, meetingRoutes, fileRoutes, collaborationRoutes, aiRoutes, pollRoutes
¦   ¦   +-- services/           # aiService (local NLP intelligence engine)
¦   ¦   +-- socket/             # Socket.IO connection and event handlers
¦   ¦   +-- utils/              # password hashing, jwt utilities, room code generator, sanitizer
¦   ¦   +-- validators/         # Zod schemas
¦   ¦   +-- server.ts           # Server bootstrap and middleware configuration
¦   +-- test-auth.js            # Automated test suite: Auth (13 tests)
¦   +-- test-meeting.js         # Automated test suite: Meeting management (15 tests)
¦   +-- test-socket.js          # Automated test suite: Socket.IO signaling (18 tests)
¦   +-- test-webrtc.js          # Automated test suite: WebRTC signaling (11 tests)
¦   +-- test-collaboration.js   # Automated test suite: Collaboration & Whiteboard (20 tests)
¦   +-- test-ai.js              # Automated test suite: AI intelligence & Assistant (14 tests)
¦   +-- test-polls.js           # Automated test suite: Polls & Reactions (10 tests)
¦   +-- package.json
¦
+-- .env.example                # Global environment template
+-- package.json                # Root package scripts
+-- README.md                   # Complete documentation
`

---

## ?? Getting Started & Local Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18.0.0 or higher recommended)
- 
pm (Node Package Manager)

### Step 1: Clone and Install Dependencies

`ash
# Clone the repository
git clone https://github.com/your-username/CodeAlpha_ConnectSphere.git
cd CodeAlpha_ConnectSphere

# Install dependencies for both server and client
npm run install:all
`

### Step 2: Configure Environment Variables

`ash
# Copy example environment configurations
cp server/.env.example server/.env
cp client/.env.example client/.env
`

server/.env contents:
`env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL="file:./dev.db"
JWT_SECRET="connectsphere_super_secret_jwt_key_change_in_production_2026"
JWT_EXPIRES_IN="7d"
MAX_FILE_SIZE_MB=15
UPLOAD_DIR="./uploads"
`

### Step 3: Initialize the Database

`ash
cd server
npx prisma db push
cd ..
`

### Step 4: Run the Development Servers

In terminal 1 (Backend):
`ash
npm run dev:server
`
*Backend server runs on http://localhost:5000*

In terminal 2 (Frontend):
`ash
npm run dev:client
`
*Frontend client runs on http://localhost:5173*

---

## ?? Comprehensive Automated Test Suite

ConnectSphere includes an extensive, enterprise-grade automated test harness verifying all 10 phases.

To execute all **101 automated tests**:

`ash
# From the root directory:
npm test

# Or directly from the server directory:
cd server
npm test
`

### Test Suite Breakdown:

`
============================================================
CONNECTSPHERE AUTOMATED VERIFICATION SUITE
============================================================
  Phase 2: Authentication & Password Security       13 / 13 PASS
  Phase 3: Meeting Management & Room Codes          15 / 15 PASS
  Phase 4: Socket.IO Signaling & Presence           18 / 18 PASS
  Phase 5: WebRTC Signaling Mesh                    11 / 11 PASS
  Phase 7: Real-Time Collaboration & Whiteboard     20 / 20 PASS
  Phase 8: AI Productivity & Meeting Intelligence   14 / 14 PASS
  Phase 9: Interactive Engagement & Live Polls      10 / 10 PASS
------------------------------------------------------------
  TOTAL VERIFIED TESTS:                            101 / 101 PASS
============================================================
`

All tests execute with automated resource cleanup, creating and tearing down isolated testing databases and mock sockets.

---

## ?? Security Hardening Highlights

- **Media Encryption**: Audio and video streams are encrypted in-transit via standard WebRTC DTLS-SRTP.
- **Password Security**: Passwords are never stored in plaintext; salted and hashed with cryptjs (10 rounds).
- **Zero Credential Leaks**: Automated test assertions ensure passwordHash is stripped before any API response is returned.
- **File Upload Safeguards**: Multer enforces a 15MB file size ceiling, strictly sanitizes filenames to block path traversal, and rejects dangerous executable file types.
- **Authorization Verification**: Non-meeting participants cannot inspect chat history, download meeting files, read meeting notes, or vote in polls.
- **HTTP Header Hardening**: Powered by Helmet to mitigate cross-site scripting (XSS), clickjacking, and MIME sniffing attacks.

---

## ?? Production Deployment Guide

### Deploy Backend (e.g., Render / Railway)
1. Push repository to GitHub.
2. Create a new Web Service pointing to /server.
3. Set Build Command: 
pm install && npx prisma generate && npm run build.
4. Set Start Command: 
ode dist/server.js.
5. Add Environment Variables:
   - NODE_ENV=production
   - PORT=5000
   - CLIENT_URL=https://your-frontend-domain.vercel.app
   - DATABASE_URL=postgresql://... (or use persistent disk for SQLite)
   - JWT_SECRET=your-secure-random-64-character-string

### Deploy Frontend (e.g., Vercel / Netlify)
1. Create a new project pointing to /client.
2. Set Build Command: 
pm run build.
3. Set Output Directory: dist.
4. Add Environment Variable:
   - VITE_API_URL=https://your-backend-domain.onrender.com

---

## ????? Author & Internship Details

- **Developer**: CodeAlpha Full Stack Development Intern
- **Task**: Task 4 — Real-Time Communication & Collaboration Platform
- **Project**: ConnectSphere ("Meet. Collaborate. Get Things Done.")
- **Submission Date**: September 2026
- **License**: MIT
