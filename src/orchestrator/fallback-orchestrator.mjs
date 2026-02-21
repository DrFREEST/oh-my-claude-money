/**
 * fallback-orchestrator.mjs - 자동 폴백 오케스트레이터
 *
 * Claude 리밋 100% 시 대체 모델로 자동 전환
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createHandoffContext } from '../utils/handoff-context.mjs';

// 폴백 체인 정의
const FALLBACK_CHAIN = [
  {
    id: 'claude-opus-4-6',
    name: 'Claude Opus 4.6',
    provider: 'anthropic',
    type: 'primary',
    checkLimit: 'claude-oauth'  // OAuth API로 체크
  },
  {
    id: 'gpt-5.3-codex',
    name: 'GPT-5.3 Codex',
    provider: 'openai',
    type: 'fallback-1',
    mcpTool: 'ask_codex',
    mcpRole: 'executor'
  },
  {
    id: 'gemini-3-flash',
    name: 'Gemini 3 Flash',
    provider: 'google',
    type: 'fallback-2',
    mcpTool: 'ask_gemini',
    mcpRole: 'explore'
  },
  {
    id: 'gpt-5.3',
    name: 'GPT-5.3',
    provider: 'openai',
    type: 'fallback-3',
    mcpTool: 'ask_codex',
    mcpRole: 'architect'
  }
];

const STATE_FILE = join(process.env.HOME || '', '.omcm', 'fallback-state.json');
const FALLBACK_THRESHOLD = 90; // 90% 이상이면 폴백 활성화
const RECOVERY_THRESHOLD = 85; // Claude 리밋이 이 이하로 떨어지면 복구

/**
 * FallbackOrchestrator - Claude 리밋 초과 시 자동 폴백 처리
 */
export class FallbackOrchestrator {
  constructor() {
    this.state = this.loadState();
    this.limitTrackers = new Map();
  }

  /**
   * 상태 파일 로드
   */
  loadState() {
    if (!existsSync(STATE_FILE)) {
      return this.getDefaultState();
    }

    try {
      return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    } catch (e) {
      return this.getDefaultState();
    }
  }

  /**
   * 기본 상태
   */
  getDefaultState() {
    return {
      currentModel: FALLBACK_CHAIN[0],
      fallbackActive: false,
      fallbackReason: null,
      fallbackStartedAt: null,
      history: []
    };
  }

  /**
   * 상태 저장
   */
  saveState() {
    const dir = dirname(STATE_FILE);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    this.state.lastUpdated = new Date().toISOString();
    writeFileSync(STATE_FILE, JSON.stringify(this.state, null, 2));
  }

  /**
   * Claude 리밋 체크 (OAuth API 사용)
   */
  async checkClaudeLimit() {
    try {
      // usage-api.ts의 getUsage() 함수 사용
      const usage = await this.getClaudeUsage();
      if (!usage) return null;

      const fiveHourPercent = usage.fiveHourPercent || 0;
      const weeklyPercent = usage.weeklyPercent || 0;
      const maxPercent = Math.max(fiveHourPercent, weeklyPercent);

      return {
        provider: 'anthropic',
        model: 'claude-opus-4-5',
        fiveHour: fiveHourPercent,
        weekly: weeklyPercent,
        max: maxPercent,
        isLimited: maxPercent >= 100,
        canRecover: maxPercent < RECOVERY_THRESHOLD
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Claude 사용량 조회 (기존 usage-api 활용)
   */
  async getClaudeUsage() {
    // ~/.claude/statsig/usage_response.json 파일에서 읽기
    const usageFile = join(process.env.HOME || '', '.claude', 'statsig', 'usage_response.json');

    if (!existsSync(usageFile)) {
      // 대안: OMC HUD 캐시에서 읽기
      const hudCacheFile = join(process.env.HOME || '', '.claude', 'plugins', 'oh-my-claudecode', '.usage-cache.json');

      if (existsSync(hudCacheFile)) {
        try {
          const cacheContent = readFileSync(hudCacheFile, 'utf-8');
          const cache = JSON.parse(cacheContent);

          if (cache && cache.data) {
            return {
              fiveHourPercent: cache.data.fiveHourPercent || 0,
              weeklyPercent: cache.data.weeklyPercent || 0
            };
          }
        } catch (e) {
          // 파싱 실패
        }
      }

      return null;
    }

    try {
      const data = JSON.parse(readFileSync(usageFile, 'utf-8'));
      // 파싱 로직 (기존 OMC usage-api.ts 참조)
      return this.parseUsageResponse(data);
    } catch (e) {
      return null;
    }
  }

  /**
   * 사용량 응답 파싱
   */
  parseUsageResponse(data) {
    // OMC usage-api.ts의 parseUsageResponse 로직 참조
    if (!data) {
      return null;
    }

    // 직접 rateLimits 필드가 있는 경우
    if (data.rateLimits) {
      let fiveHourPercent = 0;
      let weeklyPercent = 0;

      const limits = data.rateLimits;
      if (limits.fiveHour) {
        const used = limits.fiveHour.used || 0;
        const total = limits.fiveHour.total || 1;
        fiveHourPercent = Math.round((used / total) * 100);
      }

      if (limits.weekly) {
        const used = limits.weekly.used || 0;
        const total = limits.weekly.total || 1;
        weeklyPercent = Math.round((used / total) * 100);
      }

      return { fiveHourPercent, weeklyPercent };
    }

    // 퍼센트 직접 값이 있는 경우
    if (typeof data.fiveHourPercent === 'number' || typeof data.weeklyPercent === 'number') {
      return {
        fiveHourPercent: data.fiveHourPercent || 0,
        weeklyPercent: data.weeklyPercent || 0
      };
    }

    return null;
  }

  /**
   * 폴백 필요 여부 확인 및 전환
   */
  async checkAndFallback(options) {
    const defaultOptions = {};
    const opts = options || defaultOptions;
    const claudeLimit = await this.checkClaudeLimit();

    if (!claudeLimit) {
      // 리밋 정보 없으면 현재 상태 유지
      return { action: 'none', reason: 'limit-info-unavailable' };
    }

    // 폴백 활성화 상태에서 복구 가능 여부 확인 (RECOVERY_THRESHOLD 미만)
    if (this.state.fallbackActive && claudeLimit.max < RECOVERY_THRESHOLD) {
      return this.recoverToPrimary(claudeLimit);
    }

    // 폴백 필요 여부 확인 (FALLBACK_THRESHOLD 이상)
    if (!this.state.fallbackActive && claudeLimit.max >= FALLBACK_THRESHOLD) {
      return this.activateFallback(claudeLimit, opts);
    }

    return {
      action: 'none',
      currentModel: this.state.currentModel,
      claudeLimit
    };
  }

  /**
   * 폴백 활성화
   */
  activateFallback(claudeLimit, options) {
    const defaultOptions = {};
    const opts = options || defaultOptions;
    const fallbackModel = this.getNextAvailableModel();

    if (!fallbackModel) {
      return { action: 'error', reason: 'no-fallback-available' };
    }

    const previousModel = this.state.currentModel;

    this.state.currentModel = fallbackModel;
    this.state.fallbackActive = true;
    this.state.fallbackReason = 'Claude limit reached: 5h=' + claudeLimit.fiveHour + '%, weekly=' + claudeLimit.weekly + '%';
    this.state.fallbackStartedAt = new Date().toISOString();
    this.state.history.push({
      action: 'fallback',
      from: previousModel.id,
      to: fallbackModel.id,
      reason: this.state.fallbackReason,
      timestamp: new Date().toISOString()
    });

    this.saveState();

    // 핸드오프 컨텍스트 파일 생성
    try {
      createHandoffContext({
        fromModel: previousModel,
        toModel: fallbackModel,
        reason: this.state.fallbackReason,
        currentTask: opts.currentTask || null,
        sessionSummary: opts.sessionSummary || null,
        todoList: opts.todoList || null,
        cwd: this.projectDir
      });
    } catch (e) {
      // 컨텍스트 생성 실패해도 폴백은 계속 진행
      console.error('[OMCM] Handoff context creation failed:', e.message);
    }

    return {
      action: 'fallback',
      from: previousModel,
      to: fallbackModel,
      reason: this.state.fallbackReason,
      claudeLimit
    };
  }

  /**
   * 프라이머리(Claude)로 복구
   */
  recoverToPrimary(claudeLimit) {
    const previousModel = this.state.currentModel;
    const primaryModel = FALLBACK_CHAIN[0];

    this.state.currentModel = primaryModel;
    this.state.fallbackActive = false;
    this.state.fallbackReason = null;
    this.state.history.push({
      action: 'recover',
      from: previousModel.id,
      to: primaryModel.id,
      reason: 'Claude limit recovered: 5h=' + claudeLimit.fiveHour + '%, weekly=' + claudeLimit.weekly + '%',
      timestamp: new Date().toISOString()
    });

    this.saveState();

    return {
      action: 'recover',
      from: previousModel,
      to: primaryModel,
      reason: 'Claude limit below ' + RECOVERY_THRESHOLD + '%',
      claudeLimit
    };
  }

  /**
   * 다음 사용 가능한 모델 찾기
   */
  getNextAvailableModel() {
    // Claude 다음 모델부터 검색
    for (let i = 1; i < FALLBACK_CHAIN.length; i++) {
      const model = FALLBACK_CHAIN[i];
      const limit = this.limitTrackers.get(model.provider);

      // 리밋 정보가 없거나 100% 미만이면 사용 가능
      if (!limit || limit.max < 100) {
        return model;
      }
    }
    return null;
  }

  /**
   * 현재 오케스트레이터 정보
   */
  getCurrentOrchestrator() {
    return {
      model: this.state.currentModel,
      fallbackActive: this.state.fallbackActive,
      fallbackReason: this.state.fallbackReason,
      fallbackDuration: this.state.fallbackStartedAt
        ? Date.now() - new Date(this.state.fallbackStartedAt).getTime()
        : null
    };
  }

  /**
   * MCP를 통해 작업 실행 (폴백 모델 사용)
   * MCP-First: ask_codex / ask_gemini 디스크립터 반환
   */
  async executeWithFallback(prompt, options) {
    const current = this.state.currentModel;

    // Claude인 경우 일반 실행
    if (current.provider === 'anthropic') {
      return { useMcp: false, model: current };
    }

    // MCP 사용: ask_codex / ask_gemini
    return {
      useMcp: true,
      model: current,
      mcpTool: current.mcpTool || 'ask_codex',
      mcpRole: current.mcpRole || 'executor',
      prompt
    };
  }

  /**
   * 프로바이더 리밋 업데이트
   */
  updateProviderLimit(provider, limitData) {
    this.limitTrackers.set(provider, {
      ...limitData,
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * 모든 프로바이더 리밋 조회
   */
  getAllLimits() {
    const limits = {};
    for (const entry of this.limitTrackers) {
      const provider = entry[0];
      const data = entry[1];
      limits[provider] = data;
    }
    return limits;
  }

  /**
   * 폴백 체인 정보
   */
  getFallbackChain() {
    const self = this;
    return FALLBACK_CHAIN.map(function(model, index) {
      return {
        id: model.id,
        name: model.name,
        provider: model.provider,
        type: model.type,
        checkLimit: model.checkLimit,
        mcpTool: model.mcpTool,
        mcpRole: model.mcpRole,
        order: index,
        isCurrent: model.id === self.state.currentModel.id
      };
    });
  }

  /**
   * 폴백 히스토리 조회
   */
  getHistory() {
    return this.state.history || [];
  }

  /**
   * 히스토리 초기화
   */
  clearHistory() {
    this.state.history = [];
    this.saveState();
  }

  /**
   * 수동 폴백 (테스트/디버깅용)
   */
  manualFallback(modelId) {
    const targetModel = FALLBACK_CHAIN.find(function(m) {
      return m.id === modelId;
    });

    if (!targetModel) {
      return { success: false, reason: 'Model not found: ' + modelId };
    }

    const previousModel = this.state.currentModel;

    this.state.currentModel = targetModel;
    this.state.fallbackActive = targetModel.type !== 'primary';
    this.state.fallbackReason = this.state.fallbackActive ? 'Manual fallback' : null;
    this.state.fallbackStartedAt = this.state.fallbackActive ? new Date().toISOString() : null;

    this.state.history.push({
      action: 'manual',
      from: previousModel.id,
      to: targetModel.id,
      reason: 'Manual switch',
      timestamp: new Date().toISOString()
    });

    this.saveState();

    return {
      success: true,
      from: previousModel,
      to: targetModel
    };
  }

  /**
   * 상태 리셋
   */
  reset() {
    this.state = this.getDefaultState();
    this.limitTrackers.clear();
    this.saveState();
    return { reset: true };
  }
}

// 싱글톤 인스턴스
let instance = null;

export function getFallbackOrchestrator() {
  if (!instance) {
    instance = new FallbackOrchestrator();
  }
  return instance;
}

// 새 인스턴스 강제 생성 (테스트용)
export function createFallbackOrchestrator() {
  return new FallbackOrchestrator();
}

export { FALLBACK_CHAIN, FALLBACK_THRESHOLD, RECOVERY_THRESHOLD, STATE_FILE };
