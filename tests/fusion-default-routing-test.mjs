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

function mapAgentToOpenCode(agentType) {
  var mapping = {
    'architect': 'Oracle',
    'architect-low': 'Flash',
    'architect-medium': 'Oracle',
    'researcher': 'Oracle',
    'researcher-low': 'Flash',
    'designer': 'Flash',
    'designer-low': 'Flash',
    'designer-high': 'Codex',
    'explore': 'Flash',
    'explore-medium': 'Oracle',
    'explore-high': 'Oracle',
    'scientist': 'Oracle',
    'scientist-low': 'Flash',
    'scientist-high': 'Oracle',
    'executor': 'Codex',
    'executor-low': 'Flash',
    'executor-high': 'Codex',
    'writer': 'Flash',
    'planner': 'Oracle',
    'critic': 'Oracle',
    'analyst': 'Oracle',
    'vision': 'Flash',
    'qa-tester': 'Codex',
    'qa-tester-high': 'Codex',
    'security-reviewer': 'Oracle',
    'security-reviewer-low': 'Flash',
    'build-fixer': 'Codex',
    'build-fixer-low': 'Flash',
    'tdd-guide': 'Codex',
    'tdd-guide-low': 'Flash',
    'code-reviewer': 'Oracle',
    'code-reviewer-low': 'Flash'
  };
  return mapping[agentType] || 'Codex';
}

// 라우팅 결정 함수 (fusion-router.mjs에서 가져옴)
function shouldRouteToOpenCode(toolInput) {
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
    var tokenSavingAgents = ['architect', 'architect-low', 'architect-medium',
                            'researcher', 'researcher-low',
                            'designer', 'designer-low', 'designer-high',
                            'explore', 'explore-medium', 'explore-high',
                            'scientist', 'scientist-low', 'scientist-high',
                            'writer', 'vision',
                            'code-reviewer', 'code-reviewer-low',
                            'security-reviewer', 'security-reviewer-low'];

    var shouldSave = tokenSavingAgents.indexOf(agentType) !== -1;

    if (shouldSave) {
      return {
        route: true,
        reason: fusionDefault ? 'fusion-default-' + agentType : 'token-saving-agent-' + agentType,
        targetModel: { id: 'gpt-5.2-codex', name: 'GPT-5.2 Codex' },
        opencodeAgent: mapAgentToOpenCode(agentType)
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
  { subagent_type: 'oh-my-claudecode:researcher', expected: 'route', desc: 'researcher (연구)' },
  { subagent_type: 'oh-my-claudecode:designer', expected: 'route', desc: 'designer (디자인)' },
  { subagent_type: 'oh-my-claudecode:writer', expected: 'route', desc: 'writer (문서)' },
  { subagent_type: 'oh-my-claudecode:vision', expected: 'route', desc: 'vision (시각)' },
  { subagent_type: 'oh-my-claudecode:code-reviewer', expected: 'route', desc: 'code-reviewer (리뷰)' },
  { subagent_type: 'oh-my-claudecode:executor', expected: 'no-route', desc: 'executor (실행)' },
  { subagent_type: 'oh-my-claudecode:executor-high', expected: 'no-route', desc: 'executor-high (고급 실행)' },
  { subagent_type: 'oh-my-claudecode:build-fixer', expected: 'no-route', desc: 'build-fixer (빌드 수정)' },
  { subagent_type: 'oh-my-claudecode:qa-tester', expected: 'no-route', desc: 'qa-tester (QA 테스트)' },
  { subagent_type: 'oh-my-claudecode:tdd-guide', expected: 'no-route', desc: 'tdd-guide (TDD)' },
];

console.log('--- 라우팅 테스트 ---');
var passed = 0;
var failed = 0;

testCases.forEach(function(tc) {
  var result = shouldRouteToOpenCode(tc);
  var actualRoute = result.route ? 'route' : 'no-route';
  var status = actualRoute === tc.expected ? '✅' : '❌';

  if (actualRoute === tc.expected) passed++;
  else failed++;

  var info = result.route ? ' → ' + result.opencodeAgent : '';
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
