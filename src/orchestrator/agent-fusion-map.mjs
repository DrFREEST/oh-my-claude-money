/**
 * agent-fusion-map.mjs - OMC ↔ OpenCode 에이전트 퓨전 매핑
 *
 * oh-my-claudecode의 28개 에이전트를 oh-my-opencode 에이전트로 매핑하여
 * Claude 토큰 사용량을 절약하면서 동일한 기능 제공
 */

// =============================================================================
// OpenCode 에이전트 정의 (oh-my-opencode)
// =============================================================================

export const OPENCODE_AGENTS = {
  // 메인 오케스트레이터 - Claude Opus 4.5
  Sisyphus: {
    model: 'claude-opus-4.5',
    provider: 'anthropic',
    role: 'Main orchestrator, complex execution',
    costTier: 'high',
  },

  // 플래너 - Claude 기반
  Prometheus: {
    model: 'claude-opus-4.5',
    provider: 'anthropic',
    role: 'Strategic planning',
    costTier: 'high',
  },

  // 플랜 컨설턴트 - Claude 기반
  Metis: {
    model: 'claude-opus-4.5',
    provider: 'anthropic',
    role: 'Plan consultant, critic',
    costTier: 'high',
  },

  // 아키텍트/디버거 - GPT 5.2 ⭐ 토큰 절약!
  Oracle: {
    model: 'gpt-5.2',
    provider: 'openai',
    role: 'Architecture, debugging, deep analysis',
    costTier: 'medium',
    savesClaudeTokens: true,
  },

  // 프론트엔드 - Gemini 3 Pro ⭐ 토큰 절약!
  'Frontend Engineer': {
    model: 'gemini-3-pro',
    provider: 'google',
    role: 'UI/UX, frontend development',
    costTier: 'medium',
    savesClaudeTokens: true,
  },

  // 문서/탐색 - Claude Sonnet 4.5
  Librarian: {
    model: 'claude-sonnet-4.5',
    provider: 'anthropic',
    role: 'Documentation, codebase exploration',
    costTier: 'low',
  },

  // 빠른 탐색 - 경량 모델
  Explore: {
    model: 'claude-haiku-3.5',
    provider: 'anthropic',
    role: 'Fast codebase search',
    costTier: 'low',
  },

  // 비주얼 분석 - 멀티모달
  'Multimodal Looker': {
    model: 'gemini-3-pro',
    provider: 'google',
    role: 'Visual analysis, image understanding',
    costTier: 'medium',
    savesClaudeTokens: true,
  },
};

// =============================================================================
// OMC → OpenCode 에이전트 퓨전 매핑
// =============================================================================

/**
 * OMC 에이전트를 OpenCode 에이전트로 매핑
 *
 * 전략:
 * - Claude 토큰 절약이 가능한 경우 다른 프로바이더 사용
 * - 정확도가 중요한 작업은 동일 프로바이더 유지
 * - 비용/품질 트레이드오프 고려
 */
export const FUSION_MAP = {
  // =========================================================================
  // Analysis Domain (분석)
  // =========================================================================

  // architect: 복잡한 분석 → Oracle (GPT 5.2) ⭐ 토큰 절약!
  architect: {
    opencode: 'Oracle',
    savesTokens: true,
    reason: 'GPT 5.2 고품질 분석, Claude 토큰 절약',
    fallbackToOMC: false, // OpenCode 우선
  },
  'architect-medium': {
    opencode: 'Oracle',
    savesTokens: true,
    reason: 'GPT 5.2 중급 분석',
    fallbackToOMC: false,
  },
  'architect-low': {
    opencode: 'Librarian',
    savesTokens: false, // 같은 Claude 사용
    reason: '간단한 분석은 Librarian으로',
    fallbackToOMC: true, // 사용량 낮으면 OMC 사용
  },

  // =========================================================================
  // Execution Domain (실행)
  // =========================================================================

  // executor: 코드 실행 → Sisyphus (동일 Opus)
  'executor-high': {
    opencode: 'Sisyphus',
    savesTokens: false, // 같은 Claude Opus
    reason: '복잡한 실행은 품질 유지',
    fallbackToOMC: true, // 사용량 낮으면 OMC가 더 빠름
  },
  executor: {
    opencode: 'Sisyphus',
    savesTokens: false,
    reason: '표준 실행',
    fallbackToOMC: true,
  },
  'executor-low': {
    opencode: 'Librarian',
    savesTokens: false,
    reason: '간단한 실행',
    fallbackToOMC: true,
  },

  // =========================================================================
  // Search Domain (탐색)
  // =========================================================================

  // explore: 빠른 탐색 → Explore/Librarian
  explore: {
    opencode: 'Explore',
    savesTokens: false, // Haiku급
    reason: '빠른 탐색',
    fallbackToOMC: true,
  },
  'explore-medium': {
    opencode: 'Librarian',
    savesTokens: false,
    reason: '중간 탐색',
    fallbackToOMC: true,
  },

  // =========================================================================
  // Research Domain (조사)
  // =========================================================================

  // researcher: API/문서 조사 → Oracle (GPT) ⭐ 토큰 절약!
  researcher: {
    opencode: 'Oracle',
    savesTokens: true,
    reason: 'GPT 5.2 문서 조사, Claude 토큰 절약',
    fallbackToOMC: false,
  },
  'researcher-low': {
    opencode: 'Librarian',
    savesTokens: false,
    reason: '간단한 조사',
    fallbackToOMC: true,
  },

  // =========================================================================
  // Frontend Domain (프론트엔드) ⭐⭐ 최대 절약!
  // =========================================================================

  // designer: UI/UX → Frontend Engineer (Gemini) ⭐ 토큰 절약!
  'designer-high': {
    opencode: 'Frontend Engineer',
    savesTokens: true,
    reason: 'Gemini 3 Pro UI 전문, Claude 토큰 절약',
    fallbackToOMC: false,
  },
  designer: {
    opencode: 'Frontend Engineer',
    savesTokens: true,
    reason: 'Gemini 3 Pro UI 작업',
    fallbackToOMC: false,
  },
  'designer-low': {
    opencode: 'Frontend Engineer',
    savesTokens: true,
    reason: '간단한 UI 수정도 Gemini로',
    fallbackToOMC: false,
  },

  // =========================================================================
  // Documentation Domain (문서화)
  // =========================================================================

  // writer: 문서 작성 → Librarian
  writer: {
    opencode: 'Librarian',
    savesTokens: false, // Claude Sonnet
    reason: '문서 작성',
    fallbackToOMC: true,
  },

  // =========================================================================
  // Visual Domain (비주얼)
  // =========================================================================

  // vision: 이미지 분석 → Multimodal Looker (Gemini) ⭐ 토큰 절약!
  vision: {
    opencode: 'Multimodal Looker',
    savesTokens: true,
    reason: 'Gemini 멀티모달, Claude 토큰 절약',
    fallbackToOMC: false,
  },

  // =========================================================================
  // Planning Domain (계획)
  // =========================================================================

  // planner: 전략 계획 → Prometheus
  planner: {
    opencode: 'Prometheus',
    savesTokens: false, // 같은 Opus
    reason: '전략 계획은 품질 유지',
    fallbackToOMC: true,
  },

  // critic: 플랜 검토 → Metis
  critic: {
    opencode: 'Metis',
    savesTokens: false,
    reason: '플랜 검토',
    fallbackToOMC: true,
  },

  // analyst: 사전 분석 → Oracle (GPT) ⭐ 토큰 절약!
  analyst: {
    opencode: 'Oracle',
    savesTokens: true,
    reason: 'GPT 5.2 사전 분석',
    fallbackToOMC: false,
  },

  // =========================================================================
  // Testing Domain (테스팅)
  // =========================================================================

  'qa-tester': {
    opencode: 'Sisyphus',
    savesTokens: false,
    reason: 'QA 테스팅',
    fallbackToOMC: true,
  },
  'qa-tester-high': {
    opencode: 'Sisyphus',
    savesTokens: false,
    reason: '고급 QA',
    fallbackToOMC: true,
  },

  // =========================================================================
  // Security Domain (보안) - 품질 중요!
  // =========================================================================

  'security-reviewer': {
    opencode: 'Oracle',
    savesTokens: true,
    reason: 'GPT 5.2 보안 분석',
    fallbackToOMC: false,
  },
  'security-reviewer-low': {
    opencode: 'Librarian',
    savesTokens: false,
    reason: '간단한 보안 스캔',
    fallbackToOMC: true,
  },

  // =========================================================================
  // Build Domain (빌드)
  // =========================================================================

  'build-fixer': {
    opencode: 'Sisyphus',
    savesTokens: false,
    reason: '빌드 오류 수정',
    fallbackToOMC: true,
  },
  'build-fixer-low': {
    opencode: 'Librarian',
    savesTokens: false,
    reason: '간단한 빌드 수정',
    fallbackToOMC: true,
  },

  // =========================================================================
  // TDD Domain
  // =========================================================================

  'tdd-guide': {
    opencode: 'Sisyphus',
    savesTokens: false,
    reason: 'TDD 가이드',
    fallbackToOMC: true,
  },
  'tdd-guide-low': {
    opencode: 'Librarian',
    savesTokens: false,
    reason: '간단한 테스트 제안',
    fallbackToOMC: true,
  },

  // =========================================================================
  // Code Review Domain
  // =========================================================================

  'code-reviewer': {
    opencode: 'Oracle',
    savesTokens: true,
    reason: 'GPT 5.2 코드 리뷰',
    fallbackToOMC: false,
  },
  'code-reviewer-low': {
    opencode: 'Librarian',
    savesTokens: false,
    reason: '간단한 코드 체크',
    fallbackToOMC: true,
  },

  // =========================================================================
  // Data Science Domain
  // =========================================================================

  'scientist-high': {
    opencode: 'Oracle',
    savesTokens: true,
    reason: 'GPT 5.2 복잡한 분석',
    fallbackToOMC: false,
  },
  scientist: {
    opencode: 'Oracle',
    savesTokens: true,
    reason: 'GPT 5.2 데이터 분석',
    fallbackToOMC: false,
  },
  'scientist-low': {
    opencode: 'Librarian',
    savesTokens: false,
    reason: '간단한 데이터 검사',
    fallbackToOMC: true,
  },
};

// =============================================================================
// 유틸리티 함수
// =============================================================================

/**
 * OMC 에이전트에 대한 퓨전 정보 조회
 */
export function getFusionInfo(omcAgent) {
  return FUSION_MAP[omcAgent] || null;
}

/**
 * 토큰 절약 가능한 에이전트 목록
 */
export function getTokenSavingAgents() {
  return Object.entries(FUSION_MAP)
    .filter(([_, info]) => info.savesTokens)
    .map(([agent, info]) => ({
      omcAgent: agent,
      opencodeAgent: info.opencode,
      reason: info.reason,
    }));
}

/**
 * 통계 요약
 */
export function getFusionStats() {
  const total = Object.keys(FUSION_MAP).length;
  const savingAgents = Object.values(FUSION_MAP).filter((f) => f.savesTokens).length;
  const fallbackAgents = Object.values(FUSION_MAP).filter((f) => f.fallbackToOMC).length;

  return {
    totalAgents: total,
    tokenSavingAgents: savingAgents,
    tokenSavingPercent: Math.round((savingAgents / total) * 100),
    fallbackToOMCAgents: fallbackAgents,
    opencodePreferredAgents: total - fallbackAgents,
  };
}

/**
 * 에이전트별 예상 토큰 절약량 (추정)
 */
export const ESTIMATED_TOKEN_SAVINGS = {
  // GPT로 대체 시 Claude 토큰 100% 절약
  Oracle: 1.0,
  // Gemini로 대체 시 Claude 토큰 100% 절약
  'Frontend Engineer': 1.0,
  'Multimodal Looker': 1.0,
  // 같은 Claude면 절약 없음
  Sisyphus: 0,
  Prometheus: 0,
  Metis: 0,
  Librarian: 0,
  Explore: 0,
};

/**
 * 작업 배치에 대한 예상 절약량 계산
 */
export function estimateBatchSavings(tasks) {
  let totalTokens = 0;
  let savedTokens = 0;

  for (const task of tasks) {
    const fusion = FUSION_MAP[task.type];
    const estimatedTaskTokens = task.estimatedTokens || 1000; // 기본 1000 토큰

    totalTokens += estimatedTaskTokens;

    if (fusion?.savesTokens) {
      const agent = OPENCODE_AGENTS[fusion.opencode];
      if (agent?.savesClaudeTokens) {
        savedTokens += estimatedTaskTokens;
      }
    }
  }

  return {
    totalTokens,
    savedTokens,
    savingsPercent: totalTokens > 0 ? Math.round((savedTokens / totalTokens) * 100) : 0,
  };
}
