# 06 Acceptance Checklist

## 1. 验收目标

本文档用于确认「明鉴 · 医保监管智能体」Demo 级后端是否已经满足黑客松展示要求。

验收重点不是生产级稳定性，而是确认以下链路可运行：

```txt
前端 console
→ 后端 API
→ data/*.json
→ Agent 复核结果
→ 证据链展示
→ 人工动作写入
→ 刷新后状态保留
```

---

## 2. 基础环境检查

### 2.1 Git 状态

运行：

```bash
git status
```

检查：

```txt
[ ] 当前分支正确
[ ] 工作区无异常冲突
[ ] 没有误提交 .env
[ ] 没有误提交 .venv
[ ] 没有误提交 node_modules
[ ] 没有误提交 .next
[ ] 没有误提交无关缓存文件
```

---

### 2.2 前端端口检查

运行：

```bash
cd frontend
pnpm dev
```

访问：

```txt
http://localhost:3000
http://localhost:3000/console
```

检查：

```txt
[ ] 前端运行在 localhost:3000
[ ] 首页可以打开
[ ] console 页面可以打开
[ ] 页面没有明显样式崩坏
[ ] 页面没有白屏
[ ] 后端未启动时，前端仍可以 fallback 到 mock 数据
```

---

### 2.3 后端端口检查

运行：

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

检查：

```txt
[ ] 后端运行在 localhost:8000
[ ] 启动无报错
[ ] 控制台没有 JSON 解析错误
[ ] 控制台没有 data 文件路径错误
[ ] CORS 配置包含 localhost:3000
```

---

## 3. 后端接口验收

### 3.1 GET /health

运行：

```bash
curl http://localhost:8000/health
```

预期：

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

检查：

```txt
[ ] HTTP 状态码为 200
[ ] success = true
[ ] data.status = ok
[ ] service 名称正确
```

---

### 3.2 GET /review-cases

运行：

```bash
curl http://localhost:8000/review-cases
```

检查：

```txt
[ ] HTTP 状态码为 200
[ ] success = true
[ ] data.total 存在
[ ] data.page 存在
[ ] data.page_size 存在
[ ] data.items 是数组
[ ] 至少返回 1 条病例
```

每条病例至少包含：

```txt
[ ] case_id
[ ] hospital_name
[ ] department
[ ] procedure_or_item
[ ] main_diagnosis
[ ] cost
[ ] trigger_rule
[ ] light_status
[ ] confidence
[ ] suggested_action
[ ] current_status
```

字段枚举检查：

```txt
[ ] light_status 只出现 green / yellow / red
[ ] suggested_action 只出现 approve / reject / manual_review
[ ] current_status 只出现 pending / approved / rejected / manual_review
[ ] confidence 是 0 到 1 之间的数字
```

---

### 3.3 GET /review-cases/{case_id}

运行：

```bash
curl http://localhost:8000/review-cases/SC001
```

检查：

```txt
[ ] HTTP 状态码为 200
[ ] success = true
[ ] data.case_id = SC001
[ ] 包含 agent_reason
[ ] 包含 matched_cases
[ ] 包含 evidence_chain
[ ] 包含 history_actions
[ ] 包含 patient_summary
[ ] 包含 risk_reason
[ ] 包含 drg_group
```

`matched_cases` 每条应包含：

```txt
[ ] appeal_id
[ ] similarity
[ ] case_type
[ ] review_result
[ ] summary
```

`evidence_chain` 每条应包含：

```txt
[ ] step
[ ] content
[ ] source
```

`history_actions` 每条应包含：

```txt
[ ] action_id
[ ] case_id
[ ] hospital_name
[ ] department
[ ] agent_status
[ ] human_action
[ ] operator
[ ] created_at
[ ] is_agent_accepted
```

---

### 3.4 病例不存在测试

运行：

```bash
curl http://localhost:8000/review-cases/NOT_EXIST
```

预期：

```txt
[ ] HTTP 状态码为 404
[ ] success = false
[ ] data = null
[ ] message 包含 case not found
```

---

### 3.5 筛选测试

运行：

```bash
curl "http://localhost:8000/review-cases?status=green"
curl "http://localhost:8000/review-cases?status=pending"
curl "http://localhost:8000/review-cases?hospital=A医院"
curl "http://localhost:8000/review-cases?department=心内科"
curl "http://localhost:8000/review-cases?keyword=支架"
```

检查：

```txt
[ ] status=green 时，返回病例 light_status 均为 green
[ ] status=pending 时，返回病例 current_status 均为 pending
[ ] hospital=A医院 时，返回病例 hospital_name 均包含 A医院
[ ] department=心内科 时，返回病例 department 均包含 心内科
[ ] keyword=支架 时，返回结果与关键词相关
[ ] 空结果时也返回 success=true，items=[]
```

---

### 3.6 POST /actions：放行

运行：

```bash
curl -X POST http://localhost:8000/actions \
  -H "Content-Type: application/json" \
  -d "{\"case_id\":\"SC001\",\"agent_status\":\"green\",\"human_action\":\"approve\",\"operator\":\"医保审核员01\"}"
```

检查：

```txt
[ ] HTTP 状态码为 200
[ ] success = true
[ ] 返回 action_id
[ ] human_action = approve
[ ] is_agent_accepted 正确
[ ] data/manual_actions.json 新增记录
[ ] data/review_cases.json 中 SC001 current_status 更新为 approved
```

再次运行：

```bash
curl http://localhost:8000/review-cases/SC001
```

检查：

```txt
[ ] current_status = approved
[ ] history_actions 中包含刚才新增动作
```

---

### 3.7 POST /actions：绿灯打回无理由

运行：

```bash
curl -X POST http://localhost:8000/actions \
  -H "Content-Type: application/json" \
  -d "{\"case_id\":\"SC001\",\"agent_status\":\"green\",\"human_action\":\"reject\",\"operator\":\"医保审核员01\"}"
```

预期：

```txt
[ ] HTTP 状态码为 400
[ ] success = false
[ ] data = null
[ ] message 提示 human_reason 必填
[ ] manual_actions.json 没有新增无效记录
```

---

### 3.8 POST /actions：绿灯打回有理由

运行：

```bash
curl -X POST http://localhost:8000/actions \
  -H "Content-Type: application/json" \
  -d "{\"case_id\":\"SC001\",\"agent_status\":\"green\",\"human_action\":\"reject\",\"human_reason\":\"病历依据不足，需要医院补充说明。\",\"operator\":\"医保审核员01\"}"
```

检查：

```txt
[ ] HTTP 状态码为 200
[ ] success = true
[ ] 返回 action_id
[ ] human_action = reject
[ ] human_reason 被保存
[ ] data/review_cases.json 中 SC001 current_status 更新为 rejected
[ ] is_agent_accepted 根据 suggested_action 正确计算
```

---

### 3.9 POST /actions：转人工

运行：

```bash
curl -X POST http://localhost:8000/actions \
  -H "Content-Type: application/json" \
  -d "{\"case_id\":\"SC003\",\"agent_status\":\"yellow\",\"human_action\":\"manual_review\",\"operator\":\"医保审核员01\"}"
```

检查：

```txt
[ ] HTTP 状态码为 200
[ ] success = true
[ ] human_action = manual_review
[ ] current_status 更新为 manual_review
[ ] manual_actions.json 新增记录
```

---

### 3.10 GET /feedbacks

运行：

```bash
curl "http://localhost:8000/feedbacks?limit=5"
```

检查：

```txt
[ ] HTTP 状态码为 200
[ ] success = true
[ ] data.items 是数组
[ ] 最多返回 5 条
[ ] 按 created_at 倒序排列
[ ] 新增动作出现在靠前位置
```

每条反馈包含：

```txt
[ ] action_id
[ ] case_id
[ ] hospital_name
[ ] department
[ ] agent_status
[ ] human_action
[ ] human_reason 可选
[ ] operator
[ ] created_at
[ ] is_agent_accepted
```

---

### 3.11 POST /agent/review-one：规则兜底模式

确认 `.env` 或默认配置：

```env
LLM_ENABLED=false
```

运行：

```bash
curl -X POST http://localhost:8000/agent/review-one \
  -H "Content-Type: application/json" \
  -d "{\"case_id\":\"SC001\"}"
```

检查：

```txt
[ ] HTTP 状态码为 200
[ ] success = true
[ ] 返回完整 ReviewCase
[ ] 包含 light_status
[ ] 包含 confidence
[ ] 包含 suggested_action
[ ] 包含 agent_reason
[ ] 包含 matched_cases
[ ] 包含 evidence_chain
[ ] message 表示 fallback rules 或 agent review completed
[ ] data/review_cases.json 被写回
```

再次运行：

```bash
curl http://localhost:8000/review-cases/SC001
```

检查：

```txt
[ ] 能看到刚刚 Agent 复核写回的结果
```

---

### 3.12 POST /agent/review-one：病例不存在

运行：

```bash
curl -X POST http://localhost:8000/agent/review-one \
  -H "Content-Type: application/json" \
  -d "{\"case_id\":\"NOT_EXIST\"}"
```

预期：

```txt
[ ] HTTP 状态码为 404
[ ] success = false
[ ] data = null
[ ] message 包含 case not found
```

---

### 3.13 GET /dashboard/summary

该接口可选。

如果已实现，运行：

```bash
curl http://localhost:8000/dashboard/summary
```

检查：

```txt
[ ] HTTP 状态码为 200
[ ] success = true
[ ] 包含 total_pending
[ ] 包含 suggest_approve
[ ] 包含 suggest_manual
[ ] 包含 suggest_reject
[ ] 包含 last_updated
```

---

## 4. 前后端联调验收

### 4.1 同时启动

终端 1：

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

终端 2：

```bash
cd frontend
pnpm dev
```

浏览器访问：

```txt
http://localhost:3000/console
```

检查：

```txt
[ ] 页面可以正常打开
[ ] 顶部统计卡片显示正常
[ ] 筛选栏显示正常
[ ] 病例表格显示正常
[ ] 操作按钮显示正常
[ ] 最近反馈面板显示正常
```

---

### 4.2 Network 请求检查

打开浏览器 DevTools → Network。

刷新 `/console`。

检查：

```txt
[ ] GET http://localhost:8000/review-cases 成功
[ ] GET http://localhost:8000/feedbacks 成功
[ ] 没有 CORS 错误
[ ] 没有 500 错误
[ ] 没有 fetch failed 导致的异常弹窗
```

点击 `SC001` 行后检查：

```txt
[ ] GET http://localhost:8000/review-cases/SC001 成功
```

点击动作按钮后检查：

```txt
[ ] POST http://localhost:8000/actions 成功
```

---

### 4.3 病例表格验收

检查表格列：

```txt
[ ] 案例 ID 显示正常
[ ] 医院 / 科室显示正常
[ ] 项目 / 处方显示正常
[ ] 命中规则显示正常
[ ] 金额显示正常
[ ] 置信度显示正常
[ ] Agent 建议显示正常
[ ] 当前状态显示正常
[ ] 操作按钮显示正常
```

状态颜色：

```txt
[ ] green / 建议放行 显示为绿色
[ ] yellow / 建议人工 显示为黄色
[ ] red / 建议打回 显示为红色
```

---

### 4.4 点击整行详情验收

点击病例行。

如果保持右侧 Sheet 抽屉，检查：

```txt
[ ] 点击整行可以打开详情抽屉
[ ] 抽屉中显示 Agent 判断理由
[ ] 抽屉中显示证据链
[ ] 抽屉中显示相似历史申诉案例
[ ] 抽屉中显示病例摘要
[ ] 抽屉中显示历史人工动作
[ ] 抽屉中操作按钮可用
```

如果已改成行内展开，检查：

```txt
[ ] 点击整行后，在该行下方展开详情面板
[ ] 同一时间只展开一个病例
[ ] 展开面板跨越表格所有列
[ ] 展开面板中显示 Agent 判断理由
[ ] 展开面板中显示证据链
[ ] 展开面板中显示相似历史申诉案例
[ ] 展开面板中显示历史人工动作
[ ] 点击操作按钮不会误触发行展开
```

---

### 4.5 人工动作前端验收

#### 放行

点击某条待处理病例的“放行”。

检查：

```txt
[ ] Toast 显示成功
[ ] 当前状态变为已放行
[ ] 刷新页面后状态仍为已放行
[ ] feedbacks 中出现新增记录
```

#### 打回

点击某条待处理病例的“打回”。

检查：

```txt
[ ] Toast 显示成功
[ ] 当前状态变为已打回
[ ] 刷新页面后状态仍为已打回
[ ] feedbacks 中出现新增记录
```

#### 绿灯打回

对 `light_status=green` 的病例点击“打回”。

检查：

```txt
[ ] 弹出拒绝理由 Dialog
[ ] 理由为空时不能提交
[ ] 填写理由后可以提交
[ ] 后端保存 human_reason
[ ] feedbacks 中显示该理由
```

#### 转人工

点击“转人工”。

检查：

```txt
[ ] Toast 显示成功
[ ] 当前状态变为人工复核
[ ] 刷新页面后状态仍为人工复核
[ ] feedbacks 中出现新增记录
```

---

### 4.6 筛选与搜索验收

检查：

```txt
[ ] 按医院筛选可用
[ ] 按科室筛选可用
[ ] 按状态筛选可用
[ ] 关键词搜索可用
[ ] 重置筛选可用
[ ] 筛选后统计或数量显示合理
```

如果当前前端仍使用本地过滤，也可以接受。

但后端接口应支持对应 query 参数，便于后续切换服务端筛选。

---

### 4.7 Mock fallback 验收

关闭后端。

刷新：

```txt
http://localhost:3000/console
```

检查：

```txt
[ ] 前端没有白屏
[ ] 前端 fallback 到 mock 数据
[ ] 控制台可接受出现 API 请求失败日志
[ ] 页面仍可展示病例列表
[ ] 页面仍可演示基本交互
```

重新启动后端。

刷新页面。

检查：

```txt
[ ] 前端重新请求 localhost:8000
[ ] 后端数据优先于 mock 数据
```

---

## 5. LLM 模式验收

### 5.1 默认稳定模式

确认：

```env
LLM_ENABLED=false
```

检查：

```txt
[ ] /agent/review-one 不调用外部模型
[ ] 即使无网络也能返回
[ ] 返回结果结构完整
[ ] 前端不崩
```

---

### 5.2 大模型调用模式

配置：

```env
LLM_ENABLED=true
LLM_API_KEY=your_api_key
LLM_BASE_URL=your_base_url
LLM_MODEL=your_model
LLM_TIMEOUT_SECONDS=20
```

运行：

```bash
curl -X POST http://localhost:8000/agent/review-one \
  -H "Content-Type: application/json" \
  -d "{\"case_id\":\"SC001\"}"
```

检查：

```txt
[ ] 如果配置正确，模型调用成功
[ ] 返回结构仍为 ReviewCase
[ ] 包含 agent_reason
[ ] 包含 evidence_chain
[ ] 模型输出被正确解析为 JSON
[ ] API Key 没有出现在日志中
```

---

### 5.3 LLM 失败 fallback

故意使用错误 API Key 或关闭网络。

再次请求：

```bash
curl -X POST http://localhost:8000/agent/review-one \
  -H "Content-Type: application/json" \
  -d "{\"case_id\":\"SC001\"}"
```

检查：

```txt
[ ] 接口仍然返回 success=true
[ ] 使用规则兜底结果
[ ] message 提示 fallback rules
[ ] 前端不崩溃
[ ] 后端日志不泄露 API Key
```

---

## 6. 数据文件验收

### 6.1 review_cases.json

检查：

```txt
[ ] 文件仍是合法 JSON
[ ] 中文未被转义成乱码
[ ] case_id 仍使用 SCxxx
[ ] current_status 更新正确
[ ] Agent 复核结果可写回
[ ] 不出现重复 case_id
```

---

### 6.2 manual_actions.json

检查：

```txt
[ ] 文件仍是合法 JSON
[ ] 新增 action_id 按 MAxxx 递增
[ ] 新增记录 case_id 与 review_cases.json 中病例对应
[ ] created_at 格式为 YYYY-MM-DD HH:mm:ss
[ ] human_reason 在需要时被保存
[ ] is_agent_accepted 计算正确
```

---

### 6.3 suspect_cases / appeal_cases / hospital_profiles

检查：

```txt
[ ] 文件可被后端读取
[ ] Agent 复核接口不会因为字段缺失崩溃
[ ] appeal_cases 可用于生成 matched_cases
[ ] hospital_profiles 缺失匹配项时不影响接口返回
```

---

## 7. 错误处理验收

必须验证：

```txt
[ ] case 不存在返回 404
[ ] 绿灯打回无理由返回 400
[ ] 请求体枚举非法返回 422 或明确错误
[ ] JSON 文件读取失败时返回 500
[ ] JSON 文件写入失败时返回 500
[ ] 所有错误响应仍保持 { success, data, message }
```

错误响应示例：

```json
{
  "success": false,
  "data": null,
  "message": "case not found"
}
```

---

## 8. 路演核心案例验收

至少准备并验证三条核心案例。

### 8.1 绿灯案例

建议使用：

```txt
SC001
```

检查：

```txt
[ ] light_status = green
[ ] suggested_action = approve
[ ] agent_reason 能解释为什么建议放行
[ ] matched_cases 中有成功申诉案例
[ ] evidence_chain 完整
[ ] 可以演示“减少误伤”
```

---

### 8.2 红灯案例

建议使用：

```txt
SC002 或其他 red 案例
```

检查：

```txt
[ ] light_status = red
[ ] suggested_action = reject
[ ] agent_reason 能解释为什么建议打回
[ ] evidence_chain 能指出风险依据
[ ] 可以演示“聚焦高风险”
```

---

### 8.3 黄灯案例

建议使用：

```txt
SC003 或其他 yellow 案例
```

检查：

```txt
[ ] light_status = yellow
[ ] suggested_action = manual_review
[ ] agent_reason 能解释为什么需要人工审核
[ ] evidence_chain 显示证据不足或结论分化
[ ] 可以演示“AI 不替代人工判断”
```

---

## 9. 演示流程验收

建议按以下顺序演示：

```txt
1. 打开首页，说明产品定位
2. 进入 /console
3. 展示顶部统计卡片
4. 展示疑点病例列表
5. 点击绿灯案例，展示 Agent 理由与证据链
6. 点击放行，展示状态变化与反馈沉淀
7. 点击红灯案例，展示风险依据
8. 点击打回，展示人工动作记录
9. 点击黄灯案例，展示转人工逻辑
10. 可选：触发 /agent/review-one，展示单条实时复核
```

检查：

```txt
[ ] 整个流程 3 分钟内可讲完
[ ] 无需解释复杂技术细节也能听懂
[ ] 页面切换顺畅
[ ] API 请求稳定
[ ] 即使 LLM 不启用也能完成演示
```

---

## 10. 提交前检查

运行：

```bash
git status
```

确认：

```txt
[ ] 没有 .env
[ ] 没有 .venv
[ ] 没有 node_modules
[ ] 没有 .next
[ ] 没有 Python __pycache__
[ ] 没有无关截图或缓存
```

检查文档：

```txt
[ ] README 写明前端启动方式
[ ] README 写明后端启动方式
[ ] README 写明前端端口 3000
[ ] README 写明后端端口 8000
[ ] backend/README.md 存在
[ ] backend/.env.example 存在
[ ] docs/backend/ 文档存在
```

检查代码：

```txt
[ ] 前端 pnpm dev 可启动
[ ] 后端 uvicorn 可启动
[ ] 后端 requirements.txt 可安装
[ ] API base URL 可通过 NEXT_PUBLIC_API_BASE_URL 配置
[ ] CORS 允许 localhost:3000
```

---

## 11. 最低可交付标准

如果时间紧，至少必须满足：

```txt
[ ] 前端 localhost:3000 可打开 /console
[ ] 后端 localhost:8000 可启动
[ ] GET /health 可用
[ ] GET /review-cases 可用
[ ] GET /review-cases/SC001 可用
[ ] POST /actions 可用
[ ] GET /feedbacks 可用
[ ] POST /agent/review-one 在 LLM_ENABLED=false 下可用
[ ] 点击病例行可展示详情
[ ] 放行 / 打回 / 转人工能更新状态
[ ] 刷新后状态保留
```

LLM API 接入不是最低可交付要求。

---

## 12. 最终完成报告格式

开发完成后，请输出：

```txt
一、完成概览
- 当前分支：
- 前端端口：
- 后端端口：
- LLM 模式：

二、新增文件
1.
2.
3.

三、修改文件
1.
2.
3.

四、已实现接口
1. GET /health
2. GET /review-cases
3. GET /review-cases/{case_id}
4. POST /actions
5. GET /feedbacks
6. POST /agent/review-one
7. GET /dashboard/summary（如有）

五、数据读写说明
- 读取了哪些文件：
- 写入了哪些文件：
- current_status 如何更新：
- action_id 如何生成：

六、Agent 复核说明
- 规则兜底是否可用：
- LLM_ENABLED=false 是否可用：
- LLM_ENABLED=true 是否实现：
- LLM 失败是否 fallback：

七、前端联调结果
- /console 是否正常：
- Network 是否请求后端：
- 点击行详情是否正常：
- 人工动作是否正常：
- 刷新后是否保留：

八、测试结果
- curl /health：
- curl /review-cases：
- curl /review-cases/SC001：
- curl /actions：
- curl /feedbacks：
- curl /agent/review-one：

九、未解决问题
1.
2.
3.

十、下一步建议
1.
2.
3.
```
