# 03 Data Mapping

## 1. 数据源总览

Demo 阶段后端使用根目录 `data/` 作为权威数据源。

```txt
data/
├── review_cases.json
├── manual_actions.json
├── suspect_cases.json
├── appeal_cases.json
└── hospital_profiles.json
````

后端不要读取：

```txt
frontend/src/mock/
```

`frontend/src/mock/` 仅用于前端 fallback。

---

## 2. review_cases.json

### 用途

`review_cases.json` 是前端 `/console` 病例列表和病例详情的主数据源。

它表示经过 Agent 复核后的疑点病例清单。

前端表格主要读取：

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
```

详情区域主要读取：

```txt
drg_group
risk_reason
patient_summary
agent_reason
matched_cases
evidence_chain
history_actions
```

其中 `history_actions` 可以不直接存储在 `review_cases.json` 中，而是在后端详情接口中通过 `manual_actions.json` 动态关联补齐。

---

## 3. manual_actions.json

### 用途

`manual_actions.json` 记录人工审核人员对病例做出的动作。

动作包括：

```txt
approve
reject
manual_review
```

该文件用于：

1. 最近人工反馈面板。
2. 病例详情中的历史动作。
3. 路演展示“人工反馈沉淀”能力。

### 写入时机

当调用：

```http
POST /actions
```

后端需要新增一条记录到 `manual_actions.json`。

### 同步更新

提交人工动作后，后端还需要同步更新 `review_cases.json` 中对应病例的：

```txt
current_status
```

映射关系：

```txt
human_action = approve       → current_status = approved
human_action = reject        → current_status = rejected
human_action = manual_review → current_status = manual_review
```

---

## 4. suspect_cases.json

### 用途

`suspect_cases.json` 表示现有 DRG / DIP 审核系统输出的原始疑似违规清单。

它是 Agent 复核的上游输入。

在调用：

```http
POST /agent/review-one
```

时，后端应优先从 `suspect_cases.json` 查找对应 `case_id`。

如果找不到，再从 `review_cases.json` 查找。

---

## 5. appeal_cases.json

### 用途

`appeal_cases.json` 是历史申诉案例库。

Agent 复核时，需要从该文件中匹配 Top 3 相似案例，用于生成：

```txt
matched_cases
evidence_chain
agent_reason
```

### 匹配逻辑

Demo 阶段不需要向量数据库。

可以使用轻量规则评分：

```txt
同医院：加分
同科室：加分
诊断关键词重合：加分
项目 / 耗材关键词重合：加分
命中规则相似：加分
历史申诉成功：加分
历史打回案例：用于提高红灯判断权重
```

最终取 Top 3。

---

## 6. hospital_profiles.json

### 用途

`hospital_profiles.json` 表示医院或科室画像。

Agent 复核时可以用于辅助判断：

```txt
该医院是否经常出现同类病例
该科室历史申诉成功率
该科室历史打回率
该类耗材使用是否有合理背景
是否存在高风险历史
```

Demo 阶段可以只将其作为 Agent prompt 的上下文，不强制参与复杂计算。

---

## 7. 前端核心类型对齐

后端字段必须对齐：

```txt
frontend/src/types/review.ts
```

不要改变前端字段名。

---

## 8. 核心枚举

### LightStatus

```txt
green
yellow
red
```

含义：

```txt
green  → 建议放行
yellow → 建议人工审核
red    → 建议打回
```

### SuggestedAction

```txt
approve
reject
manual_review
```

含义：

```txt
approve       → Agent 建议放行
reject        → Agent 建议打回
manual_review → Agent 建议人工审核
```

### CurrentStatus

```txt
pending
approved
rejected
manual_review
```

含义：

```txt
pending       → 待处理
approved      → 已放行
rejected      → 已打回
manual_review → 人工复核中
```

### HumanAction

```txt
approve
reject
manual_review
```

含义：

```txt
approve       → 人工放行
reject        → 人工打回
manual_review → 转人工复核
```

---

## 9. ReviewCase 字段

后端返回病例时，应使用以下结构。

```ts
interface ReviewCase {
  case_id: string;
  hospital_name: string;
  department: string;
  procedure_or_item: string;
  main_diagnosis?: string;
  cost: number;
  trigger_rule: string;
  light_status: "green" | "yellow" | "red";
  confidence: number;
  suggested_action: "approve" | "reject" | "manual_review";
  current_status: "pending" | "approved" | "rejected" | "manual_review";
  reviewed_at?: string;

  drg_group?: string;
  risk_reason?: string;
  patient_summary?: string;
  agent_reason?: string;
  matched_cases?: MatchedCase[];
  evidence_chain?: EvidenceItem[];
  history_actions?: ManualAction[];
}
```

---

## 10. MatchedCase 字段

```ts
interface MatchedCase {
  appeal_id: string;
  similarity: number;
  case_type: string;
  review_result: string;
  summary: string;
}
```

字段说明：

```txt
appeal_id     → 历史申诉案例 ID
similarity    → 相似度，0~1
case_type     → 案例类型，例如“成功申诉”“打回案例”
review_result → 结果，例如 success / rejected
summary       → 案例摘要
```

---

## 11. EvidenceItem 字段

```ts
interface EvidenceItem {
  step: string;
  content: string;
  source: string;
}
```

字段说明：

```txt
step    → 证据链步骤名称
content → 证据内容
source  → 证据来源
```

常见 source：

```txt
DRG规则
脱敏病例摘要
历史申诉案例库
医院画像
Agent
```

---

## 12. ManualAction 字段

```ts
interface ManualAction {
  action_id: string;
  case_id: string;
  hospital_name: string;
  department: string;
  agent_status: "green" | "yellow" | "red";
  human_action: "approve" | "reject" | "manual_review";
  human_reason?: string;
  operator: string;
  created_at: string;
  is_agent_accepted: boolean;
}
```

---

## 13. light_status 与 agent_status 的区别

这是最容易出错的字段。

### ReviewCase 中使用

```txt
light_status
```

表示病例的 Agent 红黄绿状态。

例如：

```json
{
  "case_id": "SC001",
  "light_status": "green"
}
```

### ManualAction 中使用

```txt
agent_status
```

表示人工动作发生时，该病例对应的 Agent 红黄绿状态。

例如：

```json
{
  "case_id": "SC001",
  "agent_status": "green",
  "human_action": "reject"
}
```

后端不得把 `agent_status` 写进 `ReviewCase` 替代 `light_status`。
后端也不得把 `light_status` 写进 `ManualAction` 替代 `agent_status`。

---

## 14. case_id 统一规则

项目中病例 ID 应统一使用：

```txt
SC001
SC002
SC003
...
```

历史 mock 中可能存在：

```txt
PSC014
PSC012
```

这些可以保留为旧数据，但新增动作必须使用当前病例真实 `case_id`。

后端处理时：

1. `review_cases.json` 中的 `case_id` 是病例主键。
2. `manual_actions.json` 新增记录必须使用同一个 `case_id`。
3. `history_actions` 关联时按 `case_id` 精确匹配。
4. 不要新生成 `PSC` 前缀的病例 ID。

---

## 15. action_id 生成规则

人工动作 ID 使用：

```txt
MA001
MA002
MA003
...
```

新增动作时，后端应读取现有 `manual_actions.json`，找到最大编号，然后递增。

示例：

```txt
已有最大 action_id = MA005
新增 action_id = MA006
```

如果旧数据格式不规范，则可以 fallback 到：

```txt
MA + 当前记录数量 + 1
```

但最终应保持三位数字格式。

---

## 16. created_at 时间格式

当前前端兼容的时间格式为：

```txt
YYYY-MM-DD HH:mm:ss
```

示例：

```txt
2026-06-25 21:35:00
```

后端新增人工动作时应保持该格式。

---

## 17. JSON 文件读写要求

后端读写 JSON 文件时需要注意：

1. 使用 UTF-8 编码。
2. 写入时保留中文。
3. `ensure_ascii=False`。
4. 写入时使用缩进，便于调试。
5. 文件不存在时返回明确错误。
6. JSON 解析失败时返回 500 错误。
7. 写入失败时返回 500 错误。
8. 不要写入 `frontend/src/mock/`。