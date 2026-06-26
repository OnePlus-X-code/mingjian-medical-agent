# ===== Stage 1: Build frontend =====
FROM node:22-slim AS frontend-builder

WORKDIR /app/frontend
RUN corepack enable

# Install dependencies
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY frontend/ .
ENV NEXT_PUBLIC_API_BASE_URL=/api
ENV NODE_ENV=production
RUN pnpm build

# ===== Stage 2: Runtime =====
FROM python:3.12-slim

# Install Node.js 22 runtime and curl
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Enable pnpm (for next start)
RUN corepack enable

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend code
COPY backend/ /app/backend/

# Copy frontend build output, config, and dependencies
COPY --from=frontend-builder /app/frontend/.next /app/frontend/.next
COPY --from=frontend-builder /app/frontend/public /app/frontend/public
COPY --from=frontend-builder /app/frontend/package.json /app/frontend/package.json
COPY --from=frontend-builder /app/frontend/pnpm-lock.yaml /app/frontend/pnpm-lock.yaml
COPY --from=frontend-builder /app/frontend/next.config.ts /app/frontend/next.config.ts
COPY --from=frontend-builder /app/frontend/tsconfig.json /app/frontend/tsconfig.json
COPY --from=frontend-builder /app/frontend/postcss.config.mjs /app/frontend/postcss.config.mjs
COPY --from=frontend-builder /app/frontend/node_modules /app/frontend/node_modules

# Copy data
COPY data/ /app/data/

# Copy startup script
COPY start_modelscope.sh /app/start_modelscope.sh
RUN chmod +x /app/start_modelscope.sh

EXPOSE 7860

CMD ["/app/start_modelscope.sh"]
