FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
ARG API_INTERNAL_ORIGIN=http://api:4000
ENV API_INTERNAL_ORIGIN=$API_INTERNAL_ORIGIN
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
USER nodeapp
EXPOSE 3000
CMD ["node", "server.js"]
