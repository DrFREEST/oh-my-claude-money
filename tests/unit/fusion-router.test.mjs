/**
 * fusion-router.test.mjs - Fusion Router 로직 단위 테스트
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  shouldRouteToOpenCode,
  mapAgentToOpenCode,
  wrapWithUlwCommand,
  updateFusionState,
  TOKEN_SAVING_AGENTS,
  CLAUDE_ONLY_AGENTS
} from '../../src/hooks/fusion-router-logic.mjs';

describe('fusion-router-logic', () => {
  describe('shouldRouteToOpenCode()', () => {
    it('fusionDefault가 true일 때 토큰 절약 에이전트 라우팅', () => {
      const toolInput = {
        subagent_type: 'oh-my-claudecode:architect',
        prompt: 'Analyze this code'
      };
      const options = {
        fusion: { enabled: false }, // enabled는 false여도 fusionDefault가 우선
        fallback: null,
        limits: null,
        config: { fusionDefault: true }
      };

      const decision = shouldRouteToOpenCode(toolInput, options);

      assert.strictEqual(decision.route, true);
      assert.strictEqual(decision.reason.startsWith('fusion-default-'), true);
      assert.strictEqual(decision.opencodeAgent, 'Oracle');
    });

    it('fusionDefault가 false이고 fusion disabled면 라우팅 안함', () => {
      const toolInput = {
        subagent_type: 'oh-my-claudecode:debugger',
        prompt: 'Debug this issue'
      };
      const options = {
        fusion: { enabled: false },
        fallback: null,
        limits: null,
        config: { fusionDefault: false }
      };

      const decision = shouldRouteToOpenCode(toolInput, options);

      assert.strictEqual(decision.route, false);
      assert.strictEqual(decision.reason, 'fusion-disabled');
    });

    it('Claude 5시간 사용량 90% 이상일 때 라우팅', () => {
      const toolInput = {
        subagent_type: 'oh-my-claudecode:executor',
        prompt: 'Fix this bug'
      };
      const options = {
        fusion: { enabled: true },
        fallback: null,
        limits: {
          claude: {
            fiveHour: { percent: 92, used: 92, limit: 100 },
            weekly: { percent: 50, used: 50, limit: 100 }
          }
        },
        config: null
      };

      const decision = shouldRouteToOpenCode(toolInput, options);

      assert.strictEqual(decision.route, true);
      assert.strictEqual(decision.reason, 'claude-limit-92%');
      assert.strictEqual(decision.opencodeAgent, 'Codex');
    });

    it('Claude 주간 사용량 90% 이상일 때 라우팅', () => {
      const toolInput = {
        subagent_type: 'oh-my-claudecode:style-reviewer',
        prompt: 'Quick style review'
      };
      const options = {
        fusion: { enabled: true },
        fallback: null,
        limits: {
          claude: {
            fiveHour: { percent: 50, used: 50, limit: 100 },
            weekly: { percent: 95, used: 95, limit: 100 }
          }
        },
        config: null
      };

      const decision = shouldRouteToOpenCode(toolInput, options);

      assert.strictEqual(decision.route, true);
      assert.strictEqual(decision.reason, 'claude-limit-95%');
      assert.strictEqual(decision.opencodeAgent, 'Flash');
    });

    it('Claude 사용량 89%일 때 라우팅 안함', () => {
      const toolInput = {
        subagent_type: 'oh-my-claudecode:executor',
        prompt: 'Fix this bug'
      };
      const options = {
        fusion: { enabled: true },
        fallback: null,
        limits: {
          claude: {
            fiveHour: { percent: 89, used: 89, limit: 100 },
            weekly: { percent: 80, used: 80, limit: 100 }
          }
        },
        config: null
      };

      const decision = shouldRouteToOpenCode(toolInput, options);

      assert.strictEqual(decision.route, false);
      assert.strictEqual(decision.reason, 'no-routing-needed');
    });

    it('fallback 활성화 시 무조건 라우팅', () => {
      const toolInput = {
        subagent_type: 'oh-my-claudecode:executor',
        prompt: 'Fix this bug'
      };
      const options = {
        fusion: { enabled: true }, // fusion 활성화 필요
        fallback: {
          fallbackActive: true,
          currentModel: {
            id: 'gpt-5.2-codex',
            name: 'GPT-5.2 Codex',
            opencodeAgent: 'Codex'
          }
        },
        limits: null,
        config: null
      };

      const decision = shouldRouteToOpenCode(toolInput, options);

      assert.strictEqual(decision.route, true);
      assert.strictEqual(decision.reason, 'fallback-active');
      assert.strictEqual(decision.opencodeAgent, 'Codex');
    });

    it('save-tokens 모드에서 토큰 절약 에이전트 라우팅', () => {
      const toolInput = {
        subagent_type: 'oh-my-claudecode:explore',
        prompt: 'Search codebase'
      };
      const options = {
        fusion: { enabled: true, mode: 'save-tokens' },
        fallback: null,
        limits: null,
        config: null
      };

      const decision = shouldRouteToOpenCode(toolInput, options);

      assert.strictEqual(decision.route, true);
      assert.strictEqual(decision.reason, 'token-saving-agent-explore');
      assert.strictEqual(decision.opencodeAgent, 'Flash');
    });

    it('save-tokens 모드에서 executor는 라우팅 안됨', () => {
      const toolInput = {
        subagent_type: 'oh-my-claudecode:executor',
        prompt: 'Fix this bug'
      };
      const options = {
        fusion: { enabled: true, mode: 'save-tokens' },
        fallback: null,
        limits: null,
        config: null
      };

      const decision = shouldRouteToOpenCode(toolInput, options);

      assert.strictEqual(decision.route, false);
      assert.strictEqual(decision.reason, 'no-routing-needed');
    });

    it('balanced 모드에서 라우팅 안됨 (Claude 90% 미만)', () => {
      const toolInput = {
        subagent_type: 'oh-my-claudecode:quality-reviewer',
        prompt: 'Review code quality'
      };
      const options = {
        fusion: { enabled: true, mode: 'balanced' },
        fallback: null,
        limits: {
          claude: {
            fiveHour: { percent: 50 },
            weekly: { percent: 50 }
          }
        },
        config: null
      };

      const decision = shouldRouteToOpenCode(toolInput, options);

      assert.strictEqual(decision.route, false);
      assert.strictEqual(decision.reason, 'no-routing-needed');
    });

    it('planner는 save-tokens 모드에서도 라우팅 안됨', () => {
      const toolInput = {
        subagent_type: 'oh-my-claudecode:planner',
        prompt: 'Create a plan'
      };
      const options = {
        fusion: { enabled: true, mode: 'save-tokens' },
        fallback: null,
        limits: null,
        config: null
      };

      const decision = shouldRouteToOpenCode(toolInput, options);

      assert.strictEqual(decision.route, false);
      assert.strictEqual(decision.reason, 'no-routing-needed');
    });

    it('product-manager는 save-tokens 모드에서도 라우팅 안됨', () => {
      const toolInput = {
        subagent_type: 'oh-my-claudecode:product-manager',
        prompt: 'Manage product requirements'
      };
      const options = {
        fusion: { enabled: true, mode: 'save-tokens' },
        fallback: null,
        limits: null,
        config: null
      };

      const decision = shouldRouteToOpenCode(toolInput, options);

      assert.strictEqual(decision.route, false);
      assert.strictEqual(decision.reason, 'no-routing-needed');
    });
  });

  describe('mapAgentToOpenCode()', () => {
    // Core agents
    it('architect → Oracle', () => {
      assert.strictEqual(mapAgentToOpenCode('architect'), 'Oracle');
    });

    it('executor → Codex', () => {
      assert.strictEqual(mapAgentToOpenCode('executor'), 'Codex');
    });

    it('explore → Flash', () => {
      assert.strictEqual(mapAgentToOpenCode('explore'), 'Flash');
    });

    it('debugger → Oracle', () => {
      assert.strictEqual(mapAgentToOpenCode('debugger'), 'Oracle');
    });

    it('verifier → Codex', () => {
      assert.strictEqual(mapAgentToOpenCode('verifier'), 'Codex');
    });

    it('deep-executor → Codex', () => {
      assert.strictEqual(mapAgentToOpenCode('deep-executor'), 'Codex');
    });

    it('git-master → Codex', () => {
      assert.strictEqual(mapAgentToOpenCode('git-master'), 'Codex');
    });

    // Quality agents
    it('security-reviewer → Oracle', () => {
      assert.strictEqual(mapAgentToOpenCode('security-reviewer'), 'Oracle');
    });

    it('code-reviewer → Oracle', () => {
      assert.strictEqual(mapAgentToOpenCode('code-reviewer'), 'Oracle');
    });

    it('style-reviewer → Flash', () => {
      assert.strictEqual(mapAgentToOpenCode('style-reviewer'), 'Flash');
    });

    it('quality-reviewer → Oracle', () => {
      assert.strictEqual(mapAgentToOpenCode('quality-reviewer'), 'Oracle');
    });

    it('api-reviewer → Oracle', () => {
      assert.strictEqual(mapAgentToOpenCode('api-reviewer'), 'Oracle');
    });

    it('performance-reviewer → Oracle', () => {
      assert.strictEqual(mapAgentToOpenCode('performance-reviewer'), 'Oracle');
    });

    // Test agents
    it('qa-tester → Codex', () => {
      assert.strictEqual(mapAgentToOpenCode('qa-tester'), 'Codex');
    });

    it('test-engineer → Codex', () => {
      assert.strictEqual(mapAgentToOpenCode('test-engineer'), 'Codex');
    });

    // Research/Data agents
    it('scientist → Oracle', () => {
      assert.strictEqual(mapAgentToOpenCode('scientist'), 'Oracle');
    });

    it('dependency-expert → Oracle', () => {
      assert.strictEqual(mapAgentToOpenCode('dependency-expert'), 'Oracle');
    });

    // Design/Content agents
    it('designer → Flash', () => {
      assert.strictEqual(mapAgentToOpenCode('designer'), 'Flash');
    });

    it('writer → Flash', () => {
      assert.strictEqual(mapAgentToOpenCode('writer'), 'Flash');
    });

    it('vision → Flash', () => {
      assert.strictEqual(mapAgentToOpenCode('vision'), 'Flash');
    });

    // Strategy agents
    it('quality-strategist → Oracle', () => {
      assert.strictEqual(mapAgentToOpenCode('quality-strategist'), 'Oracle');
    });

    it('planner → Oracle', () => {
      assert.strictEqual(mapAgentToOpenCode('planner'), 'Oracle');
    });

    it('critic → Oracle', () => {
      assert.strictEqual(mapAgentToOpenCode('critic'), 'Oracle');
    });

    it('analyst → Oracle', () => {
      assert.strictEqual(mapAgentToOpenCode('analyst'), 'Oracle');
    });

    // Product agents
    it('product-manager → Oracle', () => {
      assert.strictEqual(mapAgentToOpenCode('product-manager'), 'Oracle');
    });

    it('ux-researcher → Flash', () => {
      assert.strictEqual(mapAgentToOpenCode('ux-researcher'), 'Flash');
    });

    it('information-architect → Oracle', () => {
      assert.strictEqual(mapAgentToOpenCode('information-architect'), 'Oracle');
    });

    it('product-analyst → Oracle', () => {
      assert.strictEqual(mapAgentToOpenCode('product-analyst'), 'Oracle');
    });

    // Backward compatibility
    it('researcher → Oracle (backward-compat)', () => {
      assert.strictEqual(mapAgentToOpenCode('researcher'), 'Oracle');
    });

    it('tdd-guide → Codex (backward-compat)', () => {
      assert.strictEqual(mapAgentToOpenCode('tdd-guide'), 'Codex');
    });

    it('build-fixer → Codex', () => {
      assert.strictEqual(mapAgentToOpenCode('build-fixer'), 'Codex');
    });

    it('알 수 없는 에이전트 → Codex (기본값)', () => {
      assert.strictEqual(mapAgentToOpenCode('unknown-agent'), 'Codex');
    });

    it('빈 문자열 → Codex (기본값)', () => {
      assert.strictEqual(mapAgentToOpenCode(''), 'Codex');
    });

    it('null → Codex (기본값)', () => {
      assert.strictEqual(mapAgentToOpenCode(null), 'Codex');
    });

    it('undefined → Codex (기본값)', () => {
      assert.strictEqual(mapAgentToOpenCode(undefined), 'Codex');
    });
  });

  describe('wrapWithUlwCommand()', () => {
    it('일반 프롬프트에 /ulw 추가', () => {
      const prompt = 'Fix this bug';
      const wrapped = wrapWithUlwCommand(prompt);
      assert.strictEqual(wrapped, '/ulw Fix this bug');
    });

    it('이미 /ulw가 있으면 추가 안함', () => {
      const prompt = '/ulw Fix this bug';
      const wrapped = wrapWithUlwCommand(prompt);
      assert.strictEqual(wrapped, '/ulw Fix this bug');
    });

    it('이미 /ultrawork가 있으면 추가 안함', () => {
      const prompt = '/ultrawork Fix this bug';
      const wrapped = wrapWithUlwCommand(prompt);
      assert.strictEqual(wrapped, '/ultrawork Fix this bug');
    });

    it('빈 문자열은 그대로 반환', () => {
      const wrapped = wrapWithUlwCommand('');
      assert.strictEqual(wrapped, '');
    });

    it('null은 그대로 반환', () => {
      const wrapped = wrapWithUlwCommand(null);
      assert.strictEqual(wrapped, null);
    });

    it('undefined는 그대로 반환', () => {
      const wrapped = wrapWithUlwCommand(undefined);
      assert.strictEqual(wrapped, undefined);
    });

    it('중간에 /ulw가 있어도 추가 안함', () => {
      const prompt = 'Use /ulw mode to fix this';
      const wrapped = wrapWithUlwCommand(prompt);
      assert.strictEqual(wrapped, 'Use /ulw mode to fix this');
    });
  });

  describe('updateFusionState()', () => {
    it('OpenCode 라우팅 시 통계 업데이트 (Gemini)', () => {
      const decision = {
        route: true,
        reason: 'claude-limit-95%',
        targetModel: { id: 'gemini-flash', name: 'Gemini Flash' },
        opencodeAgent: 'Flash'
      };
      const result = { success: true };
      const initialState = {
        enabled: true,
        mode: 'balanced',
        totalTasks: 0,
        routedToOpenCode: 0,
        routingRate: 0,
        estimatedSavedTokens: 0,
        byProvider: { gemini: 0, openai: 0, anthropic: 0 }
      };

      const state = updateFusionState(decision, result, initialState);

      assert.strictEqual(state.totalTasks, 1);
      assert.strictEqual(state.routedToOpenCode, 1);
      assert.strictEqual(state.routingRate, 100);
      assert.strictEqual(state.estimatedSavedTokens, 1000);
      assert.strictEqual(state.byProvider.gemini, 1);
      assert.strictEqual(state.byProvider.openai, 0);
      assert.strictEqual(state.byProvider.anthropic, 0);
    });

    it('OpenCode 라우팅 시 통계 업데이트 (OpenAI)', () => {
      const decision = {
        route: true,
        reason: 'claude-limit-95%',
        targetModel: { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex' },
        opencodeAgent: 'Codex'
      };
      const result = { success: true };
      const initialState = {
        enabled: true,
        mode: 'balanced',
        totalTasks: 0,
        routedToOpenCode: 0,
        routingRate: 0,
        estimatedSavedTokens: 0,
        byProvider: { gemini: 0, openai: 0, anthropic: 0 }
      };

      const state = updateFusionState(decision, result, initialState);

      assert.strictEqual(state.totalTasks, 1);
      assert.strictEqual(state.routedToOpenCode, 1);
      assert.strictEqual(state.routingRate, 100);
      assert.strictEqual(state.estimatedSavedTokens, 1000);
      assert.strictEqual(state.byProvider.gemini, 0);
      assert.strictEqual(state.byProvider.openai, 1);
      assert.strictEqual(state.byProvider.anthropic, 0);
    });

    it('Claude 실행 시 통계 업데이트', () => {
      const decision = {
        route: false,
        reason: 'no-routing-needed'
      };
      const result = null;
      const initialState = {
        enabled: true,
        mode: 'balanced',
        totalTasks: 0,
        routedToOpenCode: 0,
        routingRate: 0,
        estimatedSavedTokens: 0,
        byProvider: { gemini: 0, openai: 0, anthropic: 0 }
      };

      const state = updateFusionState(decision, result, initialState);

      assert.strictEqual(state.totalTasks, 1);
      assert.strictEqual(state.routedToOpenCode, 0);
      assert.strictEqual(state.routingRate, 0);
      assert.strictEqual(state.estimatedSavedTokens, 0);
      assert.strictEqual(state.byProvider.gemini, 0);
      assert.strictEqual(state.byProvider.openai, 0);
      assert.strictEqual(state.byProvider.anthropic, 1);
    });

    it('라우팅 비율 계산', () => {
      const initialState = {
        enabled: true,
        mode: 'balanced',
        totalTasks: 0,
        routedToOpenCode: 0,
        routingRate: 0,
        estimatedSavedTokens: 0,
        byProvider: { gemini: 0, openai: 0, anthropic: 0 }
      };

      // OpenCode 2번
      let state = updateFusionState(
        { route: true, targetModel: { id: 'gemini-flash' }, opencodeAgent: 'Flash' },
        { success: true },
        initialState
      );
      state = updateFusionState(
        { route: true, targetModel: { id: 'gpt-5.2-codex' }, opencodeAgent: 'Codex' },
        { success: true },
        state
      );

      // Claude 3번
      state = updateFusionState({ route: false }, null, state);
      state = updateFusionState({ route: false }, null, state);
      state = updateFusionState({ route: false }, null, state);

      assert.strictEqual(state.totalTasks, 5);
      assert.strictEqual(state.routedToOpenCode, 2);
      assert.strictEqual(state.routingRate, 40); // 2/5 * 100 = 40%
      assert.strictEqual(state.byProvider.gemini, 1);
      assert.strictEqual(state.byProvider.openai, 1);
      assert.strictEqual(state.byProvider.anthropic, 3);
    });

    it('Flash 에이전트는 Gemini로 카운트', () => {
      const decision = {
        route: true,
        reason: 'token-saving',
        targetModel: { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex' },
        opencodeAgent: 'Flash'
      };
      const initialState = {
        enabled: true,
        mode: 'balanced',
        totalTasks: 0,
        routedToOpenCode: 0,
        routingRate: 0,
        estimatedSavedTokens: 0,
        byProvider: { gemini: 0, openai: 0, anthropic: 0 }
      };

      const state = updateFusionState(decision, { success: true }, initialState);

      assert.strictEqual(state.byProvider.gemini, 1);
      assert.strictEqual(state.byProvider.openai, 0);
    });

    it('lastUpdated 타임스탬프 추가', () => {
      const decision = {
        route: true,
        targetModel: { id: 'gemini-flash' },
        opencodeAgent: 'Flash'
      };
      const initialState = {
        enabled: true,
        mode: 'balanced',
        totalTasks: 0,
        routedToOpenCode: 0,
        routingRate: 0,
        estimatedSavedTokens: 0,
        byProvider: { gemini: 0, openai: 0, anthropic: 0 }
      };

      const state = updateFusionState(decision, { success: true }, initialState);

      assert.ok(state.lastUpdated);
      assert.ok(new Date(state.lastUpdated).getTime() > 0);
    });
  });

  describe('TOKEN_SAVING_AGENTS constant', () => {
    it('토큰 절약 가능한 에이전트 목록 포함', () => {
      const expectedAgents = [
        'architect', 'explore', 'debugger', 'code-reviewer',
        'security-reviewer', 'style-reviewer', 'quality-reviewer',
        'api-reviewer', 'performance-reviewer', 'scientist',
        'dependency-expert', 'researcher', 'designer', 'writer',
        'vision', 'quality-strategist', 'analyst', 'ux-researcher',
        'information-architect', 'product-analyst'
      ];

      assert.deepStrictEqual(TOKEN_SAVING_AGENTS, expectedAgents);
    });

    it('executor 포함 안됨', () => {
      assert.strictEqual(TOKEN_SAVING_AGENTS.includes('executor'), false);
    });

    it('verifier 포함 안됨', () => {
      assert.strictEqual(TOKEN_SAVING_AGENTS.includes('verifier'), false);
    });

    it('planner 포함 안됨', () => {
      assert.strictEqual(TOKEN_SAVING_AGENTS.includes('planner'), false);
    });

    it('product-manager 포함 안됨', () => {
      assert.strictEqual(TOKEN_SAVING_AGENTS.includes('product-manager'), false);
    });
  });

  describe('CLAUDE_ONLY_AGENTS constant', () => {
    it('Claude 전용 에이전트 목록 포함', () => {
      const expectedAgents = [
        'planner', 'critic', 'executor', 'deep-executor', 'qa-tester',
        'build-fixer', 'test-engineer', 'tdd-guide', 'verifier',
        'git-master', 'product-manager'
      ];

      assert.deepStrictEqual(CLAUDE_ONLY_AGENTS, expectedAgents);
    });

    it('architect 포함 안됨', () => {
      assert.strictEqual(CLAUDE_ONLY_AGENTS.includes('architect'), false);
    });

    it('debugger 포함 안됨', () => {
      assert.strictEqual(CLAUDE_ONLY_AGENTS.includes('debugger'), false);
    });

    it('explore 포함 안됨', () => {
      assert.strictEqual(CLAUDE_ONLY_AGENTS.includes('explore'), false);
    });

    it('writer 포함 안됨', () => {
      assert.strictEqual(CLAUDE_ONLY_AGENTS.includes('writer'), false);
    });
  });
});
