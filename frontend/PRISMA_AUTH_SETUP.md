# Prisma + PostgreSQL + Auth Setup

## What this enables
- User authentication with email/password and Google login
- User-wise pricing/plan data
- KPI/dashboard usage tracking for billing limits
- BI chatbot conversation history persistence

## 1) Install packages
Run from `frontend/`:

```bash
npm install prisma @prisma/client next-auth bcryptjs
npm install @auth/prisma-adapter
npm install -D tsx
```

## 2) Create environment variables
Add to `frontend/.env.local`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/talking_bi?schema=public"
NEXTAUTH_SECRET="replace-with-random-long-secret"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

## 3) Generate and migrate Prisma

```bash
npx prisma generate
npx prisma migrate dev --name init_auth_pricing_chat
```

## 4) Google OAuth setup
1. Open Google Cloud Console.
2. Create OAuth consent screen.
3. Create OAuth Client ID (Web app).
4. Add redirect URI:
   - `http://localhost:3000/api/auth/callback/google`
5. Copy client ID and secret to `.env.local`.

## 5) NextAuth route setup (App Router)
Create `frontend/app/api/auth/[...nextauth]/route.ts` and wire:
- PrismaAdapter
- Google provider
- Credentials provider (email/password)

## 6) Password login flow
- Store hashed password in `User.passwordHash` using `bcryptjs`.
- On login, compare hash.

## 7) User pricing + limits
Use tables:
- `Subscription` for active plan
- `UsageEvent` for metering usage

Sample policy:
- FREE: max 10 KPI queries/day, no premium charts
- PRO: unlimited KPI queries + premium charts
- ENTERPRISE: unlimited + advanced support

## 8) Chat history
Persist BI chat by user:
- Create `Conversation`
- Append `Message` rows for user/assistant
- Render from DB in sidebar history panel

## 9) Important note
Current UI includes sidebar history panel with local persistence for immediate UX. To make it production-ready and user-wise, connect that panel to Prisma `Conversation` and `Message` tables after auth session is available.
