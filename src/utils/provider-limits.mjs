/**
 * provider-limits.mjs - 프로바이더별 리밋 추적
 *
 * OpenAI: 응답 헤더 파싱
 * Gemini: 로컬 카운팅
 * Claude: OAuth API
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'fs';
import { join, dirname } from 'path';

const LIMITS_FILE = join(process.env.HOME || '', '.omcm', 'provider-limits.json');

// mtime 기반 캐싱
let limitsCache = { data: null, mtime: 0 };

// Gemini Tier별 기본 리밋
const GEMINI_TIER_LIMITS = {
  free: { rpm: 15, tpm: 32000, rpd: 1000 },
  tier1: { rpm: 150, tpm: 100000, rpd: 10000 },
  tier2: { rpm: 1000, tpm: 500000, rpd: 50000 },
  tier3: { rpm: 4000, tpm: 2000000, rpd: 200000 }
};

/**
 * 리밋 상태 로드 (mtime 기반 캐싱)
 */
function loadLimits() {
  if (!existsSync(LIMITS_FILE)) {
    return getDefaultLimits();
  }

  try {
    const stat = statSync(LIMITS_FILE);
    
    // 파일이 변경되지 않았으면 캐시 반환
    if (limitsCache.data && stat.mtimeMs <= limitsCache.mtime) {
      return limitsCache.data;
    }
    
    // 파일 읽고 캐시 업데이트
    const data = JSON.parse(readFileSync(LIMITS_FILE, 'utf-8'));
    limitsCache.data = data;
    limitsCache.mtime = stat.mtimeMs;
    return data;
  } catch (e) {
    return getDefaultLimits();
  }
}

/**
 * 기본 리밋 상태
 */
function getDefaultLimits() {
  return {
    claude: {
      fiveHour: { used: 0, limit: 100, percent: 0 },
      weekly: { used: 0, limit: 100, percent: 0 },
      monthly: { used: 0, limit: 100, percent: 0 },
      lastUpdated: null
    },
    openai: {
      requests: { remaining: null, limit: null, reset: null, percent: 0 },
      tokens: { remaining: null, limit: null, reset: null, percent: 0 },
      lastUpdated: null
    },
    gemini: {
      tier: 'free',
      rpm: { used: 0, limit: GEMINI_TIER_LIMITS.free.rpm },
      tpm: { used: 0, limit: GEMINI_TIER_LIMITS.free.tpm },
      rpd: { used: 0, limit: GEMINI_TIER_LIMITS.free.rpd },
      requestLog: [],  // 최근 1분 요청 기록
      dailyRequests: 0,
      dailyResetTime: null,
      lastUpdated: null,
      is429: false
    },
    lastUpdated: new Date().toISOString()
  };
}

/**
 * 리밋 저장 (캐시 동기화)
 */
function saveLimits(limits) {
  const dir = dirname(LIMITS_FILE);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  limits.lastUpdated = new Date().toISOString();
  writeFileSync(LIMITS_FILE, JSON.stringify(limits, null, 2));
  
  // 캐시 업데이트 (저장 후 stat으로 최신 mtime 반영)
  try {
    const stat = statSync(LIMITS_FILE);
    limitsCache.data = limits;
    limitsCache.mtime = stat.mtimeMs;
  } catch (e) {
    // 캐시 무효화 (다음 loadLimits에서 파일 재로드)
    limitsCache.data = null;
    limitsCache.mtime = 0;
  }
}

// ============================================================================
// Claude Limits (OAuth API)
// ============================================================================

/**
 * Claude 리밋 업데이트 (OAuth API 응답에서)
 */
export function updateClaudeLimits(fiveHourPercent, weeklyPercent, monthlyPercent) {
  const limits = loadLimits();

  // null/undefined가 아닌 경우에만 업데이트 (HUD 싱크 버그 수정)
  if (fiveHourPercent !== null && fiveHourPercent !== undefined) {
    limits.claude.fiveHour.percent = fiveHourPercent;
  }
  if (weeklyPercent !== null && weeklyPercent !== undefined) {
    limits.claude.weekly.percent = weeklyPercent;
  }
  if (monthlyPercent !== null && monthlyPercent !== undefined) {
    if (!limits.claude.monthly) {
      limits.claude.monthly = { used: 0, limit: 100, percent: 0 };
    }
    limits.claude.monthly.percent = monthlyPercent;
  }
  limits.claude.lastUpdated = new Date().toISOString();

  saveLimits(limits);
  return limits.claude;
}

/**
 * Claude 리밋 조회
 */
export function getClaudeLimits() {
  const limits = loadLimits();
  return limits.claude;
}

// ============================================================================
// OpenAI Limits (Response Headers)
// ============================================================================

/**
 * 헤더에서 값 추출 헬퍼
 */
function getHeaderValue(headers, key) {
  if (!headers) return null;

  // Headers 객체의 get 메서드가 있는 경우 (fetch API)
  if (typeof headers.get === 'function') {
    return headers.get(key);
  }

  // 일반 객체인 경우
  return headers[key] || null;
}

/**
 * OpenAI 응답 헤더에서 리밋 추출 및 저장
 */
export function updateOpenAILimitsFromHeaders(headers) {
  const limits = loadLimits();

  // 헤더에서 리밋 정보 추출
  const requestLimit = getHeaderValue(headers, 'x-ratelimit-limit-requests');
  const requestRemaining = getHeaderValue(headers, 'x-ratelimit-remaining-requests');
  const requestReset = getHeaderValue(headers, 'x-ratelimit-reset-requests');

  const tokenLimit = getHeaderValue(headers, 'x-ratelimit-limit-tokens');
  const tokenRemaining = getHeaderValue(headers, 'x-ratelimit-remaining-tokens');
  const tokenReset = getHeaderValue(headers, 'x-ratelimit-reset-tokens');

  if (requestLimit) {
    const limitNum = parseInt(requestLimit, 10);
    const remainingNum = parseInt(requestRemaining, 10);
    const usedNum = limitNum - remainingNum;
    const percent = limitNum > 0 ? Math.round((usedNum / limitNum) * 100) : 0;

    limits.openai.requests = {
      limit: limitNum,
      remaining: remainingNum,
      reset: requestReset,
      percent: percent
    };
  }

  if (tokenLimit) {
    const limitNum = parseInt(tokenLimit, 10);
    const remainingNum = parseInt(tokenRemaining, 10);
    const usedNum = limitNum - remainingNum;
    const percent = limitNum > 0 ? Math.round((usedNum / limitNum) * 100) : 0;

    limits.openai.tokens = {
      limit: limitNum,
      remaining: remainingNum,
      reset: tokenReset,
      percent: percent
    };
  }

  limits.openai.lastUpdated = new Date().toISOString();
  saveLimits(limits);

  return limits.openai;
}

/**
 * OpenAI 리밋 수동 설정 (테스트/디버깅용)
 */
export function setOpenAILimits(requestPercent, tokenPercent) {
  const limits = loadLimits();

  if (typeof requestPercent === 'number') {
    limits.openai.requests.percent = requestPercent;
  }

  if (typeof tokenPercent === 'number') {
    limits.openai.tokens.percent = tokenPercent;
  }

  limits.openai.lastUpdated = new Date().toISOString();
  saveLimits(limits);

  return limits.openai;
}

/**
 * OpenAI 리밋 조회
 */
export function getOpenAILimits() {
  const limits = loadLimits();
  return limits.openai;
}

// ============================================================================
// Gemini Limits (Local Counting)
// ============================================================================

/**
 * Gemini Tier 설정
 */
export function setGeminiTier(tier) {
  const limits = loadLimits();

  if (!GEMINI_TIER_LIMITS[tier]) {
    throw new Error('Invalid tier: ' + tier + '. Valid: free, tier1, tier2, tier3');
  }

  limits.gemini.tier = tier;
  limits.gemini.rpm.limit = GEMINI_TIER_LIMITS[tier].rpm;
  limits.gemini.tpm.limit = GEMINI_TIER_LIMITS[tier].tpm;
  limits.gemini.rpd.limit = GEMINI_TIER_LIMITS[tier].rpd;

  saveLimits(limits);
  return limits.gemini;
}

/**
 * Gemini 요청 기록 (로컬 카운팅)
 */
export function recordGeminiRequest(tokenCount) {
  const limits = loadLimits();
  const now = Date.now();

  // requestLog 초기화 (없는 경우)
  if (!Array.isArray(limits.gemini.requestLog)) {
    limits.gemini.requestLog = [];
  }

  // 요청 로그에 추가
  limits.gemini.requestLog.push({
    timestamp: now,
    tokens: tokenCount || 0
  });

  // 1분 이내 요청만 유지
  limits.gemini.requestLog = limits.gemini.requestLog.filter(function(req) {
    return now - req.timestamp < 60000;
  });

  // RPM 계산
  const requestsInMinute = limits.gemini.requestLog.length;
  limits.gemini.rpm.used = requestsInMinute;

  // TPM 계산
  let tokensInMinute = 0;
  for (let i = 0; i < limits.gemini.requestLog.length; i++) {
    tokensInMinute += limits.gemini.requestLog[i].tokens || 0;
  }
  limits.gemini.tpm.used = tokensInMinute;

  // 일일 요청 카운트
  const today = new Date().toDateString();
  if (limits.gemini.dailyResetTime !== today) {
    limits.gemini.dailyRequests = 0;
    limits.gemini.dailyResetTime = today;
  }
  limits.gemini.dailyRequests++;
  limits.gemini.rpd.used = limits.gemini.dailyRequests;

  limits.gemini.is429 = false;
  limits.gemini.lastUpdated = new Date().toISOString();

  saveLimits(limits);

  const rpmLimit = limits.gemini.rpm.limit || 1;
  const tpmLimit = limits.gemini.tpm.limit || 1;
  const rpdLimit = limits.gemini.rpd.limit || 1;

  return {
    rpm: {
      used: limits.gemini.rpm.used,
      limit: limits.gemini.rpm.limit,
      percent: Math.round((limits.gemini.rpm.used / rpmLimit) * 100)
    },
    tpm: {
      used: limits.gemini.tpm.used,
      limit: limits.gemini.tpm.limit,
      percent: Math.round((limits.gemini.tpm.used / tpmLimit) * 100)
    },
    rpd: {
      used: limits.gemini.rpd.used,
      limit: limits.gemini.rpd.limit,
      percent: Math.round((limits.gemini.rpd.used / rpdLimit) * 100)
    }
  };
}

/**
 * Gemini 429 에러 기록
 */
export function recordGemini429() {
  const limits = loadLimits();
  limits.gemini.is429 = true;
  limits.gemini.rpm.used = limits.gemini.rpm.limit; // 한도 도달로 표시
  limits.gemini.lastUpdated = new Date().toISOString();
  saveLimits(limits);
  return limits.gemini;
}

/**
 * Gemini 429 상태 초기화
 */
export function clearGemini429() {
  const limits = loadLimits();
  limits.gemini.is429 = false;
  limits.gemini.lastUpdated = new Date().toISOString();
  saveLimits(limits);
  return limits.gemini;
}

/**
 * Gemini 리밋 조회
 */
export function getGeminiLimits() {
  const limits = loadLimits();
  const now = Date.now();

  // requestLog 초기화 (없는 경우)
  if (!Array.isArray(limits.gemini.requestLog)) {
    limits.gemini.requestLog = [];
  }

  // 오래된 요청 로그 정리
  limits.gemini.requestLog = limits.gemini.requestLog.filter(function(req) {
    return now - req.timestamp < 60000;
  });

  // 현재 RPM/TPM 재계산
  const requestsInMinute = limits.gemini.requestLog.length;
  let tokensInMinute = 0;
  for (let i = 0; i < limits.gemini.requestLog.length; i++) {
    tokensInMinute += limits.gemini.requestLog[i].tokens || 0;
  }

  const rpmLimit = limits.gemini.rpm.limit || 1;
  const tpmLimit = limits.gemini.tpm.limit || 1;
  const rpdLimit = limits.gemini.rpd.limit || 1;

  return {
    tier: limits.gemini.tier,
    rpm: {
      used: requestsInMinute,
      limit: limits.gemini.rpm.limit,
      remaining: limits.gemini.rpm.limit - requestsInMinute,
      percent: Math.round((requestsInMinute / rpmLimit) * 100)
    },
    tpm: {
      used: tokensInMinute,
      limit: limits.gemini.tpm.limit,
      remaining: limits.gemini.tpm.limit - tokensInMinute,
      percent: Math.round((tokensInMinute / tpmLimit) * 100)
    },
    rpd: {
      used: limits.gemini.rpd.used,
      limit: limits.gemini.rpd.limit,
      remaining: limits.gemini.rpd.limit - limits.gemini.rpd.used,
      percent: Math.round((limits.gemini.rpd.used / rpdLimit) * 100)
    },
    is429: limits.gemini.is429,
    lastUpdated: limits.gemini.lastUpdated
  };
}

// ============================================================================
// Combined API
// ============================================================================

/**
 * 모든 프로바이더 리밋 조회
 */
export function getAllProviderLimits() {
  return {
    claude: getClaudeLimits(),
    openai: getOpenAILimits(),
    gemini: getGeminiLimits()
  };
}

/**
 * HUD용 간단한 리밋 요약
 */
export function getLimitsForHUD() {
  const all = getAllProviderLimits();

  const claudeFiveHour = all.claude.fiveHour ? all.claude.fiveHour.percent : 0;
  const claudeWeekly = all.claude.weekly ? all.claude.weekly.percent : 0;
  const claudeMonthly = all.claude.monthly ? all.claude.monthly.percent : 0;
  const claudeMax = Math.max(claudeFiveHour || 0, claudeWeekly || 0, claudeMonthly || 0);

  const openaiRequestPercent = all.openai.requests ? all.openai.requests.percent : 0;
  const openaiRequestRemaining = all.openai.requests ? all.openai.requests.remaining : null;

  const geminiRpmPercent = all.gemini.rpm ? all.gemini.rpm.percent : 0;
  const geminiRpmRemaining = all.gemini.rpm ? all.gemini.rpm.remaining : null;

  return {
    claude: {
      percent: claudeMax,
      fiveHour: claudeFiveHour,
      weekly: claudeWeekly,
      monthly: claudeMonthly,
      isLimited: claudeMax >= 100
    },
    openai: {
      percent: openaiRequestPercent || 0,
      remaining: openaiRequestRemaining,
      isLimited: openaiRequestRemaining === 0
    },
    gemini: {
      percent: geminiRpmPercent || 0,
      remaining: geminiRpmRemaining,
      isLimited: all.gemini.is429 || geminiRpmRemaining <= 0,
      isEstimated: true
    }
  };
}

/**
 * 모든 리밋 초기화
 */
export function resetAllLimits() {
  const defaultLimits = getDefaultLimits();
  saveLimits(defaultLimits);
  return defaultLimits;
}

/**
 * 리밋 상태 파일 존재 여부
 */
export function limitsFileExists() {
  return existsSync(LIMITS_FILE);
}

export { GEMINI_TIER_LIMITS, LIMITS_FILE };
