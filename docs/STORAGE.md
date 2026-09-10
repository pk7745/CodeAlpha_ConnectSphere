# ConnectSphere: File Storage Architecture & Persistence

This document explains the **StorageProvider** abstraction, local filesystem storage, Render Persistent Disk considerations, and cloud object storage migration.

---

## 1. Storage Abstraction Architecture

In real-time collaboration applications, assuming a local directory like ./uploads is reliable in production is an anti-pattern: containerized hosting platforms (such as Render Web Services) run ephemeral container filesystems that are wiped upon redeploy, restart, or scaling.

ConnectSphere solves this by isolating all file handling behind the StorageProvider interface:

`
                  +--------------------------------+
                  |    StorageProvider Interface   |
                  +--------------------------------+
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
+-----------------------+                   +-----------------------+
| LocalFilesystemStorage|                   |   S3 / R2 / GCS       |
| (Dev + Render Disk)   |                   |   (Future Scaled Disk)|
+-----------------------+                   +-----------------------+
`

### Methods Defined on StorageProvider:
- saveFile(file: Express.Multer.File): Promise<StorageFileResult>: Saves file metadata and returns storage key.
- esolvePath(storagePath: string): string | null: Validates that the requested file exists strictly inside the designated directory and protects against path traversal (..).
- deleteFile(storagePath: string): Promise<boolean>: Safely removes the file.
- ileExists(storagePath: string): Promise<boolean>: Confirms file existence.
- getStorageDir(): string: Returns active storage path.

---

## 2. Local Development vs. Production Render

### Local Development
- Directory: Defaults to ./uploads in the server root.
- Created automatically on server bootstrap if missing.

### Production on Render (Persistent Disk)
- Render offers Persistent Disks attached to Web Services on Starter plans or higher.
- Mount Path: /var/data/uploads
- Environment Variable: UPLOAD_DIR=/var/data/uploads
- LocalFilesystemStorage automatically detects this environment variable and uses /var/data/uploads.

> [!IMPORTANT]
> **Persistent Disk Limitations**:
> A Render Persistent Disk is attached to a **single container instance**. It cannot be mounted across horizontally scaled multi-instance clusters. For deployments requiring horizontal autoscale, cloud object storage (e.g. AWS S3, Cloudflare R2, or Google Cloud Storage) should be plugged in via the StorageProvider interface.

---

## 3. Upload Security Hardening

ConnectSphere enforces multiple security gates before any file is stored:
1. **Authentication**: Requests must include a valid Bearer JWT.
2. **Meeting Membership**: The uploader must be an active participant or host in the target meeting.
3. **File Size Limit**: Multer strictly caps individual file size at 15MB (LIMIT_FILE_SIZE).
4. **Extension Blacklist**: Blocks executable and potentially dangerous file formats (.exe, .bat, .cmd, .sh, .ps1, .vbs, .js, .msi, .dll, etc.).
5. **Sanitized Storage Keys**: Filenames are prepended with crypto.randomUUID() and stripped of special characters to prevent directory injection.
6. **Path Traversal Shield**: esolvePath uses path.relative to ensure any requested file stays strictly inside the root uploads folder before streaming to the client.
