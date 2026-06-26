# 明鉴 · 医保监管智能体 — 后端

Demo 级 FastAPI 后端，为前端 `/console` 控制台提供 API。

## 启动方式

```bash
cd backend
python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt

# 开发模式（带热重载）
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8800

# 正式演示（不要使用 --reload，避免文件写入触发重启）
python -m uvicorn app.main:app --host 0.0.0.0 --port 8800
```

> **重要**：正式演示时不要使用 `--reload`。后端写入 `review_cases.json` 会触发 reload，
> 导致前端紧接着的 GET 请求失败并 fallback 到 mock 数据。

> **Windows 端口说明**：如果 8000 端口被 Windows HNS 保留（报错 `Errno 13`），
> 可改用其他端口启动，例如 `--port 8800`，并在前端 `.env.local` 中设置
> `NEXT_PUBLIC_API_BASE_URL=http://localhost:8800`。
> 释放 8000 端口需以管理员身份执行 `net stop winnat && net start winnat`。

## 访问地址

- 后端服务：http://localhost:8800
- API 文档：http://localhost:8800/docs
- 健康检查：http://localhost:8800/health

## LLM 配置（Agent 智能复核）

### 启用真实 LLM 调用

若要启用真实 Agent 调用，需要在 `backend/.env` 中设置：

```env
LLM_ENABLED=true
LLM_API_KEY=your-api-key-here
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-flash
LLM_TIMEOUT_SECONDS=20
```

- **API Key 只允许放在 `backend/.env`**，不允许出现在前端代码中
- 前端 `frontend/.env.local` 只放 `NEXT_PUBLIC_API_BASE_URL`
- `LLM_ENABLED=false` 时使用规则兜底模式，无需配置 API Key
- 如果 LLM 调用失败（网络错误、超时、返回格式错误），自动 fallback 到规则兜底

### 环境变量说明

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `DATA_DIR` | 数据目录路径（相对于 backend/） | `../data` |
| `FRONTEND_ORIGINS` | 允许的前端跨域来源（逗号分隔） | `http://localhost:3000,...` |
| `LLM_ENABLED` | 是否启用 LLM 调用 | `false` |
| `LLM_API_KEY` | OpenAI 兼容 API Key | （空） |
| `LLM_BASE_URL` | API Base URL | （空） |
| `LLM_MODEL` | 模型名称 | （空） |
| `LLM_TIMEOUT_SECONDS` | 请求超时秒数 | `20` |

复制 `.env.example` 为 `.env` 并按需修改：

```bash
cp .env.example .env
```

## 已实现接口

| Method | Path | 说明 |
| --- | --- | --- |
| GET | `/health` | 健康检查 |
| GET | `/review-cases` | 获取复核案例列表（支持 status/hospital/department/keyword 筛选 + 分页） |
| GET | `/review-cases/{case_id}` | 获取单条案例详情（含 evidence_chain / matched_cases / history_actions） |
| POST | `/actions` | 提交人工动作（放行 / 打回 / 转人工） |
| GET | `/feedbacks?limit=5` | 获取近期人工反馈记录 |
| POST | `/agent/review-one` | Agent 智能复核（调用 LLM 或规则兜底） |
| POST | `/agent/refresh-drg-cases` | 同步 DRG 疑点病例 + Agent 自动分析（默认 limit=3，每条独立 fallback） |

## Demo 数据重置

如需恢复 demo 数据基线（MA001-MA005，SC006-SC010 恢复为 pending，清理 DRG 同步导入的 SC011+ 病例）：

```bash
cd backend
python scripts/reset_demo_data.py
```

此脚本不会修改 `appeal_cases.json`、`hospital_profiles.json`、`suspect_cases.json`，这三份数据在 reset 后保持不变。

## Agent 分析流水线

点击「同步 DRG 疑点」时，后端执行五阶段分析：

1. **数据归一化**：`normalize_suspect_case()` 将 DRG 疑点转换为统一 ReviewCase 格式
2. **相似申诉案例匹配**：`_match_appeal_cases()` 使用 7 维加权评分（同医院/同科室/诊断关键词/项目关键词/命中规则/risk_reason 重合/成功申诉），取 Top 3，归一化到 0~1
3. **医院画像读取**：`_get_hospital_profile()` 匹配医院等级、风险等级、历史违规次数、申诉成功率
4. **LLM 智能分析**：将 case_brief + matched_cases + hospital_profile 注入 Prompt，调用 LLM 生成结构化 JSON（light_status / confidence / suggested_action / agent_reason / evidence_chain）
5. **规则兜底**：LLM 不可用时，基于 matched_cases 成功/失败比例 + 高风险关键词 + 医院画像动态生成结果，不依赖预写值

证据链包含 5 步：DRG初筛 → 病历关键点 → 相似申诉案例匹配 → 医院画像参考 → 复核建议生成。

## 数据源

后端读取根目录 `data/` 目录下的 JSON 文件：

- `data/review_cases.json` — 病例列表与详情
- `data/manual_actions.json` — 人工动作记录（用于详情中的 history_actions）
- `data/suspect_cases.json` — DRG 疑似违规病例（SC011-SC013，用于「同步 DRG 疑点」演示）
- `data/appeal_cases.json` — 历史申诉案例库（10 条，覆盖 A/B/C 医院和心内科/骨科/肿瘤科）
- `data/hospital_profiles.json` — 医院画像（5 家，含 A/B/C 医院的等级、风险等级、违规次数、申诉成功率）
