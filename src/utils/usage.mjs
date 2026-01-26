/**
 * usage.mjs - HUD 사용량 데이터 유틸리티
 *
 * OMC HUD 캐시에서 사용량 정보를 읽고 분석하는 유틸리티 함수들
 */

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

// 기본 설정
export const DEFAULT_THRESHOLD = 90;
export const WARNING_THRESHOLD = 70;
export const HUD_CACHE_PATH = join(homedir(), '.claude/plugins/oh-my-claudecode/.usage-cache.json');

/**
 * HUD 캐시에서 사용량 데이터 읽기
 * @returns {Object|null} 사용량 데이터 또는 null
 */
export function getUsageFromCache() {
  if (!existsSync(HUD_CACHE_PATH)) {
    return null;
  }

  try {
    const content = readFileSync(HUD_CACHE_PATH, 'utf-8');
    const cache = JSON.parse(content);

    if (cache.data) {
      return {
        fiveHour: cache.data.fiveHourPercent ?? 0,
        weekly: cache.data.weeklyPercent ?? 0,
        fiveHourResetsAt: cache.data.fiveHourResetsAt ? new Date(cache.data.fiveHourResetsAt) : null,
        weeklyResetsAt: cache.data.weeklyResetsAt ? new Date(cache.data.weeklyResetsAt) : null,
        timestamp: cache.timestamp,
        error: cache.error ?? false,
      };
    }
  } catch (e) {
    // 파싱 실패
  }

  return null;
}

/**
 * 임계치 도달 여부 확인
 * @param {number} threshold - 임계치 (기본 90%)
 * @returns {Object} { exceeded: boolean, type: 'fiveHour'|'weekly'|null, percent: number }
 */
export function checkThreshold(threshold = DEFAULT_THRESHOLD) {
  const usage = getUsageFromCache();

  if (!usage) {
    return { exceeded: false, type: null, percent: 0 };
  }

  if (usage.fiveHour >= threshold) {
    return { exceeded: true, type: 'fiveHour', percent: usage.fiveHour };
  }

  if (usage.weekly >= threshold) {
    return { exceeded: true, type: 'weekly', percent: usage.weekly };
  }

  return { exceeded: false, type: null, percent: Math.max(usage.fiveHour, usage.weekly) };
}

/**
 * 사용량 상태 레벨 결정
 * @returns {'critical'|'warning'|'normal'|'unknown'}
 */
export function getUsageLevel() {
  const usage = getUsageFromCache();

  if (!usage) return 'unknown';

  const maxPercent = Math.max(usage.fiveHour, usage.weekly);

  if (maxPercent >= DEFAULT_THRESHOLD) return 'critical';
  if (maxPercent >= WARNING_THRESHOLD) return 'warning';
  return 'normal';
}

/**
 * 리셋 시간까지 남은 시간 계산
 * @param {Date} resetDate - 리셋 시간
 * @returns {string} 포맷된 남은 시간 (예: "2h 30m")
 */
export function formatTimeUntilReset(resetDate) {
  if (!resetDate) return 'N/A';

  const now = Date.now();
  const resetMs = resetDate.getTime();
  const diffMs = resetMs - now;

  if (diffMs <= 0) return '곧 리셋';

  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    return `${diffDays}일 ${remainingHours}시간`;
  }

  const remainingMinutes = diffMinutes % 60;
  return `${diffHours}시간 ${remainingMinutes}분`;
}

/**
 * 사용량 요약 문자열 생성
 * @returns {string} 사용량 요약
 */
export function getUsageSummary() {
  const usage = getUsageFromCache();

  if (!usage) {
    return '사용량 정보 없음';
  }

  const fiveHourReset = formatTimeUntilReset(usage.fiveHourResetsAt);
  const weeklyReset = formatTimeUntilReset(usage.weeklyResetsAt);

  return `5시간: ${usage.fiveHour}% (리셋: ${fiveHourReset}), 주간: ${usage.weekly}% (리셋: ${weeklyReset})`;
}
