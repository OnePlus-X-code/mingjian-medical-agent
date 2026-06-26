# 05 Dev Tasks

## 1. 开发原则

本文件用于指导 AI IDE / TRAE 分阶段实现「明鉴 · 医保监管智能体」Demo 级后端。

后端目标不是构建完整医保信息系统，而是为当前前端 `/console` 页面提供可运行的真实 API。

开发时必须遵守：

1. 分阶段开发，不要一次性改完整个项目。
2. 每个 Phase 完成后先本地验证，再进入下一阶段。
3. 后端优先跑通，再考虑前端体验增强。
4. 不引入数据库。
5. 不引入登录系统。
6. 不接真实医保数据。
7. 不破坏前端现有 mock fallback。
8. 不破坏当前 UI。
9. 不暴露大模型 API Key 到前端。
10. 所有接口统一返回 `{ success, data, message }`。

---

## 2. 当前项目状态

当前分支：

```txt
feature/frontend-ui
```

当前前端：

```txt
frontend/
```

当前前端控制台页面：

```txt
frontend/src/app/console/page.tsx
```

当前前端 API service：

```txt
frontend/src/lib/api.ts
```

当前前端类型定义：

```txt
frontend/src/types/review.ts
```

当前后端：

```txt
backend/ 不存在，需要从零创建
```

根目录数据源：

```txt
data/review_cases.json
data/manual_actions.json
data/suspect_cases.json
data/appeal_cases.json
data/hospital_profiles.json
```

---

## 3. 端口约定

本项目本地开发统一使用：

```txt
前端：http://localhost:3000
后端：http://localhost:8000
```

如果前端当前端口不是 3000，需要在 Phase 0 中调整。

---

# Phase 0：前端端口与 API Base URL 调整

## 目标

统一本地开发端口，并确保前端请求后端时可配置 API Base URL。

## 需要检查的文件

```txt
frontend/package.json
frontend/src/lib/api.ts
frontend/.env.example
README.md
frontend/README.md
```

## 任务 0.1：前端端口改为 3000

检查 `frontend/package.json`。

如果当前是：

```json
"dev": "next dev -p 3010"
```

改为：

```json
"dev": "next dev -p 3000"
```

或者：

```json
"dev": "next dev"
```

推荐明确写成：

```json
"dev": "next dev -p 3000"
```

## 任务 0.2：API Base URL 支持环境变量

检查：

```txt
frontend/src/lib/api.ts
```

将硬编码：

```ts
const API_BASE_URL = "http://localhost:8000";
```

改为：

```ts
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
```

要求：

1. 保持现有函数签名不变。
2. 保持 mock fallback 不变。
3. 不要重构整个 api.ts。
4. 不要改变后端接口路径。
5. 不要引入新的请求库。

## 任务 0.3：新增或更新 frontend/.env.example

如果不存在，则创建：

```txt
frontend/.env.example
```

内容：

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

## 任务 0.4：更新 README 端口说明

如果 README 或 frontend/README 中仍写 `localhost:3010`，改为：

```txt
http://localhost:3000
```

## Phase 0 验收

运行：

```bash
cd frontend
pnpm dev
```

浏览器访问：

```txt
http://localhost:3000
http://localhost:3000/console
```

确认：

1. 前端能正常启动。
2. 首页能打开。
3. console 能打开。
4. 后端未启动时，前端仍能通过 mock fallback 正常显示数据。
5. 浏览器控制台没有因为 API base URL 修改导致的新错误。

---

# Phase 1：FastAPI 空壳 + Health + CORS

## 目标

创建最小后端项目，确保后端服务能启动，前端可以跨域访问。

## 新增目录结构

创建：

```txt
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── routers/
│   │   ├── __init__.py
│   │   └── health.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── common.py
│   └── services/
│       └── __init__.py
├── requirements.txt
├── .env.example
└── README.md
```

## 任务 1.1：requirements.txt

内容至少包括：

```txt
fastapi
uvicorn[standard]
pydantic
python-dotenv
```

如果计划在 Phase 5 接入 OpenAI-compatible API，可以先加入：

```txt
openai
```

但此阶段不需要实际调用模型。

## 任务 1.2：config.py

定义基础配置：

```txt
APP_NAME
DATA_DIR
FRONTEND_ORIGINS
LLM_ENABLED
LLM_API_KEY
LLM_BASE_URL
LLM_MODEL
LLM_TIMEOUT_SECONDS
```

注意：

1. 默认前端 origin 包含 `http://localhost:3000`。
2. 默认后端读取根目录 `data/`。
3. `LLM_ENABLED` 默认 `false`。
4. 不要打印 API Key。

## 任务 1.3：common.py

定义统一响应结构。

推荐 Pydantic 模型：

```python
class ApiResponse(BaseModel):
    success: bool
    data: Any = None
    message: str = "ok"
```

也可以使用简单 helper 函数返回 dict。

## 任务 1.4：health.py

实现：

```http
GET /health
```

返回：

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "mingjian-medical-agent-backend"
  },
  "message": "ok"
}
```

## 任务 1.5：main.py

创建 FastAPI app：

1. 注册 CORS。
2. 允许：

   * `http://localhost:3000`
   * `http://127.0.0.1:3000`
3. 注册 health router。
4. 设置基础 title。

## 任务 1.6：backend/.env.example

内容：

```env
DATA_DIR=../data

LLM_ENABLED=false
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL=
LLM_TIMEOUT_SECONDS=20
```

## 任务 1.7：backend/README.md

写入启动方式：

```bash
cd backend
python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Phase 1 验收

启动后端：

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

测试：

```bash
curl http://localhost:8000/health
```

预期返回：

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "mingjian-medical-agent-backend"
  },
  "message": "ok"
}
```

---

# Phase 2：JSON DataStore + Review Cases 列表与详情

## 目标

实现病例列表和病例详情接口，让前端 `/console` 可以从真实后端读取病例数据。

## 新增 / 修改文件

```txt
backend/app/services/data_store.py
backend/app/services/review_service.py
backend/app/schemas/review.py
backend/app/routers/review_cases.py
backend/app/main.py
```

## 任务 2.1：DataStore

`data_store.py` 负责统一读写 JSON。

需要支持：

```txt
read_json(filename)
write_json(filename, data)
get_data_path(filename)
```

要求：

1. 从根目录 `data/` 读取。
2. 使用 UTF-8。
3. 写入时 `ensure_ascii=False`。
4. 写入时缩进格式化。
5. 文件不存在时抛出明确异常。
6. JSON 解析失败时抛出明确异常。
7. 不读取 `frontend/src/mock/`。
8. 不写入 `frontend/src/mock/`。

## 任务 2.2：ReviewCase Schema

在 `schemas/review.py` 中定义：

```txt
ReviewCase
MatchedCase
EvidenceItem
```

字段必须对齐：

```txt
frontend/src/types/review.ts
```

重点字段：

```txt
case_id
hospital_name
department
procedure_or_item
main_diagnosis
cost
trigger_rule
light_status
confidence
suggested_action
current_status
reviewed_at
drg_group
risk_reason
patient_summary
agent_reason
matched_cases
evidence_chain
history_actions
```

## 任务 2.3：ReviewService

实现：

```txt
list_review_cases(status, hospital, department, keyword, page, page_size)
get_review_case_by_id(case_id)
```

列表逻辑：

1. 读取 `data/review_cases.json`。
2. 支持筛选：

   * `status=green/yellow/red` 按 `light_status`。
   * `status=pending/approved/rejected/manual_review` 按 `current_status`。
   * `hospital` 按 `hospital_name`。
   * `department` 按 `department`。
   * `keyword` 在多个文本字段中模糊搜索。
3. 支持分页。
4. 返回：

   * `total`
   * `page`
   * `page_size`
   * `items`

详情逻辑：

1. 按 `case_id` 查找病例。
2. 从 `data/manual_actions.json` 中按 `case_id` 关联 `history_actions`。
3. 返回完整 `ReviewCase`。
4. 找不到返回 404。

## 任务 2.4：review_cases.py Router

实现：

```http
GET /review-cases
GET /review-cases/{case_id}
```

## Phase 2 验收

启动后端后测试：

```bash
curl http://localhost:8000/review-cases
curl http://localhost:8000/review-cases/SC001
curl "http://localhost:8000/review-cases?status=green"
curl "http://localhost:8000/review-cases?keyword=支架"
```

预期：

1. `/review-cases` 返回病例列表。
2. `/review-cases/SC001` 返回完整详情。
3. 详情中包含：

   * `agent_reason`
   * `matched_cases`
   * `evidence_chain`
   * `history_actions`
4. 前端 `/console` Network 中能看到请求 `localhost:8000/review-cases` 成功。
5. 后端启动时，前端不再只依赖 mock fallback。

---

# Phase 3：人工动作 Actions + Feedbacks

## 目标

实现人工放行、打回、转人工动作，并将结果写入 JSON，使刷新后状态保留。

## 新增 / 修改文件

```txt
backend/app/schemas/action.py
backend/app/services/feedback_service.py
backend/app/routers/actions.py
backend/app/routers/feedbacks.py
backend/app/main.py
```

## 任务 3.1：Action Schema

定义：

```txt
SubmitActionPayload
ManualAction
```

字段必须对齐前端：

```txt
case_id
agent_status
human_action
human_reason
operator
```

ManualAction 返回字段：

```txt
action_id
case_id
hospital_name
department
agent_status
human_action
human_reason
operator
created_at
is_agent_accepted
```

## 任务 3.2：POST /actions

实现：

```http
POST /actions
```

请求体：

```json
{
  "case_id": "SC001",
  "agent_status": "green",
  "human_action": "reject",
  "human_reason": "病历依据不足，需要医院补充说明。",
  "operator": "医保审核员01"
}
```

业务规则：

1. `case_id` 必须存在。
2. `human_action` 必须是：

   * `approve`
   * `reject`
   * `manual_review`
3. 如果 `agent_status=green` 且 `human_action=reject`，`human_reason` 必填。
4. 新增一条记录到 `data/manual_actions.json`。
5. 更新 `data/review_cases.json` 中对应病例 `current_status`。
6. 返回新增动作。
7. 生成新的 `action_id`，格式 `MA001`、`MA002`。
8. `created_at` 使用 `YYYY-MM-DD HH:mm:ss`。
9. `is_agent_accepted = human_action === suggested_action`。

current_status 映射：

```txt
approve       → approved
reject        → rejected
manual_review → manual_review
```

## 任务 3.3：GET /feedbacks

实现：

```http
GET /feedbacks?limit=5
```

逻辑：

1. 读取 `data/manual_actions.json`。
2. 按 `created_at` 倒序。
3. 默认 `limit=5`。
4. 返回：

```json
{
  "success": true,
  "data": {
    "items": []
  },
  "message": "ok"
}
```

## Phase 3 验收

测试放行：

```bash
curl -X POST http://localhost:8000/actions \
  -H "Content-Type: application/json" \
  -d "{\"case_id\":\"SC001\",\"agent_status\":\"green\",\"human_action\":\"approve\",\"operator\":\"医保审核员01\"}"
```

测试绿灯打回但无理由：

```bash
curl -X POST http://localhost:8000/actions \
  -H "Content-Type: application/json" \
  -d "{\"case_id\":\"SC001\",\"agent_status\":\"green\",\"human_action\":\"reject\",\"operator\":\"医保审核员01\"}"
```

预期返回 400。

测试绿灯打回并填写理由：

```bash
curl -X POST http://localhost:8000/actions \
  -H "Content-Type: application/json" \
  -d "{\"case_id\":\"SC001\",\"agent_status\":\"green\",\"human_action\":\"reject\",\"human_reason\":\"病历依据不足，需要医院补充说明。\",\"operator\":\"医保审核员01\"}"
```

测试反馈：

```bash
curl "http://localhost:8000/feedbacks?limit=5"
```

前端验收：

1. 点击放行后，状态更新为已放行。
2. 点击打回后，状态更新为已打回。
3. 绿灯案例打回时必须填写理由。
4. 点击转人工后，状态更新为人工复核。
5. 刷新页面后状态仍保留。
6. 近期反馈中出现新增动作。

---

# Phase 4：Agent Review 规则兜底模式

## 目标

实现 `POST /agent/review-one` 的稳定规则兜底模式，不依赖大模型。

## 新增 / 修改文件

```txt
backend/app/services/agent_service.py
backend/app/routers/agent.py
backend/app/main.py
```

## 任务 4.1：读取输入病例

`AgentService.review_one(case_id)` 按顺序查找：

1. `data/suspect_cases.json`
2. `data/review_cases.json`

如果都找不到，返回 404。

## 任务 4.2：匹配历史申诉案例

从：

```txt
data/appeal_cases.json
```

中匹配 Top 3。

推荐轻量打分：

```txt
同医院：+10
同科室：+20
诊断关键词重合：+30
项目 / 耗材关键词重合：+30
命中规则相似：+20
历史申诉成功：+10
```

输出：

```txt
matched_cases: MatchedCase[]
```

每条包含：

```txt
appeal_id
similarity
case_type
review_result
summary
```

## 任务 4.3：读取医院画像

从：

```txt
data/hospital_profiles.json
```

读取对应医院 / 科室画像。

如果找不到，不报错，继续使用空画像。

## 任务 4.4：规则兜底生成红黄绿

规则：

### green / approve

条件倾向：

```txt
最高相似度 >= 0.75
且成功申诉案例较多
```

输出：

```txt
light_status = green
suggested_action = approve
confidence = 0.85 ~ 0.95
```

### yellow / manual_review

条件倾向：

```txt
相似度中等
证据不足
历史结果分化
```

输出：

```txt
light_status = yellow
suggested_action = manual_review
confidence = 0.55 ~ 0.75
```

### red / reject

条件倾向：

```txt
匹配到历史打回案例
或诊疗项目与诊断缺乏明显关联
或规则风险明显
```

输出：

```txt
light_status = red
suggested_action = reject
confidence = 0.80 ~ 0.95
```

## 任务 4.5：生成证据链

至少生成 4 个步骤：

```txt
DRG初筛命中
病历关键点提取
历史申诉案例匹配
复核建议生成
```

每个 EvidenceItem 包含：

```txt
step
content
source
```

## 任务 4.6：写回 review_cases.json

如果病例已存在：

更新：

```txt
light_status
confidence
suggested_action
agent_reason
matched_cases
evidence_chain
reviewed_at
```

保留：

```txt
current_status
```

如果病例不存在：

新增一条，`current_status = pending`。

## 任务 4.7：实现 Router

实现：

```http
POST /agent/review-one
```

请求体：

```json
{
  "case_id": "SC001"
}
```

返回完整 ReviewCase。

## Phase 4 验收

测试：

```bash
curl -X POST http://localhost:8000/agent/review-one \
  -H "Content-Type: application/json" \
  -d "{\"case_id\":\"SC001\"}"
```

预期：

1. 返回 `success: true`。
2. 返回完整 ReviewCase。
3. 包含：

   * `light_status`
   * `confidence`
   * `suggested_action`
   * `agent_reason`
   * `matched_cases`
   * `evidence_chain`
4. 写回 `data/review_cases.json`。
5. 再次请求 `/review-cases/SC001` 时可以看到更新后的 Agent 结果。

---

# Phase 5：LLM API 调用接入

## 目标

在规则兜底稳定可用后，接入可选大模型 API 调用。

注意：本阶段是增强项，不影响 Demo 基础可运行性。

## 新增 / 修改文件

```txt
backend/app/services/llm_client.py
backend/app/prompts/review_case_prompt.md
backend/app/services/agent_service.py
backend/.env.example
backend/requirements.txt
```

## 任务 5.1：环境变量

`.env.example` 应包含：

```env
LLM_ENABLED=false
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL=
LLM_TIMEOUT_SECONDS=20
```

## 任务 5.2：llm_client.py

实现 OpenAI-compatible 调用封装。

职责：

```txt
读取 LLM 配置
构造 client
发送 prompt
获取模型输出
处理超时
处理异常
返回文本或 JSON
```

要求：

1. 不打印 API Key。
2. 请求失败时抛出明确异常。
3. 超时时抛出明确异常。
4. 返回空内容时抛出明确异常。

## 任务 5.3：review_case_prompt.md

新增 Prompt 模板。

要求模型只输出 JSON：

```json
{
  "light_status": "green | yellow | red",
  "confidence": 0.0,
  "suggested_action": "approve | reject | manual_review",
  "agent_reason": "string",
  "evidence_chain": [
    {
      "step": "string",
      "content": "string",
      "source": "string"
    }
  ]
}
```

## 任务 5.4：AgentService 集成 LLM

逻辑：

```txt
if LLM_ENABLED=true and config 完整:
    try:
        调用 LLM
        解析 JSON
        校验字段
        使用 LLM 结果
    except:
        fallback 到规则结果
else:
    使用规则结果
```

必须 fallback 的情况：

```txt
LLM_ENABLED=false
API Key 缺失
Base URL 缺失
Model 缺失
请求超时
请求失败
返回空
返回非 JSON
枚举值非法
必要字段缺失
```

## 任务 5.5：返回 message 标识

如果使用 LLM：

```txt
message = "agent review completed by llm"
```

如果 fallback：

```txt
message = "agent review completed by fallback rules"
```

## Phase 5 验收

默认：

```env
LLM_ENABLED=false
```

测试 `/agent/review-one` 必须稳定成功。

启用：

```env
LLM_ENABLED=true
LLM_API_KEY=...
LLM_BASE_URL=...
LLM_MODEL=...
```

测试：

```bash
curl -X POST http://localhost:8000/agent/review-one \
  -H "Content-Type: application/json" \
  -d "{\"case_id\":\"SC001\"}"
```

预期：

1. 配置正确时，能调用模型。
2. 模型失败时自动 fallback。
3. 前端不崩溃。
4. API Key 不出现在日志中。
5. 返回结构仍是 ReviewCase。

---

# Phase 6：前后端联调与体验增强

## 目标

确认后端真实 API 已支撑前端 `/console` 的全部功能，并在时间允许时优化“点击整行展示详情”的产品体验。

## 任务 6.1：前后端同时启动

后端：

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

前端：

```bash
cd frontend
pnpm dev
```

访问：

```txt
http://localhost:3000/console
```

## 任务 6.2：Network 检查

在浏览器 DevTools Network 中确认：

```txt
GET http://localhost:8000/review-cases
GET http://localhost:8000/review-cases/SC001
POST http://localhost:8000/actions
GET http://localhost:8000/feedbacks
```

至少前三个必须成功。

## 任务 6.3：保留 mock fallback

必须确认：

1. 后端启动时，前端优先请求后端。
2. 后端关闭时，前端仍 fallback 到 mock。
3. 不要删除 `frontend/src/mock/`。
4. 不要删除 api.ts 中现有 fallback 逻辑。

## 任务 6.4：行点击详情展示

当前前端已实现：

```txt
点击整行 → 右侧 Sheet 抽屉 → 展示详情
```

产品期望增强为：

```txt
点击整行 → 当前行下方展开内嵌详情面板
```

优先级：

1. 后端联调优先。
2. 如果时间充足，再做行内展开。
3. 如果担心破坏当前 UI，不要改，保留右侧 Sheet。

如果实现行内展开，需要：

1. 同一时间只展开一个病例。
2. 展开内容跨越整张表。
3. 展示：

   * Agent 判断理由
   * 证据链
   * 相似历史申诉案例
   * 历史人工动作
   * 病例摘要
4. 操作按钮必须 `stopPropagation()`。
5. 不破坏放行 / 打回 / 转人工动作。

## 任务 6.5：最终自测

自测内容见：

```txt
docs/backend/06_acceptance_checklist.md
```

---

# Phase 7：收尾与提交前检查

## 目标

确保项目可提交、可演示、可被队友启动。

## 任务 7.1：检查 Git 状态

```bash
git status
```

确认：

1. 没有提交 `.env`。
2. 没有提交 `.venv`。
3. 没有提交 `node_modules`。
4. 没有提交 `.next`。
5. 没有提交无关缓存。

## 任务 7.2：检查 README

确保 README 至少说明：

```txt
前端启动方式
后端启动方式
前端端口 3000
后端端口 8000
LLM_ENABLED=false 稳定模式
LLM_ENABLED=true 模型模式
```

## 任务 7.3：输出变更报告

完成开发后输出：

```txt
一、新增文件
二、修改文件
三、已实现接口
四、数据读写说明
五、Agent 复核说明
六、前端联调说明
七、本地测试结果
八、未完成事项
九、下一步建议
```

---

## 4. 禁止事项

开发过程中不要：

1. 不要删除前端 mock 数据。
2. 不要删除 fallback 逻辑。
3. 不要引入数据库。
4. 不要引入登录。
5. 不要引入 Supabase。
6. 不要接真实医保数据。
7. 不要把 LLM API Key 写进代码。
8. 不要把 LLM API Key 写进前端。
9. 不要大改现有 UI。
10. 不要改 API 路径为 `/api/...`。
11. 不要提交 `.env`。
12. 不要提交 `.venv`。
13. 不要自动 merge 到 main。
14. 不要修改 GitHub 远程配置。

---

## 5. 推荐执行顺序

推荐给 AI IDE 的执行方式：

```txt
第一次执行：Phase 0 + Phase 1
第二次执行：Phase 2
第三次执行：Phase 3
第四次执行：Phase 4
第五次执行：Phase 5
第六次执行：Phase 6 + Phase 7
```

如果时间非常紧，最低可交付版本是：

```txt
Phase 0
Phase 1
Phase 2
Phase 3
Phase 4 的规则兜底模式
```

Phase 5 的 LLM API 接入是增强项，不是最低可交付要求。
