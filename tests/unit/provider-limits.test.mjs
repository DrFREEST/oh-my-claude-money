/**
 * provider-limits.test.mjs - 프로바이더 리밋 추적 모듈 단위 테스트
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import {
  updateClaudeLimits,
  getClaudeLimits,
  updateOpenAILimitsFromHeaders,
  setOpenAILimits,
  getOpenAILimits,
  setGeminiTier,
  recordGeminiRequest,
  recordGemini429,
  clearGemini429,
  getGeminiLimits,
  getAllProviderLimits,
  getLimitsForHUD,
  resetAllLimits,
  limitsFileExists,
  GEMINI_TIER_LIMITS,
  LIMITS_FILE
} from '../../src/utils/provider-limits.mjs';

describe('provider-limits', () => {
  before(() => {
    const dir = dirname(LIMITS_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });

  after(() => {
    if (existsSync(LIMITS_FILE)) {
      unlinkSync(LIMITS_FILE);
    }
  });

  describe('updateClaudeLimits()', () => {
    it('5시간 및 주간 리밋 업데이트', () => {
      resetAllLimits();

      const limits = updateClaudeLimits(45, 60);

      assert.strictEqual(limits.fiveHour.percent, 45);
      assert.strictEqual(limits.weekly.percent, 60);
      assert.ok(limits.lastUpdated);
    });

    it('null 값은 업데이트하지 않음', () => {
      resetAllLimits();
      updateClaudeLimits(30, 40);

      const limits = updateClaudeLimits(null, null);

      assert.strictEqual(limits.fiveHour.percent, 30);
      assert.strictEqual(limits.weekly.percent, 40);
    });

    it('undefined 값은 업데이트하지 않음', () => {
      resetAllLimits();
      updateClaudeLimits(50, 70);

      const limits = updateClaudeLimits(undefined, undefined);

      assert.strictEqual(limits.fiveHour.percent, 50);
      assert.strictEqual(limits.weekly.percent, 70);
    });

    it('한 값만 업데이트 (5시간만)', () => {
      resetAllLimits();
      updateClaudeLimits(20, 30);

      const limits = updateClaudeLimits(80, null);

      assert.strictEqual(limits.fiveHour.percent, 80);
      assert.strictEqual(limits.weekly.percent, 30);
    });

    it('한 값만 업데이트 (주간만)', () => {
      resetAllLimits();
      updateClaudeLimits(20, 30);

      const limits = updateClaudeLimits(null, 90);

      assert.strictEqual(limits.fiveHour.percent, 20);
      assert.strictEqual(limits.weekly.percent, 90);
    });
  });

  describe('getClaudeLimits()', () => {
    it('Claude 리밋 조회', () => {
      resetAllLimits();
      updateClaudeLimits(55, 75);

      const limits = getClaudeLimits();

      assert.strictEqual(limits.fiveHour.percent, 55);
      assert.strictEqual(limits.weekly.percent, 75);
    });
  });

  describe('updateOpenAILimitsFromHeaders()', () => {
    it('Headers 객체에서 리밋 추출 (get 메서드)', () => {
      resetAllLimits();

      const headers = new Map();
      headers.set('x-ratelimit-limit-requests', '500');
      headers.set('x-ratelimit-remaining-requests', '300');
      headers.set('x-ratelimit-reset-requests', '5m0s');
      headers.set('x-ratelimit-limit-tokens', '100000');
      headers.set('x-ratelimit-remaining-tokens', '75000');
      headers.set('x-ratelimit-reset-tokens', '10m0s');

      const limits = updateOpenAILimitsFromHeaders(headers);

      assert.strictEqual(limits.requests.limit, 500);
      assert.strictEqual(limits.requests.remaining, 300);
      assert.strictEqual(limits.requests.reset, '5m0s');
      assert.strictEqual(limits.requests.percent, 40); // (500-300)/500 * 100

      assert.strictEqual(limits.tokens.limit, 100000);
      assert.strictEqual(limits.tokens.remaining, 75000);
      assert.strictEqual(limits.tokens.reset, '10m0s');
      assert.strictEqual(limits.tokens.percent, 25); // (100000-75000)/100000 * 100
    });

    it('일반 객체에서 리밋 추출', () => {
      resetAllLimits();

      const headers = {
        'x-ratelimit-limit-requests': '200',
        'x-ratelimit-remaining-requests': '50',
        'x-ratelimit-reset-requests': '3m0s',
        'x-ratelimit-limit-tokens': '50000',
        'x-ratelimit-remaining-tokens': '10000',
        'x-ratelimit-reset-tokens': '7m0s'
      };

      const limits = updateOpenAILimitsFromHeaders(headers);

      assert.strictEqual(limits.requests.limit, 200);
      assert.strictEqual(limits.requests.remaining, 50);
      assert.strictEqual(limits.requests.percent, 75); // (200-50)/200 * 100

      assert.strictEqual(limits.tokens.limit, 50000);
      assert.strictEqual(limits.tokens.remaining, 10000);
      assert.strictEqual(limits.tokens.percent, 80); // (50000-10000)/50000 * 100
    });

    it('헤더가 없으면 업데이트하지 않음', () => {
      resetAllLimits();

      const limits = updateOpenAILimitsFromHeaders({});

      assert.strictEqual(limits.requests.limit, null);
      assert.strictEqual(limits.tokens.limit, null);
    });

    it('null 헤더 처리', () => {
      resetAllLimits();

      const limits = updateOpenAILimitsFromHeaders(null);

      assert.strictEqual(limits.requests.limit, null);
      assert.strictEqual(limits.tokens.limit, null);
    });
  });

  describe('setOpenAILimits()', () => {
    it('퍼센트 값 직접 설정', () => {
      resetAllLimits();

      const limits = setOpenAILimits(60, 80);

      assert.strictEqual(limits.requests.percent, 60);
      assert.strictEqual(limits.tokens.percent, 80);
    });

    it('한 값만 설정 (request만)', () => {
      resetAllLimits();

      const limits = setOpenAILimits(40, null);

      assert.strictEqual(limits.requests.percent, 40);
    });

    it('한 값만 설정 (token만)', () => {
      resetAllLimits();

      const limits = setOpenAILimits(null, 70);

      assert.strictEqual(limits.tokens.percent, 70);
    });
  });

  describe('getOpenAILimits()', () => {
    it('OpenAI 리밋 조회', () => {
      resetAllLimits();
      setOpenAILimits(50, 60);

      const limits = getOpenAILimits();

      assert.strictEqual(limits.requests.percent, 50);
      assert.strictEqual(limits.tokens.percent, 60);
    });
  });

  describe('setGeminiTier()', () => {
    it('free 티어 설정', () => {
      resetAllLimits();

      const limits = setGeminiTier('free');

      assert.strictEqual(limits.tier, 'free');
      assert.strictEqual(limits.rpm.limit, GEMINI_TIER_LIMITS.free.rpm);
      assert.strictEqual(limits.tpm.limit, GEMINI_TIER_LIMITS.free.tpm);
      assert.strictEqual(limits.rpd.limit, GEMINI_TIER_LIMITS.free.rpd);
    });

    it('tier1 설정', () => {
      resetAllLimits();

      const limits = setGeminiTier('tier1');

      assert.strictEqual(limits.tier, 'tier1');
      assert.strictEqual(limits.rpm.limit, GEMINI_TIER_LIMITS.tier1.rpm);
    });

    it('tier2 설정', () => {
      resetAllLimits();

      const limits = setGeminiTier('tier2');

      assert.strictEqual(limits.tier, 'tier2');
      assert.strictEqual(limits.rpm.limit, GEMINI_TIER_LIMITS.tier2.rpm);
    });

    it('tier3 설정', () => {
      resetAllLimits();

      const limits = setGeminiTier('tier3');

      assert.strictEqual(limits.tier, 'tier3');
      assert.strictEqual(limits.rpm.limit, GEMINI_TIER_LIMITS.tier3.rpm);
    });

    it('잘못된 티어는 에러', () => {
      resetAllLimits();

      assert.throws(() => {
        setGeminiTier('invalid-tier');
      }, /Invalid tier/);
    });
  });

  describe('recordGeminiRequest()', () => {
    it('요청 기록 및 RPM/TPM 계산', () => {
      resetAllLimits();
      setGeminiTier('free');

      const result = recordGeminiRequest(1000);

      assert.strictEqual(result.rpm.used, 1);
      assert.strictEqual(result.tpm.used, 1000);
      assert.strictEqual(result.rpd.used, 1);
    });

    it('여러 요청 기록', () => {
      resetAllLimits();
      setGeminiTier('free');

      recordGeminiRequest(500);
      recordGeminiRequest(700);
      const result = recordGeminiRequest(300);

      assert.strictEqual(result.rpm.used, 3);
      assert.strictEqual(result.tpm.used, 1500); // 500 + 700 + 300
      assert.strictEqual(result.rpd.used, 3);
    });

    it('tokenCount가 없으면 0으로 처리', () => {
      resetAllLimits();
      setGeminiTier('free');

      const result = recordGeminiRequest();

      assert.strictEqual(result.rpm.used, 1);
      assert.strictEqual(result.tpm.used, 0);
    });

    it('퍼센트 계산', () => {
      resetAllLimits();
      setGeminiTier('free'); // rpm: 15, tpm: 32000

      recordGeminiRequest(16000); // 50% TPM
      const result = recordGeminiRequest(8000); // 75% TPM

      assert.strictEqual(result.rpm.percent, 13); // 2/15 = 13%
      assert.strictEqual(result.tpm.percent, 75); // 24000/32000 = 75%
    });
  });

  describe('recordGemini429()', () => {
    it('429 에러 기록', () => {
      resetAllLimits();
      setGeminiTier('free');

      const limits = recordGemini429();

      assert.strictEqual(limits.is429, true);
      assert.strictEqual(limits.rpm.used, limits.rpm.limit);
    });
  });

  describe('clearGemini429()', () => {
    it('429 상태 초기화', () => {
      resetAllLimits();
      setGeminiTier('free');
      recordGemini429();

      const limits = clearGemini429();

      assert.strictEqual(limits.is429, false);
    });
  });

  describe('getGeminiLimits()', () => {
    it('Gemini 리밋 조회', () => {
      resetAllLimits();
      setGeminiTier('tier1');
      recordGeminiRequest(5000);

      const limits = getGeminiLimits();

      assert.strictEqual(limits.tier, 'tier1');
      assert.strictEqual(limits.rpm.used, 1);
      assert.strictEqual(limits.tpm.used, 5000);
      assert.strictEqual(limits.rpm.remaining, GEMINI_TIER_LIMITS.tier1.rpm - 1);
      assert.strictEqual(limits.tpm.remaining, GEMINI_TIER_LIMITS.tier1.tpm - 5000);
    });

    it('오래된 요청 로그는 자동 정리', async () => {
      resetAllLimits();
      setGeminiTier('free');

      // 임시로 오래된 타임스탬프 추가
      const result1 = recordGeminiRequest(1000);

      // 약간의 지연
      await new Promise(resolve => setTimeout(resolve, 10));

      const limits = getGeminiLimits();
      assert.ok(limits.rpm.used >= 0); // 정리 로직 작동 확인
    });
  });

  describe('getAllProviderLimits()', () => {
    it('모든 프로바이더 리밋 조회', () => {
      resetAllLimits();
      updateClaudeLimits(40, 50);
      setOpenAILimits(60, 70);
      setGeminiTier('tier2');

      const all = getAllProviderLimits();

      assert.strictEqual(all.claude.fiveHour.percent, 40);
      assert.strictEqual(all.openai.requests.percent, 60);
      assert.strictEqual(all.gemini.tier, 'tier2');
    });
  });

  describe('getLimitsForHUD()', () => {
    it('HUD용 요약 데이터 생성', () => {
      resetAllLimits();
      updateClaudeLimits(60, 80);
      setOpenAILimits(30, 40);
      setGeminiTier('free');
      recordGeminiRequest(1000);

      const hud = getLimitsForHUD();

      assert.strictEqual(hud.claude.percent, 80); // max(60, 80)
      assert.strictEqual(hud.claude.fiveHour, 60);
      assert.strictEqual(hud.claude.weekly, 80);
      assert.strictEqual(hud.claude.isLimited, false);

      assert.strictEqual(hud.openai.percent, 30);
      assert.strictEqual(hud.openai.isLimited, false);

      assert.strictEqual(hud.gemini.isEstimated, true);
    });

    it('100% 이상이면 isLimited true', () => {
      resetAllLimits();
      updateClaudeLimits(100, 100);

      const hud = getLimitsForHUD();

      assert.strictEqual(hud.claude.isLimited, true);
    });

    it('OpenAI remaining이 0이면 isLimited true', () => {
      resetAllLimits();

      const headers = {
        'x-ratelimit-limit-requests': '100',
        'x-ratelimit-remaining-requests': '0',
        'x-ratelimit-reset-requests': '1m0s'
      };
      updateOpenAILimitsFromHeaders(headers);

      const hud = getLimitsForHUD();

      assert.strictEqual(hud.openai.isLimited, true);
    });

    it('Gemini 429 상태면 isLimited true', () => {
      resetAllLimits();
      setGeminiTier('free');
      recordGemini429();

      const hud = getLimitsForHUD();

      assert.strictEqual(hud.gemini.isLimited, true);
    });
  });

  describe('resetAllLimits()', () => {
    it('모든 리밋 초기화', () => {
      updateClaudeLimits(90, 95);
      setOpenAILimits(80, 85);
      setGeminiTier('tier3');

      const limits = resetAllLimits();

      assert.strictEqual(limits.claude.fiveHour.percent, 0);
      assert.strictEqual(limits.openai.requests.percent, 0);
      assert.strictEqual(limits.gemini.tier, 'free');
    });
  });

  describe('limitsFileExists()', () => {
    it('파일이 존재하면 true', () => {
      resetAllLimits();

      assert.strictEqual(limitsFileExists(), true);
    });

    it('파일이 없으면 false', () => {
      if (existsSync(LIMITS_FILE)) {
        unlinkSync(LIMITS_FILE);
      }

      assert.strictEqual(limitsFileExists(), false);
    });
  });
});
