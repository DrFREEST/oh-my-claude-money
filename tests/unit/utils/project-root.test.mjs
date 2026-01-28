/**
 * project-root.test.mjs - 프로젝트 루트 탐지 테스트
 */

import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { join } from 'node:path';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';

// 테스트할 모듈
import {
  findProjectRootSync,
  getStateDir,
  getStatePath,
  getProjectInfo,
  PROJECT_MARKERS
} from '../../../src/utils/project-root.mjs';

describe('project-root 유틸리티', () => {
  const testDir = join(tmpdir(), 'omcm-test-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  const subDir = join(testDir, 'src', 'components');

  beforeEach(() => {
    // 테스트 디렉토리 생성
    mkdirSync(subDir, { recursive: true });
  });

  afterEach(() => {
    // 테스트 디렉토리 정리
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('findProjectRootSync()', () => {
    test('Git 루트(.git)를 탐지해야 함', () => {
      mkdirSync(join(testDir, '.git'), { recursive: true });

      const result = findProjectRootSync(subDir);

      assert.strictEqual(result.root, testDir);
      assert.strictEqual(result.method, 'git');
      assert.strictEqual(result.isGlobal, false);
    });

    test('package.json으로 프로젝트 루트를 탐지해야 함', () => {
      writeFileSync(join(testDir, 'package.json'), '{}');

      const result = findProjectRootSync(subDir);

      assert.strictEqual(result.root, testDir);
      assert.strictEqual(result.method, 'marker:package.json');
      assert.strictEqual(result.isGlobal, false);
    });

    test('Cargo.toml으로 Rust 프로젝트 루트를 탐지해야 함', () => {
      writeFileSync(join(testDir, 'Cargo.toml'), '[package]');

      const result = findProjectRootSync(subDir);

      assert.strictEqual(result.root, testDir);
      assert.strictEqual(result.method, 'marker:Cargo.toml');
    });

    test('go.mod로 Go 프로젝트 루트를 탐지해야 함', () => {
      writeFileSync(join(testDir, 'go.mod'), 'module example');

      const result = findProjectRootSync(subDir);

      assert.strictEqual(result.root, testDir);
      assert.strictEqual(result.method, 'marker:go.mod');
    });

    test('pyproject.toml로 Python 프로젝트 루트를 탐지해야 함', () => {
      writeFileSync(join(testDir, 'pyproject.toml'), '[project]');

      const result = findProjectRootSync(subDir);

      assert.strictEqual(result.root, testDir);
      assert.strictEqual(result.method, 'marker:pyproject.toml');
    });

    test('CLAUDE.md로 Claude 프로젝트 루트를 탐지해야 함', () => {
      writeFileSync(join(testDir, 'CLAUDE.md'), '# Claude');

      const result = findProjectRootSync(subDir);

      assert.strictEqual(result.root, testDir);
      assert.strictEqual(result.method, 'marker:CLAUDE.md');
    });

    test('마커가 없으면 글로벌 fallback을 사용해야 함', () => {
      const result = findProjectRootSync(subDir);

      assert.strictEqual(result.root, join(homedir(), '.omcm'));
      assert.strictEqual(result.method, 'global');
      assert.strictEqual(result.isGlobal, true);
    });

    test('useGlobal: false면 시작 디렉토리를 반환해야 함', () => {
      const result = findProjectRootSync(subDir, { useGlobal: false });

      assert.strictEqual(result.root, subDir);
      assert.strictEqual(result.method, 'cwd');
      assert.strictEqual(result.isGlobal, false);
    });

    test('Git이 다른 마커보다 우선해야 함', () => {
      mkdirSync(join(testDir, '.git'), { recursive: true });
      writeFileSync(join(testDir, 'package.json'), '{}');

      const result = findProjectRootSync(subDir);

      assert.strictEqual(result.method, 'git');
    });
  });

  describe('getStateDir()', () => {
    test('프로젝트 루트가 있으면 .omcm/state/ 경로를 반환해야 함', () => {
      writeFileSync(join(testDir, 'package.json'), '{}');

      const stateDir = getStateDir(subDir);

      assert.strictEqual(stateDir, join(testDir, '.omcm', 'state'));
    });

    test('프로젝트 루트가 없으면 글로벌 상태 경로를 반환해야 함', () => {
      const stateDir = getStateDir(subDir);

      assert.strictEqual(stateDir, join(homedir(), '.omcm', 'state'));
    });
  });

  describe('getStatePath()', () => {
    test('상태 파일 전체 경로를 반환해야 함', () => {
      writeFileSync(join(testDir, 'package.json'), '{}');

      const statePath = getStatePath('ultrawork-state.json', subDir);

      assert.strictEqual(statePath, join(testDir, '.omcm', 'state', 'ultrawork-state.json'));
    });
  });

  describe('getProjectInfo()', () => {
    test('프로젝트 정보를 반환해야 함', () => {
      writeFileSync(join(testDir, 'package.json'), '{}');

      const info = getProjectInfo(subDir);

      assert.strictEqual(info.root, testDir);
      assert.strictEqual(info.method, 'marker:package.json');
      assert.strictEqual(info.isGlobal, false);
      assert.strictEqual(info.stateDir, join(testDir, '.omcm', 'state'));
      assert.strictEqual(info.startDir, subDir);
      assert.strictEqual(info.home, homedir());
    });
  });

  describe('PROJECT_MARKERS', () => {
    test('필수 마커들이 포함되어 있어야 함', () => {
      assert.ok(PROJECT_MARKERS.includes('.git'));
      assert.ok(PROJECT_MARKERS.includes('package.json'));
      assert.ok(PROJECT_MARKERS.includes('Cargo.toml'));
      assert.ok(PROJECT_MARKERS.includes('go.mod'));
      assert.ok(PROJECT_MARKERS.includes('CLAUDE.md'));
    });
  });
});
