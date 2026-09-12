# Production image for the UR Platform API.
# Railway detects this file and uses it instead of treating the repo as an Expo app.

FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Pin the same pnpm as package.json. Installing "latest" pnpm (11.20+)
# fails on Railway with ERR_PNPM_PNPM_ENGINE_IDENTITY_UNVERIFIABLE
# because it cannot verify @pnpm/exe for pnpm 9 on Alpine/musl.
RUN npm install -g pnpm@9.12.0

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

COPY . .

# Public Supabase keys must be present at export time — Expo inlines EXPO_PUBLIC_* into the website.
# Railway passes matching Variables as Docker build-args. Never ARG the service-role key.
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_URL=$SUPABASE_URL

ENV CI=1
ENV EXPO_NO_TELEMETRY=1
ENV NODE_OPTIONS=--max-old-space-size=4096
# NativeWind writes this path during export; Metro SHA-1 fails if it is missing.
RUN mkdir -p node_modules/react-native-css-interop/.cache \
  && printf '/* nativewind cache seed */\n' > node_modules/react-native-css-interop/.cache/web.css \
  && pnpm run build \
  && mkdir -p dist-web \
  && (pnpm run build:web || echo "[docker] build:web failed — shipping API + fallback page") \
  && cp -f public/manifest.webmanifest public/sw.js dist-web/

FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV WEB_DIST_PATH=/app/dist-web

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --gid 1001 nodejs

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/dist-web ./dist-web
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=25s --retries=3 \
  CMD node -e "const p=process.env.PORT||3000;require('http').get('http://127.0.0.1:'+p+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/index.mjs"]
