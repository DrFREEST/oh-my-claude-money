/**
 * switch-triggers.mjs - 자동 전환 고도화
 *
 * OMCM의 퓨전 라우팅에서 더 세밀한 자동 전환 트리거를 제공합니다.
 * 기존 5시간/주간 90% 기준 외에 추가 트리거:
 * - 시간당 요청 수 초과
 * - 세션 비용 예산 초과
 * - MCP 연속 실패
 * - 평균 응답 지연
 *
 * OMC v4.1.3 대응
 *
 * @version 1.0.0
 */

// ANSI 컬러 상수
var RED = '\x1b[31m';
var YELLOW = '\x1b[33m';
var GREEN = '\x1b[32m';
var CYAN = '\x1b[36m';
var DIM = '\x1b[2m';
var RESET = '\x1b[0m';

/**
 * 자동 전환 트리거 설정
 * @type {Object.<string, {threshold: number, unit: string, action: string}>}
 */
var SWITCH_TRIGGERS = {
  hourly_rate: { threshold: 50, unit: 'requests/hour', action: 'suggest_opencode' },
  cost_budget: { threshold: 5.0, unit: '$/session', action: 'force_opencode' },
  mcp_failure: { threshold: 3, unit: 'consecutive', action: 'fallback_opencode' },
  latency: { threshold: 30000, unit: 'ms_avg', action: 'switch_model' },
  token_burn_rate: { threshold: 100000, unit: 'tokens/minute', action: 'suggest_downgrade' },
};

/**
 * 액션 우선순위 맵 (높을수록 긴급)
 * @type {Object.<string, number>}
 */
var ACTION_PRIORITY = {
  force_opencode: 100,
  fallback_opencode: 80,
  suggest_downgrade: 60,
  switch_model: 40,
  suggest_opencode: 20,
};

/**
 * 액션별 심각도 맵
 * @type {Object.<string, string>}
 */
var ACTION_SEVERITY = {
  force_opencode: 'critical',
  fallback_opencode: 'critical',
  suggest_downgrade: 'warning',
  switch_model: 'warning',
  suggest_opencode: 'info',
};

/**
 * 메트릭을 기반으로 트리거를 평가
 *
 * @param {Object} metrics - 메트릭 데이터
 * @param {number} [metrics.hourlyRequests] - 시간당 요청 수
 * @param {number} [metrics.sessionCost] - 세션 비용 ($)
 * @param {number} [metrics.mcpConsecutiveFailures] - MCP 연속 실패 횟수
 * @param {number} [metrics.avgLatencyMs] - 평균 응답 지연 (ms)
 * @param {number} [metrics.tokenBurnRate] - 토큰 소모율 (tokens/minute)
 * @param {Object} [config] - 트리거 설정 (기본값: SWITCH_TRIGGERS)
 * @returns {{triggered: boolean, triggers: Array<{name: string, threshold: number, actual: number, action: string, message: string}>}}
 */
export function evaluateTriggers(metrics, config) {
  var triggers = [];
  var triggerConfig = config || SWITCH_TRIGGERS;

  if (!metrics) {
    return { triggered: false, triggers: [] };
  }

  // hourly_rate 체크
  if (metrics.hourlyRequests !== undefined && triggerConfig.hourly_rate) {
    if (metrics.hourlyRequests > triggerConfig.hourly_rate.threshold) {
      triggers.push({
        name: 'hourly_rate',
        threshold: triggerConfig.hourly_rate.threshold,
        actual: metrics.hourlyRequests,
        action: triggerConfig.hourly_rate.action,
        message: 'Hourly request rate exceeded: ' + metrics.hourlyRequests + ' > ' + triggerConfig.hourly_rate.threshold,
      });
    }
  }

  // cost_budget 체크
  if (metrics.sessionCost !== undefined && triggerConfig.cost_budget) {
    if (metrics.sessionCost > triggerConfig.cost_budget.threshold) {
      triggers.push({
        name: 'cost_budget',
        threshold: triggerConfig.cost_budget.threshold,
        actual: metrics.sessionCost,
        action: triggerConfig.cost_budget.action,
        message: 'Session cost budget exceeded: $' + metrics.sessionCost.toFixed(2) + ' > $' + triggerConfig.cost_budget.threshold.toFixed(2),
      });
    }
  }

  // mcp_failure 체크
  if (metrics.mcpConsecutiveFailures !== undefined && triggerConfig.mcp_failure) {
    if (metrics.mcpConsecutiveFailures >= triggerConfig.mcp_failure.threshold) {
      triggers.push({
        name: 'mcp_failure',
        threshold: triggerConfig.mcp_failure.threshold,
        actual: metrics.mcpConsecutiveFailures,
        action: triggerConfig.mcp_failure.action,
        message: 'MCP consecutive failures: ' + metrics.mcpConsecutiveFailures + ' >= ' + triggerConfig.mcp_failure.threshold,
      });
    }
  }

  // latency 체크
  if (metrics.avgLatencyMs !== undefined && triggerConfig.latency) {
    if (metrics.avgLatencyMs > triggerConfig.latency.threshold) {
      triggers.push({
        name: 'latency',
        threshold: triggerConfig.latency.threshold,
        actual: metrics.avgLatencyMs,
        action: triggerConfig.latency.action,
        message: 'Average latency exceeded: ' + metrics.avgLatencyMs + 'ms > ' + triggerConfig.latency.threshold + 'ms',
      });
    }
  }

  // token_burn_rate 체크
  if (metrics.tokenBurnRate !== undefined && triggerConfig.token_burn_rate) {
    if (metrics.tokenBurnRate > triggerConfig.token_burn_rate.threshold) {
      triggers.push({
        name: 'token_burn_rate',
        threshold: triggerConfig.token_burn_rate.threshold,
        actual: metrics.tokenBurnRate,
        action: triggerConfig.token_burn_rate.action,
        message: 'Token burn rate exceeded: ' + metrics.tokenBurnRate + ' tokens/min > ' + triggerConfig.token_burn_rate.threshold + ' tokens/min',
      });
    }
  }

  return {
    triggered: triggers.length > 0,
    triggers: triggers,
  };
}

/**
 * 활성화된 트리거들로부터 권장 액션 결정
 *
 * @param {Array<{name: string, threshold: number, actual: number, action: string, message: string}>} triggers - 활성화된 트리거 목록
 * @returns {{action: string, reason: string, severity: string}}
 */
export function getRecommendedAction(triggers) {
  if (!triggers || triggers.length === 0) {
    return { action: 'none', reason: 'No triggers activated', severity: 'info' };
  }

  // 우선순위가 가장 높은 트리거 찾기
  var highestPriority = -1;
  var selectedTrigger = null;

  for (var i = 0; i < triggers.length; i++) {
    var trigger = triggers[i];
    var priority = ACTION_PRIORITY[trigger.action] || 0;
    if (priority > highestPriority) {
      highestPriority = priority;
      selectedTrigger = trigger;
    }
  }

  if (!selectedTrigger) {
    return { action: 'none', reason: 'No valid trigger action found', severity: 'info' };
  }

  var severity = ACTION_SEVERITY[selectedTrigger.action] || 'info';
  var reason = selectedTrigger.message;

  // 여러 트리거가 있으면 이유에 추가 정보 포함
  if (triggers.length > 1) {
    reason = reason + ' (and ' + (triggers.length - 1) + ' more trigger(s))';
  }

  return {
    action: selectedTrigger.action,
    reason: reason,
    severity: severity,
  };
}

/**
 * 사용자 오버라이드와 환경변수를 적용한 트리거 설정 생성
 *
 * @param {Object} [overrides] - 사용자 오버라이드 설정
 * @returns {Object} 병합된 트리거 설정
 */
export function createTriggerConfig(overrides) {
  // 기본 설정 복사
  var config = {};
  var keys = Object.keys(SWITCH_TRIGGERS);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    config[key] = {
      threshold: SWITCH_TRIGGERS[key].threshold,
      unit: SWITCH_TRIGGERS[key].unit,
      action: SWITCH_TRIGGERS[key].action,
    };
  }

  // 환경변수 체크 (OMCM_TRIGGER_*)
  var envPrefix = 'OMCM_TRIGGER_';
  var envKeys = Object.keys(process.env);
  for (var j = 0; j < envKeys.length; j++) {
    var envKey = envKeys[j];
    if (envKey.indexOf(envPrefix) === 0) {
      var triggerName = envKey.substring(envPrefix.length).toLowerCase();
      var envValue = parseFloat(process.env[envKey]);
      if (!isNaN(envValue) && config[triggerName]) {
        config[triggerName].threshold = envValue;
      }
    }
  }

  // 사용자 오버라이드 적용
  if (overrides) {
    var overrideKeys = Object.keys(overrides);
    for (var k = 0; k < overrideKeys.length; k++) {
      var overrideKey = overrideKeys[k];
      if (config[overrideKey] && overrides[overrideKey]) {
        if (overrides[overrideKey].threshold !== undefined) {
          config[overrideKey].threshold = overrides[overrideKey].threshold;
        }
        if (overrides[overrideKey].action !== undefined) {
          config[overrideKey].action = overrides[overrideKey].action;
        }
        if (overrides[overrideKey].unit !== undefined) {
          config[overrideKey].unit = overrides[overrideKey].unit;
        }
      }
    }
  }

  return config;
}

/**
 * 트리거 알림을 HUD 표시용 문자열로 포맷
 *
 * @param {{name: string, threshold: number, actual: number, action: string, message: string}} trigger - 트리거 정보
 * @param {string} [severity] - 심각도 ('critical', 'warning', 'info')
 * @returns {string} 포맷된 알림 문자열
 */
export function formatTriggerAlert(trigger, severity) {
  var sev = severity || ACTION_SEVERITY[trigger.action] || 'info';
  var color;

  if (sev === 'critical') {
    color = RED;
  } else if (sev === 'warning') {
    color = YELLOW;
  } else {
    color = CYAN;
  }

  var prefix = '[TRIGGER] ';
  var actionLabel = trigger.action.toUpperCase().replace(/_/g, ' ');
  var message = trigger.message;

  return color + prefix + actionLabel + ': ' + message + RESET;
}

/**
 * 기본 트리거 설정 export
 */
export { SWITCH_TRIGGERS };
