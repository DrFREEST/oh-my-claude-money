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

// =============================================================================
// Provider/Token helpers
// =============================================================================

/**
 * providerId/modelId/agentName 기반으로 프로바이더 정규화
 * @param {string} providerId
 * @param {string} modelId
 * @param {string} agentName
 * @returns {string} 'openai' | 'gemini' | 'anthropic' | 'kimi'
 */
function normalizeProvider(providerId, modelId, agentName) {
  var provider = '';

  if (providerId) {
    var pid = String(providerId).toLowerCase();
    if (pid === 'google' || pid === 'gemini') return 'gemini';
    if (pid === 'openai' || pid === 'gpt') return 'openai';
    if (pid === 'anthropic' || pid === 'claude') return 'anthropic';
    if (pid === 'kimi' || pid === 'kimi-for-coding' || pid === 'moonshot') return 'kimi';
    if (pid === 'opencode') {
      var mid = String(modelId || '').toLowerCase();
      if (mid.indexOf('gemini') !== -1 || mid.indexOf('flash') !== -1 || mid.indexOf('pro') !== -1) {
        return 'gemini';
      }
      if (mid.indexOf('gpt') !== -1 || mid.indexOf('o1') !== -1 || mid.indexOf('codex') !== -1) {
        return 'openai';
      }
      if (mid.indexOf('claude') !== -1 || mid.indexOf('sonnet') !== -1 || mid.indexOf('opus') !== -1 || mid.indexOf('haiku') !== -1) {
        return 'anthropic';
      }
    }
  }

  if (agentName) {
    var agentHint = String(agentName).toLowerCase();
    if (agentHint.indexOf('flash') !== -1) return 'gemini';
  }

  if (modelId) {
    var midFallback = String(modelId).toLowerCase();
    if (midFallback.indexOf('gemini') !== -1 || midFallback.indexOf('flash') !== -1 || midFallback.indexOf('pro') !== -1) {
      return 'gemini';
    }
    if (midFallback.indexOf('gpt') !== -1 || midFallback.indexOf('o1') !== -1 || midFallback.indexOf('codex') !== -1) {
      return 'openai';
    }
    if (midFallback.indexOf('claude') !== -1 || midFallback.indexOf('sonnet') !== -1 || midFallback.indexOf('opus') !== -1 || midFallback.indexOf('haiku') !== -1) {
      return 'anthropic';
    }
    if (midFallback.indexOf('kimi') !== -1 || midFallback.indexOf('moonshot') !== -1) {
      return 'kimi';
    }
  }

  if (agentName) {
    var agentLower = String(agentName).toLowerCase();
    if (agentLower.indexOf('flash') !== -1) return 'gemini';
    if (agentLower.indexOf('oracle') !== -1 || agentLower.indexOf('codex') !== -1) return 'openai';
  }

  return 'openai';
}

/**
 * OpenCode 결과에서 실제 토큰 사용량 추출
 * @param {object|null} result
 * @returns {number} 실제 토큰 합계 (input + cache + output)
 */
function getActualTokenTotal(result) {
  if (!result || !result.tokens) return 0;

  var inputTokens = result.tokens.input || 0;
  var outputTokens = result.tokens.output || 0;
  var cacheRead = 0;
  var cacheCreate = 0;

  if (result.tokens.cache) {
    cacheRead = result.tokens.cache.read || 0;
    cacheCreate = result.tokens.cache.create || result.tokens.cache.write || 0;
  }
  if (typeof result.tokens.cacheRead === 'number') {
    cacheRead = result.tokens.cacheRead;
  }
  if (typeof result.tokens.cacheCreate === 'number') {
    cacheCreate = result.tokens.cacheCreate;
  }

  return inputTokens + cacheRead + cacheCreate + outputTokens;
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

  // 테스트 호환: sessionId 자리에 currentState 객체가 전달된 경우
  if (sessionId && typeof sessionId === 'object' && currentState === null) {
    currentState = sessionId;
    sessionId = null;
  }

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
      byProvider: { gemini: 0, openai: 0, anthropic: 0, kimi: 0 },
      sessionId: sessionId
    };
  }

  if (!state.byProvider) {
    state.byProvider = { gemini: 0, openai: 0, anthropic: 0, kimi: 0 };
  }
  if (typeof state.byProvider.gemini !== 'number') state.byProvider.gemini = 0;
  if (typeof state.byProvider.openai !== 'number') state.byProvider.openai = 0;
  if (typeof state.byProvider.anthropic !== 'number') state.byProvider.anthropic = 0;
  if (typeof state.byProvider.kimi !== 'number') state.byProvider.kimi = 0;

  // 실제 OpenCode 실행 성공 여부 판단
  var routeRequested = decision && decision.route === true;
  var openCodeSucceeded = routeRequested;
  if (routeRequested && result && result.success === false) {
    openCodeSucceeded = false;
  }

  // 업데이트 적용 함수
  function applyUpdate(targetState, didOpenCode, providerName, savedTokens) {
    targetState.totalTasks++;

    if (didOpenCode) {
      targetState.routedToOpenCode++;
      targetState.estimatedSavedTokens += savedTokens;

      if (providerName === 'gemini') {
        targetState.byProvider.gemini++;
      } else if (providerName === 'openai') {
        targetState.byProvider.openai++;
      } else if (providerName === 'kimi') {
        targetState.byProvider.kimi++;
      } else if (providerName === 'anthropic') {
        targetState.byProvider.anthropic++;
      } else {
        targetState.byProvider.openai++;
      }
    } else {
      targetState.byProvider.anthropic++;
    }

    targetState.routingRate = targetState.totalTasks > 0
      ? Math.round((targetState.routedToOpenCode / targetState.totalTasks) * 100)
      : 0;
    targetState.lastUpdated = new Date().toISOString();
  }

  var providerId = '';
  var modelId = '';
  if (result) {
    if (result.providerID) providerId = result.providerID;
    if (!providerId && result.actualProviderID) providerId = result.actualProviderID;
    if (!providerId && result.tokens && result.tokens.providerID) providerId = result.tokens.providerID;
    if (!providerId && result.result && result.result.providerID) providerId = result.result.providerID;
    if (!providerId && result.result && result.result.model && result.result.model.providerID) {
      providerId = result.result.model.providerID;
    }

    if (result.modelID) modelId = result.modelID;
    if (!modelId && result.actualModelID) modelId = result.actualModelID;
    if (!modelId && result.tokens && result.tokens.modelID) modelId = result.tokens.modelID;
    if (!modelId && result.result && result.result.model && result.result.model.modelID) {
      modelId = result.result.model.modelID;
    }
    if (!modelId && result.result && result.result.model && result.result.model.id) {
      modelId = result.result.model.id;
    }
  }
  if (!modelId && decision && decision.targetModel && decision.targetModel.id) {
    modelId = decision.targetModel.id;
  }
  var agentName = decision ? decision.opencodeAgent : '';
  var normalizedProvider = normalizeProvider(providerId, modelId, agentName);

  var savedTokens = 1000;
  var actualTokenTotal = getActualTokenTotal(result);
  if (actualTokenTotal > 0) {
    savedTokens = actualTokenTotal;
  }

  applyUpdate(state, openCodeSucceeded, normalizedProvider, savedTokens);

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
        byProvider: { gemini: 0, openai: 0, anthropic: 0, kimi: 0 }
      };
    }
    if (!globalState.byProvider) {
      globalState.byProvider = { gemini: 0, openai: 0, anthropic: 0, kimi: 0 };
    }
    if (typeof globalState.byProvider.gemini !== 'number') globalState.byProvider.gemini = 0;
    if (typeof globalState.byProvider.openai !== 'number') globalState.byProvider.openai = 0;
    if (typeof globalState.byProvider.anthropic !== 'number') globalState.byProvider.anthropic = 0;
    if (typeof globalState.byProvider.kimi !== 'number') globalState.byProvider.kimi = 0;

    applyUpdate(globalState, openCodeSucceeded, normalizedProvider, savedTokens);
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
      // 주의: "gemini-cli:gemini-3-flash-preview" (CLI 직접 접속)와 구분 필요
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
  if (modelId === 'gemini-flash' || modelId.indexOf('flash') !== -1) {
    return {
      agent: 'Codex',
      model: { id: 'gpt-5.2-codex', name: 'GPT 5.2 Codex (Gemini Fallback)' },
      reason: 'gemini-rate-limited'
    };
  }

  // Gemini Pro → OpenAI Oracle
  if (modelId === 'gemini-pro' || modelId.indexOf('pro') !== -1) {
    return {
      agent: 'Oracle',
      model: { id: 'gpt-5.2', name: 'GPT 5.2 Oracle (Gemini Fallback)' },
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
