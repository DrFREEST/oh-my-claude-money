/**
 * agent-fusion-map.mjs - OMC ↔ OMO 에이전트 퓨전 매핑 v3.0
 *
 * 퓨전/폴백 모드에서 oh-my-claudecode(OMC) 에이전트를
 * oh-my-opencode(OMO) 에이전트로 매핑하여 Claude 토큰 절약
 *
 * OMC v4.0.6 호환 - Codex fallback chain 반영
 *
 * 티어별 모델 분배:
 * - HIGH (Opus급): Claude Opus 4.6 유지 - 복잡한 추론 필요
 * - MEDIUM (Sonnet급): gpt-5.3-codex (thinking) - 표준 구현 작업
 * - LOW (Haiku급): gemini-3-flash-preview (thinking) - 빠른 탐색/간단한 작업
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
  // OMC 4.0.6 fallback chain: gpt-5.3-codex → gpt-5.3 → gpt-5.2-codex → gpt-5.2
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
    model: 'gemini-3-pro-preview',
    thinking: true,
    tier: 'MEDIUM',
    savesClaudeTokens: true,
    fallbackChain: ['gemini-3-flash-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'],
  },

  // LOW Tier - Gemini 3 Flash Preview (빠른 응답, thinking 모드)
  FLASH: {
    provider: 'google',
    model: 'gemini-3-flash-preview',
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
// OMC → OMO 에이전트 퓨전 매핑 (33개) - OMC v4.0.6 호환
// =============================================================================

export const FUSION_MAP = {
  // =========================================================================
  // HIGH Tier (13개) - Claude Opus 4.6 유지 (복잡한 추론)
  // =========================================================================

  architect: {
    omoAgent: 'build',
    model: MODELS.OPUS,
    reason: '전략적 아키텍처 분석은 Opus 품질 필요',
    fallbackToOMC: true,
  },

  'executor-high': {
    omoAgent: 'build',
    model: MODELS.OPUS,
    reason: '복잡한 멀티파일 구현',
    fallbackToOMC: true,
  },

  'explore-high': {
    omoAgent: 'explore',
    model: MODELS.OPUS,
    reason: '복잡한 아키텍처 탐색',
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

  'qa-tester-high': {
    omoAgent: 'build',
    model: MODELS.OPUS,
    reason: '포괄적 프로덕션 QA',
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

  'scientist-high': {
    omoAgent: 'build',
    model: MODELS.OPUS,
    reason: '복잡한 ML/가설 검증',
    fallbackToOMC: true,
  },

  'designer-high': {
    omoAgent: 'build',
    model: MODELS.OPUS,
    reason: '복잡한 UI 시스템 설계',
    fallbackToOMC: true,
  },

  // =========================================================================
  // MEDIUM Tier (10개) - GPT 5.3 Codex (thinking) ⭐ 토큰 절약!
  // =========================================================================

  'architect-medium': {
    omoAgent: 'build',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex - 중간 복잡도 아키텍처 분석',
    fallbackToOMC: false,
  },

  executor: {
    omoAgent: 'build',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex - 표준 기능 구현',
    fallbackToOMC: false,
  },

  'explore-medium': {
    omoAgent: 'explore',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex - 깊은 코드베이스 탐색',
    fallbackToOMC: false,
  },

  researcher: {
    omoAgent: 'general',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex - 외부 문서 리서치',
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
    reason: 'GPT 5.3 Codex -인터랙티브 CLI 테스팅',
    fallbackToOMC: false,
  },

  'build-fixer': {
    omoAgent: 'build',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex -빌드/타입 오류 수정',
    fallbackToOMC: false,
  },

  'tdd-guide': {
    omoAgent: 'build',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex -TDD 워크플로우 가이드',
    fallbackToOMC: false,
  },

  scientist: {
    omoAgent: 'build',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex -데이터 분석',
    fallbackToOMC: false,
  },

  // =========================================================================
  // LOW Tier (8개) - Gemini 3 Flash Preview (thinking) ⭐ 토큰 절약!
  // =========================================================================

  'architect-low': {
    omoAgent: 'explore',
    model: MODELS.FLASH,
    reason: 'Gemini Flash - 간단한 코드 질문',
    fallbackToOMC: false,
  },

  'executor-low': {
    omoAgent: 'build',
    model: MODELS.FLASH,
    reason: 'Gemini Flash - 간단한 싱글파일 작업',
    fallbackToOMC: false,
  },

  explore: {
    omoAgent: 'explore',
    model: MODELS.FLASH,
    reason: 'Gemini Flash - 빠른 코드베이스 탐색',
    fallbackToOMC: false,
  },

  'researcher-low': {
    omoAgent: 'general',
    model: MODELS.FLASH,
    reason: 'Gemini Flash - 빠른 문서 조회',
    fallbackToOMC: false,
  },

  'designer-low': {
    omoAgent: 'build',
    model: MODELS.FLASH,
    reason: 'Gemini Flash - 간단한 스타일링',
    fallbackToOMC: false,
  },

  writer: {
    omoAgent: 'general',
    model: MODELS.FLASH,
    reason: 'Gemini Flash - 기술 문서 작성',
    fallbackToOMC: false,
  },

  'security-reviewer-low': {
    omoAgent: 'build',
    model: MODELS.FLASH,
    reason: 'Gemini Flash - 빠른 보안 스캔',
    fallbackToOMC: false,
  },

  'build-fixer-low': {
    omoAgent: 'build',
    model: MODELS.FLASH,
    reason: 'Gemini Flash - 간단한 빌드 오류 수정',
    fallbackToOMC: false,
  },

  'tdd-guide-low': {
    omoAgent: 'build',
    model: MODELS.FLASH,
    reason: 'Gemini Flash - 빠른 테스트 제안',
    fallbackToOMC: false,
  },

  'code-reviewer-low': {
    omoAgent: 'build',
    model: MODELS.FLASH,
    reason: 'Gemini Flash - 빠른 코드 체크',
    fallbackToOMC: false,
  },

  'scientist-low': {
    omoAgent: 'build',
    model: MODELS.FLASH,
    reason: 'Gemini Flash - 빠른 데이터 검사',
    fallbackToOMC: false,
  },

  'qa-tester-low': {
    omoAgent: 'build',
    model: MODELS.FLASH,
    reason: 'Gemini Flash - 빠른 QA 테스트',
    fallbackToOMC: false,
  },

  // =========================================================================
  // 추가 HIGH Tier (v0.7.0 + v1.1.0)
  // =========================================================================

  'researcher-high': {
    omoAgent: 'general',
    model: MODELS.OPUS,
    reason: '심층 연구 및 복잡한 문서 분석',
    fallbackToOMC: true,
  },

  'build-fixer-high': {
    omoAgent: 'build',
    model: MODELS.OPUS,
    reason: '복잡한 빌드/컴파일 오류 해결',
    fallbackToOMC: true,
  },

  // v1.1.0 신규 에이전트 (OMC v4.0.0+)
  'deep-executor': {
    omoAgent: 'build',
    model: MODELS.OPUS,
    reason: '복잡한 자율 작업 - Opus 필수',
    fallbackToOMC: true,
  },

  'git-master': {
    omoAgent: 'build',
    model: MODELS.CODEX,
    reason: 'GPT 5.3 Codex - Git 작업 관리',
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

  // hulw 모드가 활성화된 경우
  if (fusionState.hulwMode) {
    return true;
  }

  return false;
}
