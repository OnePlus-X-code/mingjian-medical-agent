# 01 Backend Overview

## 1. 项目背景

「明鉴 · 医保监管智能体」是一个面向医保基金监管场景的黑客松 Demo 项目。

产品定位不是替代现有 DRG / DIP 智能审核系统，而是接在现有审核系统之后，作为一个“智能复核与决策辅助层”。

核心链路：

```txt
DRG 疑似违规清单
→ Agent 智能复核
→ 相似历史申诉案例匹配
→ 红 / 黄 / 绿分级建议
→ 证据链展示
→ 人工放行 / 打回 / 转人工
→ 反馈沉淀
````

前端已经完成 `/console` 控制台页面。后端需要为该控制台提供真实 API，使其从 mock 演示升级为可运行的端到端 Demo。

---

## 2. 后端目标

本阶段后端目标是实现一个 Demo 级 FastAPI 服务，支撑前端控制台的全部核心功能：

1. 读取病例复核清单。
2. 返回病例详情。
3. 支持搜索和筛选。
4. 返回 Agent 判断理由、证据链、相似申诉案例。
5. 接收人工动作：放行、打回、转人工。
6. 将人工动作写入 JSON 文件。
7. 更新病例当前状态。
8. 提供单条 Agent 复核接口。
9. 支持规则兜底模式与可选大模型 API 调用模式。

后端不是完整医保业务系统，而是黑客松 Demo 的“智能复核服务层”。

---

## 3. 本地开发端口约定

本项目统一使用以下端口：

```txt
前端 Next.js: http://localhost:3000
后端 FastAPI: http://localhost:8000
```

前端 API base URL 应优先读取：

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

如果未配置环境变量，则默认使用：

```txt
http://localhost:8000
```

后端必须配置 CORS，允许以下来源：

```txt
http://localhost:3000
http://127.0.0.1:3000
```

---

## 4. 后端数据策略

Demo 阶段不使用数据库。

后端直接读取和写入根目录 `data/` 下的 JSON 文件：

```txt
data/review_cases.json
data/manual_actions.json
data/suspect_cases.json
data/appeal_cases.json
data/hospital_profiles.json
```

其中：

* `review_cases.json`：前端病例列表与详情的主数据源。
* `manual_actions.json`：人工审核动作记录。
* `suspect_cases.json`：DRG 系统输出的原始疑似违规清单。
* `appeal_cases.json`：历史申诉案例库。
* `hospital_profiles.json`：医院和科室画像。

后端不要读取 `frontend/src/mock/` 作为数据源。
`frontend/src/mock/` 只作为前端 fallback 使用。

---

## 5. 后端职责边界

### 当前阶段要做

后端需要实现：

1. FastAPI 服务启动。
2. 健康检查接口。
3. 病例列表接口。
4. 病例详情接口。
5. 人工动作提交接口。
6. 近期反馈接口。
7. 单条 Agent 复核接口。
8. JSON 文件读写。
9. CORS 配置。
10. 基础错误处理。
11. 可选大模型 API 调用能力。
12. 大模型调用失败后的规则兜底。

### 当前阶段不做

本阶段明确不做：

1. 不做登录。
2. 不做权限系统。
3. 不做真实医保数据接入。
4. 不做数据库。
5. 不做 Supabase / PostgreSQL / MongoDB。
6. 不做复杂 RAG。
7. 不做向量数据库。
8. 不做真实 HIS / 医保局系统对接。
9. 不做多租户。
10. 不做生产级审计日志。
11. 不做复杂异步任务队列。
12. 不在前端暴露大模型 API Key。

---

## 6. 推荐后端目录结构

建议新增：

```txt
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── health.py
│   │   ├── review_cases.py
│   │   ├── actions.py
│   │   ├── feedbacks.py
│   │   └── agent.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── common.py
│   │   ├── review.py
│   │   └── action.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── data_store.py
│   │   ├── review_service.py
│   │   ├── feedback_service.py
│   │   ├── agent_service.py
│   │   └── llm_client.py
│   └── prompts/
│       └── review_case_prompt.md
├── requirements.txt
├── .env.example
└── README.md
```

---

## 7. 技术栈

后端使用：

```txt
Python 3.11+
FastAPI
Uvicorn
Pydantic
python-dotenv
```

可选：

```txt
openai
```

如果接入 OpenAI-compatible 大模型 API，则使用 `openai` SDK，不在前端直接调用模型 API。

---

## 8. 统一响应格式

所有接口统一返回：

```json
{
  "success": true,
  "data": {},
  "message": "ok"
}
```

失败时返回：

```json
{
  "success": false,
  "data": null,
  "message": "case not found"
}
```

前端 `api.ts` 会读取响应中的 `data` 字段，所以后端必须保持该格式。

---

## 9. Demo 稳定性原则

后端开发优先保证 Demo 稳定。

尤其是 Agent 复核接口：

* 默认可以使用规则兜底模式。
* 大模型调用作为可选增强。
* 大模型调用失败时不能让前端崩溃。
* 必须返回结构化结果。
* 必须能写回 `review_cases.json`。
* 路演时至少保证 `SC001`、`SC002`、`SC003` 三条核心案例可稳定展示。