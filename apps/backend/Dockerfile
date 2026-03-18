FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++
COPY package*.json ./
COPY prisma/schema.prisma ./prisma/
RUN npm ci --only=production && cp -r node_modules /tmp/prod_modules
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache postgresql16-client dumb-init \
  && addgroup -g 1001 -S nodejs \
  && adduser  -S nestjs  -u 1001
COPY --from=deps /tmp/prod_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma  ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma  ./node_modules/@prisma
COPY --chown=nestjs:nodejs prisma ./prisma
COPY --chown=nestjs:nodejs docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
USER nestjs
EXPOSE 4000
ENTRYPOINT ["dumb-init","--","docker-entrypoint.sh"]
CMD ["node","dist/main"]
