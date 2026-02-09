/**
 * agent-fusion-map.mjs - OMC ↔ OMO 에이전트 퓨전 매핑 v3.0
 *
 * 퓨전/폴백 모드에서 oh-my-claudecode(OMC) 에이전트를
 * oh-my-opencode(OMO) 에이전트로 매핑하여 Claude 토큰 절약
 *
 * OMC v4.1.4 호환 - Codex fallback chain 반영
 *
 * 티어별 모델 분배:
 * - HIGH (Opus급): Claude Opus 4.6 유지 - 복잡한 추론 필요
 * - MEDIUM (Sonnet급): gpt-5.3-codex (thinking) - 표준 구현 작업
 * - LOW (Haiku급): gemini-3-flash (thinking) - 빠른 탐색/간단한 작업
 */

// =============================================================================
// 모델 정의
// =============================================================================

export const MODELS = {
  // HIGH Tier - Claude Opus 4.6 (품질 최우선)
  OPUS: {
    provider: 'anthropic',
    model: 'claude-opus-4-6-20260205',
    thinking: true,
    tier: 'HIGH',
    savesClaudeTokens: false,
  },

  // MEDIUM Tier - GPT 5.3 Codex (코딩 특화, thinking 모드)
  // OMC 4.1.4 fallback chain: gpt-5.3-codex → gpt-5.3 → gpt-5.2-codex → gpt-5.2
  CODEX: {
    provider: 'openai',
    model: 'gpt-5.3-codex',
    thinking: true,
    tier: 'MEDIUM',
    savesClaudeTokens: true,
    fallbackChain: ['gpt-5.3', 'gpt-5.2-codex', 'gpt-5.2'],
  },

  // MEDIUM Tier - Gemini 3 Pro (디자인/비전 특화)
  GEMINI_PRO: {
    provider: 'google',
    model: 'gemini-3-pro',
    thinking: true,
    tier: 'MEDIUM',
    savesClaudeTokens: true,
    fallbackChain: ['gemini-3-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'],
  },

  // LOW Tier - Gemini 3 Flash Preview (빠른 응답, thinking 모드)
  FLASH: {
    provider: 'google',
    model: 'gemini-3-flash',
    thinking: true,
    tier: 'LOW',
    savesClaudeTokens: true,
    fallbackChain: ['gemini-2.5-flash'],
  },
};

// =============================================================================
// OMO 에이전트 정의
// =============================================================================

export const OMO_AGENTS = {
  build: {
    description: '메인 구현/빌드 에이전트',
    capabilities: ['edit', 'write', 'bash', 'read', 'grep', 'glob'],
  },
  explore: {
    description: '코드베이스 탐색 에이전트',
    capabilities: ['read', 'grep', 'glob', 'bash', 'websearch', 'webfetch'],
  },
  plan: {
    description: '계획 수립 에이전트',
    capabilities: ['read', 'grep', 'glob', 'websearch'],
  },
  general: {
    description: '범용 서브에이전트',
    capabilities: ['read', 'grep', 'glob', 'bash', 'websearch', 'webfetch'],
  },
};

// =============================================================================
// OMC → OMO 에이전트 퓨전 매핑 (28개 + 2 alias) - OMC v4.1.4 호환
// =============================================================================

export const FUSION_MAP = {
  // =========================================================================
  // HIGH Tier (11개) - Claude Opus 4.6 유지 (복잡한 추론)
  // =========================================================================

  architect: {
    omoAgent: 'build',
    model: MODELS.OPUS,
    reason: '전략적 아키텍처 분석은 Opus 품질 필요',
    fallbackToOMC: true,
  },

  'deep-executor': {
    omoAgent: 'build',
    model: MODELS.OPUS,
    reason: '복잡한 자율 작업 - Opus 필수',
    fallbackToOMC: true,
  },

  debugger: {
    omoAgent: 'build',
    model: MODELS.OPUS,
    reason: '복잡한 디버깅 분석',
    fallbackToOMC: true,
  },

  planner: {
    omoAgent: 'plan',
    model: MODELS.OPUS,
    reason: '전략적 계획 수립',
    fallbackToOMC: true,
  },

  critic: {
    omoAgent: 'plan',
    model: MODELS.OPUS,
    reason: '플랜 검토 및 비평',
    fallbackToOMC: true,
  },

  analyst: {
    omoAgent: 'plan',
    model: MODELS.OPUS,
    reason: '요구사항 분석',
    fallbackToOMC: true,
  },

  'security-reviewer': {
    omoAgent: 'build',
    model: MODELS.OPUS,
    reason: '보안 취약점 심층 분석',
    fallbackToOMC: true,
  },

  'code-reviewer': {
    omoAgent: 'build',
    model: MODELS.OPUS,
    reason: '전문 코드 리뷰',
    fallbackToOMC: true,
  },

  'quality-reviewer': {
    omoAgent: 'build',
    model: MODELS.OPUS,
    reason: '품질 심층 리뷰',
    fallbackToOMC: true,
  },

  'product-manager': {
    omoAgent: 'plan',
    model: MODELS.OPUS,
    reason: '제품 전략 및 관리',
    fallbackToOMC: true,
  },

  'information-architect': {
    omoAgent: 'plan',
    model: MODELS.OPUS,
    reason: '정보 구조 설계',
    fallbackToOMC: true,
  },

  // =========================================================================
  // MEDIUM Tier (13개) - GPT 5.3 Codex / Gemini Pro ⭐ 토큰 절약!
  // =========================================================================

  executor: {
    omoAgent: 'build',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex - 표준 기능 구현',
    fallbackToOMC: false,
  },

  'dependency-expert': {
    omoAgent: 'general',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex - 의존성/문서 조사',
    fallbackToOMC: false,
  },

  designer: {
    omoAgent: 'build',
    model: MODELS.GEMINI_PRO,
    reason: 'Gemini 3 Pro - UI/UX 디자인 구현 (1M 컨텍스트)',
    fallbackToOMC: false,
  },

  vision: {
    omoAgent: 'general',
    model: MODELS.GEMINI_PRO,
    reason: 'Gemini 3 Pro - 이미지/다이어그램 분석 (멀티모달)',
    fallbackToOMC: false,
  },

  'qa-tester': {
    omoAgent: 'build',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex - 인터랙티브 CLI 테스팅',
    fallbackToOMC: false,
  },

  'build-fixer': {
    omoAgent: 'build',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex - 빌드/타입 오류 수정',
    fallbackToOMC: false,
  },

  'test-engineer': {
    omoAgent: 'build',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex - TDD/테스트 작성 (was tdd-guide)',
    fallbackToOMC: false,
  },

  scientist: {
    omoAgent: 'build',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex - 데이터 분석',
    fallbackToOMC: false,
  },

  'git-master': {
    omoAgent: 'build',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex - Git 작업 관리',
    fallbackToOMC: false,
  },

  verifier: {
    omoAgent: 'build',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex - 코드 검증',
    fallbackToOMC: false,
  },

  'api-reviewer': {
    omoAgent: 'build',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex - API 설계 리뷰',
    fallbackToOMC: false,
  },

  'performance-reviewer': {
    omoAgent: 'build',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex - 성능 분석 리뷰',
    fallbackToOMC: false,
  },

  'quality-strategist': {
    omoAgent: 'plan',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex - 품질 전략 수립',
    fallbackToOMC: false,
  },

  'product-analyst': {
    omoAgent: 'plan',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex - 제품 분석',
    fallbackToOMC: false,
  },

  // =========================================================================
  // LOW Tier (4개) - Gemini 3 Flash Preview (thinking) ⭐ 토큰 절약!
  // =========================================================================

  explore: {
    omoAgent: 'explore',
    model: MODELS.FLASH,
    reason: 'Gemini Flash - 빠른 코드베이스 탐색',
    fallbackToOMC: false,
  },

  writer: {
    omoAgent: 'general',
    model: MODELS.FLASH,
    reason: 'Gemini Flash - 기술 문서 작성',
    fallbackToOMC: false,
  },

  'style-reviewer': {
    omoAgent: 'build',
    model: MODELS.FLASH,
    reason: 'Gemini Flash - 코드 스타일 체크',
    fallbackToOMC: false,
  },

  'ux-researcher': {
    omoAgent: 'general',
    model: MODELS.FLASH,
    reason: 'Gemini Flash - UX 리서치',
    fallbackToOMC: false,
  },

  // =========================================================================
  // Backward-compat aliases (OMC 4.0.x → 4.1.x)
  // =========================================================================

  researcher: {
    omoAgent: 'general',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex - backward-compat → dependency-expert',
    fallbackToOMC: false,
  },

  'tdd-guide': {
    omoAgent: 'build',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex - backward-compat → test-engineer',
    fallbackToOMC: false,
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
 * 티어별 에이전트 목록
 */
export function getAgentsByTier(tier) {
  return Object.entries(FUSION_MAP)
    .filter(([_, info]) => info.model.tier === tier)
    .map(([agent, info]) => ({
      omcAgent: agent,
      omoAgent: info.omoAgent,
      model: info.model.model,
      reason: info.reason,
    }));
}

/**
 * Claude 토큰 절약 가능한 에이전트 목록 (MEDIUM + LOW)
 */
export function getTokenSavingAgents() {
  return Object.entries(FUSION_MAP)
    .filter(([_, info]) => info.model.savesClaudeTokens)
    .map(([agent, info]) => ({
      omcAgent: agent,
      omoAgent: info.omoAgent,
      model: info.model.model,
      provider: info.model.provider,
    }));
}

/**
 * 통계 요약
 */
export function getFusionStats() {
  const total = Object.keys(FUSION_MAP).length;
  const highTier = Object.values(FUSION_MAP).filter((f) => f.model.tier === 'HIGH').length;
  const mediumTier = Object.values(FUSION_MAP).filter((f) => f.model.tier === 'MEDIUM').length;
  const lowTier = Object.values(FUSION_MAP).filter((f) => f.model.tier === 'LOW').length;
  const savingAgents = Object.values(FUSION_MAP).filter((f) => f.model.savesClaudeTokens).length;

  return {
    totalAgents: total,
    highTier,
    mediumTier,
    lowTier,
    claudeSavingAgents: savingAgents,
    claudeSavingsPercent: Math.round((savingAgents / total) * 100),
  };
}

/**
 * OpenCode 실행 명령어 생성
 */
export function buildOpenCodeCommand(omcAgent, prompt, options = {}) {
  const fusion = FUSION_MAP[omcAgent];
  if (!fusion) {
    return null;
  }

  const model = `${fusion.model.provider}/${fusion.model.model}`;
  const agent = fusion.omoAgent;

  // thinking 모드가 활성화된 경우 /ulw 커맨드 포함
  const thinkingPrefix = fusion.model.thinking ? '/ulw ' : '';

  return {
    command: 'opencode',
    args: ['run', '--format', 'json', '--model', model, '--agent', agent],
    prompt: `${thinkingPrefix}${prompt}`,
    model,
    agent,
    savesTokens: fusion.model.savesClaudeTokens,
  };
}

/**
 * 작업 배치에 대한 예상 절약량 계산
 */
export function estimateBatchSavings(tasks) {
  let totalTokens = 0;
  let savedTokens = 0;

  for (const task of tasks) {
    const fusion = FUSION_MAP[task.type];
    const estimatedTaskTokens = task.estimatedTokens || 1000;

    totalTokens += estimatedTaskTokens;

    if (fusion && fusion.model.savesClaudeTokens) {
      savedTokens += estimatedTaskTokens;
    }
  }

  return {
    totalTokens,
    savedTokens,
    savingsPercent: totalTokens > 0 ? Math.round((savedTokens / totalTokens) * 100) : 0,
  };
}

// =============================================================================
// 기본 모드 체크
// =============================================================================

/**
 * 퓨전 모드 활성화 여부 확인
 * - 기본 모드: Claude만 사용 (이 매핑 무시)
 * - 퓨전/폴백 모드: 이 매핑 적용
 */
export function shouldUseFusionMapping(fusionState) {
  if (!fusionState) return false;

  // 퓨전 모드가 명시적으로 활성화된 경우
  if (fusionState.enabled && fusionState.mode === 'save-tokens') {
    return true;
  }

  // 폴백 모드가 활성화된 경우 (사용량 초과)
  if (fusionState.fallbackActive) {
    return true;
  }

  // team 모드가 활성화된 경우 (OMC 4.1.4, was hulw)
  if (fusionState.teamMode || fusionState.hulwMode) {
    return true;
  }

  return false;
}
