# ConnectSphere: Neon PostgreSQL Database Configuration

This document outlines how ConnectSphere connects to and manages migrations on **Neon Serverless PostgreSQL**.

---

## 1. Why Neon?

Neon provides serverless PostgreSQL with:
- Instant provisioning and automated scaling
- Connection pooling for serverless and containerized Node.js workloads
- Native compatibility with Prisma ORM
- Built-in SSL encryption (`sslmode=require`)

---

## 2. Setting Up Neon PostgreSQL

1. Sign up or log in at [Neon.tech](https://neon.tech).
2. Create a new project named `connectsphere-db`.
3. Choose the region nearest to your Render backend (e.g. US East / Oregon).
4. On the dashboard, locate the **Connection string** section.
5. Select **Connection pooling** (or Direct Connection).
6. Format of the URL:
   ```
   postgresql://[user]:[password]@[endpoint].neon.tech/[database]?sslmode=require
   ```

---

## 3. Prisma PostgreSQL Schema & Migrations

The verified PostgreSQL schema is maintained in:
```
server/prisma/schema.postgresql.prisma
```
And the initial deterministic DDL migration script is located at:
```
server/prisma/migrations/20260910000000_init_neon_postgresql/migration.sql
```

### Applying Migrations to Neon

Production deployment MUST use:
```bash
npx prisma migrate deploy
```
*(Do NOT use `prisma db push` in production).*

#### Option 1: Automated Deployment via Prisma CLI (Recommended)
From your terminal:
```bash
cd server
DATABASE_URL="postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require" npx prisma migrate deploy --schema=prisma/schema.postgresql.prisma
```
This applies all unapplied migrations safely without running destructive resets.

#### Option 2: SQL Editor in Neon Console
1. Open the **SQL Editor** in the Neon console.
2. Copy and paste the contents of `server/prisma/migrations/20260910000000_init_neon_postgresql/migration.sql`.
3. Click **Run** to provision the tables, unique constraints, and foreign key cascades.

---

## 4. Handling Non-Empty Existing Databases (Error P3005)

If you are pointing ConnectSphere to a Neon database that already has tables from a previous run or another application, Prisma may return:
```
Error: P3005
The database schema is not empty.
```

To resolve this:
1. **Recommended (Clean Database)**: In your Neon Project dashboard, create a fresh database (e.g. `connectsphere`):
   ```sql
   CREATE DATABASE connectsphere;
   ```
   Update your connection string to end with `/connectsphere?sslmode=require`, then rerun `npx prisma migrate deploy`.
2. **Alternative (Baseline Migration)**: If the existing tables in the database already match the migration, mark the initial migration as applied:
   ```bash
   npx prisma migrate resolve --applied 20260910000000_init_neon_postgresql --schema=prisma/schema.postgresql.prisma
   ```

---

## 5. Connection Pooling Best Practices

For Node.js / Express containers running on Render:
- Keep `prisma` instance as a global singleton (`server/src/lib/prisma.ts`).
- Avoid instantiating `new PrismaClient()` per request.
- When shutting down, invoke `await prisma.$disconnect()` inside the graceful shutdown hook (already implemented in `server.ts`).
