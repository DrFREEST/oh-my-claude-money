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
 * OMC 4.1.3 기준 에이전트 (28개, Lane 기반):
 *   Build/Analysis: architect, executor, explore, debugger, verifier, deep-executor, git-master
 *   Review: security-reviewer, code-reviewer, style-reviewer, quality-reviewer, api-reviewer, performance-reviewer
 *   Testing: qa-tester, test-engineer (was tdd-guide)
 *   Domain: scientist, dependency-expert (was researcher), designer, writer, vision, quality-strategist
 *   Product: planner, critic, analyst, product-manager, ux-researcher, information-architect, product-analyst
 *
 * OMO 3.4.0 기준 에이전트: oracle (GPT), explore (Gemini), build (GPT),
 *                        sisyphus, librarian, metis, momus, prometheus, atlas, hephaestus, multimodal-looker
 *
 * OMC v4.1.3 delegationRouting 인식: OMCM은 delegationRouting이 활성화되면 자동으로 양보함
 *
 * @param {string} agentType - OMC 에이전트 타입
 * @returns {string} - OpenCode 에이전트
 */
export function mapAgentToOpenCode(agentType) {
  var mapping = {
    // Build/Analysis Lane
    'architect': 'oracle',           // 전략적 아키텍처 분석
    'executor': 'build',             // 코드 작성/구현
    'explore': 'explore',            // 빠른 코드베이스 탐색
    'debugger': 'oracle',            // 복잡한 디버깅
    'verifier': 'build',             // 코드 검증
    'deep-executor': 'build',        // 복잡한 자율 작업
    'git-master': 'build',           // Git 작업 관리

    // Review Lane
    'security-reviewer': 'oracle',   // 보안 취약점 분석
    'code-reviewer': 'oracle',       // 코드 품질 리뷰
    'style-reviewer': 'explore',     // 코드 스타일 체크
    'quality-reviewer': 'oracle',    // 품질 심층 리뷰
    'api-reviewer': 'oracle',        // API 설계 리뷰
    'performance-reviewer': 'oracle', // 성능 분석

    // Testing Lane
    'qa-tester': 'build',            // QA 테스팅
    'test-engineer': 'build',        // TDD/테스트 작성 (was tdd-guide)

    // Domain Lane
    'scientist': 'oracle',           // 데이터 분석
    'dependency-expert': 'oracle',   // 의존성/문서 조사 (was researcher)
    'designer': 'explore',           // UI/UX 디자인
    'writer': 'explore',             // 문서 작성
    'vision': 'explore',             // 이미지/다이어그램 분석
    'quality-strategist': 'oracle',  // 품질 전략 수립

    // Product Lane
    'planner': 'oracle',             // 전략적 계획 수립
    'critic': 'oracle',              // 플랜 검토/비평
    'analyst': 'oracle',             // 요구사항 분석
    'product-manager': 'oracle',     // 제품 관리
    'ux-researcher': 'explore',      // UX 리서치
    'information-architect': 'oracle', // 정보 구조 설계
    'product-analyst': 'oracle',     // 제품 분석

    // Hephaestus (OMO 3.4.0 신규)
    'build-fixer': 'hephaestus',     // 빌드/타입 오류 수정 전문

    // Backward-compat aliases (OMC 4.0.x → 4.1.x)
    'researcher': 'oracle',          // → dependency-expert
    'tdd-guide': 'build',            // → test-engineer
  };
  return mapping[agentType] || 'build';
}

/**
 * OMO 에이전트에 해당하는 모델 정보 반환
 * @param {string} omoAgent - OMO 에이전트 이름
 * @returns {object} - { id: string, name: string }
 */
export function getModelInfoForAgent(omoAgent) {
  // Gemini 기반 에이전트
  var geminiAgents = ['explore', 'metis', 'momus', 'multimodal-looker'];
  // GPT Oracle 기반 에이전트
  var oracleAgents = ['oracle', 'librarian', 'sisyphus'];
  // GPT Codex 기반 에이전트
  var codexAgents = ['build', 'hephaestus', 'atlas', 'prometheus'];

  for (var i = 0; i < geminiAgents.length; i++) {
    if (omoAgent === geminiAgents[i]) {
      if (omoAgent === 'metis') {
        return { id: 'gemini-3-pro', name: 'Gemini 3 Pro' };
      }
      return { id: 'gemini-3-flash', name: 'Gemini 3 Flash' };
    }
  }

  for (var j = 0; j < oracleAgents.length; j++) {
    if (omoAgent === oracleAgents[j]) {
      return { id: 'gpt-5.3', name: 'GPT 5.3 Oracle' };
    }
  }

  for (var k = 0; k < codexAgents.length; k++) {
    if (omoAgent === codexAgents[k]) {
      return { id: 'gpt-5.3-codex', name: 'GPT 5.3 Codex' };
    }
  }

  // 기본값 (OMC 4.1.3 fallback chain: gpt-5.3-codex → gpt-5.3 → gpt-5.2-codex → gpt-5.2)
  return { id: 'gpt-5.3-codex', name: 'GPT 5.3 Codex' };
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

  // OMC v4.1.3+ delegationRouting 활성화 시: OMC가 직접 라우팅하므로 OMCM 퓨전 비활성화
  // 단, fusionMode가 명시적으로 'always'인 경우는 OMCM이 우선
  try {
    var omcConfigPath = join(HOME, '.omc-config.json');
    if (existsSync(omcConfigPath)) {
      var omcConfig = JSON.parse(readFileSync(omcConfigPath, 'utf-8'));
      if (omcConfig.delegationRouting && omcConfig.delegationRouting.enabled) {
        var fusionConfig = config || {};
        if (fusionConfig.fusionMode !== 'always') {
          return { route: false, reason: 'OMC delegationRouting active — OMCM fusion deferred' };
        }
      }
    }
  } catch (e) {
    // config 읽기 실패 시 무시 — OMCM 기본 동작 유지
  }

  // fusionDefault 설정 확인
  var fusionDefault = config && config.fusionDefault === true;

  // 퓨전 비활성화 상태 (fusionDefault가 true면 무시)
  if (!fusionDefault && (!fusion || fusion.enabled === false)) {
    return { route: false, reason: 'fusion-disabled' };
  }

  // 폴백 활성화 상태 - 반드시 OpenCode로 라우팅
  if (fallback && fallback.fallbackActive) {
    var currentModel = fallback.currentModel;
    var opencodeAgent = 'build';
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
      var mappedAgent = agentType ? mapAgentToOpenCode(agentType) : 'build';
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
    // executor, critic, planner, qa-tester, build-fixer는 Claude 전용
    if (!fusionDefault && fusion && fusion.mode === 'save-tokens') {
      var tokenSavingAgents = [
        // Build/Analysis (분석만)
        'architect', 'explore', 'debugger',
        // Review Lane
        'code-reviewer', 'security-reviewer', 'style-reviewer',
        'quality-reviewer', 'api-reviewer', 'performance-reviewer',
        // Domain Lane (분석/문서)
        'scientist', 'dependency-expert', 'researcher',
        'designer', 'writer', 'vision', 'quality-strategist',
        // Product Lane (분석)
        'analyst', 'ux-researcher', 'information-architect', 'product-analyst'
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
          targetModel: { id: 'gpt-5.3-codex', name: 'GPT-5.3 Codex' },
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

    if (model.indexOf('gemini') !== -1 || agent === 'explore') {
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
      if (gModel.indexOf('gemini') !== -1 || gAgent === 'explore') {
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
 * OMC 4.1.3 + OMO 3.4.0 기준
 * fusionDefault 모드에서는 planner 제외 모든 에이전트가 라우팅됨
 */
export const TOKEN_SAVING_AGENTS = [
  // Build/Analysis (분석만, → Oracle/Flash)
  'architect', 'explore', 'debugger',
  // Review Lane (→ Oracle/Flash)
  'code-reviewer', 'security-reviewer', 'style-reviewer',
  'quality-reviewer', 'api-reviewer', 'performance-reviewer',
  // Domain Lane (→ Oracle/Flash)
  'scientist', 'dependency-expert', 'researcher',
  'designer', 'writer', 'vision', 'quality-strategist',
  // Product Lane (분석, → Oracle/Flash)
  'analyst', 'ux-researcher', 'information-architect', 'product-analyst'
];

/**
 * 라우팅 불가능한 에이전트 목록 (Claude 전용)
 * 실행, 테스트, 빌드 등 정확도가 중요한 작업은 Claude에서만 실행
 * planner, critic, executor, qa-tester, build-fixer, test-engineer, deep-executor
 */
export const CLAUDE_ONLY_AGENTS = [
  'planner', 'critic', 'executor', 'deep-executor',
  'qa-tester', 'build-fixer', 'test-engineer', 'tdd-guide',
  'verifier', 'git-master', 'product-manager'
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
        // L2 에이전트 (분석/탐색/리뷰)
        'architect', 'explore', 'debugger',
        'dependency-expert', 'researcher',
        'scientist', 'designer', 'writer', 'vision',
        'code-reviewer', 'security-reviewer', 'style-reviewer',
        'quality-reviewer', 'api-reviewer', 'performance-reviewer',
        'quality-strategist', 'ux-researcher', 'information-architect', 'product-analyst',
        // L3 에이전트 (실행/테스트/빌드)
        'executor', 'deep-executor', 'verifier',
        'qa-tester', 'build-fixer', 'test-engineer', 'tdd-guide',
        'git-master',
        // L4 에이전트 (전략/계획)
        'critic', 'analyst', 'product-manager'
      ]
    };
  }

  if (sessionInputTokens >= 20000000) {
    return {
      level: 3,
      name: 'L3',
      agents: [
        // L2 에이전트
        'architect', 'explore', 'debugger',
        'dependency-expert', 'researcher',
        'scientist', 'designer', 'writer', 'vision',
        'code-reviewer', 'security-reviewer', 'style-reviewer',
        'quality-reviewer', 'api-reviewer', 'performance-reviewer',
        'quality-strategist', 'ux-researcher', 'information-architect', 'product-analyst',
        // L3 에이전트
        'executor', 'deep-executor', 'verifier',
        'qa-tester', 'build-fixer', 'test-engineer', 'tdd-guide',
        'git-master'
      ]
    };
  }

  if (sessionInputTokens >= 5000000) {
    return {
      level: 2,
      name: 'L2',
      agents: [
        'architect', 'explore', 'debugger',
        'dependency-expert', 'researcher',
        'scientist', 'designer', 'writer', 'vision',
        'code-reviewer', 'security-reviewer', 'style-reviewer',
        'quality-reviewer', 'api-reviewer', 'performance-reviewer',
        'quality-strategist', 'ux-researcher', 'information-architect', 'product-analyst'
      ]
    };
  }

  return {
    level: 1,
    name: 'L1',
    agents: []  // 기본 모드, 에이전트 목록 불필요
  };
}

// =============================================================================
// v0.9.0 Gemini Rate Limit 감지 + OpenAI 자동 폴백
// =============================================================================

/**
 * Antigravity 계정 설정 파일 경로
 */
var ANTIGRAVITY_ACCOUNTS_FILE = join(HOME, '.config', 'opencode', 'antigravity-accounts.json');

/**
 * Rate limit 캐시 (5분 TTL)
 * Hook이 단발 실행이므로 파일 I/O를 최소화하기 위한 파일 기반 캐시
 */
var RATE_LIMIT_CACHE_FILE = join(OMCM_DIR, 'gemini-rate-limit-cache.json');
var RATE_LIMIT_CACHE_TTL_MS = 5 * 60 * 1000; // 5분

/**
 * Gemini rate limit 상태 확인
 *
 * antigravity-accounts.json의 rateLimitResetTimes를 읽어
 * 모든 계정의 Gemini Flash가 rate-limited인지 확인합니다.
 *
 * @returns {object} { isLimited: boolean, earliestReset: number|null, availableAccounts: number }
 */
export function checkGeminiRateLimit() {
  // 1. 캐시 확인 (파일 기반)
  try {
    if (existsSync(RATE_LIMIT_CACHE_FILE)) {
      var cached = JSON.parse(readFileSync(RATE_LIMIT_CACHE_FILE, 'utf-8'));
      var cacheAge = Date.now() - (cached.checkedAt || 0);
      if (cacheAge < RATE_LIMIT_CACHE_TTL_MS) {
        return cached.result;
      }
    }
  } catch (e) {
    // 캐시 읽기 실패 무시
  }

  var result = { isLimited: true, earliestReset: null, availableAccounts: 0 };
  var now = Date.now();

  // 2. Antigravity 계정 파일 읽기
  try {
    if (!existsSync(ANTIGRAVITY_ACCOUNTS_FILE)) {
      // 계정 파일 없으면 rate limit 상태 알 수 없음 → 제한 없다고 가정
      result.isLimited = false;
      _saveRateLimitCache(result);
      return result;
    }

    var accountData = JSON.parse(readFileSync(ANTIGRAVITY_ACCOUNTS_FILE, 'utf-8'));
    var accounts = accountData.accounts || [];

    if (accounts.length === 0) {
      result.isLimited = false;
      _saveRateLimitCache(result);
      return result;
    }

    var earliestReset = Infinity;
    var totalAccounts = 0;
    var availableAccounts = 0;

    for (var i = 0; i < accounts.length; i++) {
      var account = accounts[i];
      // 비활성 계정 스킵 (enabled 필드가 false인 경우)
      if (account.enabled === false) continue;

      totalAccounts++;
      var resetTimes = account.rateLimitResetTimes || {};

      // Gemini Flash의 rate limit reset time 확인
      // 키 패턴: "gemini-antigravity:antigravity-gemini-3-flash" (Antigravity 프록시)
      // 주의: "gemini-cli:gemini-3-flash" (CLI 직접 접속)와 구분 필요
      // OpenCode 서버풀은 Antigravity 프록시를 사용하므로 antigravity 키만 확인
      var isAccountLimited = false;
      var keys = Object.keys(resetTimes);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        // antigravity 키만 매칭 (CLI 키 제외)
        if (key.indexOf('antigravity') !== -1 &&
            (key.indexOf('gemini-3-flash') !== -1 || key.indexOf('gemini-flash') !== -1)) {
          var resetTime = resetTimes[key];
          if (typeof resetTime === 'number' && resetTime > now) {
            isAccountLimited = true;
            if (resetTime < earliestReset) {
              earliestReset = resetTime;
            }
          }
          break;
        }
      }

      if (!isAccountLimited) {
        availableAccounts++;
      }
    }

    result.availableAccounts = availableAccounts;

    if (totalAccounts === 0) {
      // 계정이 없으면 제한 없다고 가정
      result.isLimited = false;
    } else if (availableAccounts === totalAccounts) {
      // 모든 계정이 사용 가능할 때만 OK
      result.isLimited = false;
    } else {
      // 어떤 계정이든 rate-limited이면 폴백 적용
      // (OpenCode가 rate-limited 계정을 우선 선택하는 경우 방지)
      result.isLimited = true;
      result.earliestReset = earliestReset === Infinity ? null : earliestReset;
    }
  } catch (e) {
    // 파일 읽기/파싱 실패 → 제한 없다고 가정 (안전한 기본값)
    result.isLimited = false;
  }

  _saveRateLimitCache(result);
  return result;
}

/**
 * Rate limit 캐시 저장 (내부 함수)
 * @param {object} result - rate limit 결과
 */
function _saveRateLimitCache(result) {
  try {
    ensureOmcmDir();
    writeFileSync(RATE_LIMIT_CACHE_FILE, JSON.stringify({
      checkedAt: Date.now(),
      result: result
    }));
  } catch (e) {
    // 캐시 저장 실패 무시
  }
}

/**
 * Gemini가 rate-limited일 때 OpenAI 폴백 에이전트/모델 결정
 *
 * Flash → Codex (빠른 작업은 GPT-5.2-Codex로 대체)
 * Gemini Pro → Oracle (GPT-5.2)
 *
 * @param {string} omoAgent - 원래 OpenCode 에이전트 (Flash, Oracle, Codex 등)
 * @param {object} modelInfo - 원래 모델 정보 { id, name }
 * @returns {object|null} - { agent, model: { id, name }, reason } 또는 null (폴백 불필요)
 */
export function getGeminiFallback(omoAgent, modelInfo) {
  if (!modelInfo || !modelInfo.id) return null;

  var modelId = modelInfo.id;

  // Gemini Flash → OpenAI Codex
  if (modelId === 'gemini-3-flash' || modelId === 'gemini-flash' || modelId.indexOf('flash') !== -1) {
    return {
      agent: 'build',
      model: { id: 'gpt-5.3-codex', name: 'GPT 5.3 Codex (Gemini Fallback)' },
      reason: 'gemini-rate-limited'
    };
  }

  // Gemini Pro → OpenAI Oracle
  if (modelId === 'gemini-3-pro' || modelId === 'gemini-pro' || modelId.indexOf('pro') !== -1) {
    return {
      agent: 'oracle',
      model: { id: 'gpt-5.3', name: 'GPT 5.3 Oracle (Gemini Fallback)' },
      reason: 'gemini-rate-limited'
    };
  }

  return null;
}

/**
 * 라우팅 결정에 Gemini rate limit 폴백 적용
 *
 * @param {object} decision - shouldRouteToOpenCode()의 반환값
 * @returns {object} - 폴백 적용된 라우팅 결정
 */
export function applyGeminiFallbackToDecision(decision) {
  if (!decision || !decision.route) return decision;

  var modelId = decision.targetModel && decision.targetModel.id
    ? decision.targetModel.id
    : '';
  var isGeminiTarget = modelId.indexOf('gemini') !== -1 ||
                       modelId.indexOf('flash') !== -1 ||
                       modelId.indexOf('pro') !== -1;

  // Gemini 타겟이 아니면 폴백 불필요
  if (!isGeminiTarget) return decision;

  // Gemini rate limit 확인
  var rateLimit = checkGeminiRateLimit();
  if (!rateLimit.isLimited) return decision;

  // 폴백 적용
  var fallback = getGeminiFallback(decision.opencodeAgent, decision.targetModel);
  if (!fallback) return decision;

  // 원본 결정 보존 + 폴백 정보 병합
  return {
    route: decision.route,
    reason: decision.reason + '+' + fallback.reason,
    targetModel: fallback.model,
    opencodeAgent: fallback.agent,
    originalAgent: decision.opencodeAgent,
    originalModel: decision.targetModel,
    geminiRateLimit: {
      isLimited: true,
      earliestReset: rateLimit.earliestReset,
      fallbackApplied: true
    }
  };
}
