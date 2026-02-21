---
description: "[DEPRECATED] OMC v4.3.1에서 제거됨 (저활용으로 canonical 에이전트로 통합) - analyst를 사용하세요"
---

# [DEPRECATED] product-analyst

> **OMC v4.3.1에서 제거되었습니다 (저활용으로 canonical 에이전트로 통합).**
> `analyst` 에이전트를 사용하세요.
> OMCM은 이 이름을 자동으로 `analyst`로 라우팅합니다.

이 에이전트는 OMC v4.3.1 Agent Registry Consolidation에서 제거되었습니다.

## 마이그레이션

- **이전**: `subagent_type: "product-analyst"` 또는 `agent_role: "product-analyst"`
- **이후**: `subagent_type: "analyst"` 또는 `agent_role: "analyst"`

OMC v4.3.1+의 `normalizeDelegationRole()`이 자동으로 라우팅합니다.
