# Railway — read this before you build or deploy

This file is the contract for the **live website**. Railway has been serving an old one-page Sign up after we already shipped a three-page join path. Do not guess. Follow this file.

## What to deploy

| Item | Value |
| --- | --- |
| GitHub repo | `kenuetrecht-hue/ur-platform-v2` (**private** — do not make it public) |
| Branch Railway must build | **`main` only** |
| Work branch (same code after we push) | `chat` — we push `chat` then update `main` to match |
| Live URL | https://ur-platform-v2-production.up.railway.app |
| Login | https://ur-platform-v2-production.up.railway.app/login |
| Health | https://ur-platform-v2-production.up.railway.app/api/health |
| Which Railway box | The **website** service whose public URL is `ur-platform-v2-production.up.railway.app`. Not the MySQL box. |

**Always deploy the newest commit on `main`.** Do not redeploy an older “Success” build. If `chat` and `main` are the same SHA, you have the right code.

## What we built (join path)

Same product for phone and website (Expo). Words are **Login** and **Sign up** only. Not “Sign in.”

1. **`/login`** — returning members: email + password. **Show password** is next to Password. Already 18+ on the account? They go in. No pictures.
2. **`/signup`** — **Step 1 of 3.** Name, email, password, **type the password again**. Read Terms, tap **OK**. Then **Continue to ID pictures**. **No camera on this page.**
3. **`/signup-id`** — **Step 2 of 3.** Live camera, yellow box, ID **front** then **back**. Then **Continue to selfie**. No selfie camera here.
4. **`/signup-selfie`** — **Step 3 of 3.** One selfie so the face matches the ID. **Check my ID and selfie**. If it passes, create/login the account and open the app.

Leftover `/age-verify` is a **redirect only**. It is not the join form.

## Where the code is

| Page / job | File |
| --- | --- |
| Login screen | `app/(auth)/login.tsx` |
| Step 1 account form | `app/(auth)/signup.tsx` + `components/finish-account-after-id-pass.tsx` |
| Step 2 ID pictures | `app/(auth)/signup-id.tsx` + `components/signup-id-pictures.tsx` |
| Step 3 selfie + check | `app/(auth)/signup-selfie.tsx` + `components/signup-selfie-check.tsx` |
| Routes | `lib/after-sign-in.ts` (`/login`, `/signup`, `/signup-id`, `/signup-selfie`) |
| One camera at a time | `components/age-kyc-photo-capture.tsx` |
| After pictures pass | `hooks/use-enter-app-after-pictures.ts` |
| Create MySQL tables | `scripts/run-all-migrations.js` (`pnpm db:setup`) |
| Production start | `scripts/start-production.js` — tables first, then `node dist/index.mjs` |
| Railway settings | `railway.json` |
| Docker image | `Dockerfile` |

If Sign up still shows cameras on the **same** page as name/email/password, you are running an **old image**. That old file was `components/id-check-during-signin.tsx`. It is **gone**. The new build must not contain it.

## How Railway must build this

1. Builder = **Dockerfile** at `/Dockerfile` (`railway.json`).
2. Do not treat the repo as a bare Expo app and skip the Docker file.
3. Start command inside the image is already  
   `node scripts/start-production.js`  
   That runs table setup, then the website. Do not override start to `node dist/index.mjs` only, or tables may never be created.
4. `preDeployCommand` is `node scripts/run-all-migrations.js`.
5. Watch the **build log**. If you see `build:web failed — shipping API + fallback page`, the website JS is incomplete. **Fail the deploy** and rebuild. Do not leave testers on a half-built site.
6. After **Success**, confirm the new commit SHA in the Railway deployment matches GitHub `main`.

## How to prove the new pages are live

Open a **fresh** browser (or hard-refresh). Do not use an old “Add to Home Screen” icon.

1. Go to `/login`. You should see Login + a **Sign up** bubble.
2. Tap **Sign up**. The title must say **Sign up · Step 1 of 3**. You must see **two** password lines and **OK — I agree to the Terms**. You must **not** see a live camera.
3. After Continue, the URL must become `/signup-id` and the title **ID pictures · Step 2 of 3**.
4. After Continue, the URL must become `/signup-selfie` and the title **Selfie · Step 3 of 3**.

If those titles are missing, Railway is still serving the previous deployment. Redeploy **latest `main`**, then wait for a new Success.

## MySQL (website must be linked)

The app uses **MySQL** (drizzle mysql2), not Postgres.

- Link the Railway **MySQL** plugin to the **website** service.
- On the website service, a `mysql://…` URL must exist as `MYSQL_URL` or `MYSQL_DATABASE_URL`, or as Railway’s `MYSQLHOST` / `MYSQLUSER` / `MYSQLPASSWORD` / `MYSQLDATABASE` / `MYSQLPORT`.
- On Railway, the **internal** host (`mysql.railway.internal`) is correct for the website. Do not use `localhost`.
- Ignore a `postgresql://` `DATABASE_URL` if Railway injected Postgres. The app already skips that.
- Leave **`DEV_SKIP_AGE_KYC` off**. Testers must do the real 18+ pictures. No bypass.

A Doctor AI log line about `ownerCommandCenterEvents` is **not** the Sign up flow. If that insert fails, check that table setup ran on this website’s MySQL. It does not mean you should roll back the three-page Sign up.

## What Railway must not do

- Do not deploy a branch other than `main`.
- Do not pin or replay an old successful deployment.
- Do not make the GitHub repo public.
- Do not ask anyone to paste passwords, service-role keys, or Gemini keys into chat.
- Do not put secrets in `EXPO_PUBLIC_*`.
- Do not turn on `DEV_SKIP_AGE_KYC` in production.
- Do not “fix” Sign up by putting cameras back on `/signup`.

## Owner (Ken) after you show Success

Testers use `/login`. Members type email + password. New people tap Sign up and walk Step 1 → 2 → 3. If a phone icon still shows the old frozen page, delete **only that icon** and add the site again from Login.
