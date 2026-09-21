<div align="center">

# 🏃‍♂️ SportUp

**The Social Running & Sports Community App**

*Connect. Train. Compete.*

[![Expo SDK](https://img.shields.io/badge/Expo-57.0-000020?logo=expo)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.86-61DAFB?logo=react)](https://reactnative.dev)
[![Fastify](https://img.shields.io/badge/Fastify-4.x-000000?logo=fastify)](https://fastify.dev)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748?logo=prisma)](https://prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-blue?logo=postgresql)](https://www.postgresql.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript)](https://www.typescriptlang.org)

</div>

---

## 📖 Overview

**SportUp** is a full-stack, cross-platform mobile application designed to bring athletes together. Whether you are a solo runner tracking your morning run or an organizer creating community running events, SportUp gives you everything you need to stay active, connected, and motivated.

---

## ✨ Features

### 🏃 Live Run Tracking
- **GPS-powered live tracking** with real-time distance, pace, and duration KPIs.
- **Per-kilometer splits** — every kilometer is recorded automatically.
- **Audio cues** via text-to-speech — the app announces your pace and distance each km.
- **Pause & Resume** — full control over your tracking session.
- **Custom Run Names** — when you finish, a smart modal prompts you to name your run, with the name auto-suggested based on the time of day (Morning Run, Evening Run…).
- **Planned Event Runs** — starting a scheduled event automatically pre-fills the run name with the event's title.

### 📅 Planned Events & Group Runs
- **Browse events** on the Explore screen — list view or map view.
- **Nearby vs. Global** — toggle between runs near your location and all runs across the entire platform (e.g., browse runs in Nabeul from Beja).
- **Join & Leave** runs with one tap.
- **Organizer Tools** — create, edit, and delete your own events with distance, difficulty, max participants, location, and a custom route.
- **Start Run Now** — both organizers and participants can start live GPS tracking directly from the event page, with the session linked to that event.
- **Invitations** — invite friends to private events.

### 📊 Run History & Dashboard
- Full **post-run history** with an expandable card per run.
- Displays: run title, date/time, distance (KM), duration, average pace.
- **Splits breakdown** — see your pace for every individual kilometer.
- **Route replay** — view the GPS path you took on a map.

### 🌍 Explore & Discover
- Explore activities by location (GPS-based or profile-based region).
- **Sport filters** — filter by Running, Cycling, Football, Yoga, and more.
- **Search bar** — search events by title or description.
- **Map view** — see events pinned on an interactive map with callouts.

### 👥 Social & Community
- **Follow/Unfollow** other athletes.
- **Follower notifications** — when someone you follow creates a new event, you get an instant in-app notification with a direct link to join.
- **Social Feed** — a post feed with likes, comments, and nested replies.
- **Comment likes & mentions**.
- **Leaderboard** — rank athletes by total distance and score.
- **Profiles** — view athlete profiles with their stats, level, and event history.

### 🔔 Notifications
- Real-time in-app **Notification Center**.
- Covers: new follower events, event invites, reminders, kudos, join confirmations, and rank-ups.
- Smart tap navigation — tapping a notification routes you directly to the relevant screen.
- Mark individual or all notifications as read.

### 🏅 Ranking & Gamification
- Athletes earn **rank scores** based on event attendance and total distance run.
- **Running levels**: Beginner → Intermediate → Advanced → Elite.
- Live **Leaderboard** to compare progress with the community.

### 👤 Profile & Onboarding
- Google OAuth and email/password sign-in.
- Guided **profile setup** — set your governorate, preferred sports, running level, bio, and avatar.
- Upload a **custom profile picture**.
- View your own stats: total distance, events joined, rank score.

---

## 🛠️ Tech Stack

### 📱 Mobile App (`apps/mobile`)

| Technology | Purpose |
|---|---|
| **React Native 0.86** | Cross-platform mobile framework |
| **Expo SDK 57** | Managed workflow, native module access |
| **Expo Router** | File-based navigation (similar to Next.js) |
| **TypeScript** | Type-safe development |
| **Zustand** | Lightweight global state management |
| **TanStack Query v5** | Server state, caching, and data fetching |
| **React Hook Form + Zod** | Form validation and schema enforcement |
| **Expo Location** | GPS location tracking |
| **Expo Speech** | Audio pace announcements during runs |
| **Expo Notifications** | Push notification support |
| **Expo Image Picker** | Avatar upload from camera/gallery |
| **React Native Maps** | Interactive maps for events and routes |
| **Axios** | HTTP client for API communication |
| **date-fns** | Date formatting utilities |
| **geolib** | Geospatial calculations (distance, pace) |
| **React Native Reanimated** | Smooth UI animations |

### ⚡ API Server (`apps/api`)

| Technology | Purpose |
|---|---|
| **Fastify 4** | High-performance Node.js web framework |
| **TypeScript** | Type-safe backend |
| **Prisma ORM** | Type-safe database access & migrations |
| **PostgreSQL** | Relational database |
| **@fastify/jwt** | JWT authentication |
| **@fastify/cors** | Cross-origin resource sharing |
| **@fastify/rate-limit** | API rate limiting |
| **@fastify/multipart** | File upload handling |
| **bcrypt** | Password hashing |
| **Zod** | Request body validation |
| **sharp** | Server-side image processing |

### 📦 Shared Package (`packages/shared`)

| Technology | Purpose |
|---|---|
| **TypeScript + Zod** | Shared schemas and types used by both app and API |

### 🗄️ Database & Deployment

| Platform | Purpose |
|---|---|
| **PostgreSQL (local)** | Local development database |
| **Neon (cloud)** | Serverless PostgreSQL for production |
| **Render.com** | API server hosting |
| **EAS (Expo Application Services)** | Mobile app builds & OTA updates |

---

## 🗂️ Project Structure

```
SportUp/
├── apps/
│   ├── mobile/                   # React Native / Expo app
│   │   ├── app/
│   │   │   ├── (app)/
│   │   │   │   ├── (tabs)/
│   │   │   │   │   ├── home.tsx         # Dashboard & quick actions
│   │   │   │   │   ├── index.tsx        # Explore events (map/list)
│   │   │   │   │   ├── events.tsx       # My events
│   │   │   │   │   ├── feed.tsx         # Social feed
│   │   │   │   │   ├── leaderboard.tsx  # Rankings
│   │   │   │   │   └── profile.tsx      # User profile
│   │   │   │   ├── event/               # Event detail, create, edit
│   │   │   │   ├── run/                 # Live tracking & history
│   │   │   │   ├── post/                # Post detail
│   │   │   │   └── notifications.tsx
│   │   └── src/
│   │       ├── components/             # Reusable UI components
│   │       ├── hooks/                  # Custom hooks (useLiveRunTracking…)
│   │       ├── services/               # API service modules
│   │       ├── stores/                 # Zustand global stores
│   │       └── theme/                  # Design tokens & styles
│   │
│   └── api/                           # Fastify REST API server
│       ├── prisma/
│       │   └── schema.prisma           # All database models
│       └── src/
│           └── modules/
│               ├── auth/               # Login, register, OAuth
│               ├── events/             # Event CRUD & participants
│               ├── users/              # Profiles & follows
│               ├── feed/               # Posts, comments, likes
│               ├── runs/               # Run session sync & history
│               ├── notifications/      # In-app notifications
│               └── rank/               # Leaderboard & scoring
│
└── packages/
    └── shared/                        # Shared Zod schemas & TS types
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** >= 20
- **npm** >= 9
- **PostgreSQL** running locally
- **Expo Go** or a development build on your device

### 1. Clone & Install
```bash
git clone https://github.com/AyariiAsma/SportUp.git
cd SportUp
npm install
```

### 2. Configure Environment Variables

Create `apps/api/.env`:
```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/sportup"
JWT_SECRET="your-super-secret-jwt-key"
```

### 3. Set up the Database
```bash
cd apps/api
npx prisma db push
npx prisma db seed
```

### 4. Run the Project
```bash
# From the monorepo root
npm run api      # Starts the Fastify API on http://localhost:3000
npm run mobile   # Starts the Expo dev server
```

### 5. Build for Android (EAS)
```bash
cd apps/mobile
npx eas-cli build --platform android --profile preview
```

---

## 📸 Key Screens

| Screen | Description |
|---|---|
| **Home** | Quick actions: start a run, browse events, view recent stats |
| **Explore** | Map/list of nearby or global events with sport & search filters |
| **My Events** | Events you've joined, organized, or been invited to |
| **Live Run** | Real-time GPS tracking with KPIs, splits, and audio cues |
| **Run History** | All past runs with full stats, pace splits, and route map |
| **Event Detail** | Join, leave, share, or start a planned run |
| **Social Feed** | Community posts, likes, and comments |
| **Leaderboard** | Rankings by distance & score |
| **Notifications** | All in-app alerts in one place |
| **Profile** | Your stats, running level, bio, and full history |

---

## 🚢 Deployment & Infrastructure

SportUp uses a **three-tier cloud infrastructure** for production:

```
┌─────────────────────────────────────────────────────────────┐
│                      PRODUCTION STACK                       │
│                                                             │
│  📱 Expo Dev / EAS          ⚡ Render.com       🗄️ Neon     │
│  ─────────────────         ───────────────     ──────────  │
│  Mobile App Hosting  ────▶  Fastify REST API  ────▶  PostgreSQL │
│  OTA Updates               Node.js Server           Serverless DB │
│  APK/IPA Builds                                             │
└─────────────────────────────────────────────────────────────┘
```

---

### 🗄️ Neon — Serverless PostgreSQL Database

[Neon](https://neon.tech) is the cloud PostgreSQL database used in production.

**Why Neon?**
- ✅ Serverless — scales to zero when not in use (no idle costs)
- ✅ Full PostgreSQL compatibility — works 100% with Prisma ORM
- ✅ Instant branching — create isolated DB branches for testing
- ✅ Free tier generous enough for a production MVP

**How it's used:**
- The production `DATABASE_URL` environment variable on Render points to the Neon connection pooler endpoint.
- All schema migrations are applied using `npx prisma db push` against the Neon database.

```env
# Production .env on Render
DATABASE_URL="postgresql://neondb_owner:<password>@ep-xxxxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

---

### ⚡ Render — API Server Hosting

[Render.com](https://render.com) hosts the Fastify REST API in production.

**Why Render?**
- ✅ Free tier available for web services
- ✅ Auto-deploy on every Git push to `main`
- ✅ Built-in environment variable management
- ✅ Zero-config HTTPS / SSL

**How it's used:**
- The `apps/api` service is deployed as a **Node.js Web Service** on Render.
- On every push to `main`, Render automatically runs `npm install && npm run build` then `npm start`.
- The `render.yaml` file at the root of the repo defines the service configuration.

```yaml
# render.yaml
services:
  - type: web
    name: sportup-api
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm run start --workspace=apps/api
```

The mobile app's `API_URL` in `src/services/api.ts` points to:
```
https://sportup-api.onrender.com
```

---

### 📱 Expo Dev / EAS — Mobile App Builds

[Expo Application Services (EAS)](https://expo.dev/eas) handles building, distributing, and updating the React Native mobile app.

**Why EAS?**
- ✅ Build Android APK / iOS IPA in the cloud without needing a Mac or Android Studio
- ✅ **OTA (Over-the-Air) updates** — push JS-only changes instantly without going through the App Store
- ✅ **Internal distribution** — share APKs directly with testers via a QR code link
- ✅ Manages code signing and certificates automatically

**Build Profiles** (defined in `apps/mobile/eas.json`):

| Profile | Distribution | Use Case |
|---|---|---|
| `development` | Internal | Dev build with Expo Dev Client for native debugging |
| `preview` | Internal | Test APK shared with team via QR link |
| `production` | Store | Final App Store / Play Store submission |

**How to build:**
```bash
cd apps/mobile

# Build a preview APK for Android testers
npx eas-cli build --platform android --profile preview

# Build for production
npx eas-cli build --platform android --profile production
```

**Expo Go vs Dev Build:**
- **Expo Go** — use during early development to test JS changes instantly, no build required
- **Dev Build** — a custom Expo client that includes native modules like `expo-location`, `expo-speech`, and `react-native-maps`; required for full feature testing

---



Pull requests are welcome! For major feature changes, please open an issue first.

---

## 📄 License

This project is for educational and personal use. All rights reserved by the SportUp team.

---

<div align="center">

Built with ❤️ by **Asma** — powered by TypeScript from top to bottom.

</div>
