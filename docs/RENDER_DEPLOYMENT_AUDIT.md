# ConnectSphere: Production Deployment Audit (Render Free Tier + Neon)

**Project**: ConnectSphere — *“Meet. Collaborate. Get Things Done.”*  
**Architecture Target**: 100% Free-Tier Deployment  
**Auditor**: Lead Full-Stack Engineer  
**Target Environment**: 
- **Frontend**: Render Static Site (React 18 / Vite SPA — FREE)
- **Backend**: Render Web Service (Node.js / Express / Socket.IO — FREE)
- **Database**: Neon Serverless PostgreSQL (FREE)
- **File Storage**: Supabase Storage Free Tier (1 GB persistent storage — FREE, no credit card)
- **AI Intelligence**: Google Gemini API (server-side only) with offline local NLP fallback
- **Real-Time**: Socket.IO over WebSocket (HTTPS / WSS)
- **Media**: Native Browser WebRTC Mesh (DTLS-SRTP, STUN NAT traversal, 2–6 participants)
- **Storage**: StorageProvider Abstraction (`LocalFilesystemStorage` in dev, `SupabaseStorageProvider` in prod)

---

## 1. Architecture Overview

ConnectSphere is structured as a clean TypeScript monorepo with two primary workspaces:
- `/client`: React 18, Vite, Tailwind CSS, Lucide React, Socket.IO Client, WebRTC RTCPeerConnection.
- `/server`: Node.js, Express, Socket.IO Server, Prisma ORM, Multer, Zod, bcryptjs, jsonwebtoken, Helmet, AWS S3 Client.

```
+-------------------------------------------------------------------------+
|                              GITHUB REPO                                |
+-------------------------------------------------------------------------+
                    |                                 |
                    v                                 v
   +---------------------------------+  +---------------------------------+
   |    RENDER STATIC SITE (FREE)    |  |    RENDER WEB SERVICE (FREE)    |
   |         React 18 + Vite         |  |     Node.js + Express + WSS     |
   +---------------------------------+  +---------------------------------+
                    |                                 |
         HTTPS      |                      HTTPS/WSS  |
                    v                                 v
        [Client Browser] <========================> [Backend API & Socket]
                ^                                     |
                | WebRTC Mesh (P2P DTLS-SRTP)         +---> Neon PostgreSQL
                v                                     +---> Gemini API (Server)
        [Other Participants]                          +---> Supabase Storage (Free Tier)
```

---

## 2. Production Blockers & Hardening Audit

| ID | Category | Local Development State | Production Reality (Render Free Tier + Neon) | Implemented Resolution |
| :--- | :--- | :--- | :--- | :--- |
| **B-01** | Frontend API URL | `api.ts` hardcoded `API_BASE = '/api'`. | Frontend and backend run on separate subdomains (`*.onrender.com`). | Reads `import.meta.env.VITE_API_URL` to prefix API requests dynamically. |
| **B-02** | Frontend Socket URL | `socketService.ts` called `io()` with default host. | Static site domain does not handle WebSocket connections. | Passes `import.meta.env.VITE_SOCKET_URL` to `io()`. |
| **B-03** | File Download URL | `collaborationApi.ts` fetched `/api/meetings/...` directly. | Download requests failed on separate static domain. | Centralized download fetches to use dynamic `API_BASE`. |
| **B-04** | Server Host Binding | `server.listen(port)` did not bind to `0.0.0.0`. | Render Web Services require explicit binding to `0.0.0.0` for port detection. | Bound server explicitly to `0.0.0.0`. |
| **B-05** | CORS Security | CORS allowed localhost in production. | In production, opening CORS to unverified origins is insecure. | Strict origin verification in production: allow exclusively `CLIENT_URL`. |
| **B-06** | Ephemeral File Storage | `fileRoutes.ts` wrote to `./uploads` on local disk. | Render Free Web Service filesystem is strictly ephemeral; files are lost on restart. Render Persistent Disk requires a paid plan. | Implemented `SupabaseStorageProvider` using free Supabase Storage (1GB free, no billing required) with `LocalFilesystemStorage` for local dev. |
| **B-07** | Database Provider | `schema.prisma` configured with SQLite. | Neon is cloud PostgreSQL. SQLite cannot connect to Neon. | Created `schema.postgresql.prisma` and generated deterministic PostgreSQL migration SQL. |
| **B-08** | Build Sequence | Build script was `tsc`. | Code lacked updated Prisma client. | Updated server build to `prisma generate && tsc`. |
| **B-09** | SPA Client Routing | Direct navigation to non-root routes failed on static CDN. | Static sites return 404 for non-root paths without rewrite rules. | Added rewrite rule in `render.yaml` (`/* -> /index.html`). |
| **B-10** | Graceful Shutdown | Server did not handle `SIGTERM`/`SIGINT`. | Render stops containers with `SIGTERM`. | Added graceful shutdown closing HTTP server, Socket.IO, and disconnecting Prisma. |
| **B-11** | Startup Validation | Config loaded without validating required variables. | Missing `JWT_SECRET` or `DATABASE_URL` causes crashes. | Added startup validator that fails fast with clear errors without leaking secret values. |
| **B-12** | AI / Gemini Integration | Local NLP only. | Server-side Gemini API capability required. | Added server-side Google Gemini API integration with an 8s timeout and automatic fallback to local NLP. |

---

## 3. Environment Variables Matrix

### Backend Web Service (`server`)

| Variable | Required in Prod | Description | Example / Default |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | **Yes** | Execution mode | `production` |
| `PORT` | **Yes** (Render injects) | Port the backend listens on | `10000` |
| `DATABASE_URL` | **Yes** | Neon PostgreSQL connection string | `postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require` |
| `JWT_SECRET` | **Yes** | Secret for signing auth tokens (min 32 chars) | Random 64-char string |
| `CLIENT_URL` | **Yes** | Deployed Render Frontend Static Site URL | `https://connectsphere.onrender.com` |
| `STORAGE_PROVIDER` | **Yes** | Storage mode | `supabase` (or `local` for dev) |
| `SUPABASE_URL` | Required if prod | Supabase Project URL | `https://<project-ref>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Required if prod | Supabase Service Role Secret Key | Server-side secret |
| `SUPABASE_STORAGE_BUCKET` | Optional | Bucket name (default: connectsphere-files) | `connectsphere-files` |
| `GEMINI_API_KEY` | Optional | Google Gemini API key | Server-side secret (local NLP fallback if omitted) |

### Frontend Static Site (`client`)

| Variable | Required in Prod | Description | Example / Default |
| :--- | :--- | :--- | :--- |
| `VITE_API_URL` | **Yes** | Deployed Render Backend URL | `https://connectsphere-api.onrender.com` |
| `VITE_SOCKET_URL` | Optional | Deployed Render Backend WebSocket URL | `https://connectsphere-api.onrender.com` |

*Security Rule: Zero secrets (`DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, or storage secrets) are ever bundled into the client build.*

---

## 4. Rate Limiting & WebRTC Topology

- **Rate Limiting**: Implemented via sliding-window in-memory rate limiters (`authRateLimiter`, `aiRateLimiter`, `fileUploadRateLimiter`). Documented strictly as **single-instance / process-local** rate limiting.
- **WebRTC Mesh Scaling**: Mesh peer-to-peer topology target is **2–6 active participants**. Large-scale enterprise meetings require an SFU (e.g. mediasoup/LiveKit).
