# ConnectSphere: Render Free Tier & Neon Deployment Guide

> **Important**: This guide outlines the exact, deployment-ready sequence to deploy ConnectSphere to the **Render Free Tier** and **Neon**. Follow each step sequentially.

---

## 1. Free-Tier Architecture Summary

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
   |                                                  +---> Supabase Storage (Free Tier)
   |                                                  |
   +--- (HTTPS) ---> API Endpoints -------------------+
   +--- (WSS) -----> Real-Time Signaling -------------+
```

- **Frontend**: Render Static Site (100% Free, Global CDN, SPA rewrite).
- **Backend**: Render Web Service (100% Free tier, binds to `0.0.0.0`, port managed by Render).
- **File Storage**: Supabase Storage Free Tier (1 GB free persistent storage, no credit card required). The Render filesystem is treated as strictly ephemeral.
- **Persistent Disk**: **NOT used**. No paid Render plan is required.

---

## 2. Step-by-Step Deployment Instructions

### STEP 1: Push Repository to GitHub
Ensure the latest `main` branch with all verified phases and Render configurations is committed and pushed:
```bash
git push origin main
```

---

### STEP 2: Configure Neon PostgreSQL Database
1. Go to [Neon.tech](https://neon.tech) and sign in.
2. Under your Project, copy your connection string (Pooled or Direct).
   Format:
   ```
   postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
   ```
3. **Database Preparation**:
   - For a clean deployment, ensure your target database in Neon is empty or create a dedicated database (e.g., `connectsphere`) in the Neon console.
   - If using an existing database with previous tables, you can create a fresh branch or use Prisma baseline commands.

---

### STEP 3: Apply the Database Migration to Neon
You can apply the PostgreSQL migration to your Neon database using Prisma Migrate:

```bash
cd server
DATABASE_URL="your_neon_connection_string" npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma
```
This applies `server/prisma/migrations/20260910000000_init_neon_postgresql/migration.sql` to provision all 10 tables, unique indexes, cascading foreign keys, and relations.

---

### STEP 4: Set Up Free Cloud Storage (Supabase Storage — No Credit Card)
Because Render Free Web Services run on ephemeral filesystems, configure free Supabase Storage for meeting file attachments:
1. Log into the [Supabase Dashboard](https://supabase.com) and select/create a free project.
2. Go to **Storage** -> **New bucket**.
3. Bucket name: `connectsphere-files`.
4. Keep **Public bucket** unticked (Private).
5. In Project Settings -> **API**, copy:
   - **Project URL** (`https://<project-ref>.supabase.co`)
   - **service_role secret** key (Project API keys)

---

### STEP 5: Create the Backend Web Service on Render (Free Plan)
1. Log in to [Render.com](https://dashboard.render.com).
2. Click **New +** -> **Web Service**.
3. Connect your GitHub repository: `CodeAlpha_ConnectSphere`.
4. Configure service settings:
   - **Name**: `connectsphere-server`
   - **Region**: Oregon (or region closest to your Neon database)
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
   - **Plan**: **Free**

---

### STEP 6: Configure Backend Environment Variables
Under the **Environment** tab of `connectsphere-server`, add:

| Key | Value | Notes |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production mode & security hardening |
| `PORT` | `10000` | Render-assigned port |
| `DATABASE_URL` | `postgresql://...` | Your Neon PostgreSQL connection string |
| `JWT_SECRET` | *(Click "Generate")* | Cryptographic 64+ character random secret |
| `CLIENT_URL` | `https://placeholder` | Update in Step 9 with your frontend URL |
| `STORAGE_PROVIDER` | `supabase` | Enables Supabase Storage Free Tier |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` | Your Supabase Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | `<your-service-role-secret-key>` | Server-side secret key |
| `SUPABASE_STORAGE_BUCKET` | `connectsphere-files` | Supabase storage bucket name |
| `GEMINI_API_KEY` | `AIza...` | Optional: Google Gemini AI key (local NLP fallback if empty) |

> [!NOTE]
> **No Persistent Disk**: Do NOT add any Render Disks. Storage is handled externally via the cloud storage provider, keeping the service completely within the Render Free Tier.

Click **Create Web Service**. Once deployed, copy your backend URL:
`https://connectsphere-server-xxxx.onrender.com`

---

### STEP 7: Create the Frontend Static Site on Render (Free)
1. In the Render Dashboard, click **New +** -> **Static Site**.
2. Select the repository: `CodeAlpha_ConnectSphere`.
3. Configure settings:
   - **Name**: `connectsphere-client`
   - **Branch**: `main`
   - **Root Directory**: `client`
   - **Build Command**: `npm ci && npm run build`
   - **Publish Directory**: `dist`

---

### STEP 8: Configure Frontend Environment Variables & Rewrites
Under **Environment Variables** in `connectsphere-client`:

| Key | Value |
| :--- | :--- |
| `VITE_API_URL` | `https://connectsphere-server-xxxx.onrender.com` |
| `VITE_SOCKET_URL`| `https://connectsphere-server-xxxx.onrender.com` |

Under **Redirects/Rewrites**:
- **Type**: `Rewrite`
- **Source**: `/*`
- **Destination**: `/index.html`

Click **Create Static Site**. Copy the frontend URL:
`https://connectsphere-client-xxxx.onrender.com`

---

### STEP 9: Final Security Link (Update Backend CORS)
1. Navigate back to `connectsphere-server` on Render.
2. Under **Environment Variables**, update `CLIENT_URL`:
   ```
   CLIENT_URL=https://connectsphere-client-xxxx.onrender.com
   ```
3. Save changes. Render triggers a rolling redeploy with strict production CORS locked to your frontend origin.

---

### STEP 10: Verification Checklist
1. Open `https://connectsphere-client-xxxx.onrender.com`.
2. Register an account and verify login flow.
3. Create an instant meeting, test audio/video/screen share, real-time chat, notes, whiteboard, and file sharing.
4. Verify meeting summary and AI assistant interaction.
