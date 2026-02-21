---
description: "[DEPRECATED] OMC v4.3.1에서 제거됨 - quality-reviewer를 사용하세요"
---

# [DEPRECATED] performance-reviewer

> **OMC v4.3.1에서 제거되었습니다.**
> `quality-reviewer` 에이전트를 사용하세요.
> OMCM은 이 이름을 자동으로 `quality-reviewer`로 라우팅합니다.

이 에이전트는 OMC v4.3.1 Agent Registry Consolidation에서 제거되었습니다.

## 마이그레이션

- **이전**: `subagent_type: "performance-reviewer"` 또는 `agent_role: "performance-reviewer"`
- **이후**: `subagent_type: "quality-reviewer"` 또는 `agent_role: "quality-reviewer"`

OMC v4.3.1+의 `normalizeDelegationRole()`이 자동으로 라우팅합니다.
