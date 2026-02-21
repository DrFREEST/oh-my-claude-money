#!/usr/bin/env node
/**
 * fusionDefault 라우팅 로직 테스트
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const HOME = process.env.HOME || '';
const OMCM_DIR = join(HOME, '.omcm');
const FUSION_STATE_FILE = join(OMCM_DIR, 'fusion-state.json');
const FALLBACK_STATE_FILE = join(OMCM_DIR, 'fallback-state.json');
const CONFIG_FILE = join(HOME, '.claude', 'plugins', 'omcm', 'config.json');

function readJsonFile(filepath) {
  if (!existsSync(filepath)) return null;
  try { return JSON.parse(readFileSync(filepath, 'utf-8')); }
  catch (e) { return null; }
}

function mapAgentToMcp(agentType) {
  var mapping = {
    'architect': 'Oracle',
    'executor': 'Codex',
    'explore': 'Flash',
    'debugger': 'Oracle',
    'verifier': 'Codex',
    'deep-executor': 'Codex',
    'git-master': 'Codex',
    'security-reviewer': 'Oracle',
    'code-reviewer': 'Oracle',
    'style-reviewer': 'Flash',
    'quality-reviewer': 'Oracle',
    'api-reviewer': 'Oracle',
    'performance-reviewer': 'Oracle',
    'qa-tester': 'Codex',
    'test-engineer': 'Codex',
    'scientist': 'Oracle',
    'dependency-expert': 'Oracle',
    'designer': 'Flash',
    'writer': 'Flash',
    'vision': 'Flash',
    'quality-strategist': 'Oracle',
    'planner': 'Oracle',
    'critic': 'Oracle',
    'analyst': 'Oracle',
    'product-manager': 'Oracle',
    'ux-researcher': 'Flash',
    'information-architect': 'Oracle',
    'product-analyst': 'Oracle',
    // Backward compatibility aliases
    'researcher': 'Oracle',
    'tdd-guide': 'Codex'
  };
  return mapping[agentType] || 'Codex';
}

// 라우팅 결정 함수 (fusion-router.mjs에서 가져옴)
function shouldRouteToMcp(toolInput) {
  var fusion = readJsonFile(FUSION_STATE_FILE);
  var fallback = readJsonFile(FALLBACK_STATE_FILE);
  var config = readJsonFile(CONFIG_FILE);

  var fusionDefault = config && config.fusionDefault === true;

  // fusionDefault가 아니고 fusion도 비활성화면 라우팅 안함
  if (!fusionDefault && (!fusion || fusion.enabled === false)) {
    return { route: false, reason: 'fusion-disabled' };
  }

  // fallback 활성화 상태면 먼저 라우팅
  if (fallback && fallback.fallbackActive) {
    return { route: true, reason: 'fallback-active' };
  }

  // fusionDefault 또는 save-tokens 모드에서 에이전트 타입 기반 라우팅
  var shouldRouteByMode = fusionDefault || (fusion && fusion.mode === 'save-tokens');

  if (toolInput && toolInput.subagent_type && shouldRouteByMode) {
    var agentType = toolInput.subagent_type.replace('oh-my-claudecode:', '');
    var tokenSavingAgents = ['architect', 'explore', 'debugger', 'code-reviewer',
                            'security-reviewer', 'style-reviewer', 'quality-reviewer',
                            'api-reviewer', 'performance-reviewer', 'scientist',
                            'dependency-expert', 'researcher', 'designer', 'writer',
                            'vision', 'quality-strategist', 'analyst', 'ux-researcher',
                            'information-architect', 'product-analyst'];

    var shouldSave = tokenSavingAgents.indexOf(agentType) !== -1;

    if (shouldSave) {
      return {
        route: true,
        reason: fusionDefault ? 'fusion-default-' + agentType : 'token-saving-agent-' + agentType,
        targetModel: { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex' },
        mcpAgent: mapAgentToMcp(agentType)
      };
    }
  }

  return { route: false, reason: 'no-routing-needed' };
}

console.log('=== fusionDefault 라우팅 테스트 ===\n');

// 현재 상태 출력
var config = readJsonFile(CONFIG_FILE);
var fusion = readJsonFile(FUSION_STATE_FILE);
var fallback = readJsonFile(FALLBACK_STATE_FILE);

console.log('--- 현재 상태 ---');
console.log('fusionDefault:', config && config.fusionDefault);
console.log('fusion enabled:', fusion && fusion.enabled);
console.log('fallback active:', fallback && fallback.fallbackActive);
console.log('');

// 테스트 케이스들
var testCases = [
  { subagent_type: 'oh-my-claudecode:architect', expected: 'route', desc: 'architect (분석)' },
  { subagent_type: 'oh-my-claudecode:explore', expected: 'route', desc: 'explore (탐색)' },
  { subagent_type: 'oh-my-claudecode:debugger', expected: 'route', desc: 'debugger (디버깅)' },
  { subagent_type: 'oh-my-claudecode:dependency-expert', expected: 'route', desc: 'dependency-expert (의존성)' },
  { subagent_type: 'oh-my-claudecode:designer', expected: 'route', desc: 'designer (디자인)' },
  { subagent_type: 'oh-my-claudecode:writer', expected: 'route', desc: 'writer (문서)' },
  { subagent_type: 'oh-my-claudecode:vision', expected: 'route', desc: 'vision (시각)' },
  { subagent_type: 'oh-my-claudecode:code-reviewer', expected: 'route', desc: 'code-reviewer (리뷰)' },
  { subagent_type: 'oh-my-claudecode:security-reviewer', expected: 'route', desc: 'security-reviewer (보안)' },
  { subagent_type: 'oh-my-claudecode:style-reviewer', expected: 'route', desc: 'style-reviewer (스타일)' },
  { subagent_type: 'oh-my-claudecode:scientist', expected: 'route', desc: 'scientist (데이터)' },
  { subagent_type: 'oh-my-claudecode:researcher', expected: 'route', desc: 'researcher (backward-compat)' },
  { subagent_type: 'oh-my-claudecode:executor', expected: 'no-route', desc: 'executor (실행)' },
  { subagent_type: 'oh-my-claudecode:verifier', expected: 'no-route', desc: 'verifier (검증)' },
  { subagent_type: 'oh-my-claudecode:build-fixer', expected: 'no-route', desc: 'build-fixer (빌드 수정)' },
  { subagent_type: 'oh-my-claudecode:qa-tester', expected: 'no-route', desc: 'qa-tester (QA 테스트)' },
  { subagent_type: 'oh-my-claudecode:test-engineer', expected: 'no-route', desc: 'test-engineer (테스트)' },
  { subagent_type: 'oh-my-claudecode:tdd-guide', expected: 'no-route', desc: 'tdd-guide (backward-compat)' },
  { subagent_type: 'oh-my-claudecode:planner', expected: 'no-route', desc: 'planner (계획)' },
  { subagent_type: 'oh-my-claudecode:product-manager', expected: 'no-route', desc: 'product-manager (PM)' },
];

console.log('--- 라우팅 테스트 ---');
var passed = 0;
var failed = 0;

testCases.forEach(function(tc) {
  var result = shouldRouteToMcp(tc);
  var actualRoute = result.route ? 'route' : 'no-route';
  var status = actualRoute === tc.expected ? '✅' : '❌';

  if (actualRoute === tc.expected) passed++;
  else failed++;

  var info = result.route ? ' → ' + result.mcpAgent : '';
  console.log(status + ' ' + tc.desc + info);

  if (actualRoute !== tc.expected) {
    console.log('   예상: ' + tc.expected + ', 실제: ' + actualRoute + ' (' + result.reason + ')');
  }
});

console.log('\n--- 결과 ---');
console.log('통과: ' + passed + '/' + testCases.length);
console.log('실패: ' + failed + '/' + testCases.length);

if (failed === 0) {
  console.log('\n✅ fusionDefault 라우팅 로직이 정상 작동합니다!');
  process.exit(0);
} else {
  console.log('\n❌ 일부 테스트가 실패했습니다.');
  process.exit(1);
}
