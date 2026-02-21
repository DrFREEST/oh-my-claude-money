/**
 * fusion-router.test.mjs - Fusion Router 로직 단위 테스트
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  shouldRouteToMcp,
  mapAgentToMcp,
  wrapWithUlwCommand,
  updateFusionState,
  TOKEN_SAVING_AGENTS,
  CLAUDE_ONLY_AGENTS
} from '../../src/hooks/fusion-router-logic.mjs';

describe('fusion-router-logic', () => {
  describe('shouldRouteToMcp()', () => {
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

      const decision = shouldRouteToMcp(toolInput, options);

      assert.strictEqual(decision.route, true);
      assert.strictEqual(decision.reason.startsWith('fusion-default-'), true);
      assert.strictEqual(decision.mcpAgent, 'codex-oracle');
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

      const decision = shouldRouteToMcp(toolInput, options);

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

      const decision = shouldRouteToMcp(toolInput, options);

      assert.strictEqual(decision.route, true);
      assert.strictEqual(decision.reason, 'claude-limit-92%');
      assert.strictEqual(decision.mcpAgent, 'codex-build');
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

      const decision = shouldRouteToMcp(toolInput, options);

      assert.strictEqual(decision.route, true);
      assert.strictEqual(decision.reason, 'claude-limit-95%');
      assert.strictEqual(decision.mcpAgent, 'gemini-flash');
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

      const decision = shouldRouteToMcp(toolInput, options);

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
            id: 'gpt-5.3-codex',
            name: 'GPT-5.3 Codex',
            mcpAgent: 'codex-build'
          }
        },
        limits: null,
        config: null
      };

      const decision = shouldRouteToMcp(toolInput, options);

      assert.strictEqual(decision.route, true);
      assert.strictEqual(decision.reason, 'fallback-active');
      assert.strictEqual(decision.mcpAgent, 'codex-build');
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

      const decision = shouldRouteToMcp(toolInput, options);

      assert.strictEqual(decision.route, true);
      assert.strictEqual(decision.reason, 'token-saving-agent-explore');
      assert.strictEqual(decision.mcpAgent, 'gemini-flash');
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

      const decision = shouldRouteToMcp(toolInput, options);

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

      const decision = shouldRouteToMcp(toolInput, options);

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

      const decision = shouldRouteToMcp(toolInput, options);

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

      const decision = shouldRouteToMcp(toolInput, options);

      assert.strictEqual(decision.route, false);
      assert.strictEqual(decision.reason, 'no-routing-needed');
    });
  });

  describe('mapAgentToMcp()', () => {
    // Core agents
    it('architect → Oracle', () => {
      assert.strictEqual(mapAgentToMcp('architect'), 'codex-oracle');
    });

    it('executor → Codex', () => {
      assert.strictEqual(mapAgentToMcp('executor'), 'codex-build');
    });

    it('explore → Flash', () => {
      assert.strictEqual(mapAgentToMcp('explore'), 'gemini-flash');
    });

    it('debugger → Oracle', () => {
      assert.strictEqual(mapAgentToMcp('debugger'), 'codex-oracle');
    });

    it('verifier → Codex', () => {
      assert.strictEqual(mapAgentToMcp('verifier'), 'codex-build');
    });

    it('deep-executor → Codex', () => {
      assert.strictEqual(mapAgentToMcp('deep-executor'), 'codex-build');
    });

    it('git-master → Codex', () => {
      assert.strictEqual(mapAgentToMcp('git-master'), 'codex-build');
    });

    // Quality agents
    it('security-reviewer → Oracle', () => {
      assert.strictEqual(mapAgentToMcp('security-reviewer'), 'codex-oracle');
    });

    it('code-reviewer → Oracle', () => {
      assert.strictEqual(mapAgentToMcp('code-reviewer'), 'codex-oracle');
    });

    it('style-reviewer → Flash', () => {
      assert.strictEqual(mapAgentToMcp('style-reviewer'), 'gemini-flash');
    });

    it('quality-reviewer → Oracle', () => {
      assert.strictEqual(mapAgentToMcp('quality-reviewer'), 'codex-oracle');
    });

    it('api-reviewer → Oracle', () => {
      assert.strictEqual(mapAgentToMcp('api-reviewer'), 'codex-oracle');
    });

    it('performance-reviewer → Oracle', () => {
      assert.strictEqual(mapAgentToMcp('performance-reviewer'), 'codex-oracle');
    });

    // Test agents
    it('qa-tester → Codex', () => {
      assert.strictEqual(mapAgentToMcp('qa-tester'), 'codex-build');
    });

    it('test-engineer → Codex', () => {
      assert.strictEqual(mapAgentToMcp('test-engineer'), 'codex-build');
    });

    // Research/Data agents
    it('scientist → Oracle', () => {
      assert.strictEqual(mapAgentToMcp('scientist'), 'codex-oracle');
    });

    it('dependency-expert → Oracle', () => {
      assert.strictEqual(mapAgentToMcp('dependency-expert'), 'codex-oracle');
    });

    // Design/Content agents
    it('designer → Flash', () => {
      assert.strictEqual(mapAgentToMcp('designer'), 'gemini-flash');
    });

    it('writer → Flash', () => {
      assert.strictEqual(mapAgentToMcp('writer'), 'gemini-flash');
    });

    it('vision → Flash', () => {
      assert.strictEqual(mapAgentToMcp('vision'), 'gemini-flash');
    });

    // Strategy agents
    it('quality-strategist → Oracle', () => {
      assert.strictEqual(mapAgentToMcp('quality-strategist'), 'codex-oracle');
    });

    it('planner → Oracle', () => {
      assert.strictEqual(mapAgentToMcp('planner'), 'codex-oracle');
    });

    it('critic → Oracle', () => {
      assert.strictEqual(mapAgentToMcp('critic'), 'codex-oracle');
    });

    it('analyst → Oracle', () => {
      assert.strictEqual(mapAgentToMcp('analyst'), 'codex-oracle');
    });

    // Product agents
    it('product-manager → Oracle', () => {
      assert.strictEqual(mapAgentToMcp('product-manager'), 'codex-oracle');
    });

    it('ux-researcher → Flash', () => {
      assert.strictEqual(mapAgentToMcp('ux-researcher'), 'gemini-flash');
    });

    it('information-architect → Oracle', () => {
      assert.strictEqual(mapAgentToMcp('information-architect'), 'codex-oracle');
    });

    it('product-analyst → Oracle', () => {
      assert.strictEqual(mapAgentToMcp('product-analyst'), 'codex-oracle');
    });

    // Backward compatibility
    it('researcher → Oracle (backward-compat)', () => {
      assert.strictEqual(mapAgentToMcp('researcher'), 'codex-oracle');
    });

    it('tdd-guide → Codex (backward-compat)', () => {
      assert.strictEqual(mapAgentToMcp('tdd-guide'), 'codex-build');
    });

    it('build-fixer → Codex', () => {
      assert.strictEqual(mapAgentToMcp('build-fixer'), 'codex-build');
    });

    it('알 수 없는 에이전트 → Codex (기본값)', () => {
      assert.strictEqual(mapAgentToMcp('unknown-agent'), 'codex-build');
    });

    it('빈 문자열 → Codex (기본값)', () => {
      assert.strictEqual(mapAgentToMcp(''), 'codex-build');
    });

    it('null → Codex (기본값)', () => {
      assert.strictEqual(mapAgentToMcp(null), 'codex-build');
    });

    it('undefined → Codex (기본값)', () => {
      assert.strictEqual(mapAgentToMcp(undefined), 'codex-build');
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
    it('MCP 라우팅 시 통계 업데이트 (Gemini)', () => {
      const decision = {
        route: true,
        reason: 'claude-limit-95%',
        targetModel: { id: 'gemini-3-flash', name: 'Gemini 3 Flash' },
        mcpAgent: 'gemini-flash'
      };
      const result = { success: true };
      const initialState = {
        enabled: true,
        mode: 'balanced',
        totalTasks: 0,
        routedToMcp: 0,
        routingRate: 0,
        estimatedSavedTokens: 0,
        byProvider: { gemini: 0, openai: 0, anthropic: 0 }
      };

      const state = updateFusionState(decision, result, initialState);

      assert.strictEqual(state.totalTasks, 1);
      assert.strictEqual(state.routedToMcp, 1);
      assert.strictEqual(state.routingRate, 100);
      assert.strictEqual(state.estimatedSavedTokens, 1000);
      assert.strictEqual(state.byProvider.gemini, 1);
      assert.strictEqual(state.byProvider.openai, 0);
      assert.strictEqual(state.byProvider.anthropic, 0);
    });

    it('MCP 라우팅 시 통계 업데이트 (OpenAI)', () => {
      const decision = {
        route: true,
        reason: 'claude-limit-95%',
        targetModel: { id: 'gpt-5.3-codex', name: 'GPT-5.3 Codex' },
        mcpAgent: 'codex-build'
      };
      const result = { success: true };
      const initialState = {
        enabled: true,
        mode: 'balanced',
        totalTasks: 0,
        routedToMcp: 0,
        routingRate: 0,
        estimatedSavedTokens: 0,
        byProvider: { gemini: 0, openai: 0, anthropic: 0 }
      };

      const state = updateFusionState(decision, result, initialState);

      assert.strictEqual(state.totalTasks, 1);
      assert.strictEqual(state.routedToMcp, 1);
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
        routedToMcp: 0,
        routingRate: 0,
        estimatedSavedTokens: 0,
        byProvider: { gemini: 0, openai: 0, anthropic: 0 }
      };

      const state = updateFusionState(decision, result, initialState);

      assert.strictEqual(state.totalTasks, 1);
      assert.strictEqual(state.routedToMcp, 0);
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
        routedToMcp: 0,
        routingRate: 0,
        estimatedSavedTokens: 0,
        byProvider: { gemini: 0, openai: 0, anthropic: 0 }
      };

      // MCP 2번
      let state = updateFusionState(
        { route: true, targetModel: { id: 'gemini-3-flash' }, mcpAgent: 'gemini-flash' },
        { success: true },
        initialState
      );
      state = updateFusionState(
        { route: true, targetModel: { id: 'gpt-5.3-codex' }, mcpAgent: 'codex-build' },
        { success: true },
        state
      );

      // Claude 3번
      state = updateFusionState({ route: false }, null, state);
      state = updateFusionState({ route: false }, null, state);
      state = updateFusionState({ route: false }, null, state);

      assert.strictEqual(state.totalTasks, 5);
      assert.strictEqual(state.routedToMcp, 2);
      assert.strictEqual(state.routingRate, 40); // 2/5 * 100 = 40%
      assert.strictEqual(state.byProvider.gemini, 1);
      assert.strictEqual(state.byProvider.openai, 1);
      assert.strictEqual(state.byProvider.anthropic, 3);
    });

    it('gemini-flash 에이전트는 Gemini로 카운트', () => {
      const decision = {
        route: true,
        reason: 'token-saving',
        targetModel: { id: 'gpt-5.3-codex', name: 'GPT-5.3 Codex' },
        mcpAgent: 'gemini-flash'
      };
      const initialState = {
        enabled: true,
        mode: 'balanced',
        totalTasks: 0,
        routedToMcp: 0,
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
        targetModel: { id: 'gemini-3-flash' },
        mcpAgent: 'gemini-flash'
      };
      const initialState = {
        enabled: true,
        mode: 'balanced',
        totalTasks: 0,
        routedToMcp: 0,
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
        'dependency-expert', 'researcher', 'designer', 'writer', 'document-specialist',
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
