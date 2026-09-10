# ConnectSphere

> **"Meet. Collaborate. Get Things Done."**

A production-grade, full-stack real-time video conferencing and interactive collaboration platform engineered for the **CodeAlpha Full Stack Development Internship (Task 4)**.

---

## 🌟 Project Status & Badges

- **Status**: Production Deployment Ready (Phases 1 → 10 Complete)
- **Automated Tests**: **101 / 101 Passed (100% Pass Rate)**
- **Target Deployment**: Render Static Site (Frontend) + Render Web Service (Backend) + Neon (PostgreSQL)
- **Real-Time Stack**: WebRTC DTLS-SRTP Mesh + Socket.IO over WSS
- **Security**: Bcrypt (10 rounds), JWT, Helmet, Strict Production CORS, In-Memory Rate Limiting, Zod Validation

---

## 📋 CodeAlpha Task 4 — Core Requirements Compliance Matrix

ConnectSphere fulfills **every single requirement** specified for CodeAlpha Task 4:

| CodeAlpha Requirement | ConnectSphere Module | Verification Status |
| :--- | :--- | :--- |
| **1. Multi-user video calling** | Browser-native WebRTC mesh with DTLS-SRTP encryption, dynamic grid layout, audio indicator, active speaker highlight, camera toggling, and connection health diagnostics. | ✅ Completed (Phases 4-6) |
| **2. Screen sharing** | Native `navigator.mediaDevices.getDisplayMedia` screen capture with track replacement and auto-restoration upon termination. | ✅ Completed (Phase 5) |
| **3. File sharing** | Configurable `StorageProvider` with 15MB file limit, executable filtering, path traversal defenses, authenticated download endpoints, and delete permissions. | ✅ Completed (Phase 7 & Hardening) |
| **4. Collaborative whiteboard** | HTML5 Canvas whiteboard modal featuring pen, eraser, geometric shapes (rectangle, circle, line), color palette, stroke width adjustments, undo history, clear canvas, PNG export, and real-time Socket.IO synchronization. | ✅ Completed (Phase 7) |
| **5. Data encryption / security** | Native WebRTC DTLS-SRTP media stream encryption, bcrypt password hashing with 10 salt rounds, signed JWT access tokens, HTTP security headers (Helmet), CORS whitelisting, and strict Zod input validation. | ✅ Completed (Phases 2 & 10) |
| **6. User authentication** | Full authentication pipeline: secure registration, login, JWT token management, automatic session restoration, and authenticated API / Socket middleware. | ✅ Completed (Phase 2) |

---

## 🚀 Advanced Production Features

ConnectSphere goes beyond basic video calls with a comprehensive collaboration and productivity suite:

1. **Smart Workspace Drawer**:
   - **Real-Time Meeting Chat**: Live messaging with auto-scroll, timestamps, and sender identification.
   - **Collaborative Notes**: Live-synced meeting notepad formatted with Markdown support.
   - **Interactive Agenda**: Real-time meeting agenda with checkable item statuses for milestone tracking.
   - **Action Items Tracker**: Task checklist with assignees, due dates, and instant completion toggles.
2. **AI-Powered Meeting Intelligence**:
   - **Google Gemini API Support**: Server-side Gemini 1.5 Flash integration with zero credentials exposed to browser.
   - **Zero-Cost Local NLP Fallback**: Automatic local heuristics fallback if no API key is provided.
   - **Executive Summaries**: Synthesizes agenda, notes, and discussion flow into professional briefs.
   - **Key Discussion & Decisions Extraction**: Automatically captures decisions made during the conference.
   - **Sentiment & Engagement Analytics**: Analyzes team sentiment (POSITIVE, CONSTRUCTIVE, ANALYTICAL, NEUTRAL) and engagement scoring.
   - **Contextual Q&A Assistant**: In-meeting AI chatbot that answers questions regarding the ongoing discussion.
   - **Automated Task Extractor**: Scans chat messages for commitments ("I will...", "Let me handle...") and auto-creates action items.
3. **Interactive Audience Engagement**:
   - **Live Polls**: Real-time poll creator, multi-choice voting, live percentage bars, and host closing controls.
   - **Floating Emoji Reactions**: Live animated emoji particles (👍, ❤️, 👏, 🎉, 🔥, 💡) floating across peer screens.
4. **Meeting Management & Controls**:
   - Human-readable room codes (`CONNECT-XXXXXX`).
   - Pre-join hardware preview modal (test camera & microphone before entering).
   - In-call participant drawer with presence indicators.
   - Keyboard shortcuts (`Ctrl+D` for audio mute, `Ctrl+E` for camera).
   - Meeting summary dashboard with duration tracking, participant counts, and host management.

---

## 🏗️ Production Architecture (Render + Neon)

```
GitHub Monorepo
   |
   +--------------------------------------------------+
   |                                                  |
   v                                                  v
Render Static Site                              Render Web Service
(client / React 18 / Vite)                      (server / Node / Express / Socket.IO)
   |                                                  |
   |                                                  +---> Neon PostgreSQL (DATABASE_URL)
   |                                                  +---> Google Gemini API (GEMINI_API_KEY)
   |                                                  +---> Render Persistent Disk (/var/data/uploads)
   |                                                  |
   +--- (HTTPS) ---> API Endpoints -------------------+
   +--- (WSS) -----> Real-Time Signaling -------------+
```

### Frontend (`client`)
- **Type**: Render Static Site
- **Build Command**: `npm ci && npm run build`
- **Publish Path**: `dist`
- **Routing**: SPA rewrite rule (`/* -> /index.html`)
- **Environment**: `VITE_API_URL` and `VITE_SOCKET_URL`

### Backend (`server`)
- **Type**: Render Web Service
- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npm start`
- **Health Check**: `/api/health`
- **Binding**: Explicitly listens on `0.0.0.0:$PORT`
- **Process Management**: Graceful shutdown on `SIGTERM`/`SIGINT` with Prisma disconnect

### Database (Neon PostgreSQL)
- **Database**: Neon Serverless PostgreSQL
- **Migrations**: Pre-generated production migration in `server/prisma/migrations/20260910000000_init_neon_postgresql/`
- **Execution**: `npx prisma migrate deploy`

### Storage Abstraction (`StorageProvider`)
- **Interface**: Decoupled from physical disk via `StorageProvider` abstraction.
- **Local Dev**: Writes to `./uploads` in workspace.
- **Production**: Configured via `UPLOAD_DIR=/var/data/uploads` when Render Persistent Disk is attached.

---

## 📁 Repository Structure

```
CodeAlpha_ConnectSphere/
├── client/                     # Frontend React 18 + Vite SPA
│   ├── src/
│   │   ├── components/         # UI components (auth, meeting, collaboration, dashboard)
│   │   ├── contexts/           # AuthContext, ThemeContext
│   │   ├── hooks/              # useWebRTC, useMeetingSocket
│   │   ├── pages/              # Landing, Login, Register, Dashboard, MeetingRoom
│   │   ├── services/           # api, socketService, meetingApi, collaborationApi, aiApi, pollApi
│   │   └── vite-env.d.ts       # Vite TypeScript definitions
│   ├── package.json
│   └── vite.config.ts
│
├── server/                     # Backend Node.js / Express / Socket.IO Server
│   ├── prisma/
│   │   ├── schema.prisma       # SQLite dev schema
│   │   ├── schema.postgresql.prisma # Production Neon PostgreSQL schema
│   │   └── migrations/         # Production PostgreSQL DDL migration
│   ├── src/
│   │   ├── config/             # Environment & startup validation
│   │   ├── controllers/        # Express controllers (auth, meeting)
│   │   ├── middleware/         # authMiddleware, rateLimitMiddleware
│   │   ├── routes/             # authRoutes, meetingRoutes, fileRoutes, collaborationRoutes, aiRoutes, pollRoutes, healthRoutes
│   │   ├── services/           # aiService (Gemini + local NLP), storage/ (StorageProvider abstraction)
│   │   ├── socket/             # Socket.IO handlers (WebRTC signaling, chat, whiteboard, presence)
│   │   └── server.ts           # Express & Socket.IO server with 0.0.0.0 binding and graceful shutdown
│   ├── test-*.js               # 101 automated integration tests across all phases
│   └── package.json
│
├── docs/                       # Complete deployment guides
│   ├── RENDER_DEPLOYMENT_AUDIT.md
│   ├── RENDER_DEPLOYMENT.md    # Step-by-step instructions for Render & Neon
│   ├── NEON_DATABASE.md        # Neon connection & migration guide
│   └── STORAGE.md              # StorageProvider & Render Persistent Disk guide
│
├── render.yaml                 # Render Blueprint specification
├── .env.example                # Global environment template
├── package.json                # Monorepo root orchestration
└── README.md
```

---

## 🧪 Automated Test Verification (101 / 101 Tests Passing)

```
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
```

To run the full suite:
```bash
npm test
```

---

## ⚙️ Environment Variables Reference

### Backend (`server/.env`)
```env
NODE_ENV=production
PORT=5000
DATABASE_URL="postgresql://user:password@ep-xyz.neon.tech/connectsphere?sslmode=require"
JWT_SECRET="your_64_char_secure_random_key"
CLIENT_URL="https://connectsphere.onrender.com"
GEMINI_API_KEY="AIza..."                # Optional
UPLOAD_DIR="/var/data/uploads"           # Optional (Render Persistent Disk)
```

### Frontend (`client/.env`)
```env
VITE_API_URL="https://connectsphere-api.onrender.com"
VITE_SOCKET_URL="https://connectsphere-api.onrender.com"
```

---

## ⚠️ Architectural Scope & Limitations

1. **WebRTC Mesh Scaling Target**:
   - The conferencing engine uses a peer-to-peer WebRTC mesh topology with DTLS-SRTP encryption.
   - It is intentionally targeted and optimized for **2–6 active video participants** per room.
   - For 10+ active video participants, a Selective Forwarding Unit (SFU) architecture should be considered.
2. **Persistent Disk Single-Instance Scope**:
   - The local storage provider supports Render Persistent Disks mounted at `/var/data/uploads`.
   - Persistent disks attach to a single container instance. If horizontally autoscaling across multiple server instances in the future, cloud object storage (e.g. AWS S3 or Cloudflare R2) can be slotted into the `StorageProvider` interface without changing application code.

---

## 📖 Deployment Documentation Links

- [Render Deployment Step-by-Step Guide](docs/RENDER_DEPLOYMENT.md)
- [Neon PostgreSQL Setup & Migrations](docs/NEON_DATABASE.md)
- [Storage Architecture & Persistence](docs/STORAGE.md)
- [Render Deployment Audit](docs/RENDER_DEPLOYMENT_AUDIT.md)

---

## 👨‍💻 Author & Internship Submission

- **Internship**: CodeAlpha Full Stack Development Internship
- **Task**: Task 4 — Real-Time Communication & Collaboration Platform
- **Project**: ConnectSphere ("Meet. Collaborate. Get Things Done.")
- **License**: MIT