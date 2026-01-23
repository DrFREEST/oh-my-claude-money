---
name: hybrid-ultrawork
description: 하이브리드 울트라워크 모드 활성화 (Claude + OpenCode 병렬)
aliases:
  - hulw
  - hybrid
arguments:
  - name: task
    description: 실행할 작업 설명
    required: true
---

# 하이브리드 울트라워크

Claude Code와 OpenCode를 함께 활용하여 토큰 사용량을 최적화합니다.

## 현재 상태

현재 Claude 사용량을 확인하고 최적의 라우팅 계획을 수립합니다.

```javascript
// 라우팅 정보 조회
import { getRoutingInfo } from '/opt/oh-my-claude-money/src/orchestrator/hybrid-ultrawork.mjs';

const tasks = [
  { type: 'explore', prompt: '코드베이스 탐색' },
  { type: 'executor', prompt: '기능 구현' },
  { type: 'researcher', prompt: 'API 문서 조사' }
];

const info = getRoutingInfo(tasks);
console.log(info.recommendation);
```

## 실행 방법

### 방법 1: 자동 라우팅

OMC의 ultrawork 모드에서 자동으로 하이브리드 라우팅이 적용됩니다:

```
ulw: {{task}}
```

사용량이 70% 이상이면 적합한 작업이 OpenCode로 자동 위임됩니다.

### 방법 2: 명시적 하이브리드 모드

```
hulw: {{task}}
```

또는

```
hybrid ultrawork: {{task}}
```

### 방법 3: 스크립트 직접 실행

```bash
node -e "
import { createHybridUltrawork } from '/opt/oh-my-claude-money/src/orchestrator/hybrid-ultrawork.mjs';

const hw = createHybridUltrawork({ projectDir: '{{directory}}' });
await hw.start();

const plan = hw.planExecution([
  { type: 'explore', prompt: '{{task}}', priority: 1 }
]);

console.log(plan.summary);
"
```

## 라우팅 규칙

| 사용량 | OpenCode 비율 | 설명 |
|--------|--------------|------|
| 90%+ | 80% | 최대 절감 모드 |
| 70-90% | 50% | 균형 모드 |
| 50-70% | 30% | 품질 우선 |
| 50% 미만 | 10% | Claude 중심 |

## 작업 유형별 라우팅

### Claude 선호 (높은 정확도)
- `architect` - 아키텍처 분석
- `executor-high` - 복잡한 리팩토링
- `critic` - 플랜 검토
- `planner` - 전략적 계획

### OpenCode 선호 (비용 효율)
- `explore` → Librarian
- `researcher` → Oracle (GPT 5.2)
- `designer` → Frontend Engineer (Gemini 3)
- `writer` → Librarian

## 설정

`~/.claude/plugins/oh-my-claude-money/config.json`에서 라우팅 설정 변경:

```json
{
  "routing": {
    "enabled": true,
    "usageThreshold": 70,
    "maxOpencodeWorkers": 3,
    "autoDelegate": true
  }
}
```

## 결과 확인

실행 후 통계:
- Claude 처리 작업 수
- OpenCode 처리 작업 수
- 예상 토큰 절감량
