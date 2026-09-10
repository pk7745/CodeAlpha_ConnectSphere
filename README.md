# ConnectSphere

> **"Meet. Collaborate. Get Things Done."**

A full-stack real-time video conferencing and interactive collaboration platform engineered for the **CodeAlpha Full Stack Development Internship (Task 4)**.

---

## 🌟 Project Status & Architecture

- **Status**: Deployment-Ready Architecture Prepared for Render (Free) + Neon
- **Target Deployment**:
  - **Frontend**: Render Static Site (Free Plan)
  - **Backend**: Render Web Service (Free Plan)
  - **Database**: Neon Serverless PostgreSQL (Free Tier)
  - **File Storage**: Cloud Object Storage (e.g. Cloudflare R2 / Supabase Storage via S3 API)
- **Real-Time Stack**: WebRTC DTLS-SRTP Mesh + Socket.IO over WSS
- **Security**: Bcrypt (10 rounds), JWT, Helmet, Strict Production CORS, In-Memory Rate Limiting, Zod Validation

---

## 📋 CodeAlpha Task 4 — Core Requirements Implementation

| CodeAlpha Requirement | ConnectSphere Module | Implementation Details |
| :--- | :--- | :--- |
| **1. Multi-user video calling** | Browser-native WebRTC mesh with DTLS-SRTP encryption, dynamic grid layout, audio indicator, active speaker highlight, camera toggling, and connection health diagnostics. | Verified (Phases 4–6) |
| **2. Screen sharing** | Native `navigator.mediaDevices.getDisplayMedia` screen capture with track replacement and auto-restoration upon termination. | Verified (Phase 5) |
| **3. File sharing** | `StorageProvider` abstraction supporting local disk in dev and S3-compatible cloud object storage in prod, with 15MB limit, executable blocking, and path traversal protection. | Verified (Phase 7 & Hardening) |
| **4. Collaborative whiteboard** | HTML5 Canvas whiteboard modal featuring pen, eraser, geometric shapes (rectangle, circle, line), color palette, stroke width adjustments, undo history, clear canvas, PNG export, and real-time Socket.IO synchronization. | Verified (Phase 7) |
| **5. Data encryption / security** | Native WebRTC DTLS-SRTP media stream encryption, bcrypt password hashing with 10 salt rounds, signed JWT access tokens, HTTP security headers (Helmet), CORS whitelisting, and strict Zod input validation. | Verified (Phases 2 & 10) |
| **6. User authentication** | Full authentication pipeline: secure registration, login, JWT token management, automatic session restoration, and authenticated API / Socket middleware. | Verified (Phase 2) |

---

## 🚀 Key Features

1. **Smart Workspace Drawer**:
   - **Real-Time Meeting Chat**: Live messaging with auto-scroll, timestamps, and sender identification.
   - **Collaborative Notes**: Live-synced meeting notepad formatted with Markdown support.
   - **Interactive Agenda**: Real-time meeting agenda with checkable item statuses for milestone tracking.
   - **Action Items Tracker**: Task checklist with assignees, due dates, and instant completion toggles.
2. **AI-Powered Meeting Intelligence**:
   - **Google Gemini API Support**: Server-side Gemini API integration with zero credentials exposed to browser.
   - **Zero-Cost Local NLP Fallback**: Automatic local heuristics fallback if no API key is provided or request times out.
   - **Executive Summaries**: Synthesizes agenda, notes, and discussion flow into professional briefs.
   - **Key Discussion & Decisions Extraction**: Automatically captures decisions made during the conference.
   - **Sentiment & Engagement Analytics**: Analyzes team sentiment and engagement scoring.
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

## 🏗️ Free-Tier Production Architecture (Render + Neon)

```
GitHub Monorepo
   |
   +--------------------------------------------------+
   |                                                  |
   v                                                  v
Render Static Site (FREE)                         Render Web Service (FREE)
(client / React 18 / Vite)                        (server / Node / Express / Socket.IO)
   |                                                  |
   |                                                  +---> Neon PostgreSQL (DATABASE_URL)
   |                                                  +---> Google Gemini API (GEMINI_API_KEY)
   |                                                  +---> Cloud Object Storage (R2 / S3)
   |                                                  |
   +--- (HTTPS) ---> API Endpoints -------------------+
   +--- (WSS) -----> Real-Time Signaling -------------+
```

### Frontend (`client`)
- **Type**: Render Static Site (Free Plan)
- **Build Command**: `npm ci && npm run build`
- **Publish Path**: `dist`
- **Routing**: SPA rewrite rule (`/* -> /index.html`)
- **Environment**: `VITE_API_URL` and `VITE_SOCKET_URL`

### Backend (`server`)
- **Type**: Render Web Service (Free Plan)
- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npm start`
- **Health Check**: `/api/health`
- **Binding**: Explicitly listens on `0.0.0.0:$PORT`
- **Process Management**: Graceful shutdown on `SIGTERM`/`SIGINT` with Prisma disconnect
- **Filesystem**: Treated as strictly ephemeral.

### Database (`Neon PostgreSQL`)
- **Type**: Serverless PostgreSQL
- **Migrations**: Pre-generated production migration in `server/prisma/migrations/20260910000000_init_neon_postgresql/`
- **Execution**: `npx prisma migrate deploy`

### Storage Abstraction (`StorageProvider`)
- **Interface**: Decoupled from physical disk via `StorageProvider` abstraction.
- **Local Development**: `LocalFilesystemStorage` writing to `./uploads`.
- **Production**: `CloudStorageProvider` connected to S3-compatible cloud object storage (e.g. Cloudflare R2 / Supabase Storage), ensuring persistent files without paid Render disks.

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
│   ├── test-*.js               # Automated integration tests across all phases
│   └── package.json
│
├── docs/                       # Complete deployment guides
│   ├── RENDER_DEPLOYMENT_AUDIT.md
│   ├── RENDER_DEPLOYMENT.md    # Step-by-step instructions for Render & Neon
│   ├── NEON_DATABASE.md        # Neon connection & migration guide
│   └── STORAGE.md              # StorageProvider & Cloudflare R2 / S3 guide
│
├── render.yaml                 # Render Blueprint specification (100% Free Plan)
├── .env.example                # Global environment template
├── package.json                # Monorepo root orchestration
└── README.md
```

---

## ⚠️ Architectural Scope & Limitations

1. **WebRTC Mesh Participant Scope**:
   - Uses peer-to-peer WebRTC mesh topology with DTLS-SRTP encryption.
   - Targeted and optimized for **2–6 active video participants** per meeting room.
   - For larger meetings exceeding 6–8 concurrent video streams, an SFU (Selective Forwarding Unit) media server would be recommended.
2. **Ephemeral Web Service Filesystem**:
   - On Render Free Web Services, container filesystems are ephemeral and reset on sleep or restart.
   - Meeting file attachments require configuring `STORAGE_PROVIDER=cloud` with S3-compatible cloud object storage (e.g. Cloudflare R2 / Supabase Storage).
3. **In-Memory Rate Limiting**:
   - The rate limiters are process-local (single instance). Multi-instance clusters would require a shared Redis store.

---

## 📖 Deployment Documentation Links

- [Render Free Tier Deployment Guide](docs/RENDER_DEPLOYMENT.md)
- [Neon PostgreSQL Setup & Migrations](docs/NEON_DATABASE.md)
- [Storage Architecture & Cloud Object Storage](docs/STORAGE.md)
- [Render Deployment Audit Checklist](docs/RENDER_DEPLOYMENT_AUDIT.md)

---

## 👨‍💻 Author & Internship Submission

- **Internship**: CodeAlpha Full Stack Development Internship
- **Task**: Task 4 — Real-Time Communication & Collaboration Platform
- **Project**: ConnectSphere ("Meet. Collaborate. Get Things Done.")
- **License**: MIT