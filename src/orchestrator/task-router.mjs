/**
 * task-router.mjs - 하이브리드 태스크 라우터
 *
 * Claude Code ↔ MCP(ask_codex/ask_gemini) 간 작업 분배 결정
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
 * 'mcp': MCP(ask_codex/ask_gemini) 에이전트 선호
 * 'any': 현재 사용량에 따라 결정
 */
export const TASK_ROUTING_PREFERENCES = {
  // Claude Code 선호 (높은 정확도 필요) - OMC 4.2.15
  architect: 'claude', // 아키텍처 분석
  debugger: 'claude', // 복잡한 디버깅
  critic: 'claude', // 플랜 검토
  planner: 'claude', // 전략적 계획
  'deep-executor': 'claude', // 복잡한 자율 작업
  'quality-reviewer': 'claude', // 품질 심층 리뷰
  'product-manager': 'claude', // 제품 관리

  // MCP 선호 (비용 효율적)
  explore: 'mcp', // 코드베이스 탐색
  'dependency-expert': 'mcp', // 의존성/문서 조사 (was researcher)
  researcher: 'mcp', // backward-compat alias
  writer: 'mcp', // 문서 작성
  'document-specialist': 'mcp', // 문서 전문 작업
  'style-reviewer': 'mcp', // 코드 스타일 체크
  'ux-researcher': 'mcp', // UX 리서치

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

// =============================================================================
// 라우팅 결정 함수
// =============================================================================

/**
 * 작업 라우팅 결정
 * @param {string} taskType - OMC 에이전트 타입
 * @param {Object} options - 추가 옵션
 * @returns {Object} 라우팅 결정 { target: 'claude'|'mcp', reason: string, agentRole?: string }
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
      agentRole: taskType,
    };
  }

  if (preference === 'mcp') {
    // MCP 가용성 확인
    if (!isMcpAvailable()) {
      return {
        target: 'claude',
        reason: 'MCP 미설치, Claude 사용',
        agentRole: taskType,
      };
    }

    return {
      target: 'mcp',
      reason: `${taskType}는 비용 효율적으로 MCP에 위임`,
      agentRole: taskType,
    };
  }

  // 2. 'any': 현재 사용량에 따라 결정
  const threshold = config.routing?.usageThreshold || 70;

  if (usage && (usage.fiveHour >= threshold || usage.weekly >= threshold)) {
    // 사용량 높음 → MCP 우선
    if (!isMcpAvailable()) {
      return {
        target: 'claude',
        reason: `사용량 높음(${Math.max(usage.fiveHour, usage.weekly)}%) but MCP 미설치`,
        agentRole: taskType,
      };
    }

    return {
      target: 'mcp',
      reason: `사용량 ${Math.max(usage.fiveHour, usage.weekly)}% - MCP로 부하 분산`,
      agentRole: taskType,
    };
  }

  // 3. 기본: Claude 사용
  return {
    target: 'claude',
    reason: `사용량 정상(${usage?.fiveHour || 0}%) - Claude 사용`,
    agentRole: taskType,
  };
}

/**
 * 병렬 작업 분배 계획
 * ultrawork 모드에서 여러 작업을 Claude/MCP에 최적 분배
 * @param {Array} tasks - 작업 목록 [{ type, prompt, priority }]
 * @returns {Object} { claudeTasks: [], mcpTasks: [] }
 */
export function planParallelDistribution(tasks) {
  const claudeTasks = [];
  const mcpTasks = [];

  const usage = getUsageFromCache();
  const currentUsage = usage ? Math.max(usage.fiveHour, usage.weekly) : 0;

  // 사용량에 따른 MCP 비율 결정
  let mcpRatio = 0;
  if (currentUsage >= 90) mcpRatio = 0.8; // 90%+ → 80% MCP
  else if (currentUsage >= 70) mcpRatio = 0.5; // 70-90% → 50% MCP
  else if (currentUsage >= 50) mcpRatio = 0.3; // 50-70% → 30% MCP
  else mcpRatio = 0.1; // 50% 미만 → 10% MCP

  // MCP 미설치 시 모두 Claude로
  if (!isMcpAvailable()) {
    return { claudeTasks: tasks, mcpTasks: [] };
  }

  // 우선순위 정렬 (높은 우선순위 먼저)
  const sortedTasks = [...tasks].sort((a, b) => (b.priority || 0) - (a.priority || 0));

  for (const task of sortedTasks) {
    const routing = routeTask(task.type);

    if (routing.target === 'mcp') {
      mcpTasks.push({
        ...task,
        agentRole: routing.agentRole,
        reason: routing.reason,
      });
    } else if (routing.target === 'claude') {
      claudeTasks.push({
        ...task,
        reason: routing.reason,
      });
    } else {
      // 'any' 타입: 비율에 따라 분배
      const currentMcpRatio = mcpTasks.length / (mcpTasks.length + claudeTasks.length + 1);

      if (currentMcpRatio < mcpRatio) {
        mcpTasks.push({
          ...task,
          agentRole: task.type,
          reason: `부하 분산 (목표 비율: ${mcpRatio * 100}%)`,
        });
      } else {
        claudeTasks.push({
          ...task,
          reason: '기본 Claude 처리',
        });
      }
    }
  }

  return { claudeTasks, mcpTasks };
}

// =============================================================================
// 유틸리티 함수
// =============================================================================

let _mcpAvailable = null;

/**
 * MCP 가용성 확인 (캐시됨)
 * MCP-First 아키텍처에서는 ask_codex/ask_gemini MCP 도구가 등록되어 있으면 사용 가능
 */
export function isMcpAvailable() {
  if (_mcpAvailable !== null) return _mcpAvailable;

  // MCP 도구는 MCP 서버가 처리하므로 항상 가용하다고 간주
  // 실제 가용성은 MCP 서버 응답 시 확인됨
  _mcpAvailable = true;

  return _mcpAvailable;
}

/**
 * MCP 가용성 캐시 초기화
 */
export function resetMcpCache() {
  _mcpAvailable = null;
}

/**
 * 라우팅 결정 요약 생성
 */
export function getRoutingSummary(distribution) {
  const claudeTasks = distribution.claudeTasks || [];
  const mcpTasks = distribution.mcpTasks || [];
  const total = claudeTasks.length + mcpTasks.length;

  return {
    total,
    claude: claudeTasks.length,
    mcp: mcpTasks.length,
    claudePercent: total > 0 ? Math.round((claudeTasks.length / total) * 100) : 0,
    mcpPercent: total > 0 ? Math.round((mcpTasks.length / total) * 100) : 0,
  };
}
