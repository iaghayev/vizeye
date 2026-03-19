FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++ openssl openssl-dev
COPY package*.json ./
COPY prisma/schema.prisma ./prisma/
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl openssl-dev
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache postgresql16-client dumb-init openssl openssl-dev \
  && addgroup -g 1001 -S nodejs \
  && adduser  -S nestjs  -u 1001

COPY --from=deps    /app/node_modules         ./node_modules
COPY --from=builder /app/dist                 ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY                prisma                    ./prisma
COPY                tsconfig.json             ./tsconfig.json
COPY                public                    ./public

RUN chown -R nestjs:nodejs /app

COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nestjs
EXPOSE 4000
ENTRYPOINT ["dumb-init","--","docker-entrypoint.sh"]
CMD ["node","dist/src/main"]
