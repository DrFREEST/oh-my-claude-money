/**
 * fusion-tracker.test.mjs - Fusion 상태 추적 모듈 단위 테스트
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { existsSync, unlinkSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import {
  readFusionState,
  writeFusionState,
  recordRouting,
  setFusionMode,
  setFusionEnabled,
  resetFusionStats,
  STATE_FILE
} from '../../src/utils/fusion-tracker.mjs';

describe('fusion-tracker', () => {
  // 테스트 전후 상태 파일 정리
  before(() => {
    const dir = dirname(STATE_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });

  after(() => {
    if (existsSync(STATE_FILE)) {
      unlinkSync(STATE_FILE);
    }
  });

  describe('readFusionState()', () => {
    it('파일이 없으면 null 반환', () => {
      if (existsSync(STATE_FILE)) {
        unlinkSync(STATE_FILE);
      }
      const state = readFusionState();
      assert.strictEqual(state, null);
    });

    it('유효한 파일을 읽으면 객체 반환', () => {
      const testState = {
        enabled: true,
        mode: 'balanced',
        totalTasks: 10,
        routedToMcp: 5
      };
      writeFusionState(testState);

      const state = readFusionState();
      assert.notStrictEqual(state, null);
      assert.strictEqual(state.enabled, true);
      assert.strictEqual(state.mode, 'balanced');
      assert.strictEqual(state.totalTasks, 10);
      assert.strictEqual(state.routedToMcp, 5);
    });

    it('잘못된 JSON 파일이면 null 반환', () => {
      writeFileSync(STATE_FILE, 'invalid json content');

      const state = readFusionState();
      assert.strictEqual(state, null);
    });
  });

  describe('writeFusionState()', () => {
    it('상태를 파일에 저장', () => {
      const testState = {
        enabled: true,
        mode: 'aggressive',
        totalTasks: 20,
        routedToMcp: 15
      };

      writeFusionState(testState);

      assert.strictEqual(existsSync(STATE_FILE), true);
      const savedState = readFusionState();
      assert.strictEqual(savedState.enabled, true);
      assert.strictEqual(savedState.mode, 'aggressive');
      assert.strictEqual(savedState.totalTasks, 20);
      assert.strictEqual(savedState.routedToMcp, 15);
      assert.ok(savedState.lastUpdated); // lastUpdated 자동 추가됨
    });

    it('디렉토리가 없으면 생성', () => {
      if (existsSync(STATE_FILE)) {
        unlinkSync(STATE_FILE);
      }
      const dir = dirname(STATE_FILE);
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
      }

      const testState = { enabled: true, mode: 'balanced' };
      writeFusionState(testState);

      assert.strictEqual(existsSync(STATE_FILE), true);
    });
  });

  describe('recordRouting()', () => {
    it('opencode로 라우팅 기록 (gemini 프로바이더)', () => {
      resetFusionStats();

      const state = recordRouting('mcp', 'gemini', 1500);

      assert.strictEqual(state.totalTasks, 1);
      assert.strictEqual(state.routedToMcp, 1);
      assert.strictEqual(state.estimatedSavedTokens, 1500);
      assert.strictEqual(state.byProvider.gemini, 1);
      assert.strictEqual(state.byProvider.anthropic, 0);
      assert.strictEqual(state.routingRate, 100);
    });

    it('opencode로 라우팅 기록 (google 프로바이더)', () => {
      resetFusionStats();

      const state = recordRouting('mcp', 'google', 1000);

      assert.strictEqual(state.totalTasks, 1);
      assert.strictEqual(state.routedToMcp, 1);
      assert.strictEqual(state.estimatedSavedTokens, 1000);
      assert.strictEqual(state.byProvider.gemini, 1);
    });

    it('opencode로 라우팅 기록 (openai 프로바이더)', () => {
      resetFusionStats();

      const state = recordRouting('mcp', 'openai', 2000);

      assert.strictEqual(state.totalTasks, 1);
      assert.strictEqual(state.routedToMcp, 1);
      assert.strictEqual(state.estimatedSavedTokens, 2000);
      assert.strictEqual(state.byProvider.openai, 1);
    });

    it('opencode로 라우팅 기록 (gpt 프로바이더)', () => {
      resetFusionStats();

      const state = recordRouting('mcp', 'gpt', 1500);

      assert.strictEqual(state.totalTasks, 1);
      assert.strictEqual(state.routedToMcp, 1);
      assert.strictEqual(state.byProvider.openai, 1);
    });

    it('claude로 라우팅 기록', () => {
      resetFusionStats();

      const state = recordRouting('claude', 'anthropic', 0);

      assert.strictEqual(state.totalTasks, 1);
      assert.strictEqual(state.routedToMcp, 0);
      assert.strictEqual(state.estimatedSavedTokens, 0);
      assert.strictEqual(state.byProvider.anthropic, 1);
      assert.strictEqual(state.routingRate, 0);
    });

    it('라우팅 비율 계산', () => {
      resetFusionStats();

      recordRouting('mcp', 'gemini', 1000);
      recordRouting('mcp', 'openai', 1000);
      recordRouting('claude', 'anthropic', 0);
      recordRouting('claude', 'anthropic', 0);
      const state = recordRouting('mcp', 'gemini', 1000);

      assert.strictEqual(state.totalTasks, 5);
      assert.strictEqual(state.routedToMcp, 3);
      assert.strictEqual(state.routingRate, 60); // 3/5 * 100 = 60%
    });

    it('savedTokens가 없으면 0으로 처리', () => {
      resetFusionStats();

      const state = recordRouting('mcp', 'gemini');

      assert.strictEqual(state.estimatedSavedTokens, 0);
    });

    it('상태 파일이 없으면 기본 상태로 초기화', () => {
      if (existsSync(STATE_FILE)) {
        unlinkSync(STATE_FILE);
      }

      const state = recordRouting('mcp', 'gemini', 1000);

      assert.strictEqual(state.totalTasks, 1);
      assert.strictEqual(state.routedToMcp, 1);
    });
  });

  describe('setFusionMode()', () => {
    it('모드 변경', () => {
      resetFusionStats();

      const state = setFusionMode('aggressive');

      assert.strictEqual(state.mode, 'aggressive');
    });

    it('상태 파일이 없으면 기본 상태로 초기화', () => {
      if (existsSync(STATE_FILE)) {
        unlinkSync(STATE_FILE);
      }

      const state = setFusionMode('conservative');

      assert.strictEqual(state.mode, 'conservative');
      assert.strictEqual(state.enabled, true);
    });
  });

  describe('setFusionEnabled()', () => {
    it('퓨전 활성화', () => {
      resetFusionStats();

      const state = setFusionEnabled(true);

      assert.strictEqual(state.enabled, true);
    });

    it('퓨전 비활성화', () => {
      resetFusionStats();

      const state = setFusionEnabled(false);

      assert.strictEqual(state.enabled, false);
    });

    it('상태 파일이 없으면 기본 상태로 초기화', () => {
      if (existsSync(STATE_FILE)) {
        unlinkSync(STATE_FILE);
      }

      const state = setFusionEnabled(true);

      assert.strictEqual(state.enabled, true);
    });
  });

  describe('resetFusionStats()', () => {
    it('통계 초기화', () => {
      // 먼저 데이터 추가
      recordRouting('mcp', 'gemini', 1000);
      recordRouting('mcp', 'openai', 2000);

      // 초기화
      const state = resetFusionStats();

      assert.strictEqual(state.totalTasks, 0);
      assert.strictEqual(state.routedToMcp, 0);
      assert.strictEqual(state.routingRate, 0);
      assert.strictEqual(state.estimatedSavedTokens, 0);
      assert.strictEqual(state.byProvider.gemini, 0);
      assert.strictEqual(state.byProvider.openai, 0);
      assert.strictEqual(state.byProvider.anthropic, 0);
      assert.strictEqual(state.enabled, true);
      assert.strictEqual(state.mode, 'balanced');
    });
  });
});
