/**
 * task-router.mjs - 하이브리드 태스크 라우터
 *
 * Claude Code ↔ OpenCode 간 작업 분배 결정
 * 토큰 사용량, 작업 유형, 비용/품질 트레이드오프 기반
 */

import { getUsageFromCache, checkThreshold, getUsageLevel } from '../utils/usage.mjs';
import { loadConfig } from '../utils/config.mjs';

// =============================================================================
// 라우팅 상수
// =============================================================================

/**
 * 작업 유형별 선호 대상
 * 'claude': Claude Code 에이전트 선호
 * 'opencode': OpenCode 에이전트 선호
 * 'any': 현재 사용량에 따라 결정
 */
export const TASK_ROUTING_PREFERENCES = {
  // Claude Code 선호 (높은 정확도 필요) - OMC 4.1.16
  architect: 'claude', // 아키텍처 분석
  debugger: 'claude', // 복잡한 디버깅
  critic: 'claude', // 플랜 검토
  planner: 'claude', // 전략적 계획
  'deep-executor': 'claude', // 복잡한 자율 작업
  'quality-reviewer': 'claude', // 품질 심층 리뷰
  'product-manager': 'claude', // 제품 관리

  // OpenCode 선호 (비용 효율적)
  explore: 'opencode', // 코드베이스 탐색
  'dependency-expert': 'opencode', // 의존성/문서 조사 (was researcher)
  researcher: 'opencode', // backward-compat alias
  writer: 'opencode', // 문서 작성
  'style-reviewer': 'opencode', // 코드 스타일 체크
  'ux-researcher': 'opencode', // UX 리서치

  // 상황에 따라 결정
  executor: 'any', // 일반 구현
  designer: 'any', // UI 작업
  'build-fixer': 'any', // 빌드 오류 수정
  'test-engineer': 'any', // TDD/테스트 작성 (was tdd-guide)
  scientist: 'any', // 데이터 분석
  verifier: 'any', // 코드 검증
  'code-reviewer': 'any', // 코드 리뷰
  'security-reviewer': 'any', // 보안 리뷰
};

/**
 * OpenCode 에이전트 매핑
 * OMC 에이전트 → OpenCode 에이전트 매핑
 */
export const OPENCODE_AGENT_MAPPING = {
  // OMC 4.1.16 Lane 기반 매핑
  explore: 'Librarian', // 코드베이스 탐색
  'dependency-expert': 'Oracle', // 의존성/문서 조사
  researcher: 'Oracle', // backward-compat alias
  writer: 'Librarian', // 문서 작성
  designer: 'Frontend Engineer', // UI/UX 디자인
  executor: 'Sisyphus', // 메인 실행
  'style-reviewer': 'Librarian', // 코드 스타일 체크
  'ux-researcher': 'Librarian', // UX 리서치
  'test-engineer': 'Sisyphus', // 테스트 작성
  verifier: 'Sisyphus', // 코드 검증
  'code-reviewer': 'Oracle', // 코드 리뷰
  'security-reviewer': 'Oracle', // 보안 리뷰
};

// =============================================================================
// 라우팅 결정 함수
// =============================================================================

/**
 * 작업 라우팅 결정
 * @param {string} taskType - OMC 에이전트 타입
 * @param {Object} options - 추가 옵션
 * @returns {Object} 라우팅 결정 { target: 'claude'|'opencode', reason: string, agent?: string }
 */
export function routeTask(taskType, options = {}) {
  const config = loadConfig();
  const usage = getUsageFromCache();
  const usageLevel = getUsageLevel();

  const preference = TASK_ROUTING_PREFERENCES[taskType] || 'any';

  // 1. 명시적 선호도가 있는 경우
  if (preference === 'claude') {
    return {
      target: 'claude',
      reason: `${taskType}는 높은 정확도가 필요하여 Claude 선호`,
      agent: taskType,
    };
  }

  if (preference === 'opencode') {
    // OpenCode 사용 가능 여부 확인
    if (!isOpenCodeAvailable()) {
      return {
        target: 'claude',
        reason: 'OpenCode 미설치, Claude 사용',
        agent: taskType,
      };
    }

    return {
      target: 'opencode',
      reason: `${taskType}는 비용 효율적으로 OpenCode에 위임`,
      agent: OPENCODE_AGENT_MAPPING[taskType] || 'Sisyphus',
    };
  }

  // 2. 'any': 현재 사용량에 따라 결정
  const threshold = config.routing?.usageThreshold || 70;

  if (usage && (usage.fiveHour >= threshold || usage.weekly >= threshold)) {
    // 사용량 높음 → OpenCode 우선
    if (!isOpenCodeAvailable()) {
      return {
        target: 'claude',
        reason: `사용량 높음(${Math.max(usage.fiveHour, usage.weekly)}%) but OpenCode 미설치`,
        agent: taskType,
      };
    }

    return {
      target: 'opencode',
      reason: `사용량 ${Math.max(usage.fiveHour, usage.weekly)}% - OpenCode로 부하 분산`,
      agent: OPENCODE_AGENT_MAPPING[taskType] || 'Sisyphus',
    };
  }

  // 3. 기본: Claude 사용
  return {
    target: 'claude',
    reason: `사용량 정상(${usage?.fiveHour || 0}%) - Claude 사용`,
    agent: taskType,
  };
}

/**
 * 병렬 작업 분배 계획
 * ultrawork 모드에서 여러 작업을 Claude/OpenCode에 최적 분배
 * @param {Array} tasks - 작업 목록 [{ type, prompt, priority }]
 * @returns {Object} { claudeTasks: [], opencodeTasks: [] }
 */
export function planParallelDistribution(tasks) {
  const claudeTasks = [];
  const opencodeTasks = [];

  const usage = getUsageFromCache();
  const currentUsage = usage ? Math.max(usage.fiveHour, usage.weekly) : 0;

  // 사용량에 따른 OpenCode 비율 결정
  let opencodeRatio = 0;
  if (currentUsage >= 90) opencodeRatio = 0.8; // 90%+ → 80% OpenCode
  else if (currentUsage >= 70) opencodeRatio = 0.5; // 70-90% → 50% OpenCode
  else if (currentUsage >= 50) opencodeRatio = 0.3; // 50-70% → 30% OpenCode
  else opencodeRatio = 0.1; // 50% 미만 → 10% OpenCode

  // OpenCode 미설치 시 모두 Claude로
  if (!isOpenCodeAvailable()) {
    return { claudeTasks: tasks, opencodeTasks: [] };
  }

  // 우선순위 정렬 (높은 우선순위 먼저)
  const sortedTasks = [...tasks].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const task of sortedTasks) {
    const routing = routeTask(task.type);

    if (routing.target === 'opencode') {
      opencodeTasks.push({
        ...task,
        opencodeAgent: routing.agent,
        reason: routing.reason,
      });
    } else if (routing.target === 'claude') {
      claudeTasks.push({
        ...task,
        reason: routing.reason,
      });
    } else {
      // 'any' 타입: 비율에 따라 분배
      const currentOpencodeRatio = opencodeTasks.length / (opencodeTasks.length + claudeTasks.length + 1);

      if (currentOpencodeRatio < opencodeRatio) {
        opencodeTasks.push({
          ...task,
          opencodeAgent: OPENCODE_AGENT_MAPPING[task.type] || 'Sisyphus',
          reason: `부하 분산 (목표 비율: ${opencodeRatio * 100}%)`,
        });
      } else {
        claudeTasks.push({
          ...task,
          reason: '기본 Claude 처리',
        });
      }
    }
  }

  return { claudeTasks, opencodeTasks };
}

// =============================================================================
// 유틸리티 함수
// =============================================================================

let _openCodeAvailable = null;

/**
 * OpenCode 설치 여부 확인 (캐시됨)
 */
export function isOpenCodeAvailable() {
  if (_openCodeAvailable !== null) return _openCodeAvailable;

  try {
    const { execFileSync } = require('child_process');
    execFileSync('which', ['opencode'], { stdio: 'pipe' });
    _openCodeAvailable = true;
  } catch {
    _openCodeAvailable = false;
  }

  return _openCodeAvailable;
}

/**
 * OpenCode 가용성 캐시 초기화
 */
export function resetOpenCodeCache() {
  _openCodeAvailable = null;
}

/**
 * 라우팅 결정 요약 생성
 */
export function getRoutingSummary(distribution) {
  const { claudeTasks, opencodeTasks } = distribution;
  const total = claudeTasks.length + opencodeTasks.length;

  return {
    total,
    claude: claudeTasks.length,
    opencode: opencodeTasks.length,
    claudePercent: total > 0 ? Math.round((claudeTasks.length / total) * 100) : 0,
    opencodePercent: total > 0 ? Math.round((opencodeTasks.length / total) * 100) : 0,
  };
}
