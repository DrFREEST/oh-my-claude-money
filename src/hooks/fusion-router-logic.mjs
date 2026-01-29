/**
 * fusion-router-logic.mjs - 퓨전 라우터 핵심 로직 (테스트 가능)
 *
 * hooks/fusion-router.mjs에서 사용되는 핵심 로직을 분리
 */

import { readFileSync, existsSync, mkdirSync, openSync, writeSync, closeSync, writeFileSync } from 'fs';
import { join } from 'path';
import { getSessionIdFromTty } from '../utils/session-id.mjs';

// Constants
const HOME = process.env.HOME || '';
export const OMCM_DIR = join(HOME, '.omcm');
export const FUSION_STATE_FILE = join(OMCM_DIR, 'fusion-state.json');
export const FALLBACK_STATE_FILE = join(OMCM_DIR, 'fallback-state.json');
export const PROVIDER_LIMITS_FILE = join(OMCM_DIR, 'provider-limits.json');
export const ROUTING_LOG_FILE = join(OMCM_DIR, 'routing-log.jsonl');
export const CONFIG_FILE = join(HOME, '.claude', 'plugins', 'omcm', 'config.json');

/**
 * OMCM 디렉토리 존재 확인 및 생성
 */
export function ensureOmcmDir() {
  if (!existsSync(OMCM_DIR)) {
    mkdirSync(OMCM_DIR, { recursive: true });
  }
}

/**
 * JSON 파일 안전 읽기
 * @param {string} filepath - 파일 경로
 * @returns {object|null} - 파싱된 JSON 객체 또는 null
 */
export function readJsonFile(filepath) {
  if (!existsSync(filepath)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(filepath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

/**
 * 라우팅 결정 로그 기록
 * @param {object} decision - 라우팅 결정 정보
 */
export function logRouting(decision) {
  ensureOmcmDir();
  var entry = {
    timestamp: new Date().toISOString(),
    toolName: decision.toolName,
    subagentType: decision.subagentType,
    decision: decision.decision,
    reason: decision.reason,
    target: decision.target
  };
  var line = JSON.stringify(entry) + '\n';

  try {
    var fd = openSync(ROUTING_LOG_FILE, 'a');
    writeSync(fd, line);
    closeSync(fd);
  } catch (e) {
    // 로깅 실패 무시
  }
}

/**
 * OMC 에이전트를 OpenCode 에이전트로 매핑
 *
 * OMC 3.6.0 기준 에이전트: architect, researcher, explore, executor, designer,
 *                        writer, vision, critic, analyst, orchestrator, planner, qa-tester
 *
 * OMO 3.1.0 기준 에이전트: Oracle (GPT), Flash (Gemini), Codex (GPT),
 *                        explore, librarian, frontend-ui-ux-engineer, document-writer, multimodal-looker
 *
 * @param {string} agentType - OMC 에이전트 타입
 * @returns {string} - OpenCode 에이전트
 */
export function mapAgentToOpenCode(agentType) {
  var mapping = {
    // 분석/아키텍처
    'architect': 'Oracle',           // 복잡한 추론
    'architect-low': 'Flash',        // 빠른 분석
    'architect-medium': 'Oracle',
    'analyst': 'Oracle',
    'critic': 'Oracle',

    // 연구/문서
    'researcher': 'Oracle',
    'researcher-low': 'Flash',       // 빠른 조회

    // 탐색
    'explore': 'Flash',              // 빠른 탐색
    'explore-medium': 'Oracle',      // 중간 복잡도
    'explore-high': 'Oracle',        // 복잡한 탐색

    // 데이터 과학
    'scientist': 'Oracle',
    'scientist-low': 'Flash',
    'scientist-high': 'Oracle',

    // 프론트엔드/디자인
    'designer': 'Flash',             // 빠른 UI 작업
    'designer-low': 'Flash',
    'designer-high': 'Codex',        // 복잡한 UI 구현

    // 문서 작성
    'writer': 'Flash',               // 빠른 문서 작성

    // 비전/멀티모달
    'vision': 'Flash',               // 이미지 분석

    // 실행/구현
    'executor': 'Codex',             // 코드 작성
    'executor-low': 'Flash',         // 간단한 수정
    'executor-high': 'Codex',        // 복잡한 구현

    // 테스트/QA
    'qa-tester': 'Codex',
    'qa-tester-high': 'Codex',
    'tdd-guide': 'Codex',
    'tdd-guide-low': 'Flash',

    // 빌드/에러 수정
    'build-fixer': 'Codex',
    'build-fixer-low': 'Flash',      // 간단한 빌드 수정

    // 코드 리뷰/보안
    'code-reviewer': 'Oracle',
    'code-reviewer-low': 'Flash',
    'security-reviewer': 'Oracle',
    'security-reviewer-low': 'Flash',

    // 조율
    'orchestrator': 'Oracle',

    // 계획 (Claude 유지 권장, 하지만 폴백 시 Oracle)
    'planner': 'Oracle'
  };
  return mapping[agentType] || 'Codex';
}

/**
 * OMO 에이전트에 해당하는 모델 정보 반환
 * @param {string} omoAgent - OMO 에이전트 이름
 * @returns {object} - { id: string, name: string }
 */
export function getModelInfoForAgent(omoAgent) {
  // Gemini 기반 에이전트
  var geminiAgents = ['explore', 'frontend-ui-ux-engineer', 'document-writer', 'multimodal-looker', 'Flash'];
  // GPT Oracle 기반 에이전트
  var oracleAgents = ['Oracle', 'librarian'];
  // GPT Codex 기반 에이전트
  var codexAgents = ['Codex'];

  for (var i = 0; i < geminiAgents.length; i++) {
    if (omoAgent === geminiAgents[i]) {
      if (omoAgent === 'frontend-ui-ux-engineer') {
        return { id: 'gemini-pro', name: 'Gemini 3 Pro' };
      }
      return { id: 'gemini-flash', name: 'Gemini 3 Flash' };
    }
  }

  for (var j = 0; j < oracleAgents.length; j++) {
    if (omoAgent === oracleAgents[j]) {
      return { id: 'gpt-5.2', name: 'GPT 5.2 Oracle' };
    }
  }

  for (var k = 0; k < codexAgents.length; k++) {
    if (omoAgent === codexAgents[k]) {
      return { id: 'gpt-5.2-codex', name: 'GPT 5.2 Codex' };
    }
  }

  // 기본값
  return { id: 'gpt-5.2-codex', name: 'GPT 5.2 Codex' };
}

/**
 * OpenCode로 라우팅해야 하는지 확인
 * @param {object} toolInput - 도구 입력
 * @param {object} [options] - 옵션 (테스트용 의존성 주입)
 * @param {object} [options.fusion] - 퓨전 상태 (주입)
 * @param {object} [options.fallback] - 폴백 상태 (주입)
 * @param {object} [options.limits] - 프로바이더 리밋 (주입)
 * @param {object} [options.config] - 설정 (주입)
 * @returns {object} - { route: boolean, reason: string, targetModel?: object, opencodeAgent?: string }
 */
export function shouldRouteToOpenCode(toolInput, options = {}) {
  // 의존성 주입 지원 (테스트용)
  var fusion = options.fusion !== undefined ? options.fusion : readJsonFile(FUSION_STATE_FILE);
  var fallback = options.fallback !== undefined ? options.fallback : readJsonFile(FALLBACK_STATE_FILE);
  var limits = options.limits !== undefined ? options.limits : readJsonFile(PROVIDER_LIMITS_FILE);
  var config = options.config !== undefined ? options.config : readJsonFile(CONFIG_FILE);

  // fusionDefault 설정 확인
  var fusionDefault = config && config.fusionDefault === true;

  // 퓨전 비활성화 상태 (fusionDefault가 true면 무시)
  if (!fusionDefault && (!fusion || fusion.enabled === false)) {
    return { route: false, reason: 'fusion-disabled' };
  }

  // 폴백 활성화 상태 - 반드시 OpenCode로 라우팅
  if (fallback && fallback.fallbackActive) {
    var currentModel = fallback.currentModel;
    var opencodeAgent = 'Codex';
    if (currentModel && currentModel.opencodeAgent) {
      opencodeAgent = currentModel.opencodeAgent;
    }
    return {
      route: true,
      reason: 'fallback-active',
      targetModel: currentModel,
      opencodeAgent: opencodeAgent
    };
  }

  // Claude 리밋 체크 (90% 임계값)
  if (limits && limits.claude) {
    var fiveHourPercent = 0;
    var weeklyPercent = 0;

    if (limits.claude.fiveHour && typeof limits.claude.fiveHour.percent === 'number') {
      fiveHourPercent = limits.claude.fiveHour.percent;
    }
    if (limits.claude.weekly && typeof limits.claude.weekly.percent === 'number') {
      weeklyPercent = limits.claude.weekly.percent;
    }

    var maxPercent = Math.max(fiveHourPercent, weeklyPercent);

    if (maxPercent >= 90) {
      // 에이전트 매핑 존중
      var agentType = '';
      if (toolInput && toolInput.subagent_type) {
        agentType = toolInput.subagent_type.replace('oh-my-claudecode:', '');
      }
      var mappedAgent = agentType ? mapAgentToOpenCode(agentType) : 'Codex';
      var modelInfo = getModelInfoForAgent(mappedAgent);

      return {
        route: true,
        reason: 'claude-limit-' + maxPercent + '%',
        targetModel: { id: modelInfo.id, name: modelInfo.name },
        opencodeAgent: mappedAgent
      };
    }
  }

  // 프롬프트 기반 작업 규모 판단 (대규모 작업 라우팅 우선도 상승)
  if (toolInput && toolInput.subagent_type && toolInput.prompt) {
    var promptLen = toolInput.prompt.length || 0;
    var promptLower = toolInput.prompt.toLowerCase();
    var agentTypePrompt = toolInput.subagent_type.replace('oh-my-claudecode:', '');

    // 대규모 작업 키워드
    var largeTaskKeywords = ['리팩토링', '전체', '모든 파일', '모든 ', 'refactor', 'all files', 'entire', 'complete'];
    var isLargeTask = promptLen > 500;

    if (!isLargeTask) {
      for (var ki = 0; ki < largeTaskKeywords.length; ki++) {
        if (promptLower.indexOf(largeTaskKeywords[ki]) !== -1) {
          isLargeTask = true;
          break;
        }
      }
    }

    // 대규모 작업이면 planner 제외 모든 에이전트 라우팅 (fusionDefault처럼)
    if (isLargeTask && agentTypePrompt !== 'planner') {
      var largeAgent = mapAgentToOpenCode(agentTypePrompt);
      var largeModel = getModelInfoForAgent(largeAgent);

      return {
        route: true,
        reason: 'large-task-' + agentTypePrompt,
        targetModel: { id: largeModel.id, name: largeModel.name },
        opencodeAgent: largeAgent
      };
    }
  }

  // 세션 토큰 기반 동적 라우팅 (fusion-state에서 토큰 읽기)
  if (toolInput && toolInput.subagent_type) {
    var agentTypeForLevel = toolInput.subagent_type.replace('oh-my-claudecode:', '');

    // fusion-state에서 세션 토큰 읽기
    var sessionTokens = 0;
    if (fusion && fusion.actualTokens && fusion.actualTokens.claude) {
      sessionTokens = fusion.actualTokens.claude.input || 0;
    }

    if (sessionTokens >= 5000000) {
      var routingLevel = getRoutingLevel(sessionTokens);

      // 현재 에이전트가 라우팅 레벨에 포함되는지 확인
      var isInLevel = false;
      for (var idx = 0; idx < routingLevel.agents.length; idx++) {
        if (agentTypeForLevel === routingLevel.agents[idx]) {
          isInLevel = true;
          break;
        }
      }

      if (isInLevel) {
        var levelAgent = mapAgentToOpenCode(agentTypeForLevel);
        var levelModel = getModelInfoForAgent(levelAgent);

        return {
          route: true,
          reason: 'session-token-' + routingLevel.name + '-' + agentTypeForLevel,
          targetModel: { id: levelModel.id, name: levelModel.name },
          opencodeAgent: levelAgent,
          routingLevel: routingLevel.level
        };
      }
    }
  }

  // fusionDefault가 true이거나 save-tokens 모드에서 에이전트 라우팅
  var shouldRouteByMode = fusionDefault || (fusion && fusion.mode === 'save-tokens');

  if (toolInput && toolInput.subagent_type && shouldRouteByMode) {
    var agentType = toolInput.subagent_type.replace('oh-my-claudecode:', '');

    // planner만 Claude에서 유지 (전략적 계획 수립)
    // 나머지 모든 에이전트는 fusionDefault 모드에서 OpenCode로 라우팅
    var claudeOnlyInFusion = ['planner'];

    var isClaudeOnly = false;
    for (var i = 0; i < claudeOnlyInFusion.length; i++) {
      if (agentType === claudeOnlyInFusion[i]) {
        isClaudeOnly = true;
        break;
      }
    }

    // fusionDefault 모드에서는 planner 제외 모든 에이전트 라우팅
    if (fusionDefault && !isClaudeOnly) {
      var mappedAgent = mapAgentToOpenCode(agentType);
      var modelInfo = getModelInfoForAgent(mappedAgent);

      return {
        route: true,
        reason: 'fusion-default-' + agentType,
        targetModel: { id: modelInfo.id, name: modelInfo.name },
        opencodeAgent: mappedAgent
      };
    }

    // save-tokens 모드: 특정 에이전트만 라우팅 (분석/탐색 위주)
    // executor, critic, planner, qa-tester, build-fixer, tdd-guide는 Claude 전용
    if (!fusionDefault && fusion && fusion.mode === 'save-tokens') {
      var tokenSavingAgents = [
        // 분석/아키텍처
        'architect', 'architect-low', 'architect-medium',
        // 연구
        'researcher', 'researcher-low',
        // 탐색
        'explore', 'explore-medium', 'explore-high',
        // 데이터 과학
        'scientist', 'scientist-low', 'scientist-high',
        // 디자인/문서/비전
        'designer', 'designer-low', 'designer-high',
        'writer', 'vision',
        // 코드 리뷰/보안
        'code-reviewer', 'code-reviewer-low',
        'security-reviewer', 'security-reviewer-low'
      ];

      var shouldSave = false;
      for (var j = 0; j < tokenSavingAgents.length; j++) {
        if (agentType === tokenSavingAgents[j]) {
          shouldSave = true;
          break;
        }
      }

      if (shouldSave) {
        return {
          route: true,
          reason: 'token-saving-agent-' + agentType,
          targetModel: { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex' },
          opencodeAgent: mapAgentToOpenCode(agentType)
        };
      }
    }
  }

  return { route: false, reason: 'no-routing-needed' };
}

/**
 * /ulw 커맨드 래핑
 * @param {string} prompt - 원본 프롬프트
 * @returns {string} - /ulw로 래핑된 프롬프트
 */
export function wrapWithUlwCommand(prompt) {
  if (!prompt) return prompt;
  if (prompt.includes('/ulw') || prompt.includes('/ultrawork')) {
    return prompt;
  }
  return '/ulw ' + prompt;
}

/**
 * 퓨전 상태 업데이트
 * @param {object} decision - 라우팅 결정
 * @param {object} result - 실행 결과
 * @param {string|null} [sessionId] - 세션 ID (null이면 글로벌)
 * @param {object} [currentState] - 현재 상태 (테스트용 주입)
 * @returns {object} - 업데이트된 상태
 */
export function updateFusionState(decision, result, sessionId = null, currentState = null) {
  ensureOmcmDir();

  // 세션별 또는 글로벌 상태 파일 경로 결정
  var stateFile = FUSION_STATE_FILE;
  if (sessionId) {
    var sessionDir = join(OMCM_DIR, 'sessions', sessionId);
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }
    stateFile = join(sessionDir, 'fusion-state.json');
  }

  var state = currentState !== null ? currentState : readJsonFile(stateFile);
  if (!state) {
    state = {
      enabled: true,
      mode: 'balanced',
      totalTasks: 0,
      routedToOpenCode: 0,
      routingRate: 0,
      estimatedSavedTokens: 0,
      byProvider: { gemini: 0, openai: 0, anthropic: 0 },
      sessionId: sessionId
    };
  }

  state.totalTasks++;

  if (decision.route) {
    state.routedToOpenCode++;
    state.estimatedSavedTokens += 1000;

    var model = decision.targetModel ? decision.targetModel.id : '';
    var agent = decision.opencodeAgent || '';

    if (model.indexOf('gemini') !== -1 || agent === 'Flash') {
      state.byProvider.gemini++;
    } else if (model.indexOf('gpt') !== -1 || model.indexOf('codex') !== -1) {
      state.byProvider.openai++;
    }
  } else {
    state.byProvider.anthropic++;
  }

  state.routingRate = state.totalTasks > 0
    ? Math.round((state.routedToOpenCode / state.totalTasks) * 100)
    : 0;
  state.lastUpdated = new Date().toISOString();

  writeFileSync(stateFile, JSON.stringify(state, null, 2));

  // 글로벌 상태도 함께 업데이트 (세션별 상태와 별개로 누적)
  if (sessionId) {
    var globalState = readJsonFile(FUSION_STATE_FILE);
    if (!globalState) {
      globalState = {
        enabled: true,
        mode: 'balanced',
        totalTasks: 0,
        routedToOpenCode: 0,
        routingRate: 0,
        estimatedSavedTokens: 0,
        byProvider: { gemini: 0, openai: 0, anthropic: 0 }
      };
    }
    globalState.totalTasks++;
    if (decision.route) {
      globalState.routedToOpenCode++;
      globalState.estimatedSavedTokens += 1000;
      var gModel = decision.targetModel ? decision.targetModel.id : '';
      var gAgent = decision.opencodeAgent || '';
      if (gModel.indexOf('gemini') !== -1 || gAgent === 'Flash') {
        globalState.byProvider.gemini++;
      } else if (gModel.indexOf('gpt') !== -1 || gModel.indexOf('codex') !== -1) {
        globalState.byProvider.openai++;
      }
    } else {
      globalState.byProvider.anthropic++;
    }
    globalState.routingRate = globalState.totalTasks > 0
      ? Math.round((globalState.routedToOpenCode / globalState.totalTasks) * 100) : 0;
    globalState.lastUpdated = new Date().toISOString();
    writeFileSync(FUSION_STATE_FILE, JSON.stringify(globalState, null, 2));
  }

  return state;
}

/**
 * 라우팅 가능한 에이전트 목록 (OpenCode로 라우팅하여 토큰 절약)
 * OMC 3.6.0 + OMO 3.1.0 기준
 * fusionDefault 모드에서는 planner 제외 모든 에이전트가 라우팅됨
 */
export const TOKEN_SAVING_AGENTS = [
  // 분석/아키텍처 (→ Oracle)
  'architect', 'architect-low', 'architect-medium',
  // 연구 (→ Oracle/librarian)
  'researcher', 'researcher-low',
  // 프론트엔드/디자인 (→ frontend-ui-ux-engineer)
  'designer', 'designer-low', 'designer-high',
  // 탐색 (→ explore)
  'explore', 'explore-medium', 'explore-high',
  // 데이터 과학 (→ Oracle)
  'scientist', 'scientist-low', 'scientist-high',
  // 문서/비전 (→ document-writer/multimodal-looker)
  'writer', 'vision',
  // 코드 리뷰/보안 (→ Oracle/explore)
  'code-reviewer', 'code-reviewer-low',
  'security-reviewer', 'security-reviewer-low'
];

/**
 * 라우팅 불가능한 에이전트 목록 (Claude 전용)
 * 실행, 테스트, 빌드 등 정확도가 중요한 작업은 Claude에서만 실행
 * planner, critic, executor*, qa-tester*, build-fixer*, tdd-guide*
 */
export const CLAUDE_ONLY_AGENTS = [
  'planner', 'critic', 'executor', 'executor-low', 'executor-high',
  'qa-tester', 'qa-tester-high', 'build-fixer', 'build-fixer-low',
  'tdd-guide', 'tdd-guide-low'
];

// =============================================================================
// v0.8.0 모듈 통합 - 동적 매핑, 규칙 엔진, 캐시
// =============================================================================

import { getAgentMapping, getDynamicMapping } from '../router/mapping.mjs';
import { evaluateRouting, interpretAction } from '../router/rules.mjs';
import { getCachedRoute, cacheRoute, getCacheStats } from '../router/cache.mjs';

/**
 * v0.8.0 향상된 라우팅 결정
 *
 * 1. 캐시 확인
 * 2. 동적 매핑 확인
 * 3. 조건부 규칙 평가
 * 4. 기본 로직 폴백
 *
 * @param {object} toolInput - 도구 입력
 * @param {object} context - 추가 컨텍스트 (usage, mode, task 정보)
 * @param {object} [options] - 옵션 (테스트용 의존성 주입)
 * @returns {object} - 라우팅 결정
 */
export function shouldRouteToOpenCodeV2(toolInput, context = {}, options = {}) {
  // 에이전트 타입 추출
  var agentType = '';
  if (toolInput && toolInput.subagent_type) {
    agentType = toolInput.subagent_type.replace('oh-my-claudecode:', '');
  }

  if (!agentType) {
    return { route: false, reason: 'no-agent-type' };
  }

  // 1. 캐시 확인
  var cached = getCachedRoute(agentType, context);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  // 2. 조건부 규칙 평가
  var ruleContext = {
    usage: context.usage || {},
    mode: context.mode || {},
    task: context.task || {},
    agent: { type: agentType },
  };

  var ruleResult = evaluateRouting(ruleContext);

  if (ruleResult.matched) {
    var action = interpretAction(ruleResult.action);

    // prefer 또는 force 액션 모두 적용 (preferredProvider가 있으면)
    if (action.preferredProvider) {
      var decision = {
        route: action.preferredProvider === 'opencode',
        reason: 'rule-' + ruleResult.rule.id,
        ruleApplied: ruleResult.rule,
        matched: true,
      };

      if (decision.route) {
        var mappedAgent = mapAgentToOpenCode(agentType);
        decision.opencodeAgent = mappedAgent;
        decision.targetModel = getModelInfoForAgent(mappedAgent);
      }

      cacheRoute(agentType, context, decision);
      return decision;
    }
  }

  // 3. 동적 매핑 확인
  var dynamicMapping = getAgentMapping(agentType);

  if (dynamicMapping) {
    var decision = {
      route: dynamicMapping.provider === 'opencode',
      reason: 'dynamic-mapping-' + agentType,
      targetModel: {
        id: dynamicMapping.model,
        name: dynamicMapping.model,
      },
      opencodeAgent: dynamicMapping.target,
      tier: dynamicMapping.tier,
    };

    cacheRoute(agentType, context, decision);
    return decision;
  }

  // 4. 기본 로직 (v0.7.0 호환)
  var baseDecision = shouldRouteToOpenCode(toolInput, options);

  // 캐시에 저장
  cacheRoute(agentType, context, baseDecision);

  return baseDecision;
}

/**
 * 라우팅 통계 조회 (v0.8.0)
 */
export function getRoutingStats() {
  var fusionState = readJsonFile(FUSION_STATE_FILE) || {};
  var cacheStats = getCacheStats();
  var dynamicMapping = getDynamicMapping();

  return {
    fusion: {
      totalTasks: fusionState.totalTasks || 0,
      routedToOpenCode: fusionState.routedToOpenCode || 0,
      routingRate: fusionState.routingRate || 0,
      estimatedSavedTokens: fusionState.estimatedSavedTokens || 0,
      byProvider: fusionState.byProvider || {},
    },
    cache: cacheStats,
    dynamicMappings: dynamicMapping.mappings ? dynamicMapping.mappings.length : 0,
  };
}

/**
 * 세션 토큰 기반 라우팅 레벨 결정
 *
 * - L1 (< 5M): 기본 모드 (기존 로직)
 * - L2 (5-20M): 분석/탐색 에이전트 자동 라우팅
 * - L3 (20-40M): 실행 에이전트까지 라우팅 확대
 * - L4 (40M+): planner 제외 전체 라우팅
 *
 * @param {number} sessionInputTokens - 세션 누적 입력 토큰
 * @returns {object} { level: number, name: string, agents: string[] }
 */
export function getRoutingLevel(sessionInputTokens) {
  if (sessionInputTokens >= 40000000) {
    return {
      level: 4,
      name: 'L4',
      agents: [
        // L2 에이전트
        'architect', 'architect-low', 'architect-medium',
        'researcher', 'researcher-low',
        'explore', 'explore-medium', 'explore-high',
        'scientist', 'scientist-low', 'scientist-high',
        'designer', 'designer-low', 'designer-high',
        'writer', 'vision',
        'code-reviewer', 'code-reviewer-low',
        'security-reviewer', 'security-reviewer-low',
        // L3 에이전트
        'executor', 'executor-low', 'executor-high',
        'qa-tester', 'qa-tester-high',
        'build-fixer', 'build-fixer-low',
        'tdd-guide', 'tdd-guide-low',
        // L4 에이전트
        'critic', 'analyst'
      ]
    };
  }

  if (sessionInputTokens >= 20000000) {
    return {
      level: 3,
      name: 'L3',
      agents: [
        // L2 에이전트
        'architect', 'architect-low', 'architect-medium',
        'researcher', 'researcher-low',
        'explore', 'explore-medium', 'explore-high',
        'scientist', 'scientist-low', 'scientist-high',
        'designer', 'designer-low', 'designer-high',
        'writer', 'vision',
        'code-reviewer', 'code-reviewer-low',
        'security-reviewer', 'security-reviewer-low',
        // L3 에이전트
        'executor', 'executor-low', 'executor-high',
        'qa-tester', 'qa-tester-high',
        'build-fixer', 'build-fixer-low',
        'tdd-guide', 'tdd-guide-low'
      ]
    };
  }

  if (sessionInputTokens >= 5000000) {
    return {
      level: 2,
      name: 'L2',
      agents: [
        'architect', 'architect-low', 'architect-medium',
        'researcher', 'researcher-low',
        'explore', 'explore-medium', 'explore-high',
        'scientist', 'scientist-low', 'scientist-high',
        'designer', 'designer-low', 'designer-high',
        'writer', 'vision',
        'code-reviewer', 'code-reviewer-low',
        'security-reviewer', 'security-reviewer-low'
      ]
    };
  }

  return {
    level: 1,
    name: 'L1',
    agents: []  // 기본 모드, 에이전트 목록 불필요
  };
}
