# Sellit – Working Flow

## 1. Run the app (development)

```text
┌─────────────────────────────────────────────────────────────────┐
│  Terminal 1 (Backend)          │  Terminal 2 (Frontend)         │
├─────────────────────────────────────────────────────────────────┤
│  cd backend                    │  cd frontend                    │
│  npm run dev                   │  npm run dev                   │
│  → Port 5000                   │  → Port 3000 (0.0.0.0)        │
└─────────────────────────────────────────────────────────────────┘
```

- **Backend:** `http://localhost:5000` (API under `/api/*`, health at `/health`)
- **Frontend:** `http://localhost:3000`
- **Frontend env:** `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:5000/api`

---

## 2. High-level architecture

```text
  Mobile / Web (Next.js)
         │
         ▼
  Node.js API (Express)  ←── Socket.IO (chat, presence)
         │
         ├── MongoDB (Prisma)  … Users, Ads, Chats, Deals, BusinessPackage
         │
         └── OpenAI (optional) … AI Sales Assistant, description generation
```

---

## 3. Main user flows

### Auth

1. User opens app → `useAuth` runs (if cookie `token` exists).
2. `GET /api/auth/me` → backend validates JWT, returns user.
3. Login: `POST /api/auth/login` or OTP flow → backend returns JWT → frontend sets cookie and refetches `/auth/me`.
4. Profile: `GET /api/user/profile` (and optional `GET /api/user/ai-chat` for AI Chat setting).

### Browse & search

1. Home / category / search → `GET /api/ads`, `GET /api/categories`, `GET /api/locations`, etc.
2. Ad detail → `GET /api/ads/:id` (and related endpoints).
3. Favorites / limits → `GET /api/user/...`, `GET /api/ads/check-limit`, etc.

### Post ad

1. User goes to Post Ad → backend `GET /api/ads/check-status` (free vs business vs premium).
2. Form submit → `POST /api/ads` (with or without payment flow).
3. Business Package / premium → Razorpay or credits; backend activates and updates quota.

### Chat

1. From ad or profile → `POST /api/chat/room` (body: `adId`, `receiverId`) → get or create room.
2. Frontend connects Socket.IO, joins `room:${roomId}`.
3. Send: `socket.emit('send_message', { roomId, content, type: 'TEXT' })` or `POST /api/chat/rooms/:roomId/messages`.
4. Receive: `socket.on('new_message', ...)`. If receiver offline, backend sends FCM push.

### AI Sales Assistant (Business Package sellers)

1. **When it runs:** Seller has active Business Package + **AI Chat enabled** in profile + seller is **offline or not viewing this chat** + no manual seller message in last **30 minutes**.
2. **Trigger:** Something (e.g. cron or “Suggest reply” button) calls `POST /api/ai/sales-reply` with `{ roomId }`. Caller must be the **seller** (ad owner); JWT required.
3. **Backend:** Checks Business Package, `aiChatEnabled`, online/viewing and `lastSellerMessageAt`; loads room + ad + last messages; calls OpenAI with Manglish sales-assistant prompt; returns `{ reply }`.
4. **Human override:** When the seller sends a message (socket or REST), backend sets `ChatRoom.lastSellerMessageAt`; AI will not reply for 30 minutes.
5. **Profile toggle:** `GET /api/user/ai-chat`, `PUT /api/user/ai-chat` with `{ enabled: true/false }`.

---

## 4. Quick reference

| What              | Where / How |
|-------------------|-------------|
| API base          | `NEXT_PUBLIC_API_URL` (e.g. `http://localhost:5000/api`) |
| Auth check        | `GET /api/auth/me` (Bearer token in cookie/header) |
| Profile           | `GET /api/user/profile` |
| AI Chat setting   | `GET/PUT /api/user/ai-chat` |
| Suggest AI reply | `POST /api/ai/sales-reply` body `{ roomId }` (seller only) |
| Chat room         | `POST /api/chat/room`; then Socket.IO `room:${roomId}` |
| Backend health    | `GET http://localhost:5000/health` |

---

## 5. Database (MongoDB + Prisma)

- Schema: `backend/prisma/schema.mongodb.prisma`
- Generate client: `cd backend && npx prisma generate --schema=prisma/schema.mongodb.prisma`
- No migrations for MongoDB; ensure indexes/collections match schema when you add fields (e.g. `User.aiChatEnabled`, `ChatRoom.lastSellerMessageAt`).

This is the working flow for running the app and for the main features (auth, browse, post, chat, AI sales assistant).
