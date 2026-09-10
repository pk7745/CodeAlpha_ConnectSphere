# ConnectSphere: Neon PostgreSQL Database Configuration

This document outlines how ConnectSphere connects to and manages migrations on **Neon Serverless PostgreSQL**.

---

## 1. Why Neon?

Neon provides serverless PostgreSQL with:
- Instant provisioning and automated scaling
- Connection pooling for serverless and containerized Node.js workloads
- Native compatibility with Prisma ORM
- Built-in SSL encryption (sslmode=require)

---

## 2. Setting Up Neon PostgreSQL

1. Sign up or log in at [Neon.tech](https://neon.tech).
2. Create a new project named connectsphere-db.
3. Choose the region nearest to your Render backend (e.g. US East / Oregon).
4. On the dashboard, locate the **Connection string** section.
5. Select **Direct Connection** (or **Connection pooling** with port 6543 / ?sslmode=require&pgbouncer=true).
6. Format of the URL:
   `
   postgresql://[user]:[password]@[endpoint].neon.tech/[database]?sslmode=require
   `

---

## 3. Prisma PostgreSQL Schema & Migrations

The verified PostgreSQL schema is maintained in:
`
server/prisma/schema.postgresql.prisma
`
And the initial DDL migration script is located at:
`
server/prisma/migrations/20260910000000_init_neon_postgresql/migration.sql
`

### Applying Migrations to Neon

#### Option 1: Automated Deployment via Prisma CLI
When connecting your production environment variable to Neon:
`ash
cd server
DATABASE_URL="postgresql://user:pass@ep-xyz.neon.tech/connectsphere?sslmode=require" npx prisma migrate deploy
`
This applies all unapplied migrations safely without running destructive resets.

#### Option 2: SQL Editor in Neon Console
If you prefer direct SQL execution:
1. Open the **SQL Editor** in Neon console.
2. Copy and paste the contents of server/prisma/migrations/20260910000000_init_neon_postgresql/migration.sql.
3. Click **Run** to provision the tables, unique constraints, and foreign key cascades.

---

## 4. Connection Pooling Best Practices

For Node.js / Express containers running on Render:
- Keep prisma instance as a global singleton (server/src/lib/prisma.ts).
- Avoid instantiating 
ew PrismaClient() per request.
- When shutting down, invoke wait prisma.() inside the graceful shutdown hook (already implemented in server.ts).
