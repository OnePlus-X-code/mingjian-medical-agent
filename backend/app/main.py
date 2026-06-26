"""FastAPI 应用入口。"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import APP_NAME, FRONTEND_ORIGINS
from app.routers import actions, agent, feedbacks, health, review_cases

app = FastAPI(
    title="明鉴 · 医保监管智能体后端",
    description="Demo 级 FastAPI 后端，为前端 /console 控制台提供 API。",
    version="0.1.0",
)

# CORS 配置：允许前端跨域访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=FRONTEND_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

# 注册路由
app.include_router(health.router, tags=["health"])
app.include_router(review_cases.router, tags=["review-cases"])
app.include_router(actions.router, tags=["actions"])
app.include_router(feedbacks.router, tags=["feedbacks"])
app.include_router(agent.router, tags=["agent"])


@app.get("/")
def root():
    """根路径，返回基本信息。"""
    return {
        "success": True,
        "data": {
            "service": APP_NAME,
            "docs": "/docs",
            "health": "/health",
        },
        "message": "ok",
    }
