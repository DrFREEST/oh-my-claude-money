/**
 * fusion-router-logic.mjs - 퓨전 라우터 핵심 로직 (테스트 가능)
 *
 * hooks/fusion-router.mjs에서 사용되는 핵심 로직을 분리
 */

import { readFileSync, existsSync, mkdirSync, openSync, writeSync, closeSync, writeFileSync } from 'fs';
import { join } from 'path';

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
 * @param {string} agentType - OMC 에이전트 타입
 * @returns {string} - OpenCode 에이전트 (Oracle, Flash, Codex)
 */
export function mapAgentToOpenCode(agentType) {
  var mapping = {
    'architect': 'Oracle',
    'architect-low': 'Flash',
    'architect-medium': 'Oracle',
    'researcher': 'Oracle',
    'researcher-low': 'Flash',
    'designer': 'Flash',
    'designer-low': 'Flash',
    'designer-high': 'Codex',
    'explore': 'Flash',
    'explore-medium': 'Oracle',
    'explore-high': 'Oracle',
    'scientist': 'Oracle',
    'scientist-low': 'Flash',
    'scientist-high': 'Oracle',
    'executor': 'Codex',
    'executor-low': 'Flash',
    'executor-high': 'Codex',
    'writer': 'Flash',
    'planner': 'Oracle',
    'critic': 'Oracle',
    'analyst': 'Oracle',
    'vision': 'Flash',
    'qa-tester': 'Codex',
    'qa-tester-high': 'Codex',
    'security-reviewer': 'Oracle',
    'security-reviewer-low': 'Flash',
    'build-fixer': 'Codex',
    'build-fixer-low': 'Flash',
    'tdd-guide': 'Codex',
    'tdd-guide-low': 'Flash',
    'code-reviewer': 'Oracle',
    'code-reviewer-low': 'Flash'
  };
  return mapping[agentType] || 'Codex';
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
      // 에이전트 매핑 존중 (Flash/Oracle/Codex)
      var agentType = '';
      if (toolInput && toolInput.subagent_type) {
        agentType = toolInput.subagent_type.replace('oh-my-claudecode:', '');
      }
      var mappedAgent = agentType ? mapAgentToOpenCode(agentType) : 'Codex';

      return {
        route: true,
        reason: 'claude-limit-' + maxPercent + '%',
        targetModel: { id: mappedAgent === 'Flash' ? 'gemini-flash' : 'gpt-5.2-codex', name: mappedAgent === 'Flash' ? 'Gemini Flash' : 'GPT-5.2 Codex' },
        opencodeAgent: mappedAgent
      };
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
      var modelId = mappedAgent === 'Flash' ? 'gemini-flash' : 'gpt-5.2-codex';
      var modelName = mappedAgent === 'Flash' ? 'Gemini Flash' : (mappedAgent === 'Oracle' ? 'GPT Oracle' : 'GPT Codex');

      return {
        route: true,
        reason: 'fusion-default-' + agentType,
        targetModel: { id: modelId, name: modelName },
        opencodeAgent: mappedAgent
      };
    }

    // save-tokens 모드: 특정 에이전트만 라우팅
    if (!fusionDefault && fusion && fusion.mode === 'save-tokens') {
      var tokenSavingAgents = ['architect', 'architect-low', 'architect-medium',
                              'researcher', 'researcher-low',
                              'designer', 'designer-low', 'designer-high',
                              'explore', 'explore-medium', 'explore-high',
                              'scientist', 'scientist-low', 'scientist-high',
                              'writer', 'vision',
                              'code-reviewer', 'code-reviewer-low',
                              'security-reviewer', 'security-reviewer-low'];

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
 * @param {object} [currentState] - 현재 상태 (테스트용 주입)
 * @returns {object} - 업데이트된 상태
 */
export function updateFusionState(decision, result, currentState = null) {
  ensureOmcmDir();

  var state = currentState !== null ? currentState : readJsonFile(FUSION_STATE_FILE);
  if (!state) {
    state = {
      enabled: true,
      mode: 'balanced',
      totalTasks: 0,
      routedToOpenCode: 0,
      routingRate: 0,
      estimatedSavedTokens: 0,
      byProvider: { gemini: 0, openai: 0, anthropic: 0 }
    };
  }

  state.totalTasks++;

  if (decision.route) {
    state.routedToOpenCode++;
    state.estimatedSavedTokens += 1000; // 작업당 약 1000 토큰 절약 추정

    // 프로바이더별 추적
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

  writeFileSync(FUSION_STATE_FILE, JSON.stringify(state, null, 2));

  return state;
}

/**
 * 라우팅 가능한 에이전트 목록 (OpenCode로 라우팅하여 토큰 절약)
 * fusionDefault 모드에서는 planner 제외 모든 에이전트가 라우팅됨
 */
export const TOKEN_SAVING_AGENTS = [
  // 분석/탐색
  'architect', 'architect-low', 'architect-medium',
  'researcher', 'researcher-low',
  'explore', 'explore-medium', 'explore-high',
  'analyst', 'critic',
  // 데이터 과학
  'scientist', 'scientist-low', 'scientist-high',
  // 프론트엔드/디자인
  'designer', 'designer-low', 'designer-high',
  // 문서/비전
  'writer', 'vision',
  // 코드 리뷰/보안
  'code-reviewer', 'code-reviewer-low',
  'security-reviewer', 'security-reviewer-low',
  // 실행/구현
  'executor', 'executor-low', 'executor-high',
  // QA/테스트
  'qa-tester', 'qa-tester-high',
  'tdd-guide', 'tdd-guide-low',
  // 빌드
  'build-fixer', 'build-fixer-low'
];

/**
 * 라우팅 불가능한 에이전트 목록 (Claude 전용)
 * fusionDefault 모드에서도 planner만 Claude에서 유지 (전략적 계획 수립)
 * 나머지 에이전트(executor, qa-tester, build-fixer, tdd-guide, critic)는 OpenCode로 라우팅
 */
export const CLAUDE_ONLY_AGENTS = ['planner'];
