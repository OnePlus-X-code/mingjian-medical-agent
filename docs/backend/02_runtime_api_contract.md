# 02 Runtime API Contract

## 1. 接口设计原则

本文件定义前端 `/console` 页面实际联调所需的后端接口。

当前前端 API service 位于：

```txt
frontend/src/lib/api.ts
````

后端接口应尽量匹配前端已有函数，不要随意修改路径。

本阶段 API 不使用 `/api` 前缀。

前端请求：

```txt
http://localhost:8000/review-cases
http://localhost:8000/review-cases/{case_id}
http://localhost:8000/actions
http://localhost:8000/feedbacks
http://localhost:8000/agent/review-one
```

统一响应格式：

```json
{
  "success": true,
  "data": {},
  "message": "ok"
}
```

失败响应：

```json
{
  "success": false,
  "data": null,
  "message": "error message"
}
```

---

## 2. GET /health

### 用途

健康检查，用于确认后端服务已启动。

### 请求

```http
GET /health
```

### 成功响应

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

## 3. GET /review-cases

### 用途

获取 Agent 复核后的病例清单，用于前端 console 表格展示。

### 请求

```http
GET /review-cases
```

### Query 参数

```txt
status?: string
hospital?: string
department?: string
keyword?: string
page?: number
page_size?: number
```

### status 过滤规则

`status` 支持两类值。

第一类：按 Agent 红黄绿状态过滤：

```txt
green
yellow
red
```

对应字段：

```txt
light_status
```

第二类：按人工处理状态过滤：

```txt
pending
approved
rejected
manual_review
```

对应字段：

```txt
current_status
```

### keyword 搜索字段

`keyword` 需要在以下字段中做模糊搜索：

```txt
case_id
hospital_name
department
procedure_or_item
main_diagnosis
trigger_rule
agent_reason
```

### 默认分页

```txt
page = 1
page_size = 50
```

### 成功响应

```json
{
  "success": true,
  "data": {
    "total": 10,
    "page": 1,
    "page_size": 50,
    "items": [
      {
        "case_id": "SC001",
        "hospital_name": "A医院",
        "department": "心内科",
        "procedure_or_item": "冠脉支架×3",
        "main_diagnosis": "复杂冠状动脉粥样硬化性心脏病",
        "cost": 28600,
        "trigger_rule": "高值耗材费用高于同组均值",
        "light_status": "green",
        "confidence": 0.92,
        "suggested_action": "approve",
        "current_status": "pending",
        "reviewed_at": "2026-06-25 08:30"
      }
    ]
  },
  "message": "ok"
}
```

### 说明

列表接口可以返回完整 `ReviewCase` 对象，也可以只返回表格展示所需字段。为了减少前后端适配成本，建议直接返回完整对象。

---

## 4. GET /review-cases/{case_id}

### 用途

获取单条病例详情。用于点击病例行后展示 Agent 理由、证据链、相似申诉案例和历史人工动作。

### 请求

```http
GET /review-cases/SC001
```

### 成功响应

```json
{
  "success": true,
  "data": {
    "case_id": "SC001",
    "hospital_name": "A医院",
    "department": "心内科",
    "procedure_or_item": "冠脉支架×3",
    "main_diagnosis": "复杂冠状动脉粥样硬化性心脏病",
    "cost": 28600,
    "trigger_rule": "高值耗材费用高于同组均值",
    "light_status": "green",
    "confidence": 0.92,
    "suggested_action": "approve",
    "current_status": "pending",
    "reviewed_at": "2026-06-25 08:30",
    "drg_group": "冠脉支架相关组",
    "risk_reason": "支架使用数量偏高",
    "patient_summary": "患者多支血管狭窄，伴既往心梗史。",
    "agent_reason": "该案例与历史成功申诉案例高度相似，病历依据能够解释高值耗材使用，因此建议放行。",
    "matched_cases": [
      {
        "appeal_id": "AC012",
        "similarity": 0.92,
        "case_type": "成功申诉",
        "review_result": "success",
        "summary": "A医院心内科复杂冠脉病变患者使用冠脉支架×3，申诉后被认定为临床合理。"
      }
    ],
    "evidence_chain": [
      {
        "step": "DRG初筛命中",
        "content": "该病例因高值耗材费用高于同组均值被标记。",
        "source": "DRG规则"
      },
      {
        "step": "历史案例匹配",
        "content": "匹配到多条相似成功申诉案例。",
        "source": "历史申诉案例库"
      }
    ],
    "history_actions": []
  },
  "message": "ok"
}
```

### 详情字段要求

详情接口必须返回：

```txt
agent_reason
evidence_chain
matched_cases
history_actions
patient_summary
risk_reason
drg_group
```

其中：

* `history_actions` 从 `data/manual_actions.json` 中按 `case_id` 关联得到。
* 其他字段优先使用 `data/review_cases.json` 中已有内容。

### 失败响应

```json
{
  "success": false,
  "data": null,
  "message": "case not found"
}
```

HTTP 状态码：`404`

---

## 5. POST /actions

### 用途

提交人工审核动作。

前端操作包括：

```txt
放行
打回
转人工
```

### 请求

```http
POST /actions
Content-Type: application/json
```

### 请求体

```json
{
  "case_id": "SC001",
  "agent_status": "green",
  "human_action": "reject",
  "human_reason": "病历依据不足，需要医院补充说明。",
  "operator": "医保审核员01"
}
```

### 字段说明

```txt
case_id: 病例 ID
agent_status: Agent 红黄绿状态，即病例 light_status
human_action: 人工动作，approve | reject | manual_review
human_reason: 人工理由，部分场景必填
operator: 操作人，Demo 阶段由前端传入
```

### 业务规则

1. `case_id` 必须存在于 `review_cases.json`。
2. `human_action` 只能是：

   * `approve`
   * `reject`
   * `manual_review`
3. 当 `agent_status === "green"` 且 `human_action === "reject"` 时，`human_reason` 必须非空。
4. 提交动作后，需要写入 `data/manual_actions.json`。
5. 提交动作后，需要更新 `data/review_cases.json` 中对应病例的 `current_status`。
6. `is_agent_accepted` 根据人工动作是否与 Agent 建议一致判断。

### current_status 更新规则

```txt
human_action = approve       → current_status = approved
human_action = reject        → current_status = rejected
human_action = manual_review → current_status = manual_review
```

### is_agent_accepted 规则

```txt
human_action === suggested_action → true
human_action !== suggested_action → false
```

### 成功响应

```json
{
  "success": true,
  "data": {
    "action_id": "MA006",
    "case_id": "SC001",
    "hospital_name": "A医院",
    "department": "心内科",
    "agent_status": "green",
    "human_action": "reject",
    "human_reason": "病历依据不足，需要医院补充说明。",
    "operator": "医保审核员01",
    "created_at": "2026-06-25 21:35:00",
    "is_agent_accepted": false
  },
  "message": "action submitted"
}
```

### 失败响应：病例不存在

```json
{
  "success": false,
  "data": null,
  "message": "case not found"
}
```

HTTP 状态码：`404`

### 失败响应：绿灯打回但未填写理由

```json
{
  "success": false,
  "data": null,
  "message": "human_reason is required when rejecting a green case"
}
```

HTTP 状态码：`400`

---

## 6. GET /feedbacks

### 用途

获取近期人工反馈记录。

### 请求

```http
GET /feedbacks?limit=5
```

### Query 参数

```txt
limit?: number
```

默认：

```txt
limit = 5
```

### 成功响应

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "action_id": "MA006",
        "case_id": "SC001",
        "hospital_name": "A医院",
        "department": "心内科",
        "agent_status": "green",
        "human_action": "reject",
        "human_reason": "病历依据不足，需要医院补充说明。",
        "operator": "医保审核员01",
        "created_at": "2026-06-25 21:35:00",
        "is_agent_accepted": false
      }
    ]
  },
  "message": "ok"
}
```

### 排序规则

按 `created_at` 倒序排列。

---

## 7. POST /agent/review-one

### 用途

触发单条 Agent 复核。用于路演展示“Agent 实时复核疑点病例”的能力。

### 请求

```http
POST /agent/review-one
Content-Type: application/json
```

### 请求体

```json
{
  "case_id": "SC001"
}
```

### 后端流程

```txt
读取 suspect_cases / review_cases 中的病例
→ 匹配 appeal_cases 中的相似申诉案例
→ 读取 hospital_profiles 中的医院画像
→ 生成 Agent 复核结果
→ 写回 review_cases.json
→ 返回更新后的 ReviewCase
```

### 成功响应

```json
{
  "success": true,
  "data": {
    "case_id": "SC001",
    "hospital_name": "A医院",
    "department": "心内科",
    "procedure_or_item": "冠脉支架×3",
    "main_diagnosis": "复杂冠状动脉粥样硬化性心脏病",
    "cost": 28600,
    "trigger_rule": "高值耗材费用高于同组均值",
    "light_status": "green",
    "confidence": 0.92,
    "suggested_action": "approve",
    "current_status": "pending",
    "agent_reason": "该病例命中高值耗材费用规则，但存在充分临床解释，并匹配到多条历史成功申诉案例，因此建议优先放行。",
    "matched_cases": [
      {
        "appeal_id": "AC012",
        "similarity": 0.92,
        "case_type": "成功申诉",
        "review_result": "success",
        "summary": "A医院心内科复杂冠脉病变患者使用冠脉支架×3，申诉成功。"
      }
    ],
    "evidence_chain": [
      {
        "step": "DRG初筛命中",
        "content": "该病例因高值耗材费用高于同组均值被标记。",
        "source": "DRG规则"
      },
      {
        "step": "复核建议生成",
        "content": "综合病历依据与历史申诉案例，建议优先放行。",
        "source": "Agent"
      }
    ]
  },
  "message": "agent review completed"
}
```

---

## 8. 可选接口：GET /dashboard/summary

当前前端已经定义 `getDashboardSummary()`，但 `/console` 页面实际统计卡片是从病例数组本地计算的。

该接口可选实现。

### 请求

```http
GET /dashboard/summary
```

### 成功响应

```json
{
  "success": true,
  "data": {
    "total_pending": 10,
    "suggest_approve": 3,
    "suggest_manual": 3,
    "suggest_reject": 4,
    "last_updated": "2026-06-25 21:30:00"
  },
  "message": "ok"
}
```

---

## 9. 前端函数映射

后端接口需要对应前端已有函数：

```txt
getReviewCases(params?)     → GET /review-cases
getReviewCaseById(id)       → GET /review-cases/{id}
submitManualAction(payload) → POST /actions
getFeedbacks(limit?)        → GET /feedbacks
triggerAgentReview(caseId)  → POST /agent/review-one
getDashboardSummary()       → GET /dashboard/summary，可选
```

---

## 10. 错误处理要求

后端必须处理：

```txt
case 不存在
请求体字段缺失
枚举值非法
绿灯打回但未填写理由
JSON 文件读取失败
JSON 文件写入失败
```

错误响应仍必须保持统一结构：

```json
{
  "success": false,
  "data": null,
  "message": "具体错误信息"
}
```