#!/bin/bash
set -e

echo "=== 明鉴 · 医保监管智能体 — ModelScope 部署启动 ==="

# ── 启动 FastAPI 后端（端口 8800） ──
cd /app/backend
echo "[1/2] Starting FastAPI backend on port 8800..."
python -m uvicorn app.main:app --host 0.0.0.0 --port 8800 &
BACKEND_PID=$!

# ── 等待后端就绪 ──
echo "Waiting for backend to be ready..."
for i in $(seq 1 30); do
  if curl -s http://127.0.0.1:8800/health > /dev/null 2>&1; then
    echo "Backend is ready (attempt $i)"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "ERROR: Backend failed to start within 30 seconds"
    exit 1
  fi
  sleep 1
done

# ── 启动 Next.js 前端（端口 7860） ──
cd /app/frontend
echo "[2/2] Starting Next.js frontend on port 7860..."
npx next start -H 0.0.0.0 -p 7860 &
FRONTEND_PID=$!

# ── 等待任一进程退出 ──
wait -n $BACKEND_PID $FRONTEND_PID
EXIT_CODE=$?

echo "Process exited with code $EXIT_CODE, shutting down..."
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
exit $EXIT_CODE
