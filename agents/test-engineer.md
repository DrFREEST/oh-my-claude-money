---
description: OMC v4.2.9 호환 에이전트 래퍼 - `test-engineer`
---

# OMC Compatibility Agent Wrapper: test-engineer

이 파일은 OMC v4.2.9의 에이전트 인벤토리와의 호환성을 위해 자동 생성되었습니다.

- OMC 에이전트: `test-engineer`
- OMCM 런타임 라우팅: `scripts/agent-mapping.json` + `mapAgentToOpenCode()`

## 목적

- 에이전트 누락 검수 리포트에서 false positive 방지
- 레거시 문서/도구가 `agents/*.md` 인벤토리를 참조할 때 호환성 유지

## 참고

실제 실행 라우팅은 코드 레벨 매핑을 기준으로 동작합니다.
