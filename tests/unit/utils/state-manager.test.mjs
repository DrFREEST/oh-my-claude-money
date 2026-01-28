/**
 * state-manager.test.mjs - 상태 관리 유틸리티 테스트
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { join } from 'node:path';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';

import {
  STATE_FILES,
  readState,
  writeState,
  deleteState,
  stateExists,
  getActiveModes,
  deactivateAllModes,
  getFusionState,
  updateFusionState
} from '../../../src/utils/state-manager.mjs';

describe('state-manager 유틸리티', () => {
  const testDir = join(tmpdir(), 'omcm-state-test-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  const subDir = join(testDir, 'src');

  beforeEach(() => {
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(testDir, 'package.json'), '{}');
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('STATE_FILES 상수', () => {
    test('모든 상태 파일 타입이 정의되어 있어야 함', () => {
      assert.strictEqual(STATE_FILES.ULTRAWORK, 'ultrawork-state.json');
      assert.strictEqual(STATE_FILES.RALPH, 'ralph-state.json');
      assert.strictEqual(STATE_FILES.FUSION, 'fusion-state.json');
      assert.strictEqual(STATE_FILES.AUTOPILOT, 'autopilot-state.json');
    });
  });

  describe('writeState() / readState()', () => {
    test('상태를 쓰고 읽을 수 있어야 함', () => {
      const testData = { active: true, count: 5 };

      writeState('ULTRAWORK', testData, { startDir: subDir });
      const result = readState('ULTRAWORK', { startDir: subDir });

      assert.strictEqual(result.active, true);
      assert.strictEqual(result.count, 5);
      assert.ok(result.lastUpdated);
    });

    test('프로젝트 루트의 .omcm/state/에 저장해야 함', () => {
      writeState('ULTRAWORK', { test: true }, { startDir: subDir });

      const expectedPath = join(testDir, '.omcm', 'state', 'ultrawork-state.json');
      assert.ok(existsSync(expectedPath));
    });

    test('서브디렉토리에서 호출해도 루트에 저장해야 함', () => {
      const deepDir = join(testDir, 'src', 'components', 'ui');
      mkdirSync(deepDir, { recursive: true });

      writeState('RALPH', { iteration: 3 }, { startDir: deepDir });

      // 프로젝트 루트에 저장되어야 함
      const expectedPath = join(testDir, '.omcm', 'state', 'ralph-state.json');
      assert.ok(existsSync(expectedPath), '프로젝트 루트에 저장되어야 함');

      // 서브디렉토리에는 생성되지 않아야 함
      const wrongPath = join(deepDir, '.omcm', 'state', 'ralph-state.json');
      assert.ok(!existsSync(wrongPath), '서브디렉토리에 생성되면 안됨');
    });

    test('merge: true면 기존 데이터와 병합해야 함', () => {
      writeState('ULTRAWORK', { a: 1, b: 2 }, { startDir: subDir });
      writeState('ULTRAWORK', { b: 3, c: 4 }, { startDir: subDir, merge: true });

      const result = readState('ULTRAWORK', { startDir: subDir });

      assert.strictEqual(result.a, 1);
      assert.strictEqual(result.b, 3); // 덮어씀
      assert.strictEqual(result.c, 4);
    });

    test('존재하지 않는 상태는 기본값을 반환해야 함', () => {
      const result = readState('nonexistent.json', {
        startDir: subDir,
        defaultValue: { empty: true }
      });

      assert.strictEqual(result.empty, true);
    });
  });

  describe('deleteState()', () => {
    test('상태 파일을 삭제해야 함', () => {
      writeState('ULTRAWORK', { test: true }, { startDir: subDir });
      assert.ok(stateExists('ULTRAWORK', { startDir: subDir }));

      const deleted = deleteState('ULTRAWORK', { startDir: subDir });

      assert.strictEqual(deleted, true);
      assert.ok(!stateExists('ULTRAWORK', { startDir: subDir }));
    });

    test('존재하지 않는 파일 삭제 시 false 반환', () => {
      const deleted = deleteState('nonexistent.json', { startDir: subDir });
      assert.strictEqual(deleted, false);
    });
  });

  describe('stateExists()', () => {
    test('상태 파일 존재 여부를 확인해야 함', () => {
      assert.ok(!stateExists('ULTRAWORK', { startDir: subDir }));

      writeState('ULTRAWORK', { test: true }, { startDir: subDir });

      assert.ok(stateExists('ULTRAWORK', { startDir: subDir }));
    });
  });

  describe('getActiveModes()', () => {
    test('활성 모드 목록을 반환해야 함', () => {
      writeState('ULTRAWORK', { active: true }, { startDir: subDir });
      writeState('RALPH', { active: true }, { startDir: subDir });
      writeState('ECOMODE', { active: false }, { startDir: subDir });

      const activeModes = getActiveModes({ startDir: subDir });

      assert.ok(activeModes.includes('ultrawork'));
      assert.ok(activeModes.includes('ralph'));
      assert.ok(!activeModes.includes('ecomode'));
    });

    test('활성 모드가 없으면 빈 배열 반환', () => {
      const activeModes = getActiveModes({ startDir: subDir });
      assert.deepStrictEqual(activeModes, []);
    });
  });

  describe('deactivateAllModes()', () => {
    test('모든 활성 모드를 비활성화해야 함', () => {
      writeState('ULTRAWORK', { active: true }, { startDir: subDir });
      writeState('RALPH', { active: true }, { startDir: subDir });

      const deactivated = deactivateAllModes({ startDir: subDir });

      assert.ok(deactivated.includes('ultrawork'));
      assert.ok(deactivated.includes('ralph'));

      // 확인
      const ultrawork = readState('ULTRAWORK', { startDir: subDir });
      const ralph = readState('RALPH', { startDir: subDir });

      assert.strictEqual(ultrawork.active, false);
      assert.strictEqual(ralph.active, false);
    });
  });

  describe('Fusion 상태 헬퍼', () => {
    test('getFusionState()가 기본값을 반환해야 함', () => {
      const state = getFusionState();

      assert.strictEqual(state.enabled, true);
      assert.strictEqual(state.mode, 'balanced');
      assert.strictEqual(state.totalTasks, 0);
    });
  });
});
