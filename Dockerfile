FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
# Rewrites and NEXT_PUBLIC_* values are inlined at build time, so they must be
# supplied as build args (.env files are excluded from the build context).
ARG API_INTERNAL_ORIGIN=http://api:4000
ARG NEXT_PUBLIC_SITE_ORIGIN=http://localhost:3000
ARG NEXT_PUBLIC_API_BASE_PATH=/api/v1
ARG NEXT_PUBLIC_DEFAULT_LOCALE=en
ENV API_INTERNAL_ORIGIN=$API_INTERNAL_ORIGIN \
    NEXT_PUBLIC_SITE_ORIGIN=$NEXT_PUBLIC_SITE_ORIGIN \
    NEXT_PUBLIC_API_BASE_PATH=$NEXT_PUBLIC_API_BASE_PATH \
    NEXT_PUBLIC_DEFAULT_LOCALE=$NEXT_PUBLIC_DEFAULT_LOCALE \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
# Docker sets HOSTNAME to the container ID; the standalone server binds to it,
# so pin it to all interfaces.
ENV NODE_ENV=production \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp
COPY --from=builder --chown=nodeapp:nodeapp /app/.next/standalone ./
COPY --from=builder --chown=nodeapp:nodeapp /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER nodeapp
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/en',{redirect:'manual'}).then(r=>{if(r.status>=500)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
