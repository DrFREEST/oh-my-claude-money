---
description: "[DEPRECATED] OMC v4.3.1에서 제거됨 (저활용으로 canonical 에이전트로 통합) - analyst를 사용하세요"
---

# [DEPRECATED] information-architect

> **OMC v4.3.1에서 제거되었습니다 (저활용으로 canonical 에이전트로 통합).**
> `analyst` 에이전트를 사용하세요 (또는 `planner` / `designer`).
> OMCM은 이 이름을 자동으로 `analyst`로 라우팅합니다.

이 에이전트는 OMC v4.3.1 Agent Registry Consolidation에서 제거되었습니다.

## 마이그레이션

- **이전**: `subagent_type: "information-architect"` 또는 `agent_role: "information-architect"`
- **이후**: `subagent_type: "analyst"` 또는 `agent_role: "analyst"` (또는 `planner` / `designer`)

OMC v4.3.1+의 `normalizeDelegationRole()`이 자동으로 라우팅합니다.
