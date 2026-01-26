/**
 * opencode-executor.test.mjs - OpenCode 실행 모듈 단위 테스트
 */
import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { wrapWithUlwCommand, mapToOpenCodeAgent, getTokenSavings } from '../../src/executor/opencode-executor.mjs';

describe('opencode-executor', () => {
  describe('wrapWithUlwCommand()', () => {
    it('기본 동작: /ulw 커맨드를 프롬프트 앞에 추가', () => {
      const prompt = 'Fix the bug';
      const result = wrapWithUlwCommand(prompt);
      assert.strictEqual(result, '/ulw Fix the bug');
    });

    it('이미 /ulw가 포함된 경우 중복 추가하지 않음', () => {
      const prompt = '/ulw Fix the bug';
      const result = wrapWithUlwCommand(prompt);
      assert.strictEqual(result, '/ulw Fix the bug');
    });

    it('이미 /ultrawork가 포함된 경우 중복 추가하지 않음', () => {
      const prompt = '/ultrawork Fix the bug';
      const result = wrapWithUlwCommand(prompt);
      assert.strictEqual(result, '/ultrawork Fix the bug');
    });

    it('disableUlw 옵션이 true이면 원본 반환', () => {
      const prompt = 'Fix the bug';
      const result = wrapWithUlwCommand(prompt, { disableUlw: true });
      assert.strictEqual(result, 'Fix the bug');
    });

    it('빈 문자열 처리', () => {
      const prompt = '';
      const result = wrapWithUlwCommand(prompt);
      assert.strictEqual(result, '/ulw ');
    });

    it('null 처리 (options가 null인 경우)', () => {
      const prompt = 'Test prompt';
      const result = wrapWithUlwCommand(prompt, null);
      assert.strictEqual(result, '/ulw Test prompt');
    });

    it('undefined 처리 (options가 undefined인 경우)', () => {
      const prompt = 'Test prompt';
      const result = wrapWithUlwCommand(prompt, undefined);
      assert.strictEqual(result, '/ulw Test prompt');
    });

    it('여러 줄 프롬프트 처리', () => {
      const prompt = 'Line 1\nLine 2\nLine 3';
      const result = wrapWithUlwCommand(prompt);
      assert.strictEqual(result, '/ulw Line 1\nLine 2\nLine 3');
    });

    it('프롬프트 중간에 /ulw가 있는 경우 (시작이 아님)', () => {
      const prompt = 'Please /ulw fix this';
      const result = wrapWithUlwCommand(prompt);
      // includes()를 사용하므로 중복 추가하지 않음
      assert.strictEqual(result, 'Please /ulw fix this');
    });
  });

  describe('mapToOpenCodeAgent()', () => {
    it('architect -> Oracle', () => {
      assert.strictEqual(mapToOpenCodeAgent('oh-my-claudecode:architect'), 'Oracle');
    });

    it('architect-low -> Flash', () => {
      assert.strictEqual(mapToOpenCodeAgent('oh-my-claudecode:architect-low'), 'Flash');
    });

    it('executor -> Codex', () => {
      assert.strictEqual(mapToOpenCodeAgent('oh-my-claudecode:executor'), 'Codex');
    });

    it('executor-low -> Flash', () => {
      assert.strictEqual(mapToOpenCodeAgent('oh-my-claudecode:executor-low'), 'Flash');
    });

    it('executor-high -> Codex', () => {
      assert.strictEqual(mapToOpenCodeAgent('oh-my-claudecode:executor-high'), 'Codex');
    });

    it('explore -> Flash', () => {
      assert.strictEqual(mapToOpenCodeAgent('oh-my-claudecode:explore'), 'Flash');
    });

    it('explore-medium -> Oracle', () => {
      assert.strictEqual(mapToOpenCodeAgent('oh-my-claudecode:explore-medium'), 'Oracle');
    });

    it('designer -> Flash', () => {
      assert.strictEqual(mapToOpenCodeAgent('oh-my-claudecode:designer'), 'Flash');
    });

    it('designer-high -> Codex', () => {
      assert.strictEqual(mapToOpenCodeAgent('oh-my-claudecode:designer-high'), 'Codex');
    });

    it('writer -> Flash', () => {
      assert.strictEqual(mapToOpenCodeAgent('oh-my-claudecode:writer'), 'Flash');
    });

    it('planner -> Oracle', () => {
      assert.strictEqual(mapToOpenCodeAgent('oh-my-claudecode:planner'), 'Oracle');
    });

    it('critic -> Oracle', () => {
      assert.strictEqual(mapToOpenCodeAgent('oh-my-claudecode:critic'), 'Oracle');
    });

    it('qa-tester -> Codex', () => {
      assert.strictEqual(mapToOpenCodeAgent('oh-my-claudecode:qa-tester'), 'Codex');
    });

    it('security-reviewer -> Oracle', () => {
      assert.strictEqual(mapToOpenCodeAgent('oh-my-claudecode:security-reviewer'), 'Oracle');
    });

    it('oh-my-claudecode: 접두사 없이도 동작', () => {
      assert.strictEqual(mapToOpenCodeAgent('architect'), 'Oracle');
      assert.strictEqual(mapToOpenCodeAgent('executor'), 'Codex');
    });

    it('알 수 없는 에이전트는 Codex로 기본 매핑', () => {
      assert.strictEqual(mapToOpenCodeAgent('oh-my-claudecode:unknown-agent'), 'Codex');
      assert.strictEqual(mapToOpenCodeAgent('random-agent'), 'Codex');
    });

    it('빈 문자열은 Codex로 매핑', () => {
      assert.strictEqual(mapToOpenCodeAgent(''), 'Codex');
    });

    it('null은 에러 발생', () => {
      assert.throws(() => {
        mapToOpenCodeAgent(null);
      }, TypeError);
    });

    it('undefined는 에러 발생', () => {
      assert.throws(() => {
        mapToOpenCodeAgent(undefined);
      }, TypeError);
    });
  });

  describe('getTokenSavings()', () => {
    it('architect는 2000 토큰 절약', () => {
      assert.strictEqual(getTokenSavings('oh-my-claudecode:architect'), 2000);
    });

    it('executor는 1500 토큰 절약', () => {
      assert.strictEqual(getTokenSavings('oh-my-claudecode:executor'), 1500);
    });

    it('executor-high는 3000 토큰 절약', () => {
      assert.strictEqual(getTokenSavings('oh-my-claudecode:executor-high'), 3000);
    });

    it('explore는 500 토큰 절약', () => {
      assert.strictEqual(getTokenSavings('oh-my-claudecode:explore'), 500);
    });

    it('researcher는 1500 토큰 절약', () => {
      assert.strictEqual(getTokenSavings('oh-my-claudecode:researcher'), 1500);
    });

    it('designer는 1000 토큰 절약', () => {
      assert.strictEqual(getTokenSavings('oh-my-claudecode:designer'), 1000);
    });

    it('writer는 800 토큰 절약', () => {
      assert.strictEqual(getTokenSavings('oh-my-claudecode:writer'), 800);
    });

    it('planner는 2500 토큰 절약', () => {
      assert.strictEqual(getTokenSavings('oh-my-claudecode:planner'), 2500);
    });

    it('critic는 1500 토큰 절약', () => {
      assert.strictEqual(getTokenSavings('oh-my-claudecode:critic'), 1500);
    });

    it('oh-my-claudecode: 접두사 없이도 동작', () => {
      assert.strictEqual(getTokenSavings('architect'), 2000);
      assert.strictEqual(getTokenSavings('executor'), 1500);
    });

    it('알 수 없는 에이전트는 1000 토큰 기본값', () => {
      assert.strictEqual(getTokenSavings('oh-my-claudecode:unknown-agent'), 1000);
      assert.strictEqual(getTokenSavings('random-agent'), 1000);
    });

    it('빈 문자열은 1000 토큰 기본값', () => {
      assert.strictEqual(getTokenSavings(''), 1000);
    });

    it('null은 에러 발생', () => {
      assert.throws(() => {
        getTokenSavings(null);
      }, TypeError);
    });

    it('undefined는 에러 발생', () => {
      assert.throws(() => {
        getTokenSavings(undefined);
      }, TypeError);
    });
  });
});
