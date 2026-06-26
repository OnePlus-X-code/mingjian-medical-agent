# Data Schema

> 本文档定义 MVP 阶段使用的 JSON 数据结构。
> 所有数据均为脱敏模拟数据，不接入真实医保数据。

---

## 1. 数据文件总览

```text
data/
├─ suspect_cases.json        # DRG系统输出的疑似违规清单，后台输入
├─ appeal_cases.json         # 历史申诉案例库，Agent检索使用
├─ hospital_profiles.json    # 医院 / 科室画像
├─ review_cases.json         # Agent复核后的红黄绿结果，前端展示
└─ manual_actions.json       # 人工操作与反馈记录
```

核心原则：

```text
suspect_cases = DRG原始疑似清单，后台输入
review_cases = Agent复核后的结果，前端展示
```

前端不直接展示 `suspect_cases`。

---

# 2. suspect_cases.json

## 2.1 说明

`suspect_cases.json` 用于模拟现有 DRG 系统输出的疑似违规清单。

这份数据是后端和 Agent 的输入，不直接作为前端主页面展示数据。

## 2.2 字段定义

| 字段                  | 类型     | 必填 | 说明             |
| ------------------- | ------ | -- | -------------- |
| `case_id`           | string | 是  | 案例 ID          |
| `hospital_id`       | string | 是  | 医院 ID          |
| `hospital_name`     | string | 是  | 医院名称           |
| `department`        | string | 是  | 科室             |
| `drg_group`         | string | 是  | DRG 分组         |
| `main_diagnosis`    | string | 是  | 主诊断            |
| `procedure_or_item` | string | 是  | 处方 / 耗材 / 检查项目 |
| `cost`              | number | 是  | 金额             |
| `trigger_rule`      | string | 是  | 命中规则           |
| `risk_reason`       | string | 是  | 疑似违规原因         |
| `patient_summary`   | string | 是  | 脱敏病例摘要         |

## 2.3 示例

```json
[
  {
    "case_id": "SC001",
    "hospital_id": "H001",
    "hospital_name": "A医院",
    "department": "心内科",
    "drg_group": "冠脉支架相关组",
    "main_diagnosis": "复杂冠状动脉粥样硬化性心脏病",
    "procedure_or_item": "冠脉支架×3",
    "cost": 28600,
    "trigger_rule": "高值耗材费用高于同组均值",
    "risk_reason": "支架使用数量偏高",
    "patient_summary": "患者多支血管狭窄，伴既往心梗史，术中记录提示病变复杂。"
  }
]
```

---

# 3. appeal_cases.json

## 3.1 说明

`appeal_cases.json` 是历史申诉案例库，是 Agent 检索的核心数据。

这份数据会进入向量数据库，用于相似案例匹配。

注意：不要只准备成功申诉案例，也要准备打回案例和人工复核案例。

## 3.2 字段定义

| 字段                  | 类型     | 必填 | 说明                               |
| ------------------- | ------ | -- | -------------------------------- |
| `appeal_id`         | string | 是  | 申诉案例 ID                          |
| `hospital_id`       | string | 否  | 医院 ID                            |
| `hospital_name`     | string | 是  | 医院名称                             |
| `department`        | string | 是  | 科室                               |
| `drg_group`         | string | 是  | DRG 分组                           |
| `main_diagnosis`    | string | 是  | 主诊断                              |
| `procedure_or_item` | string | 是  | 争议项目                             |
| `appeal_reason`     | string | 是  | 医院申诉理由                           |
| `evidence_text`     | string | 是  | 关键证据文本                           |
| `review_result`     | string | 是  | success / reject / manual_review |
| `review_comment`    | string | 是  | 医保复核意见                           |
| `case_type`         | string | 是  | 成功申诉 / 打回案例 / 人工复核案例             |

## 3.3 示例

```json
[
  {
    "appeal_id": "AC012",
    "hospital_id": "H001",
    "hospital_name": "A医院",
    "department": "心内科",
    "drg_group": "冠脉支架相关组",
    "main_diagnosis": "复杂冠脉病变",
    "procedure_or_item": "冠脉支架×3",
    "appeal_reason": "患者存在多支血管严重狭窄，术中需分段植入支架。",
    "evidence_text": "冠脉造影记录显示前降支、回旋支多处狭窄，术中记录与耗材使用数量一致。",
    "review_result": "success",
    "review_comment": "病历记录完整，耗材使用与病情复杂度匹配，予以放行。",
    "case_type": "成功申诉"
  }
]
```

## 3.4 向量化文本建议

写入 Chroma / Qdrant 时，建议将以下字段拼接成检索文本：

```text
医院：A医院
科室：心内科
DRG组：冠脉支架相关组
主诊断：复杂冠脉病变
争议项目：冠脉支架×3
申诉理由：患者存在多支血管严重狭窄，术中需分段植入支架。
关键证据：冠脉造影记录显示前降支、回旋支多处狭窄，术中记录与耗材使用数量一致。
复核结论：病历记录完整，耗材使用与病情复杂度匹配，予以放行。
```

metadata 建议保留：

```json
{
  "appeal_id": "AC012",
  "hospital_name": "A医院",
  "department": "心内科",
  "drg_group": "冠脉支架相关组",
  "procedure_or_item": "冠脉支架×3",
  "review_result": "success",
  "case_type": "成功申诉"
}
```

---

# 4. hospital_profiles.json

## 4.1 说明

`hospital_profiles.json` 用于描述医院 / 科室画像，增强 Agent 判断的解释力。

MVP 阶段不是必须，但建议准备 3-5 条。

## 4.2 字段定义

| 字段                               | 类型     | 必填 | 说明      |
| -------------------------------- | ------ | -- | ------- |
| `hospital_id`                    | string | 是  | 医院 ID   |
| `hospital_name`                  | string | 是  | 医院名称    |
| `hospital_level`                 | string | 是  | 医院等级    |
| `department`                     | string | 是  | 科室      |
| `specialty_feature`              | string | 是  | 专科特点    |
| `complex_case_ratio`             | string | 是  | 复杂病例比例  |
| `referral_feature`               | string | 是  | 转诊特点    |
| `historical_appeal_success_rate` | string | 是  | 历史申诉成功率 |
| `notes`                          | string | 否  | 补充说明    |

## 4.3 示例

```json
[
  {
    "hospital_id": "H001",
    "hospital_name": "A医院",
    "hospital_level": "三甲",
    "department": "心内科",
    "specialty_feature": "区域心血管重症转诊中心",
    "complex_case_ratio": "较高",
    "referral_feature": "收治多院转诊复杂冠脉病变患者",
    "historical_appeal_success_rate": "78%",
    "notes": "该科室高值耗材使用量长期高于普通综合医院，但部分原因与病例复杂度相关。"
  }
]
```

---

# 5. review_cases.json

## 5.1 说明

`review_cases.json` 是前端主页面实际展示的数据。

这份数据理论上由后端 Agent 根据 `suspect_cases`、`appeal_cases` 和 `hospital_profiles` 生成。
为了保证路演稳定，也可以提前生成并固化为兜底数据。

## 5.2 字段定义

| 字段                  | 类型     | 必填 | 说明                                            |
| ------------------- | ------ | -- | --------------------------------------------- |
| `case_id`           | string | 是  | 案例 ID，与 suspect_cases 对应                      |
| `hospital_name`     | string | 是  | 医院名称                                          |
| `department`        | string | 是  | 科室                                            |
| `drg_group`         | string | 是  | DRG 分组                                        |
| `main_diagnosis`    | string | 是  | 主诊断                                           |
| `procedure_or_item` | string | 是  | 项目 / 处方 / 耗材                                  |
| `cost`              | number | 是  | 金额                                            |
| `trigger_rule`      | string | 是  | 命中规则                                          |
| `risk_reason`       | string | 是  | DRG 原始疑似原因                                    |
| `patient_summary`   | string | 是  | 脱敏病例摘要                                        |
| `light_status`      | string | 是  | green / yellow / red                          |
| `confidence`        | number | 是  | 置信度，0-1                                       |
| `suggested_action`  | string | 是  | approve / reject / manual_review              |
| `agent_reason`      | string | 是  | Agent 判断理由                                    |
| `matched_cases`     | array  | 是  | 相似历史案例                                        |
| `evidence_chain`    | array  | 是  | 证据链                                           |
| `current_status`    | string | 是  | pending / approved / rejected / manual_review |

## 5.3 matched_cases 字段

| 字段              | 类型     | 必填 | 说明                               |
| --------------- | ------ | -- | -------------------------------- |
| `appeal_id`     | string | 是  | 历史申诉案例 ID                        |
| `similarity`    | number | 是  | 相似度，0-1                          |
| `case_type`     | string | 是  | 成功申诉 / 打回案例 / 人工复核案例             |
| `review_result` | string | 是  | success / reject / manual_review |
| `summary`       | string | 是  | 案例摘要                             |

## 5.4 evidence_chain 字段

| 字段        | 类型     | 必填 | 说明    |
| --------- | ------ | -- | ----- |
| `step`    | string | 是  | 证据链步骤 |
| `content` | string | 是  | 证据内容  |
| `source`  | string | 否  | 证据来源  |

## 5.5 示例

```json
[
  {
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
    "current_status": "pending"
  }
]
```

---

# 6. manual_actions.json

## 6.1 说明

`manual_actions.json` 用于记录医保工作人员的人工操作和反馈。

该文件用于展示反馈闭环。

## 6.2 字段定义

| 字段                  | 类型      | 必填   | 说明                               |
| ------------------- | ------- | ---- | -------------------------------- |
| `action_id`         | string  | 是    | 操作 ID                            |
| `case_id`           | string  | 是    | 案例 ID                            |
| `hospital_name`     | string  | 否    | 医院名称                             |
| `department`        | string  | 否    | 科室                               |
| `agent_status`      | string  | 是    | green / yellow / red             |
| `human_action`      | string  | 是    | approve / reject / manual_review |
| `human_reason`      | string  | 条件必填 | 人工理由                             |
| `operator`          | string  | 是    | 操作人                              |
| `created_at`        | string  | 是    | 操作时间                             |
| `is_agent_accepted` | boolean | 是    | 是否采纳 Agent 建议                    |

## 6.3 业务规则

当出现以下情况时：

```text
agent_status = green
human_action = reject
```

`human_reason` 必填。

## 6.4 示例

```json
[
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
```

---

# 7. 枚举值约定

## 7.1 light_status / agent_status

| 值        | 含义        |
| -------- | --------- |
| `green`  | 建议优先放行    |
| `yellow` | 建议人工复核    |
| `red`    | 建议重点核查或打回 |

## 7.2 suggested_action / human_action

| 值               | 含义    |
| --------------- | ----- |
| `approve`       | 放行    |
| `reject`        | 打回    |
| `manual_review` | 转人工审核 |

## 7.3 review_result

| 值               | 含义        |
| --------------- | --------- |
| `success`       | 历史申诉成功    |
| `reject`        | 历史申诉被打回   |
| `manual_review` | 历史案例需人工复核 |

## 7.4 current_status

| 值               | 含义    |
| --------------- | ----- |
| `pending`       | 待处理   |
| `approved`      | 已放行   |
| `rejected`      | 已打回   |
| `manual_review` | 人工复核中 |

---

# 8. 最小样例数据目标

黑客松 MVP 阶段建议准备：

| 数据文件                     | 数量   |
| ------------------------ | ---- |
| `suspect_cases.json`     | 10 条 |
| `appeal_cases.json`      | 30 条 |
| `hospital_profiles.json` | 3 条  |
| `review_cases.json`      | 10 条 |
| `manual_actions.json`    | 5 条  |

其中必须包含 3 条核心 Demo 案例：

| 类型   | 目标       |
| ---- | -------- |
| 绿灯案例 | 展示减少误伤   |
| 红灯案例 | 展示聚焦风险   |
| 黄灯案例 | 展示保留人工判断 |
