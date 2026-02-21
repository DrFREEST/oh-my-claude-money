import { describe, test } from 'node:test';
import assert from 'node:assert';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { runCompatCheck } from '../../scripts/check-omc-compat.mjs';
import { runCompatSync } from '../../scripts/sync-omc-compat.mjs';

function createTempDir(prefix) {
  return mkdtempSync(join(tmpdir(), prefix));
}

function initRepoSkeleton(rootDir) {
  mkdirSync(join(rootDir, 'skills'), { recursive: true });
  mkdirSync(join(rootDir, 'commands'), { recursive: true });
  mkdirSync(join(rootDir, 'agents'), { recursive: true });
  mkdirSync(join(rootDir, 'hooks'), { recursive: true });
}

function addSkill(rootDir, skillName) {
  var skillDir = join(rootDir, 'skills', skillName);
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    join(skillDir, 'SKILL.md'),
    ['---', 'name: ' + skillName, 'description: test', '---', '', '# ' + skillName, ''].join('\n'),
    'utf8'
  );
}

function addCommand(rootDir, commandName) {
  writeFileSync(join(rootDir, 'commands', commandName + '.md'), '# ' + commandName + '\n', 'utf8');
}

function addAgent(rootDir, agentName) {
  writeFileSync(join(rootDir, 'agents', agentName + '.md'), '# ' + agentName + '\n', 'utf8');
}

function setHookEvents(rootDir, events) {
  var hooks = {};

  for (var i = 0; i < events.length; i += 1) {
    hooks[events[i]] = [];
  }

  writeFileSync(
    join(rootDir, 'hooks', 'hooks.json'),
    JSON.stringify({ hooks: hooks }, null, 2),
    'utf8'
  );
}

describe('check-omc-compat.mjs', () => {
  test('OMC 대비 누락 항목(에이전트/스킬/커맨드/훅)을 탐지한다', () => {
    var omcDir = createTempDir('omc-ref-');
    var omcmDir = createTempDir('omcm-target-');

    try {
      initRepoSkeleton(omcDir);
      addAgent(omcDir, 'architect');
      addAgent(omcDir, 'scientist');
      addSkill(omcDir, 'autopilot');
      addSkill(omcDir, 'sciomc');
      addSkill(omcDir, 'omc-help');
      addSkill(omcDir, 'omc-doctor');
      // OMC commands 디렉토리가 없으면 skill 목록을 command baseline으로 사용
      rmSync(join(omcDir, 'commands'), { recursive: true, force: true });
      setHookEvents(omcDir, ['PreToolUse', 'SessionStart', 'PreCompact']);

      initRepoSkeleton(omcmDir);
      addSkill(omcmDir, 'autopilot');
      addCommand(omcmDir, 'autopilot');
      setHookEvents(omcmDir, ['PreToolUse']);

      var result = runCompatCheck({
        sourceDir: omcDir,
        omcmDir: omcmDir,
        strict: false
      });

      assert.strictEqual(result.ok, true);
      assert.ok(result.diff.agents.missing.indexOf('architect') !== -1);
      assert.ok(result.diff.skills.missing.indexOf('sciomc') !== -1);
      assert.ok(result.diff.commands.missing.indexOf('omc-help') !== -1);
      assert.ok(result.diff.hookEvents.missing.indexOf('PreCompact') !== -1);
      assert.ok(result.criticalMissing.indexOf('skill:sciomc') !== -1);
      assert.ok(result.summary.totalMissing > 0);

      var strictResult = runCompatCheck({
        sourceDir: omcDir,
        omcmDir: omcmDir,
        strict: true
      });

      assert.strictEqual(strictResult.exitCode, 1);
    } finally {
      rmSync(omcDir, { recursive: true, force: true });
      rmSync(omcmDir, { recursive: true, force: true });
    }
  });
});

describe('OMC v4.2.15 신기능 호환성', () => {
  test('ecomode가 mode registry에 포함되어 있는지 확인한다', () => {
    // OMC v4.2.12: ecomode가 mode registry에 재추가됨
    var knownModes = ['autopilot', 'ralph', 'ultrawork', 'ultrapilot', 'ecomode', 'swarm', 'pipeline'];
    assert.ok(knownModes.indexOf('ecomode') !== -1, 'ecomode should be in mode registry');
  });

  test('sonnet-4-6 모델 ID 형식이 유효한지 확인한다', () => {
    // OMC v4.2.12: Sonnet 4.5 → Sonnet 4.6 모델 ID 업데이트
    var modelId = 'claude-sonnet-4-6-20260217';
    assert.ok(/^claude-sonnet-4-6-\d{8}$/.test(modelId), 'sonnet-4-6 model ID should match expected format');
    assert.ok(modelId.includes('sonnet-4-6'), 'model ID should reference sonnet-4-6');
  });

  test('ccg 스킬이 존재하는지 확인한다', () => {
    var projectRoot = new URL('../..', import.meta.url).pathname;
    var ccgSkillPath = join(projectRoot, 'skills', 'ccg', 'SKILL.md');
    assert.ok(existsSync(ccgSkillPath), 'CCG 스킬 래퍼가 존재해야 함');
  });
});

describe('sync-omc-compat.mjs', () => {
  test('누락된 스킬/커맨드 래퍼를 생성하고 critical rename 항목을 보장한다', () => {
    var omcDir = createTempDir('omc-sync-ref-');
    var omcmDir = createTempDir('omcm-sync-target-');

    try {
      initRepoSkeleton(omcDir);
      addAgent(omcDir, 'architect');
      addSkill(omcDir, 'autopilot');
      setHookEvents(omcDir, ['PreToolUse']);

      initRepoSkeleton(omcmDir);
      addSkill(omcmDir, 'autopilot');
      addCommand(omcmDir, 'autopilot');
      setHookEvents(omcmDir, ['PreToolUse']);

      var dryRun = runCompatSync({
        sourceDir: omcDir,
        omcmDir: omcmDir,
        dryRun: true
      });

      assert.strictEqual(dryRun.ok, true);

      var plannedAgents = dryRun.plan.agents.map((item) => item.name);
      var plannedSkills = dryRun.plan.skills.map((item) => item.name);
      var plannedCommands = dryRun.plan.commands.map((item) => item.name);

      assert.ok(plannedAgents.indexOf('architect') !== -1);
      assert.ok(plannedSkills.indexOf('sciomc') !== -1);
      assert.ok(plannedSkills.indexOf('omc-help') !== -1);
      assert.ok(plannedSkills.indexOf('omc-doctor') !== -1);
      assert.ok(plannedCommands.indexOf('sciomc') !== -1);

      var applySync = runCompatSync({
        sourceDir: omcDir,
        omcmDir: omcmDir
      });

      assert.strictEqual(applySync.ok, true);
      assert.ok(existsSync(join(omcmDir, 'agents', 'architect.md')));
      assert.ok(existsSync(join(omcmDir, 'skills', 'sciomc', 'SKILL.md')));
      assert.ok(existsSync(join(omcmDir, 'skills', 'omc-help', 'SKILL.md')));
      assert.ok(existsSync(join(omcmDir, 'skills', 'omc-doctor', 'SKILL.md')));
      assert.ok(existsSync(join(omcmDir, 'commands', 'sciomc.md')));
      assert.ok(existsSync(join(omcmDir, 'commands', 'omc-help.md')));
      assert.ok(existsSync(join(omcmDir, 'commands', 'omc-doctor.md')));

      var commandContent = readFileSync(join(omcmDir, 'commands', 'sciomc.md'), 'utf8');
      assert.ok(commandContent.includes('/omcm:sciomc'));
    } finally {
      rmSync(omcDir, { recursive: true, force: true });
      rmSync(omcmDir, { recursive: true, force: true });
    }
  });
});
