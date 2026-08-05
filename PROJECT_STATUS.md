# UR Platform V2 — Project Status & Roadmap

**Last updated:** August 2026  
**Repo:** `ur-platform-v2` (Expo SDK 54 + Express/tRPC monorepo)

This document summarizes **what is built and working today**, **what we fixed in recent sessions**, and **what still needs to be done** for a fully functional production app.

For the original product vision (11 specialist AIs, stamps, 3D workspace, etc.), see [`PROJECT_REQUIREMENTS.md`](./PROJECT_REQUIREMENTS.md).

---

## Architecture (current)

```
┌─────────────────────────────────────────────────────────────┐
│  Phone / Web — Expo Go (port 8082)                          │
│  app/(tabs)/  ·  components/  ·  lib/trpc.ts                │
└──────────────────────────┬──────────────────────────────────┘
                           │  HTTP + Bearer (Supabase JWT)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  API Server — Express + tRPC (port 3000)                    │
│  server/_core/index.ts  ·  server/routers.ts                │
│  Security: api-security.ts · secrets.ts · secureProcedure   │
└──────────┬───────────────────────────────┬──────────────────┘
           │                               │
           ▼                               ▼
   Google Gemini (ContentMate/         MySQL via Drizzle
   LinguaMate chat)                   (loyalty, users)
   CONTENTMATE_GEMINI_API_KEY          DATABASE_URL
```

**Dev commands** (always from project root, not `app/`):

| Command | Purpose |
|---------|---------|
| `pnpm dev` | API + Metro + QR code in terminal |
| `pnpm dev:server` | API only |
| `pnpm dev:metro` | Expo only |
| `pnpm qr:terminal` | Print Expo Go QR (`exp://<LAN-IP>:8082`) |

---

## What we built / fixed (recent sessions)

### Google Cloud AI — ContentMate & LinguaMate

| Item | Location | Status |
|------|----------|--------|
| Gemini 1.5 Flash chat | `server/_core/google-ai.ts` | ✅ Working (API key or Vertex fallback) |
| Imagen 3 image gen | `server/_core/google-ai.ts` | ⚠️ Server code exists; needs Vertex AI project + service account |
| ContentMate router | `server/routers/chat-router.ts` | ✅ `secureProcedure("chat")` |
| LinguaMate router | `server/ai-language-router.ts` | ✅ chat / translate / teach |
| Multilingual prompts | `server/_core/multilingual-prompts.ts` | ✅ |
| Messages tab UI | `app/(tabs)/messages.tsx` | ✅ ContentMate + LinguaMate switcher |
| ContentMate UI | `components/personal-ai-interface.tsx` | ✅ Wired to tRPC |
| LinguaMate UI | `components/language-ai-interface.tsx` | ✅ Wired to tRPC |

### Security layer

| Item | Location | Status |
|------|----------|--------|
| Per-namespace rate limits + circuit breakers | `server/_core/api-security.ts` | ✅ |
| `secureProcedure(namespace)` | `server/_core/trpc.ts` | ✅ Used on chat, aiLanguage, webSearch, loyalty |
| Owner-only admin (`ownerProcedure`) | `server/_core/owner-auth.ts` | ✅ Needs `PLATFORM_OWNER_*` in `.env` |
| AI takeover blocking | `server/_core/ai-control.ts` | ✅ |
| AI role guardrails (stay on mission) | `server/_core/ai-roles.ts`, `ai-guardrails.ts` | ✅ |
| Server-only secrets (no client leak) | `server/_core/secrets.ts` | ✅ Key not on shared `ENV` object |
| Startup secret guard | `assertServerSecretsSafe()` in `index.ts` | ✅ Blocks `EXPO_PUBLIC_*` API keys |
| Input sanitization | `server/_core/input-sanitize.ts` | ✅ |
| Security rule for future code | `.cursor/rules/security-first.mdc` | ✅ |

### Auth & navigation

| Item | Location | Status |
|------|----------|--------|
| Supabase email/password login | `app/(auth)/login.tsx`, `lib/supabase.ts` | ✅ UI works |
| Auth context + session restore | `lib/auth-context.tsx`, `lib/auth-storage.ts` | ✅ |
| Route guard | `components/auth-route-guard.tsx` | ✅ |
| Tab navigation | `app/(tabs)/_layout.tsx` | ✅ Home, Create, Discover, Messages, Profile |
| tRPC auth headers | `lib/trpc.ts` | ✅ Sends Supabase Bearer token |

### Dev tooling fixes

| Fix | Notes |
|-----|-------|
| `ai-language-router.ts` import paths | Fixed `../_core` → `./_core` (server crash) |
| `babel-preset-expo` | Added to `package.json` (Metro bundling) |
| QR code on `pnpm dev` | Prints in terminal; uses `--kill-others-on-fail` so servers stay up |
| `.env` format | Key must be `CONTENTMATE_GEMINI_API_KEY="..."`; phone needs `EXPO_PUBLIC_API_BASE_URL` with LAN IP |

---

## What works end-to-end today

These flows are **implemented and wired** (assuming `.env` is configured):

1. **Login** — Supabase email/password → session stored → guarded tabs
2. **ContentMate** — Messages tab → chat → Gemini via server → guardrails applied
3. **LinguaMate** — Messages tab → translate / teach / chat modes
4. **Daily sign-in / loyalty** — Home tab → `trpc.loyalty.*` (needs real database)
5. **API health** — `GET /api/health`
6. **Expo Go on phone** — Scan QR from `pnpm dev` → `exp://192.168.12.56:8082`

---

## Client tabs — wiring status

| Tab | File | Backend wired? | Notes |
|-----|------|----------------|-------|
| **Home** | `app/(tabs)/index.tsx` | Partial | Daily sign-in uses loyalty tRPC; submenus mostly placeholder |
| **Create** | `app/(tabs)/create.tsx` | ❌ Mock | Text AI modal uses local parser, not ContentMate; use **Messages** for real AI |
| **Discover** | `app/(tabs)/discover.tsx` | ❌ Shell | Routes to Messages |
| **Messages** | `app/(tabs)/messages.tsx` | ✅ | ContentMate + LinguaMate (real AI) |
| **Profile** | `app/(tabs)/profile.tsx` | Partial | Logout works; admin/onboarding modals are UI-only |

**Only 3 client files call tRPC today:**
- `components/personal-ai-interface.tsx` → `chat.sendMessage`
- `components/language-ai-interface.tsx` → `aiLanguage.*`
- `hooks/use-daily-signin.ts` → `loyalty.*`

---

## Server routers — registered vs stub

### ✅ Registered & intended for production use

| Router | Auth | Purpose |
|--------|------|---------|
| `chat` | `secureProcedure` | ContentMate |
| `aiLanguage` | `secureProcedure` | LinguaMate |
| `webSearch` | `secureProcedure` | Web search (engine integration TODO) |
| `loyalty` | `secureProcedure` | Daily sign-in, scratch-off |
| `ai.*` (learning admin) | `ownerProcedure` | Owner-only AI training approval |
| `system.health` | public | Health check |

### ⚠️ Registered but NOT production-ready

| Router | Problem |
|--------|---------|
| `stamps` | All `publicProcedure`; returns hardcoded zeros; DB TODO |
| `voiceProperty` | All `publicProcedure`; demo API keys |
| `aiRealEstate` | All `publicProcedure`; demo keys |
| `ai3dSpecialist` | All `publicProcedure`; demo keys |
| `ai.getOmniCapabilities` | `publicProcedure` — should require auth |
| `auth.me`, `auth.logout` | public (acceptable for session read/clear) |

### ❌ Exist on disk but NOT registered in `appRouter`

Unreachable via `/api/trpc` until added to `server/routers.ts`:

- `workspace-3d-router`, `voice-conversation`, `plumber-router`, `landscaping-master`
- `infrastructure-router`, `helper-ai`, `health`, `compliance`
- `ai-creators-unified-router`, `legal-reference-router`, `background-engines-router`, `ai-persona-router`

---

## Environment variables — checklist

### Required for AI chat on phone (your current focus)

```env
# .env (project root — never commit)

CONTENTMATE_GEMINI_API_KEY="your-key-here"          # Server-only
EXPO_PUBLIC_API_BASE_URL="http://192.168.12.56:3000" # Your PC LAN IP, not localhost
EXPO_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
EXPO_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
```

### Required for full auth + admin

```env
PLATFORM_OWNER_SUPABASE_ID="your-supabase-user-uuid"
PLATFORM_OWNER_EMAIL="your-email@example.com"
SUPABASE_SERVICE_ROLE_KEY="..."   # Optional; improves server JWT verification
JWT_SECRET="..."                  # If using Manus session cookies
```

### Required for database features (loyalty, user sync)

```env
DATABASE_URL="mysql://user:pass@host:3306/ur_platform"
```

> **Note:** Code uses **MySQL** (`drizzle/schema.ts`, `mysql2`). `.env.example` shows PostgreSQL — align before production.

### Optional — Vertex AI / Imagen / legacy

```env
GOOGLE_CLOUD_PROJECT="..."
GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account.json"
GOOGLE_GEMINI_MODEL="gemini-1.5-flash-002"
GOOGLE_IMAGEN_MODEL="imagen-3.0-generate-002"
CORS_ALLOWED_ORIGINS="http://localhost:8082,https://your-domain.com"
```

See [`.env.example`](./.env.example) for the full list.

---

## What still needs to be done

### Phase 1 — Make the core app reliable (do first)

- [ ] **Real Supabase project** — Replace `placeholder.supabase.co` in `.env`; create test users
- [ ] **Set platform owner** — `PLATFORM_OWNER_SUPABASE_ID` / `PLATFORM_OWNER_EMAIL` for admin controls
- [ ] **MySQL database running** — Fix `DATABASE_URL` dialect; run `pnpm db:push`; verify loyalty tables
- [ ] **Verify ContentMate on phone** — After `.env` restart, send a message in Messages tab
- [ ] **Rotate Gemini key** if it was ever pasted in chat (create new key in Google AI Studio)

### Phase 2 — Security hardening (before any public launch)

- [ ] Migrate `stamps`, `voiceProperty`, `aiRealEstate`, `ai3dSpecialist` from `publicProcedure` → `secureProcedure`
- [ ] Protect `ai.getOmniCapabilities` with auth
- [ ] Remove hardcoded Supabase fallbacks in `lib/supabase.ts`
- [ ] Remove or wire dead OAuth (Manus) code — login uses Supabase only today
- [ ] Delete deprecated `lib/secure-auth-context.tsx`

### Phase 3 — Wire remaining UI to real backends

- [ ] **Create tab** — Replace `personal-ai-chat.tsx` mock with ContentMate tRPC (or deep-link to Messages)
- [ ] **Discover / Home** — Real feeds or remove “coming soon” placeholders
- [ ] **Profile admin** — Connect admin dashboard to `ownerProcedure` routes
- [ ] **Voice chat** — Currently local TTS in `voice-chat-interface.tsx`; wire to server if needed
- [ ] **Web search** — Integrate real search API in `server/web-search-security.ts`

### Phase 4 — Specialist AIs (from PROJECT_REQUIREMENTS.md)

Each specialist needs: router registration, `secureProcedure`, Gemini + role prompt, guardrails, and client UI.

| Specialist | Server file exists? | Registered? | Client UI? |
|------------|--------------------|-------------|------------|
| Plumber, Electrician, etc. | Partial (`plumber-router`, etc.) | ❌ | ❌ |
| Real Estate AI | ✅ | ✅ (insecure) | ❌ |
| 3D Specialist | ✅ | ✅ (insecure) | ❌ |
| Voice Property | ✅ | ✅ (insecure) | ❌ |
| 11 construction/creative AIs | In `lib/ai-creators-system.ts` | ❌ | ❌ |

### Phase 5 — Platform features (vision doc)

- [ ] Stamps economy + Stripe payments
- [ ] 3D collaborative workspace
- [ ] Photo-to-3D conversion
- [ ] Imagen 3 image generation (Vertex AI setup)
- [ ] Creator marketplace, affiliate, CDN, etc. (large `lib/` surface — mostly unwired)

### Phase 6 — Production readiness

- [ ] Fix TypeScript — `lib/ai-creators-system.ts` syntax errors; run `pnpm check` clean
- [ ] Remove corrupt stray files at repo root
- [ ] Enable stricter TypeScript incrementally
- [ ] CI: lint, test, build
- [ ] Production deploy: `pnpm build` + `node dist/index.js`, HTTPS, CORS, secrets in host env (not `.env` in image)
- [ ] Tests — expand beyond minimal auth tests

---

## Known issues & gotchas

| Issue | Impact | Workaround |
|-------|--------|------------|
| Port 8082 in use | `pnpm dev` fails | Only one dev session; Ctrl+C before restart |
| Run from `app/` folder | Some commands fail | Always `cd` to `ur-platform-v2` root |
| `pnpm install` while Metro running | ENOENT temp dirs on Windows | Stop dev first, then install |
| Metro cache deserialize error | Harmless warning | `pnpm expo start --clear --lan --port 8082` |
| OAuth error in logs | Harmless | Using Supabase auth, not Manus OAuth |
| `DATABASE_URL` is PostgreSQL in `.env` but code expects MySQL | Loyalty/DB features may fail | Switch to MySQL URL or migrate schema |
| Create tab Text AI | Feels broken vs Messages | Use **Messages → ContentMate** for real AI |

---

## File map — key paths

```
ur-platform-v2/
├── app/
│   ├── (auth)/login.tsx          # Login screen
│   ├── (tabs)/
│   │   ├── index.tsx             # Home + loyalty
│   │   ├── create.tsx            # Create (partial mock)
│   │   ├── discover.tsx          # Discover shell
│   │   ├── messages.tsx          # ContentMate + LinguaMate ✅
│   │   └── profile.tsx           # Profile + logout
│   └── _layout.tsx               # AuthProvider + tRPC + guard
├── components/
│   ├── personal-ai-interface.tsx # ContentMate UI ✅
│   └── language-ai-interface.tsx # LinguaMate UI ✅
├── lib/
│   ├── auth-context.tsx          # Supabase session
│   ├── trpc.ts                   # API client
│   └── supabase.ts               # Supabase client
├── server/
│   ├── _core/
│   │   ├── index.ts              # Express entry
│   │   ├── google-ai.ts          # Gemini + Imagen
│   │   ├── secrets.ts            # Server-only API keys
│   │   ├── api-security.ts       # Rate limits, CORS
│   │   ├── trpc.ts               # secureProcedure, ownerProcedure
│   │   ├── ai-guardrails.ts      # Jailbreak / safety filters
│   │   └── ai-roles.ts           # ContentMate / LinguaMate roles
│   ├── routers.ts                # appRouter composition
│   ├── routers/chat-router.ts    # ContentMate
│   └── ai-language-router.ts     # LinguaMate
├── .env                          # Local secrets (gitignored)
├── .env.example                  # Template
├── PROJECT_REQUIREMENTS.md       # Full product vision
└── PROJECT_STATUS.md             # This file
```

---

## Bottom line

**Working now:** Supabase login flow, tab app shell, ContentMate + LinguaMate AI chat with Gemini, security guardrails, owner-only AI admin hooks, loyalty/sign-in (with DB), Expo Go dev loop with QR.

**Not working / incomplete:** Most specialist AIs, stamps/payments, 3D workspace, Create tab mock AI, Discover/Home content, many server routers (unregistered or insecure), database dialect mismatch, production deploy path.

**Next best step:** Configure real Supabase + MySQL + owner env vars, restart `pnpm dev`, confirm ContentMate replies on your phone in the Messages tab. Then harden public routers and wire Create/Discover tabs to real backends.

---

*Keep API keys in `.env` only. Never commit or paste them in chat.*
