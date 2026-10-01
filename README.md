# CareerTrack — Setup Guide

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Expo Go app on your phone (or Android/iOS emulator)

---

## 1. Database Setup

Create the database and run the schema:

```bash
psql -U postgres -c "CREATE DATABASE careertrack;"
psql -U postgres -d careertrack -f server/schema.sql
```

Set the first admin (after registering an account):
```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

---

## 2. Server Setup

```bash
cd server
cp .env.example .env
# Edit .env — set DATABASE_URL and JWT_SECRET
npm install
npm run dev        # runs on http://localhost:3001
```

---

## 3. Client Setup

Find your machine's local IP address (run `ipconfig` on Windows):

```bash
# Edit src/constants/design.ts — set API_BASE_URL to your local IP:
# export const API_BASE_URL = 'http://192.168.x.x:3001';

cd client
npm install
npx expo start     # scan QR code with Expo Go
```

---

## Project Structure

```
fuzz/
├── client/                    # React Native (Expo) app
│   └── src/
│       ├── app/               # Expo Router screens
│       │   ├── _layout.tsx    # Root layout + AuthGate
│       │   ├── onboarding.tsx # 3-page onboarding
│       │   ├── assessment.tsx # 30-step wizard
│       │   ├── results.tsx    # FIS results + save
│       │   ├── roadmap.tsx    # Per-strand roadmap
│       │   ├── (auth)/        # Login + Register
│       │   └── (tabs)/        # Home, History, Resources, Admin
│       ├── fuzzy/fis.ts       # Mamdani FIS engine (on-device)
│       ├── data/              # RIASEC questions, career paths, resources
│       ├── context/           # AuthContext (JWT + SecureStore)
│       ├── services/api.ts    # Fetch wrapper
│       ├── types/             # TypeScript interfaces
│       └── constants/design.ts # Colors, spacing, tokens
│
└── server/                    # Express + PostgreSQL API
    ├── src/
    │   ├── index.ts           # Entry point
    │   ├── db.ts              # pg Pool
    │   ├── middleware/auth.ts # JWT verify + requireAdmin
    │   └── routes/
    │       ├── auth.ts        # /api/auth/register, /login
    │       ├── users.ts       # /api/users (me, list, role)
    │       └── assessments.ts # /api/assessments (CRUD)
    └── schema.sql             # PostgreSQL DDL
```

---

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/auth/register | — | Create account |
| POST | /api/auth/login | — | Get JWT token |
| GET | /api/users/me | JWT | Current user profile |
| GET | /api/users | Admin | All users |
| PATCH | /api/users/:id/role | Admin | Promote/demote |
| POST | /api/assessments | JWT | Save results |
| GET | /api/assessments/mine | JWT | User's history |
| GET | /api/assessments | Admin | All assessments |
| DELETE | /api/assessments/:id | JWT | Delete (own only) |
# CareerTrack
# CareerTrack
