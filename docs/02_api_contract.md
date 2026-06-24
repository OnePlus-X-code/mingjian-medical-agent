# API Contract

> 本文档定义前后端接口契约。
> 核心原则：前端展示的是 Agent 复核后的 `review_cases`，不是 DRG 原始疑似清单 `suspect_cases`。

---

## 1. 基础约定

### Base URL

开发环境：

```text
http://localhost:8000
```

前端请求示例：

```text
GET http://localhost:8000/review-cases
```

---

## 2. 通用响应格式

所有接口建议统一返回以下结构：

```json
{
  "success": true,
  "data": {},
  "message": "ok"
}
```

错误响应：

```json
{
  "success": false,
  "data": null,
  "message": "error message"
}
```

---

## 3. 接口清单

| Method | Path                  | 说明                 |
| ------ | --------------------- | ------------------ |
| POST   | `/drg/import`         | 导入或加载 DRG 疑似违规清单   |
| POST   | `/agent/batch-review` | 批量触发 Agent 复核      |
| POST   | `/agent/review-one`   | 单条案例实时复核           |
| GET    | `/review-cases`       | 获取 Agent 复核后的红黄绿清单 |
| GET    | `/review-cases/:id`   | 获取单个复核案例详情         |
| POST   | `/actions`            | 提交人工操作             |
| GET    | `/feedbacks`          | 获取近期反馈记录           |
| GET    | `/health`             | 健康检查               |

---

# 4. 接口详情

---

## 4.1 健康检查

### `GET /health`

用于检查后端服务是否正常。

### Response

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "mingjian-backend"
  },
  "message": "ok"
}
```

---

## 4.2 导入 DRG 疑似违规清单

### `POST /drg/import`

用于导入或加载模拟 DRG 疑似违规清单。
MVP 阶段可以直接从 `data/suspect_cases.json` 读取。

注意：该接口是后台使用，不是前端控制台主流程必须依赖的接口。

### Request

```json
{
  "source": "local_json"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "imported_count": 10,
    "source": "suspect_cases.json"
  },
  "message": "DRG suspect cases imported"
}
```

---

## 4.3 批量触发 Agent 复核

### `POST /agent/batch-review`

用于将 `suspect_cases` 批量转化为 `review_cases`。

路演时不建议现场批量调用该接口。建议提前生成 `review_cases.json`，保证 Demo 稳定。

### Request

```json
{
  "case_ids": ["SC001", "SC002", "SC003"],
  "force_refresh": false
}
```

字段说明：

| 字段              | 类型       | 必填 | 说明                   |
| --------------- | -------- | -- | -------------------- |
| `case_ids`      | string[] | 否  | 指定需要复核的案例 ID，不传则默认全部 |
| `force_refresh` | boolean  | 否  | 是否强制重新生成复核结果         |

### Response

```json
{
  "success": true,
  "data": {
    "reviewed_count": 3,
    "failed_count": 0,
    "review_case_ids": ["SC001", "SC002", "SC003"]
  },
  "message": "batch review completed"
}
```

---

## 4.4 单条案例实时复核

### `POST /agent/review-one`

用于路演现场展示单条案例实时复核链路。

### Request

```json
{
  "case_id": "SC003"
}
```

### Response

```json
{
  "success": true,
  "data": {
    "case_id": "SC003",
    "light_status": "yellow",
    "confidence": 0.68,
    "suggested_action": "manual_review",
    "agent_reason": "该案例存在部分合理性，但缺少关键病历材料，建议人工复核。",
    "matched_appeal_ids": ["AC021", "AC025"],
    "evidence_chain": [
      {
        "step": "DRG初筛命中",
        "content": "用药费用高于同组均值",
        "source": "DRG规则"
      },
      {
        "step": "历史案例匹配",
        "content": "匹配到2条相似历史案例，但复核结论不一致",
        "source": "appeal_cases"
      },
      {
        "step": "复核建议生成",
        "content": "证据不足，建议人工复核",
        "source": "Agent"
      }
    ]
  },
  "message": "single case reviewed"
}
```

---

## 4.5 获取 Agent 复核后的清单

### `GET /review-cases`

前端控制台首页使用。

该接口返回的是 Agent 已经复核完成后的红黄绿清单，不是 DRG 原始疑似清单。

### Query Parameters

| 参数           | 类型     | 必填 | 说明                   |
| ------------ | ------ | -- | -------------------- |
| `status`     | string | 否  | green / yellow / red |
| `hospital`   | string | 否  | 医院名称                 |
| `department` | string | 否  | 科室名称                 |
| `keyword`    | string | 否  | 搜索项目、规则、案例 ID        |
| `page`       | number | 否  | 页码，默认 1              |
| `page_size`  | number | 否  | 每页数量，默认 10           |

### Response

```json
{
  "success": true,
  "data": {
    "total": 10,
    "page": 1,
    "page_size": 10,
    "items": [
      {
        "case_id": "SC001",
        "hospital_name": "A医院",
        "department": "心内科",
        "procedure_or_item": "冠脉支架×3",
        "cost": 28600,
        "trigger_rule": "高值耗材费用高于同组均值",
        "light_status": "green",
        "confidence": 0.92,
        "suggested_action": "approve",
        "current_status": "pending"
      }
    ]
  },
  "message": "ok"
}
```

---

## 4.6 获取单个复核案例详情

### `GET /review-cases/:id`

前端点击某一行案例时使用。

### Response

```json
{
  "success": true,
  "data": {
    "case_id": "SC001",
    "hospital_name": "A医院",
    "department": "心内科",
    "drg_group": "冠脉支架相关组",
    "main_diagnosis": "复杂冠状动脉粥样硬化性心脏病",
    "procedure_or_item": "冠脉支架×3",
    "cost": 28600,
    "trigger_rule": "高值耗材费用高于同组均值",
    "risk_reason": "支架使用数量偏高",
    "patient_summary": "患者多支血管狭窄，伴既往心梗史，术中记录提示病变复杂。",
    "light_status": "green",
    "confidence": 0.92,
    "suggested_action": "approve",
    "agent_reason": "该案例与A医院心内科近6个月多例成功申诉案例高度相似，患者病情复杂度与耗材使用数量基本匹配，建议优先放行。",
    "matched_cases": [
      {
        "appeal_id": "AC012",
        "similarity": 0.92,
        "case_type": "成功申诉",
        "review_result": "success",
        "summary": "A医院心内科复杂冠脉病变患者，使用冠脉支架×3，病历与术中记录完整，最终申诉成功。"
      }
    ],
    "evidence_chain": [
      {
        "step": "DRG初筛命中",
        "content": "高值耗材费用高于同组均值，系统标记为疑似异常。",
        "source": "DRG规则"
      },
      {
        "step": "历史案例匹配",
        "content": "匹配到3条A医院心内科成功申诉案例，相似度最高为92%。",
        "source": "历史申诉案例库"
      },
      {
        "step": "病历关键点提取",
        "content": "病例摘要显示患者为多支血管狭窄，存在复杂冠脉病变。",
        "source": "脱敏病例摘要"
      },
      {
        "step": "复核建议生成",
        "content": "病情复杂度与耗材使用数量基本匹配，建议优先放行。",
        "source": "Agent"
      }
    ],
    "history_actions": []
  },
  "message": "ok"
}
```

---

## 4.7 提交人工操作

### `POST /actions`

工作人员点击“放行 / 打回 / 转人工审核”时使用。

### Request

```json
{
  "case_id": "SC001",
  "agent_status": "green",
  "human_action": "reject",
  "human_reason": "本次病例缺少术中影像证据，暂不放行。",
  "operator": "医保审核员01"
}
```

字段说明：

| 字段             | 类型     | 必填   | 说明                               |
| -------------- | ------ | ---- | -------------------------------- |
| `case_id`      | string | 是    | 案例 ID                            |
| `agent_status` | string | 是    | Agent 建议状态，green / yellow / red  |
| `human_action` | string | 是    | approve / reject / manual_review |
| `human_reason` | string | 条件必填 | 人工理由。绿灯被打回时必须填写                  |
| `operator`     | string | 是    | 操作人                              |

### 业务规则

如果满足以下条件：

```text
agent_status = green
human_action = reject
```

则 `human_reason` 必填。

### Response

```json
{
  "success": true,
  "data": {
    "action_id": "MA003",
    "case_id": "SC001",
    "human_action": "reject",
    "is_agent_accepted": false,
    "created_at": "2026-06-25 22:30:00"
  },
  "message": "action saved"
}
```

---

## 4.8 获取近期反馈记录

### `GET /feedbacks`

用于控制台展示近期人工反馈记录。

### Query Parameters

| 参数      | 类型     | 必填 | 说明        |
| ------- | ------ | -- | --------- |
| `limit` | number | 否  | 返回数量，默认 5 |

### Response

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "action_id": "MA003",
        "case_id": "SC001",
        "hospital_name": "A医院",
        "department": "心内科",
        "agent_status": "green",
        "human_action": "reject",
        "human_reason": "本次病例缺少术中影像证据，暂不放行。",
        "operator": "医保审核员01",
        "created_at": "2026-06-25 22:30:00",
        "is_agent_accepted": false
      }
    ]
  },
  "message": "ok"
}
```

---

# 5. 枚举值约定

## 5.1 light_status / agent_status

| 值        | 含义        |
| -------- | --------- |
| `green`  | 建议优先放行    |
| `yellow` | 建议人工复核    |
| `red`    | 建议重点核查或打回 |

## 5.2 suggested_action / human_action

| 值               | 含义    |
| --------------- | ----- |
| `approve`       | 放行    |
| `reject`        | 打回    |
| `manual_review` | 转人工审核 |

## 5.3 current_status

| 值               | 含义    |
| --------------- | ----- |
| `pending`       | 待处理   |
| `approved`      | 已放行   |
| `rejected`      | 已打回   |
| `manual_review` | 人工复核中 |

---

# 6. 前后端协作原则

1. 前端主页面只请求 `GET /review-cases`。
2. 前端不直接展示 `suspect_cases`。
3. DRG 原始疑点只在详情页中作为证据背景展示。
4. 后端必须保证返回结构稳定。
5. 即使大模型调用失败，后端也要返回可渲染的兜底结果。
6. 路演主流程优先使用预生成的 `review_cases.json`。
