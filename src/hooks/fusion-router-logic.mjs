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
export const CONFIG_FILE = findConfigFile();

function findConfigFile() {
  var pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || '';
  var candidates = [
    pluginRoot ? join(pluginRoot, 'config.json') : '',
    join(HOME, '.claude', 'marketplaces', 'omcm', 'config.json'),
    join(HOME, '.claude', 'plugins', 'omcm', 'config.json'),
  ].filter(Boolean);
  for (var i = 0; i < candidates.length; i++) {
    if (existsSync(candidates[i])) return candidates[i];
  }
  return candidates[0] || join(HOME, '.claude', 'marketplaces', 'omcm', 'config.json');
}

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
 * agent-mapping.json에서 MCP direct 매핑 조회
 * @param {string} agentType - OMC 에이전트 타입 (예: 'architect')
 * @returns {string|null} - MCP 도구명 ('ask_codex'|'ask_gemini') 또는 null
 */
var _mcpMappingCache = null;
var _mcpMappingCacheTime = 0;
var MCP_MAPPING_CACHE_TTL = 5 * 60 * 1000; // 5분

export function getMcpDirectMapping(agentType) {
  var now = Date.now();
  if (!_mcpMappingCache || (now - _mcpMappingCacheTime) > MCP_MAPPING_CACHE_TTL) {
    var mappingPaths = [
      join(HOME, '.claude', 'marketplaces', 'omcm', 'scripts', 'agent-mapping.json'),
      join(HOME, '.claude', 'plugins', 'omcm', 'scripts', 'agent-mapping.json'),
    ];
    _mcpMappingCache = {};
    for (var i = 0; i < mappingPaths.length; i++) {
      var data = readJsonFile(mappingPaths[i]);
      if (data && data.mappings) {
        var keys = Object.keys(data.mappings);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          if (key.indexOf('_comment') === 0) continue;
          var entry = data.mappings[key];
          if (entry && entry.mcp_direct) {
            _mcpMappingCache[key] = entry.mcp_direct;
          }
        }
        _mcpMappingCacheTime = now;
        break;
      }
    }
  }
  return _mcpMappingCache[agentType] || null;
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
 * OMC 에이전트를 MCP 도구용 모델 힌트로 매핑
 *
 * OMC 4.2.15 기준 에이전트 (29개, Lane 기반):
 *   Build/Analysis: architect, executor, explore, debugger, verifier, deep-executor, git-master
 *   Review: security-reviewer, code-reviewer, style-reviewer, quality-reviewer, api-reviewer, performance-reviewer
 *   Testing: qa-tester, test-engineer (was tdd-guide)
 *   Domain: scientist, dependency-expert (was researcher), designer, writer, document-specialist, vision, quality-strategist
 *   Product: planner, critic, analyst, product-manager, ux-researcher, information-architect, product-analyst
 *
 * MCP-First (v3.0): ask_codex / ask_gemini 직접 호출
 * OMCM은 delegationRouting이 활성화되면 자동으로 양보함
 *
 * @param {string} agentType - OMC 에이전트 타입
 * @returns {string} - MCP 모델 힌트 (내부 분류용)
 */
export function mapAgentToMcp(agentType) {
  var mapping = {
    // Build/Analysis Lane → ask_codex
    'architect': 'codex-oracle',       // 전략적 아키텍처 분석
    'executor': 'codex-build',         // 코드 작성/구현
    'explore': 'gemini-flash',         // 빠른 코드베이스 탐색
    'debugger': 'codex-oracle',        // 복잡한 디버깅
    'verifier': 'codex-build',         // 코드 검증
    'deep-executor': 'codex-build',    // 복잡한 자율 작업
    'git-master': 'codex-build',       // Git 작업 관리

    // Review Lane → ask_codex
    'security-reviewer': 'codex-oracle',   // 보안 취약점 분석
    'code-reviewer': 'codex-oracle',       // 코드 품질 리뷰
    'style-reviewer': 'gemini-flash',      // 코드 스타일 체크
    'quality-reviewer': 'codex-oracle',    // 품질 심층 리뷰
    'api-reviewer': 'codex-oracle',        // API 설계 리뷰
    'performance-reviewer': 'codex-oracle', // 성능 분석

    // Testing Lane → ask_codex
    'qa-tester': 'codex-build',        // QA 테스팅
    'test-engineer': 'codex-build',    // TDD/테스트 작성 (was tdd-guide)

    // Domain Lane
    'scientist': 'codex-oracle',           // 데이터 분석 → ask_codex
    'dependency-expert': 'codex-oracle',   // 의존성/문서 조사 → ask_codex
    'designer': 'gemini-flash',            // UI/UX 디자인 → ask_gemini
    'writer': 'gemini-flash',              // 문서 작성 → ask_gemini
    'document-specialist': 'gemini-flash', // 문서 전문 작성/정리 → ask_gemini
    'vision': 'gemini-flash',              // 이미지/다이어그램 분석 → ask_gemini
    'quality-strategist': 'codex-oracle',  // 품질 전략 수립 → ask_codex

    // Product Lane → ask_codex
    'planner': 'codex-oracle',             // 전략적 계획 수립
    'critic': 'codex-oracle',              // 플랜 검토/비평
    'analyst': 'codex-oracle',             // 요구사항 분석
    'product-manager': 'codex-oracle',     // 제품 관리
    'ux-researcher': 'gemini-flash',       // UX 리서치 → ask_gemini
    'information-architect': 'codex-oracle', // 정보 구조 설계
    'product-analyst': 'codex-oracle',     // 제품 분석

    // build-fixer → ask_codex
    'build-fixer': 'codex-build',      // 빌드/타입 오류 수정 전문

    // Backward-compat aliases (OMC 4.0.x → 4.1.x)
    'researcher': 'codex-oracle',      // → dependency-expert
    'tdd-guide': 'codex-build',        // → test-engineer
  };
  return mapping[agentType] || 'codex-build';
}

/**
 * MCP 힌트에 해당하는 모델 정보 반환
 * @param {string} mcpHint - MCP 모델 힌트 (mapAgentToMcp() 반환값)
 * @returns {object} - { id: string, name: string }
 */
export function getModelInfoForAgent(mcpHint) {
  // Gemini 기반 (ask_gemini)
  if (mcpHint === 'gemini-flash' || mcpHint === 'gemini-3-flash') {
    return { id: 'gemini-3-flash', name: 'Gemini 3 Flash' };
  }
  if (mcpHint === 'gemini-pro' || mcpHint === 'gemini-3-pro') {
    return { id: 'gemini-3-pro', name: 'Gemini 3 Pro' };
  }

  // GPT Oracle 기반 (ask_codex oracle role)
  if (mcpHint === 'codex-oracle') {
    return { id: 'gpt-5.3', name: 'GPT 5.3 Oracle' };
  }

  // GPT Codex 기반 (ask_codex build role)
  if (mcpHint === 'codex-build') {
    return { id: 'gpt-5.3-codex', name: 'GPT 5.3 Codex' };
  }

  // 기본값 (OMC 4.2.15 fallback chain: gpt-5.3-codex → gpt-5.3 → gpt-5.2-codex → gpt-5.2)
  return { id: 'gpt-5.3-codex', name: 'GPT 5.3 Codex' };
}

/**
 * MCP로 라우팅해야 하는지 확인
 * @param {object} toolInput - 도구 입력
 * @param {object} [options] - 옵션 (테스트용 의존성 주입)
 * @param {object} [options.fusion] - 퓨전 상태 (주입)
 * @param {object} [options.fallback] - 폴백 상태 (주입)
 * @param {object} [options.limits] - 프로바이더 리밋 (주입)
 * @param {object} [options.config] - 설정 (주입)
 * @returns {object} - { route: boolean|'mcp', reason: string, targetModel?: object, mcpTool?: string, agentRole?: string }
 */
export function shouldRouteToMcp(toolInput, options = {}) {
  // === MCP-First 라우팅 (v3.0) ===
  // config.json의 mcpFirst 설정 확인
  var config = options.config !== undefined ? options.config : readJsonFile(CONFIG_FILE);
  var mcpFirstEnabled = config && config.mcpFirst === true;
  var mcpFirstMode = (config && config.mcpFirstMode) || 'enforce';

  if (mcpFirstEnabled && toolInput && toolInput.subagent_type) {
    var agentForMcp = toolInput.subagent_type.replace('oh-my-claudecode:', '');
    var mcpTool = getMcpDirectMapping(agentForMcp);

    if (mcpTool && mcpFirstMode !== 'off') {
      // MCP-eligible 에이전트 → MCP로 라우팅
      var mcpModelInfo = getModelInfoForAgent(mapAgentToMcp(agentForMcp));
      return {
        route: 'mcp',
        mcpTool: mcpTool,
        agentRole: agentForMcp,
        reason: 'mcp-first-' + agentForMcp,
        targetModel: mcpModelInfo,
        mcpFirstMode: mcpFirstMode
      };
    }
  }

  // === 기존 로직 (MCP-ineligible 에이전트용) ===
  // 의존성 주입 지원 (테스트용)
  var fusion = options.fusion !== undefined ? options.fusion : readJsonFile(FUSION_STATE_FILE);
  var fallback = options.fallback !== undefined ? options.fallback : readJsonFile(FALLBACK_STATE_FILE);
  var limits = options.limits !== undefined ? options.limits : readJsonFile(PROVIDER_LIMITS_FILE);
  // config는 이미 위에서 읽었으므로 재사용

  // OMC v4.2.15+ delegationRouting 활성화 시: OMC가 직접 라우팅하므로 OMCM 퓨전 비활성화
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

  // 폴백 활성화 상태 - MCP로 라우팅
  if (fallback && fallback.fallbackActive) {
    var currentModel = fallback.currentModel;
    var mcpAgent = 'codex-build';
    if (currentModel && currentModel.mcpAgent) {
      mcpAgent = currentModel.mcpAgent;
    }
    return {
      route: true,
      reason: 'fallback-active',
      targetModel: currentModel,
      mcpAgent: mcpAgent
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
      var mappedAgent = agentType ? mapAgentToMcp(agentType) : 'codex-build';
      var modelInfo = getModelInfoForAgent(mappedAgent);

      return {
        route: true,
        reason: 'claude-limit-' + maxPercent + '%',
        targetModel: { id: modelInfo.id, name: modelInfo.name },
        mcpAgent: mappedAgent
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
      var largeAgent = mapAgentToMcp(agentTypePrompt);
      var largeModel = getModelInfoForAgent(largeAgent);

      return {
        route: true,
        reason: 'large-task-' + agentTypePrompt,
        targetModel: { id: largeModel.id, name: largeModel.name },
        mcpAgent: largeAgent
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
        var levelAgent = mapAgentToMcp(agentTypeForLevel);
        var levelModel = getModelInfoForAgent(levelAgent);

        return {
          route: true,
          reason: 'session-token-' + routingLevel.name + '-' + agentTypeForLevel,
          targetModel: { id: levelModel.id, name: levelModel.name },
          mcpAgent: levelAgent,
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
    // 나머지 모든 에이전트는 fusionDefault 모드에서 MCP로 라우팅
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
      var mappedAgent = mapAgentToMcp(agentType);
      var modelInfo = getModelInfoForAgent(mappedAgent);

      return {
        route: true,
        reason: 'fusion-default-' + agentType,
        targetModel: { id: modelInfo.id, name: modelInfo.name },
        mcpAgent: mappedAgent
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
        'designer', 'writer', 'document-specialist', 'vision', 'quality-strategist',
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
          mcpAgent: mapAgentToMcp(agentType)
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
 * 하위호환: updateFusionState(decision, result, currentState) 호출도 지원
 *
 * @param {string|null|object} [sessionId] - 세션 ID (null이면 글로벌, object면 currentState로 간주)
 * @param {object} [currentState] - 현재 상태 (테스트용 주입)
 * @returns {object} - 업데이트된 상태
 */
export function updateFusionState(decision, result, sessionId = null, currentState = null) {
  ensureOmcmDir();

  // 하위호환: updateFusionState(decision, result, currentState)
  var resolvedSessionId = sessionId;
  var resolvedCurrentState = currentState;
  if (
    resolvedSessionId &&
    typeof resolvedSessionId === 'object' &&
    !Array.isArray(resolvedSessionId) &&
    resolvedCurrentState === null
  ) {
    resolvedCurrentState = resolvedSessionId;
    resolvedSessionId = null;
  }

  // 세션별 또는 글로벌 상태 파일 경로 결정
  var stateFile = FUSION_STATE_FILE;
  if (resolvedSessionId) {
    var sessionDir = join(OMCM_DIR, 'sessions', resolvedSessionId);
    if (!existsSync(sessionDir)) {
      mkdirSync(sessionDir, { recursive: true });
    }
    stateFile = join(sessionDir, 'fusion-state.json');
  }

  var state = resolvedCurrentState !== null ? resolvedCurrentState : readJsonFile(stateFile);
  if (!state) {
    state = {
      enabled: true,
      mode: 'balanced',
      totalTasks: 0,
      routedToMcp: 0,
      routingRate: 0,
      estimatedSavedTokens: 0,
      byProvider: { gemini: 0, openai: 0, anthropic: 0 },
      sessionId: resolvedSessionId
    };
  }

  // byProvider 방어적 초기화 (MCP-First 섹션이 부분 상태를 기록한 경우)
  if (!state.byProvider) {
    state.byProvider = { gemini: 0, openai: 0, anthropic: 0 };
  }

  state.totalTasks = (state.totalTasks || 0) + 1;

  if (decision.route) {
    state.routedToMcp = (state.routedToMcp || 0) + 1;
    state.estimatedSavedTokens = (state.estimatedSavedTokens || 0) + 1000;

    var model = decision.targetModel ? decision.targetModel.id : '';
    var agent = decision.mcpAgent || '';

    if (model.indexOf('gemini') !== -1 || agent === 'gemini-flash' || agent === 'gemini-pro') {
      state.byProvider.gemini++;
    } else if (model.indexOf('gpt') !== -1 || model.indexOf('codex') !== -1) {
      state.byProvider.openai++;
    }
  } else {
    state.byProvider.anthropic++;
  }

  state.routingRate = state.totalTasks > 0
    ? Math.round(((state.routedToMcp || 0) / state.totalTasks) * 100)
    : 0;
  state.lastUpdated = new Date().toISOString();

  writeFileSync(stateFile, JSON.stringify(state, null, 2));

  // 글로벌 상태도 함께 업데이트 (세션별 상태와 별개로 누적)
  if (resolvedSessionId) {
    var globalState = readJsonFile(FUSION_STATE_FILE);
    if (!globalState) {
      globalState = {
        enabled: true,
        mode: 'balanced',
        totalTasks: 0,
        routedToMcp: 0,
        routingRate: 0,
        estimatedSavedTokens: 0,
        byProvider: { gemini: 0, openai: 0, anthropic: 0 }
      };
    }
    if (!globalState.byProvider) {
      globalState.byProvider = { gemini: 0, openai: 0, anthropic: 0 };
    }
    globalState.totalTasks = (globalState.totalTasks || 0) + 1;
    if (decision.route) {
      globalState.routedToMcp = (globalState.routedToMcp || 0) + 1;
      globalState.estimatedSavedTokens = (globalState.estimatedSavedTokens || 0) + 1000;
      var gModel = decision.targetModel ? decision.targetModel.id : '';
      var gAgent = decision.mcpAgent || '';
      if (gModel.indexOf('gemini') !== -1 || gAgent === 'gemini-flash' || gAgent === 'gemini-pro') {
        globalState.byProvider.gemini++;
      } else if (gModel.indexOf('gpt') !== -1 || gModel.indexOf('codex') !== -1) {
        globalState.byProvider.openai++;
      }
    } else {
      globalState.byProvider.anthropic++;
    }
    globalState.routingRate = globalState.totalTasks > 0
      ? Math.round(((globalState.routedToMcp || 0) / globalState.totalTasks) * 100) : 0;
    globalState.lastUpdated = new Date().toISOString();
    writeFileSync(FUSION_STATE_FILE, JSON.stringify(globalState, null, 2));
  }

  return state;
}

/**
 * 라우팅 가능한 에이전트 목록 (MCP로 라우팅하여 토큰 절약)
 * OMC 4.2.15 + MCP-First v3.0 기준
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
  'designer', 'writer', 'document-specialist', 'vision', 'quality-strategist',
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
export function shouldRouteToMcpV2(toolInput, context = {}, options = {}) {
  // 에이전트 타입 추출
  var agentType = '';
  if (toolInput && toolInput.subagent_type) {
    agentType = toolInput.subagent_type.replace('oh-my-claudecode:', '');
  }

  if (!agentType) {
    return { route: false, reason: 'no-agent-type' };
  }

  // 0. MCP-First 체크 (V2에서도 최우선)
  if (toolInput && toolInput.subagent_type) {
    var configForMcp = null;
    if (Object.prototype.hasOwnProperty.call(options, 'config')) {
      configForMcp = options.config;
    } else {
      configForMcp = readJsonFile(CONFIG_FILE);
    }
    if (configForMcp && configForMcp.mcpFirst === true) {
      var mcpToolV2 = getMcpDirectMapping(agentType);
      if (mcpToolV2) {
        var mcpDecision = {
          route: 'mcp',
          mcpTool: mcpToolV2,
          agentRole: agentType,
          reason: 'mcp-first-v2-' + agentType,
          targetModel: getModelInfoForAgent(mapAgentToMcp(agentType)),
          mcpAgent: mapAgentToMcp(agentType)
        };
        cacheRoute(agentType, context, mcpDecision);
        return mcpDecision;
      }
    }
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
        route: action.preferredProvider === 'mcp',
        reason: 'rule-' + ruleResult.rule.id,
        ruleApplied: ruleResult.rule,
        matched: true,
      };

      if (decision.route) {
        var mappedAgent = mapAgentToMcp(agentType);
        decision.mcpAgent = mappedAgent;
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
      route: dynamicMapping.provider === 'mcp',
      reason: 'dynamic-mapping-' + agentType,
      targetModel: {
        id: dynamicMapping.model,
        name: dynamicMapping.model,
      },
      mcpAgent: dynamicMapping.target,
      tier: dynamicMapping.tier,
    };

    cacheRoute(agentType, context, decision);
    return decision;
  }

  // 4. 기본 로직 (v0.7.0 호환)
  var baseDecision = shouldRouteToMcp(toolInput, options);

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
      routedToMcp: fusionState.routedToMcp || 0,
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
        'scientist', 'designer', 'writer', 'document-specialist', 'vision',
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
        'scientist', 'designer', 'writer', 'document-specialist', 'vision',
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
        'scientist', 'designer', 'writer', 'document-specialist', 'vision',
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
var ANTIGRAVITY_ACCOUNTS_FILE = join(HOME, '.config', 'omcm', 'antigravity-accounts.json');

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
      // MCP ask_gemini는 Antigravity 프록시를 사용하므로 antigravity 키만 확인
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
      // (MCP ask_gemini가 rate-limited 계정을 우선 선택하는 경우 방지)
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
 * Flash → Codex (빠른 작업은 GPT-5.3-Codex로 대체)
 * Gemini Pro → Oracle (GPT-5.3)
 *
 * @param {string} mcpAgent - 원래 MCP 에이전트 힌트 (gemini-flash, codex-oracle 등)
 * @param {object} modelInfo - 원래 모델 정보 { id, name }
 * @returns {object|null} - { agent, model: { id, name }, reason } 또는 null (폴백 불필요)
 */
export function getGeminiFallback(mcpAgent, modelInfo) {
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
 * @param {object} decision - shouldRouteToMcp()의 반환값
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
  var fallback = getGeminiFallback(decision.mcpAgent, decision.targetModel);
  if (!fallback) return decision;

  // 원본 결정 보존 + 폴백 정보 병합
  return {
    route: decision.route,
    reason: decision.reason + '+' + fallback.reason,
    targetModel: fallback.model,
    mcpAgent: fallback.agent,
    originalAgent: decision.mcpAgent,
    originalModel: decision.targetModel,
    geminiRateLimit: {
      isLimited: true,
      earliestReset: rateLimit.earliestReset,
      fallbackApplied: true
    }
  };
}
