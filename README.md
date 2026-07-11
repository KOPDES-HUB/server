# KOPDESHUB — Server (Backend API)

Backend REST API untuk platform **SIMPUL Merah Putih** / KOPDESHUB. Menyediakan layanan autentikasi, manajemen koperasi, anggota, simpanan, RAT, notifikasi, dan fitur pendukung lainnya.

## Tech Stack

| Layer | Teknologi |
| --- | --- |
| Runtime | [Node.js 20+](https://nodejs.org) |
| Framework | [Express 5](https://expressjs.com) + TypeScript |
| ORM | [Prisma 7](https://www.prisma.io) |
| Database | [PostgreSQL](https://www.postgresql.org) |
| Cache & Queue | [Redis](https://redis.io) + [BullMQ](https://docs.bullmq.io) |
| Autentikasi | JWT (access + refresh token via cookie), [Argon2](https://github.com/ranisalt/node-argon2) |
| OAuth | [Passport Google OAuth 2.0](https://www.passportjs.org/packages/passport-google-oauth20/) |
| Validasi | [Zod](https://zod.dev) |
| Email | [Nodemailer](https://nodemailer.com) |
| Pembayaran | [Midtrans](https://midtrans.com) |
| Bot | Telegram Bot API |
| Keamanan | Helmet, CORS, express-rate-limit |
| Upload File | Multer |

## Arsitektur

```
Client (Next.js)
      │  HTTP + cookies
      ▼
┌─────────────────────────────────────────────┐
│              Express Server                 │
│  ┌──────────┬────────────┬───────────────┐  │
│  │  Routes  │Controllers │  Middlewares  │  │
│  └────┬─────┴─────┬──────┴───────┬───────┘  │
│       │           │              │          │
│       ▼           ▼              ▼          │
│    Zod Schema   Prisma ORM   JWT Auth       │
└───────┬─────────────────────────┬───────────┘
        │                         │
        ▼                         ▼
   PostgreSQL                   Redis
                                    │
                                    ▼
                            ┌───────────────┐
                            │  BullMQ Worker│
                            │ (email, cron) │
                            └───────────────┘
```

### Struktur Direktori

```
server/
├── src/
│   ├── server.ts           # Entry point API server
│   ├── worker.ts           # Background worker (cron + queue)
│   ├── routes/             # Definisi endpoint REST
│   ├── controllers/        # Logika bisnis per modul
│   ├── schemas/            # Validasi request (Zod)
│   ├── middlewares/        # Auth, upload, role check
│   ├── queues/             # BullMQ queue & worker
│   ├── services/           # Email, Telegram bot
│   ├── lib/                # Prisma client, token, crypto
│   ├── helpers/            # Utility functions
│   └── config/             # Redis, mailer config
├── prisma/
│   ├── schema.prisma       # Model database
│   ├── migrations/         # Migrasi SQL
│   └── seed.ts             # Data awal
└── generated/prisma/       # Prisma client (auto-generated)
```

### Endpoint API Utama

| Prefix | Modul |
| --- | --- |
| `/api/auth` | Login, register, refresh token, OAuth |
| `/api/anggota-koperasi` | Manajemen anggota |
| `/api/pengurus-koperasi` | Data pengurus |
| `/api/karyawan-koperasi` | Data karyawan |
| `/api/simpanan-anggota` | Simpanan anggota |
| `/api/rat-koperasi` | Rapat Anggota Tahunan |
| `/api/profil-koperasi` | Profil koperasi |
| `/api/referensi-wilayah` | Referensi wilayah |
| `/api/users`, `/api/roles`, `/api/permissions` | RBAC & manajemen user |
| `/api/notifications` | Notifikasi |
| `/uploads` | File statis (dokumen, gambar) |
| `/admin/queues` | Dashboard BullMQ (monitoring queue) |

## Prasyarat

- **Node.js** 20+
- **PostgreSQL** 14+
- **Redis** 6+

## Menjalankan Aplikasi

### 1. Instal dependensi

```bash
cd server
npm install
```

### 2. Konfigurasi environment

Buat file `.env` di folder `server/`:

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/DB_NAME?schema=public"

# Server
NODE_ENV=development
PORT=3006
ALLOWED_ORIGINS="http://localhost:3000"
APP_URL=http://localhost:3000
APP_NAME="SIMPUL Merah Putih"

# JWT
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

# Role & Group
DEFAULT_GROUP_ID=uuid-default-group
ADMIN_GROUP_ID=uuid-admin-group

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# SMTP (email)
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=no-reply@example.com
SMTP_PASS=your_smtp_password

# Telegram (opsional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_POLLING=false

# Enkripsi config DB (opsional)
DB_CONFIG_SECRET=hex_secret_key
```

### 3. Setup database

```bash
# Generate Prisma client
npx prisma generate

# Jalankan migrasi
npx prisma migrate dev

# (Opsional) Seed data awal
npx prisma db seed
```

### 4. Jalankan API server

```bash
npm run dev
```

Server berjalan di [http://localhost:3006](http://localhost:3006) (sesuai `PORT` di `.env`).

### 5. Jalankan background worker

Di terminal terpisah:

```bash
npm run worker
```

Worker menangani antrian email, notifikasi Telegram, dan cron job (reminder deadline, dll.).

### 6. Build & production

```bash
npm run build
npm start          # API server
npm run start:worker  # Background worker
```

## Scripts

| Perintah | Fungsi |
| --- | --- |
| `npm run dev` | Dev server dengan nodemon + tsx |
| `npm run worker` | Background worker (BullMQ + cron) |
| `npm run build` | Compile TypeScript ke `dist/` |
| `npm start` | Jalankan server production |
| `npm run start:worker` | Jalankan worker production |

## Docker

Dockerfile tersedia untuk deployment containerized:

```bash
docker build -t kopdeshub-server .
docker run -p 3006:3000 --env-file .env kopdeshub-server
```

> Pastikan PostgreSQL dan Redis dapat diakses dari container.

## Catatan Pengembangan

- Autentikasi menggunakan **JWT** disimpan di **HTTP-only cookie** (`accessToken` + `refreshToken`).
- Endpoint yang membutuhkan login dilindungi middleware `authenticate`.
- CORS hanya mengizinkan origin yang terdaftar di `ALLOWED_ORIGINS`.
- Prisma client di-generate ke folder `generated/prisma/` (bukan `node_modules`).
- File upload disimpan di folder `uploads/` dan di-serve via `/uploads`.
