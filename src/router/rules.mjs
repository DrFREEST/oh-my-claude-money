/**
 * rules.mjs - 조건부 라우팅 규칙 엔진 v0.8.0
 *
 * 사용량, 작업 복잡도, 에이전트 타입 등 조건에 따라
 * 라우팅 결정을 동적으로 변경합니다.
 *
 * @since v0.8.0
 */

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// =============================================================================
// 설정 파일 경로
// =============================================================================

const RULES_PATHS = [
  join(homedir(), '.claude/plugins/omcm/routing-rules.json'),
  join(homedir(), '.omcm/routing-rules.json'),
  join(process.cwd(), '.omcm/routing-rules.json'),
];

// =============================================================================
// 기본 규칙
// =============================================================================

const DEFAULT_RULES = [
  {
    id: 'high-usage-opencode',
    condition: 'usage.fiveHour > 90',
    action: 'prefer_opencode',
    priority: 100,
    description: '5시간 사용량 90% 초과 시 OpenCode 우선',
  },
  {
    id: 'weekly-limit-opencode',
    condition: 'usage.weekly > 85',
    action: 'prefer_opencode',
    priority: 90,
    description: '주간 사용량 85% 초과 시 OpenCode 우선',
  },
  {
    id: 'complex-task-claude',
    condition: 'task.complexity == "high"',
    action: 'prefer_claude',
    priority: 80,
    description: '복잡한 작업은 Claude 우선',
  },
  {
    id: 'security-claude',
    condition: 'agent.type == "security-reviewer"',
    action: 'prefer_claude',
    priority: 85,
    description: '보안 검토는 Claude 우선',
  },
  {
    id: 'ecomode-opencode',
    condition: 'mode.ecomode == true',
    action: 'prefer_opencode',
    priority: 95,
    description: 'Ecomode 활성화 시 OpenCode 우선',
  },
];

// =============================================================================
// 규칙 캐시
// =============================================================================

let cachedRules = null;
let cacheTimestamp = 0;

const CACHE_TTL = 5 * 60 * 1000; // 5분

// =============================================================================
// 규칙 파일 로드
// =============================================================================

function loadRulesFile() {
  for (const path of RULES_PATHS) {
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, 'utf-8');
        const parsed = JSON.parse(content);

        if (parsed.rules && Array.isArray(parsed.rules)) {
          return parsed.rules;
        }
      } catch (e) {
        console.error(`[OMCM] Failed to load rules from ${path}: ${e.message}`);
      }
    }
  }

  return null;
}

// =============================================================================
// 규칙 가져오기
// =============================================================================

export function getRules() {
  const now = Date.now();

  if (cachedRules && now - cacheTimestamp < CACHE_TTL) {
    return cachedRules;
  }

  const customRules = loadRulesFile();

  if (customRules) {
    // 기본 규칙 + 커스텀 규칙 병합 후 정렬
    cachedRules = [...DEFAULT_RULES, ...customRules].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    );
  } else {
    // 기본 규칙만 사용 - 정렬 필요
    cachedRules = [...DEFAULT_RULES].sort(
      (a, b) => (b.priority || 0) - (a.priority || 0)
    );
  }

  cacheTimestamp = now;
  return cachedRules;
}

// =============================================================================
// 조건 평가
// =============================================================================

/**
 * 조건 문자열 평가
 *
 * @param {string} condition - 조건 문자열 (예: 'usage.fiveHour > 90')
 * @param {object} context - 평가 컨텍스트
 * @returns {boolean} 조건 충족 여부
 */
function evaluateCondition(condition, context) {
  // 안전한 조건 평가를 위한 파싱
  const operators = ['>=', '<=', '!=', '==', '>', '<'];
  let operator = null;
  let parts = null;

  for (const op of operators) {
    if (condition.includes(op)) {
      operator = op;
      parts = condition.split(op).map((s) => s.trim());
      break;
    }
  }

  if (!operator || !parts || parts.length !== 2) {
    return false;
  }

  const [leftPath, rightValue] = parts;

  // 왼쪽 값 추출 (점 표기법)
  let leftValue = context;
  for (const key of leftPath.split('.')) {
    if (leftValue && typeof leftValue === 'object' && key in leftValue) {
      leftValue = leftValue[key];
    } else {
      leftValue = undefined;
      break;
    }
  }

  // 오른쪽 값 파싱
  let right;
  if (rightValue === 'true') {
    right = true;
  } else if (rightValue === 'false') {
    right = false;
  } else if (rightValue.startsWith('"') && rightValue.endsWith('"')) {
    right = rightValue.slice(1, -1);
  } else if (!isNaN(rightValue)) {
    right = parseFloat(rightValue);
  } else {
    right = rightValue;
  }

  // 비교 연산
  switch (operator) {
    case '==':
      return leftValue == right;
    case '!=':
      return leftValue != right;
    case '>':
      return leftValue > right;
    case '<':
      return leftValue < right;
    case '>=':
      return leftValue >= right;
    case '<=':
      return leftValue <= right;
    default:
      return false;
  }
}

// =============================================================================
// 라우팅 결정
// =============================================================================

/**
 * 컨텍스트 기반 라우팅 결정
 *
 * @param {object} context - 라우팅 컨텍스트
 * @param {object} context.usage - 사용량 정보 { fiveHour, weekly }
 * @param {object} context.task - 작업 정보 { complexity, type }
 * @param {object} context.agent - 에이전트 정보 { type, tier }
 * @param {object} context.mode - 모드 정보 { ecomode, ralph }
 * @returns {object} 라우팅 결정 { action, rule, matched }
 */
export function evaluateRouting(context) {
  const rules = getRules();
  const matchedRules = [];

  for (const rule of rules) {
    if (!rule.condition || !rule.action) {
      continue;
    }

    try {
      if (evaluateCondition(rule.condition, context)) {
        matchedRules.push(rule);
      }
    } catch (e) {
      // 조건 평가 오류 무시
    }
  }

  if (matchedRules.length === 0) {
    return {
      action: 'default',
      rule: null,
      matched: false,
    };
  }

  // 가장 높은 우선순위 규칙 선택
  const topRule = matchedRules[0];

  return {
    action: topRule.action,
    rule: topRule,
    matched: true,
    allMatched: matchedRules,
  };
}

// =============================================================================
// 액션 해석
// =============================================================================

/**
 * 액션을 라우팅 설정으로 변환
 *
 * @param {string} action - 액션명
 * @returns {object} 라우팅 설정
 */
export function interpretAction(action) {
  switch (action) {
    case 'prefer_opencode':
      return {
        preferredProvider: 'opencode',
        forceProvider: false,
        reason: 'Rule: prefer OpenCode',
      };

    case 'force_opencode':
      return {
        preferredProvider: 'opencode',
        forceProvider: true,
        reason: 'Rule: force OpenCode',
      };

    case 'prefer_claude':
      return {
        preferredProvider: 'claude',
        forceProvider: false,
        reason: 'Rule: prefer Claude',
      };

    case 'force_claude':
      return {
        preferredProvider: 'claude',
        forceProvider: true,
        reason: 'Rule: force Claude',
      };

    case 'block':
      return {
        blocked: true,
        reason: 'Rule: blocked',
      };

    default:
      return {
        preferredProvider: null,
        forceProvider: false,
        reason: 'Default routing',
      };
  }
}

// =============================================================================
// 규칙 캐시 무효화
// =============================================================================

export function invalidateRulesCache() {
  cachedRules = null;
  cacheTimestamp = 0;
}

// =============================================================================
// 규칙 검증
// =============================================================================

export function validateRule(rule) {
  const errors = [];

  if (!rule.id) {
    errors.push('Missing "id"');
  }

  if (!rule.condition) {
    errors.push('Missing "condition"');
  }

  if (!rule.action) {
    errors.push('Missing "action"');
  }

  const validActions = [
    'prefer_opencode',
    'force_opencode',
    'prefer_claude',
    'force_claude',
    'block',
    'default',
  ];

  if (rule.action && !validActions.includes(rule.action)) {
    errors.push(`Invalid action: ${rule.action}`);
  }

  if (typeof rule.priority !== 'undefined' && typeof rule.priority !== 'number') {
    errors.push('Priority must be a number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// 규칙 목록 조회
// =============================================================================

export function listRules() {
  return getRules().map((rule) => ({
    id: rule.id,
    condition: rule.condition,
    action: rule.action,
    priority: rule.priority || 0,
    description: rule.description || '',
  }));
}
