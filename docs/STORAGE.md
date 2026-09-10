# ConnectSphere: File Storage Architecture & Persistence

This document details the **StorageProvider** abstraction, local development storage, and production cloud object storage on the Render Free Tier.

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
|  LocalFilesystemStorage  |               |   CloudStorageProvider   |
|  (Development: ./uploads)|               |  (Production: S3 / R2)   |
+--------------------------+               +--------------------------+
```

### Methods Defined on `StorageProvider`:
- `saveFile(file: Express.Multer.File): Promise<StorageFileResult>`: Saves file to local or cloud storage and returns storage metadata.
- `getFileStream(storagePath: string): Promise<Readable | null>`: Retrieves a readable stream for streaming the file directly to HTTP clients.
- `resolvePath(storagePath: string): string | null`: Validates local disk file existence and enforces cross-platform path traversal protection (`..`). Returns `null` for cloud storage.
- `deleteFile(storagePath: string): Promise<boolean>`: Safely removes the file from local disk or cloud bucket.
- `fileExists(storagePath: string): Promise<boolean>`: Confirms file existence.
- `getStorageDir(): string`: Returns local storage or staging directory path.

---

## 2. Local Development vs. Production Deployment

### Local Development (`STORAGE_PROVIDER="local"`)
- **Directory**: Defaults to `./uploads` in the server root.
- Created automatically on server bootstrap if missing.
- Files are saved directly to disk and served via streaming / `res.download`.

### Production Deployment on Render Free Tier (`STORAGE_PROVIDER="cloud"`)
- **Render Free Web Service**: Runs on an ephemeral filesystem. Any file written to the container disk is lost on restart.
- **Render Persistent Disks**: Require a paid Starter plan and are **NOT used** in this free-tier deployment.
- **Production Solution**: ConnectSphere uses `CloudStorageProvider` connected to an S3-compatible cloud object storage service (such as Cloudflare R2 or Supabase Storage).

---

## 3. Cloud Provider Selection: S3-Compatible Storage vs. Cloudinary

ConnectSphere specifically chooses **S3-compatible Object Storage (e.g. Cloudflare R2 / Supabase Storage)** for production:

| Feature | Cloudflare R2 (Recommended) | Cloudinary Free Tier |
| :--- | :--- | :--- |
| **Free Tier Allowance** | **10 GB / month** free storage | 25 Monthly Credits (~25 GB) |
| **Bandwidth / Egress** | **$0.00 (Zero egress fees)** | Counts against monthly credits |
| **Supported File Types** | Arbitrary documents (`.pdf`, `.docx`, `.pptx`, `.xlsx`, `.zip`, `.csv`, images) | Primary focus: media (images/video). Non-media files treated as `raw` |
| **Raw File Size Limit** | Up to 5 GB | **Strict 10 MB limit** on free accounts (fails ConnectSphere 15 MB requirement) |
| **API Standard** | Industry-standard S3 API | Proprietary Cloudinary SDK |
| **Direct Streaming** | Standard `GetObjectCommand` stream | Specialized raw resource delivery URLs |

### Recommended Provider: Cloudflare R2
1. Create a free Cloudflare account and create an R2 bucket (e.g. `connectsphere-uploads`).
2. Generate an R2 API token with read/write permissions.
3. Set the environment variables in your Render Web Service:
   - `STORAGE_PROVIDER=cloud`
   - `S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com`
   - `S3_BUCKET=connectsphere-uploads`
   - `S3_ACCESS_KEY_ID=<r2_access_key_id>`
   - `S3_SECRET_ACCESS_KEY=<r2_secret_access_key>`
   - `S3_REGION=auto`

---

## 4. Database Metadata Storage

Neon PostgreSQL stores **file metadata only**. Raw file contents are never stored in the database.

Database Schema (`SharedFile`):
- `id`: UUID primary key
- `meetingId`: Target meeting ID
- `uploaderId`: User ID of uploader
- `filename`: Safe sanitized filename
- `originalName`: User's original uploaded filename
- `fileType`: MIME type (e.g. `application/pdf`)
- `fileSize`: Size in bytes (up to 15MB)
- `storagePath`: Relative storage key / cloud object key
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
