# ConnectSphere: Render & Neon Production Deployment Guide

> **Important**: This guide outlines the exact, production-verified sequence to deploy ConnectSphere to **Render** and **Neon**. Follow each step sequentially.

---

## Architecture Summary

`
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
`

---

## Step-by-Step Deployment Instructions

### STEP 1: Push Repository to GitHub
Ensure the latest main branch with all 10 verified phases and Render configurations is committed and pushed:
`ash
git push origin main
`

---

### STEP 2: Create a Neon PostgreSQL Database
1. Go to [Neon.tech](https://neon.tech) and sign in.
2. Click **Create Project**.
   - **Project Name**: connectsphere-db
   - **Region**: Choose a region close to your Render deployment (e.g. US East / Oregon).
   - **PostgreSQL Version**: 16 (default).
3. Under the **Dashboard** / **Connection Details**, select **Prisma** or **Direct Connection**.
4. Copy the connection string. It will look like:
   `
   postgresql://connectsphere_owner:SECRET_PASSWORD@ep-random-name.us-east-2.aws.neon.tech/connectsphere?sslmode=require
   `

---

### STEP 3: Apply the Database Migration to Neon
You can apply the verified PostgreSQL migration to your Neon database in one of two ways:

#### Option A: Using Prisma Migrate (Recommended)
From your terminal, execute:
`ash
cd server
DATABASE_URL="your_neon_connection_string" npx prisma migrate deploy
`
This runs 20260910000000_init_neon_postgresql/migration.sql and provisions all tables, foreign keys, and indexes.

#### Option B: Using the Neon SQL Editor
1. Open the **SQL Editor** tab in your Neon Console.
2. Paste the contents of server/prisma/migrations/20260910000000_init_neon_postgresql/migration.sql.
3. Click **Run**.

---

### STEP 4: Create the Backend Web Service on Render
1. Log in to [Render.com](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository: CodeAlpha_ConnectSphere.
4. Configure the service settings:
   - **Name**: connectsphere-server
   - **Region**: Oregon (matching Neon where possible)
   - **Branch**: main
   - **Root Directory**: server
   - **Runtime**: Node
   - **Build Command**: 
pm ci && npm run build
   - **Start Command**: 
pm start
   - **Health Check Path**: /api/health
   - **Plan**: Starter (or Free if persistent disk is not used)

---

### STEP 5: Configure Backend Environment Variables
Under the **Environment** tab of connectsphere-server, add:

| Key | Value | Notes |
| :--- | :--- | :--- |
| NODE_ENV | production | Enables production hardening & strict CORS |
| PORT | 10000 | Port automatically managed by Render |
| DATABASE_URL | postgresql://... | Paste your Neon connection string |
| JWT_SECRET | *Click "Generate"* | Secure random 64-character token |
| CLIENT_URL | https://placeholder | We will update this in Step 14 after deploying the frontend |
| GEMINI_API_KEY | AIza... | Optional: Paste your Google AI Studio API key |
| UPLOAD_DIR | /var/data/uploads | If persistent disk is attached; otherwise leave default |

*(Optional Persistent Disk)*:
If using a Render Starter plan, navigate to **Disks** -> **Add Disk**:
- **Name**: connectsphere-uploads
- **Mount Path**: /var/data/uploads
- **Size**: 1 GB

Click **Create Web Service**. Wait for the build to finish. Copy the assigned service URL:
https://connectsphere-server-xxxx.onrender.com

---

### STEP 6: Create the Frontend Static Site on Render
1. In Render Dashboard, click **New +** -> **Static Site**.
2. Select the same GitHub repository: CodeAlpha_ConnectSphere.
3. Configure settings:
   - **Name**: connectsphere-client
   - **Branch**: main
   - **Root Directory**: client
   - **Build Command**: 
pm ci && npm run build
   - **Publish Directory**: dist

---

### STEP 7: Configure Frontend Environment Variables & Rewrites
Under **Environment Variables** in connectsphere-client:

| Key | Value |
| :--- | :--- |
| VITE_API_URL | https://connectsphere-server-xxxx.onrender.com |
| VITE_SOCKET_URL| https://connectsphere-server-xxxx.onrender.com |

*(SPA Routing Rewrite)*:
Under **Redirects/Rewrites**:
- **Type**: Rewrite
- **Source**: /*
- **Destination**: /index.html

Click **Create Static Site**. Wait for Vite to build and deploy. Copy the assigned URL:
https://connectsphere-client-xxxx.onrender.com

---

### STEP 8: Final Security Link (Update Backend CORS)
1. Go back to your **connectsphere-server** Web Service on Render.
2. In **Environment Variables**, update CLIENT_URL:
   `
   CLIENT_URL=https://connectsphere-client-xxxx.onrender.com
   `
3. Click **Save Changes**. Render will automatically trigger a rolling redeploy of the backend with strict CORS whitelisting locked to your frontend domain.

---

### STEP 9: Production Verification (QA Flow)
1. Navigate to your deployed frontend: https://connectsphere-client-xxxx.onrender.com.
2. Register a new user account (e.g. host@example.com).
3. Click **New Instant Meeting** from the dashboard.
4. Verify camera and microphone preview in the Pre-Join modal, then enter the room.
5. Copy the room code (CONNECT-XXXXXX).
6. Open an incognito window, create a second account, and join the room.
7. Verify:
   - WebRTC media mesh connects peer-to-peer over DTLS-SRTP.
   - Screen sharing streams video smoothly without renegotiation.
   - Whiteboard draws and synchronizes vectors across peers.
   - Workspace chat, live notes, and action items update in real time.
   - AI summary extracts discussions and tasks.
   - Live polls and floating emoji reactions trigger on all participants.
