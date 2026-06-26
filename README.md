# 明鉴 · 医保监管智能体

> Mingjian Medical Agent — 模法黑客松 S4 医保局赛道作品

## 项目简介

现有 DRG/DIP 审核系统能批量输出"疑似违规清单"，但规则引擎只能发现"看起来异常"的账目，难以理解临床场景、历史申诉结果和医院科室差异。

**明鉴**接在现有 DRG 审核系统之后，增加一层智能复核 Agent：

```text
DRG 疑似清单 → Agent 智能复核 → 匹配历史申诉案例 + 医院画像 → 生成红黄绿分级结果
→ 前端展示复核清单 → 工作人员放行 / 打回 / 人工审核 → 系统记录反馈
```

医保工作人员打开系统时，看到的不是 DRG 原始疑似清单，而是 **Agent 已经复核完成后的红黄绿清单**。点击任一案例，可查看 AI 审核建议、相似历史案例、判断理由和证据链。工作人员的反馈会被记录，用于优化 Agent 判断。

---

## 核心功能

### 🟢🟡🔴 红黄绿智能复核

- **绿灯**：与历史成功申诉案例高度相似 → 建议放行，减少误伤
- **黄灯**：证据不足或结果分化 → 建议人工复核，保留判断空间
- **红灯**：缺少合理解释或接近历史打回案例 → 建议重点核查

### 🔍 案例详情与证据链

点击任一案例，查看 DRG 原始疑点、Agent 判断理由、相似历史申诉案例（Top 3）、相似度评分、病历关键点摘要、医院画像、证据链时间线、建议操作。

### 🤖 Agent 智能复核

- 调用 LLM 大模型（DeepSeek / 通义千问 / 其他 OpenAI 兼容 API）分析病例
- **相似申诉案例匹配**：7 维加权评分（同医院 +10 / 同科室 +20 / 诊断关键词 +25 / 项目关键词 +25 / 命中规则 +20 / risk_reason 重合 +20 / 成功申诉 +5），归一化到 0~1，取 Top 3
- **医院画像读取**：匹配医院等级、风险等级、历史违规次数、申诉成功率、重点科室画像
- LLM Prompt 注入真实 matched_cases 和 hospital_profile（非空占位符）
- 规则兜底模式：基于 matched_cases 成功/失败比例 + 高风险关键词 + 医院画像动态生成灯色和建议，不再依赖预写值

### ✅ 人工反馈闭环

- 一键放行 / 打回 / 转人工审核
- 绿灯打回必须填写理由
- 反馈记录写入数据文件，刷新不丢失
- "Agent 复核"按钮：一键触发 LLM 重新分析，实时刷新详情

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 16 (Turbopack) · React 19 · TypeScript 5.9 · Tailwind 4 · shadcn/ui · Base UI |
| 后端 | Python FastAPI · Pydantic · OpenAI SDK (兼容) · Uvicorn |
| 数据 | JSON 文件存储（MVP 阶段，无需数据库） |
| LLM | DeepSeek V4 Flash / 任意 OpenAI 兼容 API |

---

## 项目结构

```text
mingjian-medical-agent/
├── frontend/                    # 前端项目
│   ├── src/
│   │   ├── app/                 # Next.js App Router 页面
│   │   │   └── console/         # 审核工作台主页面
│   │   ├── components/          # UI 组件
│   │   │   ├── dashboard/       # 业务组件（表格、抽屉、弹窗、面板）
│   │   │   ├── ui/              # shadcn/ui 基础组件
│   │   │   └── dev-overlay-fix.tsx # 隐藏 Next.js dev 内部错误徽章
│   │   ├── lib/                 # API 层 + mock fallback
│   │   ├── mock/                # 本地 mock 数据
│   │   └── types/               # TypeScript 类型定义
│   └── .env.local               # NEXT_PUBLIC_API_BASE_URL
├── backend/                     # 后端项目
│   ├── app/
│   │   ├── main.py              # FastAPI 入口 + CORS
│   │   ├── config.py            # 环境变量配置
│   │   ├── routers/             # API 路由
│   │   │   ├── health.py        #   GET /health
│   │   │   ├── review_cases.py  #   GET /review-cases, /review-cases/{id}
│   │   │   ├── actions.py       #   POST /actions
│   │   │   ├── feedbacks.py     #   GET /feedbacks
│   │   │   └── agent.py         #   POST /agent/review-one, /agent/refresh-drg-cases
│   │   ├── services/            # 业务逻辑
│   │   │   ├── review_service.py
│   │   │   ├── action_service.py
│   │   │   ├── feedback_service.py
│   │   │   ├── agent_service.py  # Agent 复核主流程
│   │   │   ├── llm_client.py     # LLM API 调用
│   │   │   └── data_store.py     # JSON 文件读写
│   │   ├── schemas/             # Pydantic 模型
│   │   └── prompts/             # LLM Prompt 模板
│   ├── scripts/
│   │   └── reset_demo_data.py   # Demo 数据重置脚本
│   ├── .env.example             # 环境变量模板
│   └── requirements.txt
├── data/                        # 业务数据
│   ├── suspect_cases.json       # DRG 疑似违规清单（SC011-SC013，同步导入）
│   ├── appeal_cases.json        # 历史申诉案例库（10 条，覆盖 A/B/C 医院）
│   ├── hospital_profiles.json   # 医院画像（5 家，含 A/B/C 医院）
│   ├── review_cases.json        # Agent 复核结果（前端展示）
│   └── manual_actions.json      # 人工操作与反馈记录
└── docs/                        # 项目文档
    ├── backend/                 # 后端开发文档
    └── demo_assets/             # 演示截图
```

---

## 快速启动

### 1. 克隆项目

```bash
git clone https://github.com/OnePlus-X-code/mingjian-medical-agent.git
cd mingjian-medical-agent
```

### 2. 启动后端

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

复制环境变量模板并按需修改：

```bash
cp .env.example .env
```

启动服务：

```bash
# 开发模式（带热重载）
uvicorn app.main:app --reload --host 0.0.0.0 --port 8800

# 正式演示（不要使用 --reload，避免文件写入触发重启）
python -m uvicorn app.main:app --host 0.0.0.0 --port 8800
```

> **重要**：正式演示时不要使用 `--reload`。后端写入 `review_cases.json` 会触发 reload，导致前端紧接着的 GET 请求失败并 fallback 到 mock 数据。

> **Windows 端口说明**：如 8000 端口被 HNS 保留（`Errno 13`），可改用 8800 端口启动。

### 3. 启动前端

```bash
cd frontend
pnpm install
pnpm dev
```

前端默认访问 http://localhost:3000 ，后端 API 默认 http://localhost:8800 。

前端通过 `frontend/.env.local` 中的 `NEXT_PUBLIC_API_BASE_URL` 连接后端。后端不可用时自动 fallback 到本地 mock 数据，不会白屏。

### 4. 启用 Agent 智能复核（LLM 调用）

编辑 `backend/.env`：

```env
LLM_ENABLED=true
LLM_API_KEY=your-api-key-here
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-flash
LLM_TIMEOUT_SECONDS=20
```

- **API Key 只允许放在 `backend/.env`**，不会暴露到前端
- `LLM_ENABLED=false` 时使用规则兜底模式，无需 API Key
- LLM 调用失败时自动 fallback 到规则兜底，前端不会崩溃

### 5. Demo 数据重置

```bash
cd backend
python scripts/reset_demo_data.py
```

恢复 5 条历史反馈（MA001-MA005）、10 条基线病例（SC001-SC005 已处置、SC006-SC010 待处理）。同时清理 DRG 同步导入的 SC011+ 病例，确保每次演示从干净状态开始。

---

## 已实现 API

| Method | Path | 说明 |
|---|---|---|
| GET | `/health` | 健康检查 |
| GET | `/review-cases` | 复核案例列表（支持 status/hospital/department/keyword 筛选 + 分页） |
| GET | `/review-cases/{case_id}` | 案例详情（含 evidence_chain / matched_cases / history_actions） |
| POST | `/actions` | 提交人工动作（放行 / 打回 / 转人工） |
| GET | `/feedbacks?limit=5` | 近期人工反馈记录 |
| POST | `/agent/review-one` | Agent 智能复核（调用 LLM 或规则兜底） |
| POST | `/agent/refresh-drg-cases` | 同步 DRG 疑点病例 + Agent 自动分析（默认 limit=3） |

API 文档：http://localhost:8800/docs

---

## 演示流程

```text
1. 执行 reset_demo_data.py 恢复初始数据（10 条基线病例）
2. 启动后端（端口 8800，不使用 --reload）
3. 启动前端（端口 3000）
4. 打开 http://localhost:3000/console
5. 看到红黄绿分级复核清单（SC001-SC010）
6. 点击「同步 DRG 疑点」→ 等待 15-20 秒 → 新增 SC011/SC012/SC013（共 13 条）
   后端执行：归一化 → 匹配历史申诉案例(Top 3) → 读取医院画像 → LLM 分析 → 写入
7. 点击 SC011 行 → 查看详情抽屉
   - Agent 判断理由（引用匹配到的 appeal_id 和医院画像）
   - 证据链 5 步：DRG初筛 → 病历关键点 → 相似申诉案例匹配 → 医院画像参考 → 复核建议
   - 相似历史案例（含相似度评分、成功/驳回标记）
   - 红黄绿建议
8. 点击「Agent 复核」按钮 → LLM 重新分析该病例
9. 点击「打回」→ 弹出理由填写弹窗 → 输入理由 → 确认
10. 查看反馈面板新增记录
11. 刷新页面 → 状态仍然保留
```

---

## 开发进度

| Phase | 内容 | 状态 |
|---|---|---|
| Phase 0 | 前端端口与 API Base URL 调整 | ✅ 完成 |
| Phase 1 | FastAPI 空壳 + Health + CORS | ✅ 完成 |
| Phase 2 | JSON DataStore + Review Cases 列表与详情 | ✅ 完成 |
| Phase 3 | 人工动作 Actions + Feedbacks | ✅ 完成 |
| Phase 4 | Agent Review 规则兜底模式 | ✅ 完成 |
| Phase 5 | LLM API 调用接入 | ✅ 完成 |
| Phase 6 | 前端 Agent 复核入口集成 | ✅ 完成 |
| Phase 7 | 打回弹窗 Bug 修复 | ✅ 完成 |
| Phase 8 | DRG 疑点同步 + Agent 自动分析 + UI 小修复 | ✅ 完成 |
| Phase 9 | 技术可信度补强（案例匹配 + 医院画像 + 规则兜底） | ✅ 完成 |

---

## 环境变量

### 后端 `backend/.env`

| 变量 | 说明 | 默认值 |
|---|---|---|
| `DATA_DIR` | 数据目录路径 | `../data` |
| `FRONTEND_ORIGINS` | 允许的前端跨域来源 | `http://localhost:3000` |
| `LLM_ENABLED` | 是否启用 LLM 调用 | `false` |
| `LLM_API_KEY` | OpenAI 兼容 API Key | （空） |
| `LLM_BASE_URL` | API Base URL | （空） |
| `LLM_MODEL` | 模型名称 | （空） |
| `LLM_TIMEOUT_SECONDS` | 请求超时秒数 | `20` |

### 前端 `frontend/.env.local`

| 变量 | 说明 | 默认值 |
|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | 后端 API 地址 | `http://localhost:8800` |

> `frontend/.env.local` 只配置 `NEXT_PUBLIC_API_BASE_URL`，不允许存放 API Key。

---

## 安全说明

- API Key 仅存放在 `backend/.env`，不会暴露到前端代码
- 前端 `.env.local` 仅包含 `NEXT_PUBLIC_API_BASE_URL`
- `.gitignore` 已排除 `.env`、`.env.local`、`.venv`、`node_modules`、`.next`
- LLM 调用错误信息中 API Key 会被替换为 `***REDACTED***`

---

## 项目价值

明鉴的核心价值不在于替代人工审核，而在于帮助医保审核人员：

- 从海量疑点中**快速定位高风险案例**
- **减少合理医疗行为被规则误伤**
- 降低医院反复申诉成本
- **沉淀历史审核经验**
- 形成可解释、可追溯、可持续优化的智能复核流程
