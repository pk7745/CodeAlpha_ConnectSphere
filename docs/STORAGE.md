# ConnectSphere: File Storage Architecture & Persistence (Supabase Storage Free Tier)

This document details the **StorageProvider** abstraction, local development storage, and production cloud object storage on the **Supabase Storage Free Tier**.

---

## 1. Storage Abstraction Architecture

In real-time collaboration applications, assuming a local directory like `./uploads` is reliable in production is an anti-pattern: containerized hosting platforms on free tiers (such as Render Free Web Services) run ephemeral container filesystems that are wiped upon every redeploy, restart, or sleep cycle.

ConnectSphere completely decouples file handling from local disk paths via the `StorageProvider` interface:

```
                  +--------------------------------+
                  |   StorageProvider Interface    |
                  +--------------------------------+
                                   |
             +---------------------+---------------------+
             |                                           |
             v                                           v
+--------------------------+               +--------------------------+
|  LocalFilesystemStorage  |               |  SupabaseStorageProvider |
|  (Development: ./uploads)|               | (Production: 1GB Free)   |
+--------------------------+               +--------------------------+
```

### Methods Defined on `StorageProvider`:
- `saveFile(file: Express.Multer.File): Promise<StorageFileResult>`: Saves file to local or cloud storage and returns storage metadata.
- `getFileStream(storagePath: string): Promise<Readable | null>`: Retrieves a readable stream for streaming the file directly to HTTP clients.
- `resolvePath(storagePath: string): string | null`: Validates local disk file existence and enforces cross-platform path traversal protection (`..`). Returns `null` for cloud storage.
- `deleteFile(storagePath: string): Promise<boolean>`: Safely removes the file from local disk or Supabase bucket.
- `fileExists(storagePath: string): Promise<boolean>`: Confirms file existence.
- `getStorageDir(): string`: Returns local storage or staging directory path.

---

## 2. Local Development vs. Production Deployment

### Local Development (`STORAGE_PROVIDER="local"`)
- **Directory**: Defaults to `./uploads` in the server root.
- Created automatically on server bootstrap if missing.
- Files are saved directly to disk and served via streaming / `res.download`.

### Production Deployment on Render Free Tier (`STORAGE_PROVIDER="supabase"`)
- **Render Free Web Service**: Runs on an ephemeral filesystem. Any file written to the container disk is lost on restart.
- **Render Persistent Disks**: Require a paid Starter plan and are **NOT used**.
- **Production Solution**: ConnectSphere uses `SupabaseStorageProvider` connected to **Supabase Storage Free Tier**, which provides 1GB of persistent cloud storage with zero billing required.

---

## 3. Supabase Storage Setup (100% Free, No Credit Card)

1. Sign up or log into [Supabase](https://supabase.com).
2. Create a new free project (or use an existing one).
3. In the Supabase dashboard, go to **Storage** -> **Create new bucket**:
   - **Bucket Name**: `connectsphere-files`
   - **Public bucket**: **Disabled (Private)** — All access is authorized through the ConnectSphere backend API.
   - **File size limit**: `15MB` (or leave default).
4. In Project Settings -> **API**:
   - Copy **Project URL** (`https://<project-ref>.supabase.co`).
   - Copy **service_role secret** key (under Project API keys).
5. Add these environment variables in your Render Web Service:
   - `STORAGE_PROVIDER=supabase`
   - `SUPABASE_URL=https://<project-ref>.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY=<your-service-role-secret-key>`
   - `SUPABASE_STORAGE_BUCKET=connectsphere-files`

> [!IMPORTANT]
> **Zero Client Exposure**: The `SUPABASE_SERVICE_ROLE_KEY` is loaded exclusively into the backend Node.js process (`server`). It is **never** sent or exposed to the React frontend or Vite client.

---

## 4. Database Metadata Storage (Neon PostgreSQL)

Neon PostgreSQL stores **file metadata only**. Raw file contents are never stored in the database.

Database Schema (`SharedFile`):
- `id`: UUID primary key
- `meetingId`: Target meeting ID
- `uploaderId`: User ID of uploader
- `filename`: Safe sanitized filename
- `originalName`: User's original uploaded filename
- `fileType`: MIME type (e.g. `application/pdf`)
- `fileSize`: Size in bytes (up to 15MB)
- `storagePath`: Relative storage key / Supabase object key
- `createdAt`: Timestamp

---

## 5. Upload Security Hardening

1. **Authentication**: Requests must include a valid Bearer JWT.
2. **Meeting Membership**: Uploader must be an active participant or host in the target meeting.
3. **File Size Limit**: Multer strictly caps individual file size at 15MB (`LIMIT_FILE_SIZE`).
4. **Extension Blacklist**: Blocks executable and potentially dangerous file formats (`.exe`, `.bat`, `.cmd`, `.sh`, `.ps1`, `.vbs`, `.js`, `.msi`, `.dll`, etc.).
5. **Sanitized Storage Keys**: Filenames are prepended with `crypto.randomUUID()` and stripped of special characters to prevent directory injection.
6. **Path Traversal Shield**: Local path resolution uses `path.relative` to ensure any requested file stays strictly inside the designated directory before streaming.
7. **Streaming Downloads**: Files are streamed using `Readable.pipe(res)` so server memory is not exhausted buffering large files.
