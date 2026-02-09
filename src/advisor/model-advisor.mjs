/**
 * model-advisor.mjs - OMC v4.1.3 모델 최적화 어드바이저
 *
 * 작업 복잡도 분석 및 모델 다운그레이드 추천을 통해
 * 비용 최적화를 지원합니다.
 *
 * OMC 4.1.3 Codex fallback chain 반영:
 *   gpt-5.3-codex → gpt-5.3 → gpt-5.2-codex → gpt-5.2
 *
 * @version 1.1.0
 */

// =============================================================================
// 모델별 비용 (1K 토큰 기준 추정, USD)
// =============================================================================

export var MODEL_COSTS = {
  // Anthropic
  'claude-opus-4-6-20260205': { input: 0.015, output: 0.075, tier: 'HIGH' },
  'claude-sonnet-4-5-20250929': { input: 0.003, output: 0.015, tier: 'MEDIUM' },
  'claude-haiku-4-5-20251001': { input: 0.0008, output: 0.004, tier: 'LOW' },

  // OpenAI - OMC 4.1.3 fallback chain
  'gpt-5.3-codex': { input: 0.005, output: 0.02, tier: 'MEDIUM' },
  'gpt-5.3': { input: 0.005, output: 0.02, tier: 'MEDIUM' },
  'gpt-5.2-codex': { input: 0.003, output: 0.012, tier: 'MEDIUM' },
  'gpt-5.2': { input: 0.003, output: 0.012, tier: 'MEDIUM' },

  // Google
  'gemini-3-pro': { input: 0.002, output: 0.008, tier: 'MEDIUM' },
  'gemini-3-flash': { input: 0.0005, output: 0.002, tier: 'LOW' },
  'gemini-2.5-pro': { input: 0.002, output: 0.008, tier: 'MEDIUM' },
  'gemini-2.5-flash': { input: 0.0003, output: 0.001, tier: 'LOW' },
};

// =============================================================================
// 작업 복잡도 분석
// =============================================================================

/**
 * 작업 복잡도 분석
 *
 * @param {object} task - 작업 정보
 * @param {string} task.agentType - OMC 에이전트 타입
 * @param {string} [task.prompt] - 프롬프트 텍스트
 * @param {number} [task.contextFiles] - 컨텍스트 파일 수
 * @returns {object} - { complexity: 'low'|'medium'|'high', score: number, factors: string[] }
 */
export function analyzeTaskComplexity(task) {
  var score = 0;
  var factors = [];
  var agentType = task.agentType || '';
  var prompt = task.prompt || '';
  var contextFiles = task.contextFiles || 0;

  // 에이전트 기반 복잡도 (OMC 4.1.3 Lane 기반)
  var highAgents = ['architect', 'planner', 'critic', 'analyst', 'deep-executor',
    'security-reviewer', 'code-reviewer', 'quality-reviewer', 'api-reviewer',
    'performance-reviewer', 'debugger', 'quality-strategist',
    'product-manager', 'information-architect', 'product-analyst'];
  var mediumAgents = ['executor', 'explore', 'dependency-expert', 'researcher',
    'designer', 'vision', 'qa-tester', 'build-fixer', 'test-engineer', 'tdd-guide',
    'scientist', 'git-master', 'verifier', 'style-reviewer', 'ux-researcher', 'writer'];

  var isHigh = false;
  for (var i = 0; i < highAgents.length; i++) {
    if (agentType === highAgents[i]) { isHigh = true; break; }
  }
  if (isHigh) {
    score += 3;
    factors.push('high-tier-agent');
  } else {
    var isMedium = false;
    for (var j = 0; j < mediumAgents.length; j++) {
      if (agentType === mediumAgents[j]) { isMedium = true; break; }
    }
    if (isMedium) {
      score += 2;
      factors.push('medium-tier-agent');
    } else {
      score += 1;
      factors.push('low-tier-agent');
    }
  }

  // 프롬프트 길이 기반
  if (prompt.length > 2000) {
    score += 2;
    factors.push('long-prompt');
  } else if (prompt.length > 500) {
    score += 1;
    factors.push('medium-prompt');
  }

  // 컨텍스트 파일 수 기반
  if (contextFiles > 10) {
    score += 2;
    factors.push('many-context-files');
  } else if (contextFiles > 3) {
    score += 1;
    factors.push('some-context-files');
  }

  // 키워드 기반 복잡도
  var complexKeywords = ['refactor', 'architecture', 'security', 'migration',
    '리팩토링', '아키텍처', '보안', '마이그레이션', '전체', 'all files'];
  var promptLower = prompt.toLowerCase();
  for (var k = 0; k < complexKeywords.length; k++) {
    if (promptLower.indexOf(complexKeywords[k]) !== -1) {
      score += 1;
      factors.push('complex-keyword: ' + complexKeywords[k]);
      break;
    }
  }

  var complexity = 'low';
  if (score >= 5) complexity = 'high';
  else if (score >= 3) complexity = 'medium';

  return { complexity: complexity, score: score, factors: factors };
}

// =============================================================================
// 모델 다운그레이드 추천
// =============================================================================

/**
 * 모델 다운그레이드 추천
 *
 * 현재 모델보다 저렴한 대안이 있으면 추천합니다.
 * 작업 복잡도가 낮으면 더 적극적으로 다운그레이드를 추천합니다.
 *
 * @param {string} currentModel - 현재 모델 ID
 * @param {object} task - 작업 정보 (analyzeTaskComplexity 입력과 동일)
 * @returns {object|null} - { recommendedModel, savings, reason } 또는 null
 */
export function getModelDowngradeRecommendation(currentModel, task) {
  var complexity = analyzeTaskComplexity(task);
  var currentCost = MODEL_COSTS[currentModel];
  if (!currentCost) return null;

  // 다운그레이드 체인
  var downgradeChains = {
    'claude-opus-4-6-20260205': ['gpt-5.3-codex', 'gemini-3-flash'],
    'gpt-5.3-codex': ['gpt-5.3', 'gpt-5.2-codex', 'gemini-3-flash'],
    'gpt-5.3': ['gpt-5.2-codex', 'gpt-5.2', 'gemini-3-flash'],
    'gpt-5.2-codex': ['gpt-5.2', 'gemini-3-flash'],
    'gemini-3-pro': ['gemini-3-flash', 'gemini-2.5-flash'],
    'gemini-3-flash': ['gemini-2.5-flash'],
  };

  var chain = downgradeChains[currentModel];
  if (!chain) return null;

  // 복잡도에 따른 다운그레이드 허용 범위
  var maxTierDrop = 0;
  if (complexity.complexity === 'low') maxTierDrop = 2;
  else if (complexity.complexity === 'medium') maxTierDrop = 1;
  else return null; // high 복잡도는 다운그레이드 불가

  var tierRank = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
  var currentTierRank = tierRank[currentCost.tier] || 2;

  for (var i = 0; i < chain.length; i++) {
    var candidate = chain[i];
    var candidateCost = MODEL_COSTS[candidate];
    if (!candidateCost) continue;

    var candidateTierRank = tierRank[candidateCost.tier] || 1;
    var tierDrop = currentTierRank - candidateTierRank;

    if (tierDrop <= maxTierDrop) {
      var savingsPercent = Math.round(
        ((currentCost.input - candidateCost.input) / currentCost.input) * 100
      );

      if (savingsPercent > 10) {
        return {
          recommendedModel: candidate,
          currentModel: currentModel,
          savings: savingsPercent,
          reason: complexity.complexity + '-complexity-allows-downgrade',
          complexity: complexity,
        };
      }
    }
  }

  return null;
}

// =============================================================================
// 비용 요약
// =============================================================================

/**
 * 세션 비용 요약
 *
 * @param {Array} calls - MCP 호출 기록 배열
 * @param {string} calls[].model - 모델 ID
 * @param {number} [calls[].inputTokens] - 입력 토큰 수
 * @param {number} [calls[].outputTokens] - 출력 토큰 수
 * @returns {object} - { totalCost, byModel, byProvider, callCount }
 */
export function getCostSummary(calls) {
  var summary = {
    totalCost: 0,
    byModel: {},
    byProvider: { anthropic: 0, openai: 0, google: 0 },
    callCount: calls.length,
  };

  for (var i = 0; i < calls.length; i++) {
    var call = calls[i];
    var model = call.model || 'unknown';
    var cost = MODEL_COSTS[model];
    if (!cost) continue;

    var inputTokens = (call.inputTokens || 0) / 1000;
    var outputTokens = (call.outputTokens || 0) / 1000;
    var callCost = (inputTokens * cost.input) + (outputTokens * cost.output);

    summary.totalCost += callCost;

    if (!summary.byModel[model]) {
      summary.byModel[model] = { cost: 0, calls: 0 };
    }
    summary.byModel[model].cost += callCost;
    summary.byModel[model].calls++;

    // 프로바이더 분류
    if (model.indexOf('claude') !== -1) {
      summary.byProvider.anthropic += callCost;
    } else if (model.indexOf('gpt') !== -1 || model.indexOf('codex') !== -1) {
      summary.byProvider.openai += callCost;
    } else if (model.indexOf('gemini') !== -1) {
      summary.byProvider.google += callCost;
    }
  }

  // 소수점 정리
  summary.totalCost = Math.round(summary.totalCost * 10000) / 10000;
  var providers = Object.keys(summary.byProvider);
  for (var p = 0; p < providers.length; p++) {
    summary.byProvider[providers[p]] = Math.round(summary.byProvider[providers[p]] * 10000) / 10000;
  }

  return summary;
}
