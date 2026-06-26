# 04 Agent Review Design

## 1. 目标

`POST /agent/review-one` 是本项目后端中最能体现“智能体能力”的接口。

它的目标是：

```txt
输入一个疑似违规病例 case_id
→ 读取病例信息
→ 匹配历史申诉案例
→ 结合医院画像
→ 生成红黄绿建议
→ 输出 Agent 理由和证据链
→ 写回 review_cases.json
→ 返回前端展示
````

该接口用于路演展示：

> 系统不是简单展示静态表格，而是可以对单条 DRG 疑点病例进行智能复核，生成可解释的决策建议。

---

## 2. 总体流程

```txt
前端点击触发复核
        ↓
POST /agent/review-one
        ↓
AgentService.review_one(case_id)
        ↓
读取 suspect_cases.json / review_cases.json
        ↓
匹配 appeal_cases.json 中的 Top 3 相似申诉案例
        ↓
读取 hospital_profiles.json 中的医院 / 科室画像
        ↓
根据配置选择：
  - 规则兜底模式
  - 大模型 API 模式
        ↓
生成结构化 ReviewCase
        ↓
写回 data/review_cases.json
        ↓
返回前端
```

---

## 3. 为什么需要规则兜底模式

黑客松路演现场可能遇到：

```txt
网络不稳定
大模型 API 超时
API Key 配置错误
模型返回格式不稳定
模型服务限流
```

因此 Agent 复核不能完全依赖大模型。

本项目必须支持：

```env
LLM_ENABLED=false
```

当 `LLM_ENABLED=false` 时：

* 不调用大模型。
* 使用规则兜底逻辑生成结果。
* 确保 `/agent/review-one` 稳定返回。
* 确保前端不会崩溃。
* 确保路演可以完成。

---

## 4. 大模型 API 模式

当配置：

```env
LLM_ENABLED=true
```

后端可以调用 OpenAI-compatible API。

推荐环境变量：

```env
LLM_ENABLED=false
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL=
LLM_TIMEOUT_SECONDS=20
```

说明：

```txt
LLM_ENABLED          是否启用大模型调用
LLM_API_KEY          大模型 API Key
LLM_BASE_URL         OpenAI-compatible base url
LLM_MODEL            模型名称
LLM_TIMEOUT_SECONDS  超时时间
```

重要原则：

1. API Key 只能放在后端 `.env` 中。
2. 不允许在前端暴露大模型 API Key。
3. 前端不能直接调用大模型 API。
4. 大模型调用失败时必须 fallback 到规则兜底结果。
5. 大模型返回内容必须解析成结构化 JSON。
6. 如果解析失败，也必须 fallback。

---

## 5. 推荐后端模块

建议新增：

```txt
backend/app/services/agent_service.py
backend/app/services/llm_client.py
backend/app/prompts/review_case_prompt.md
```

### agent_service.py

负责 Agent 复核主流程：

```txt
读取病例
匹配相似案例
读取医院画像
选择 LLM 或规则兜底
生成 ReviewCase
写回 review_cases.json
```

### llm_client.py

负责大模型 API 调用：

```txt
读取 LLM 配置
构造 OpenAI-compatible client
发送 prompt
接收模型输出
返回文本或 JSON
处理超时和异常
```

### review_case_prompt.md

存放 Agent 复核 prompt 模板。

不要把长 prompt 直接硬编码在 Python 文件中。

---

## 6. 输入数据

`POST /agent/review-one` 请求体：

```json
{
  "case_id": "SC001"
}
```

后端收到 `case_id` 后，按以下顺序读取病例：

1. 优先从 `data/suspect_cases.json` 查找。
2. 如果找不到，从 `data/review_cases.json` 查找。
3. 如果仍找不到，返回 404。

失败响应：

```json
{
  "success": false,
  "data": null,
  "message": "case not found"
}
```

---

## 7. 相似申诉案例匹配

Demo 阶段不引入向量数据库。

使用轻量规则匹配即可。

### 匹配输入

当前病例字段可能包括：

```txt
case_id
hospital_name
department
procedure_or_item
main_diagnosis
trigger_rule
risk_reason
patient_summary
drg_group
cost
```

历史申诉案例字段可能包括：

```txt
appeal_id
hospital_name
department
procedure_or_item
main_diagnosis
trigger_rule
summary
review_result
case_type
```

具体字段以现有 `data/appeal_cases.json` 为准。

### 推荐评分规则

可使用总分制：

```txt
同医院：+10
同科室：+20
诊断关键词重合：+30
项目 / 耗材关键词重合：+30
命中规则相似：+20
历史申诉成功：+10
历史打回案例：用于红灯倾向
```

将总分归一化为 `similarity`：

```txt
similarity = min(score / 100, 0.98)
```

最终取 Top 3。

### 输出 MatchedCase

```json
{
  "appeal_id": "AC012",
  "similarity": 0.92,
  "case_type": "成功申诉",
  "review_result": "success",
  "summary": "A医院心内科复杂冠脉病变患者使用冠脉支架×3，申诉成功。"
}
```

---

## 8. 规则兜底判断逻辑

规则兜底模式用于稳定生成红黄绿建议。

### 绿灯 green / approve

满足以下倾向时，建议放行：

```txt
匹配到多个成功申诉案例
最高相似度 >= 0.75
病历摘要能解释命中规则
项目 / 耗材与诊断存在合理关联
医院 / 科室画像无明显异常
```

输出：

```txt
light_status = green
suggested_action = approve
confidence = 0.85 ~ 0.95
```

### 黄灯 yellow / manual_review

满足以下倾向时，建议人工审核：

```txt
有部分相似案例，但相似度一般
病历摘要信息不足
规则命中原因存在争议
历史申诉结果分化
证据链不够充分
```

输出：

```txt
light_status = yellow
suggested_action = manual_review
confidence = 0.55 ~ 0.75
```

### 红灯 red / reject

满足以下倾向时，建议打回：

```txt
匹配到历史打回案例
项目 / 耗材与诊断缺乏明显关联
数量或金额明显偏高
病历摘要缺少关键适应症
触发规则风险较强
```

输出：

```txt
light_status = red
suggested_action = reject
confidence = 0.80 ~ 0.95
```

---

## 9. 大模型 Prompt 目标

大模型不应该自由发挥，而是承担结构化复核任务。

Prompt 需要让模型完成：

1. 阅读 DRG 疑似违规信息。
2. 阅读脱敏病例摘要。
3. 阅读相似历史申诉案例。
4. 阅读医院 / 科室画像。
5. 判断应为绿灯、黄灯还是红灯。
6. 给出置信度。
7. 给出建议动作。
8. 输出 Agent 判断理由。
9. 输出证据链。
10. 严格返回 JSON。

---

## 10. Prompt 模板建议

`backend/app/prompts/review_case_prompt.md` 可以写成：

```md
你是医保基金监管场景下的智能复核助手。

你的任务是根据现有 DRG 审核系统输出的疑似违规病例、脱敏病例摘要、历史申诉案例和医院科室画像，判断该病例应当建议放行、建议打回还是建议人工审核。

请严格根据输入信息判断，不要编造不存在的病历事实。

## 输入信息

### 疑似违规病例
{{case_json}}

### 相似历史申诉案例
{{matched_cases_json}}

### 医院 / 科室画像
{{hospital_profile_json}}

## 判断标准

- 如果命中规则有明确临床解释，且与历史成功申诉案例高度相似，输出 green / approve。
- 如果证据不足、结果分化、需要人工进一步判断，输出 yellow / manual_review。
- 如果诊疗项目与诊断缺乏合理关联，或与历史打回案例相似，输出 red / reject。

## 输出要求

只输出 JSON，不要输出 Markdown，不要输出解释性前缀。

JSON 格式如下：

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

---

## 11. 大模型返回格式

模型必须返回：

```json
{
  "light_status": "green",
  "confidence": 0.92,
  "suggested_action": "approve",
  "agent_reason": "该病例命中高值耗材费用规则，但病历显示为复杂冠脉病变，且匹配到多条历史成功申诉案例，因此建议优先放行。",
  "evidence_chain": [
    {
      "step": "DRG初筛命中",
      "content": "该病例因高值耗材费用高于同组均值被标记。",
      "source": "DRG规则"
    },
    {
      "step": "历史申诉案例匹配",
      "content": "匹配到 3 条相似申诉案例，其中 2 条为成功申诉。",
      "source": "历史申诉案例库"
    }
  ]
}
```

后端拿到模型输出后，需要补齐：

```txt
case_id
hospital_name
department
procedure_or_item
main_diagnosis
cost
trigger_rule
current_status
matched_cases
reviewed_at
history_actions
```

---

## 12. LLM 调用失败处理

以下情况必须 fallback：

```txt
LLM_ENABLED=false
LLM_API_KEY 缺失
LLM_BASE_URL 缺失
LLM_MODEL 缺失
请求超时
请求失败
模型返回空
模型返回非 JSON
模型 JSON 缺少必要字段
枚举值非法
```

fallback 时：

1. 使用规则兜底结果。
2. 正常返回 `success: true`。
3. message 可以写：

```txt
agent review completed by fallback rules
```

4. 可在日志中记录 LLM 失败原因，但不要把 API Key 打印出来。

---

## 13. 写回 review_cases.json

Agent 复核完成后，需要写回 `data/review_cases.json`。

### 如果病例已存在

按 `case_id` 找到旧记录，更新：

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
history_actions 不直接写入，可动态关联
```

### 如果病例不存在

新增一条 ReviewCase：

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
current_status = pending
reviewed_at
drg_group
risk_reason
patient_summary
agent_reason
matched_cases
evidence_chain
```

---

## 14. 返回给前端的数据

`POST /agent/review-one` 最终返回完整 ReviewCase：

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
    "reviewed_at": "2026-06-25 21:35",
    "drg_group": "冠脉支架相关组",
    "risk_reason": "支架使用数量偏高",
    "patient_summary": "患者多支血管狭窄，伴既往心梗史。",
    "agent_reason": "该病例命中高值耗材费用规则，但存在充分临床解释，因此建议放行。",
    "matched_cases": [],
    "evidence_chain": [],
    "history_actions": []
  },
  "message": "agent review completed"
}
```

---

## 15. 路演建议

路演时可以采用两种模式：

### 稳定模式

```env
LLM_ENABLED=false
```

特点：

```txt
不依赖外部模型
稳定返回
适合正式演示
```

### 实时智能模式

```env
LLM_ENABLED=true
```

特点：

```txt
调用真实大模型 API
可以展示实时复核
需要提前确认 API Key 和网络稳定
失败后自动 fallback
```

建议正式路演默认使用稳定模式，现场需要展示智能体能力时，只对 1 条核心病例触发实时复核。
