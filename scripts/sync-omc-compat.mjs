#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CRITICAL_COMPAT_ITEMS,
  formatCheckReport,
  runCompatCheck
} from './check-omc-compat.mjs';

function uniqueSorted(items) {
  var deduped = [];

  for (var i = 0; i < items.length; i += 1) {
    if (deduped.indexOf(items[i]) === -1) {
      deduped.push(items[i]);
    }
  }

  deduped.sort();
  return deduped;
}

export function buildSyncPlan(checkResult, options) {
  var effectiveOptions = options || {};
  var includeCritical = true;

  if (effectiveOptions.includeCritical === false) {
    includeCritical = false;
  }

  var skillNames = checkResult.diff.skills.missing.slice();
  var commandNames = checkResult.diff.commands.missing.slice();
  var agentNames = checkResult.diff.agents.missing.slice();

  if (includeCritical) {
    for (var i = 0; i < CRITICAL_COMPAT_ITEMS.length; i += 1) {
      var critical = CRITICAL_COMPAT_ITEMS[i];
      if (skillNames.indexOf(critical) === -1) {
        skillNames.push(critical);
      }
      if (commandNames.indexOf(critical) === -1) {
        commandNames.push(critical);
      }
    }
  }

  skillNames = uniqueSorted(skillNames);
  commandNames = uniqueSorted(commandNames);
  agentNames = uniqueSorted(agentNames);

  var omcmRoot = checkResult.omcmDir;
  var plannedAgents = [];
  var plannedSkills = [];
  var plannedCommands = [];

  for (var a = 0; a < agentNames.length; a += 1) {
    var agentName = agentNames[a];
    var agentPath = join(omcmRoot, 'agents', agentName + '.md');

    plannedAgents.push({
      name: agentName,
      path: agentPath,
      exists: existsSync(agentPath)
    });
  }

  for (var s = 0; s < skillNames.length; s += 1) {
    var skillName = skillNames[s];
    var skillPath = join(omcmRoot, 'skills', skillName, 'SKILL.md');

    plannedSkills.push({
      name: skillName,
      path: skillPath,
      exists: existsSync(skillPath)
    });
  }

  for (var c = 0; c < commandNames.length; c += 1) {
    var commandName = commandNames[c];
    var commandPath = join(omcmRoot, 'commands', commandName + '.md');

    plannedCommands.push({
      name: commandName,
      path: commandPath,
      exists: existsSync(commandPath)
    });
  }

  return {
    agents: plannedAgents,
    skills: plannedSkills,
    commands: plannedCommands
  };
}

function renderAgentWrapper(name) {
  return [
    '---',
    'description: OMC v4.2.9 호환 에이전트 래퍼 - `' + name + '`',
    '---',
    '',
    '# OMC Compatibility Agent Wrapper: ' + name,
    '',
    '이 파일은 OMC v4.2.9의 에이전트 인벤토리와의 호환성을 위해 자동 생성되었습니다.',
    '',
    '- OMC 에이전트: `' + name + '`',
    '- OMCM 런타임 라우팅: `scripts/agent-mapping.json` + `mapAgentToOpenCode()`',
    '',
    '## 목적',
    '',
    '- 에이전트 누락 검수 리포트에서 false positive 방지',
    '- 레거시 문서/도구가 `agents/*.md` 인벤토리를 참조할 때 호환성 유지',
    '',
    '## 참고',
    '',
    '실제 실행 라우팅은 코드 레벨 매핑을 기준으로 동작합니다.',
    ''
  ].join('\n');
}

function renderSkillWrapper(name) {
  return [
    '---',
    'name: ' + name,
    'description: OMC v4.2.9 호환 래퍼 - legacy skill `' + name + '` 지원',
    '---',
    '',
    '# OMC Compatibility Skill Wrapper: ' + name,
    '',
    '이 스킬은 OMC v4.2.9의 `' + name + '` 호출과의 호환성을 위해 자동 생성되었습니다.',
    '',
    '- OMC 호출: `/oh-my-claudecode:' + name + '`',
    '- OMCM 호출: `/omcm:' + name + '`',
    '- 목적: 기존 워크플로우 마이그레이션 시 명령 단절 방지',
    '',
    '## 전달 인자',
    '',
    '요청에 포함된 인자를 유지한 채 현재 OMCM 컨텍스트에서 처리합니다.',
    '',
    '## 참고',
    '',
    '필요 시 `skills/' + name + '/SKILL.md` 내용을 프로젝트 맞춤형으로 확장하세요.',
    ''
  ].join('\n');
}

function renderCommandWrapper(name) {
  return [
    '---',
    'description: OMC v4.2.9 호환 래퍼 커맨드 - /omcm:' + name,
    'aliases: [compat-' + name + ']',
    '---',
    '',
    '# OMC Compatibility Command: ' + name,
    '',
    'OMC 레거시 커맨드/스킬 호출과의 호환성을 위한 래퍼입니다.',
    '',
    '- 원본: `/oh-my-claudecode:' + name + '`',
    '- 현재: `/omcm:' + name + '`',
    '',
    '입력 인자:',
    '',
    '{{ARGUMENTS}}',
    ''
  ].join('\n');
}

export function runCompatSync(options) {
  var effectiveOptions = options || {};
  var checkResult = runCompatCheck({
    sourceDir: effectiveOptions.sourceDir || '',
    omcmDir: effectiveOptions.omcmDir || '',
    strict: false
  });

  if (!checkResult.ok) {
    return {
      ok: false,
      exitCode: checkResult.exitCode,
      error: checkResult.error,
      checkResult: checkResult
    };
  }

  var plan = buildSyncPlan(checkResult, {
    includeCritical: true
  });

  var dryRun = effectiveOptions.dryRun === true;
  var overwrite = effectiveOptions.overwrite === true;

  var createdSkills = [];
  var createdCommands = [];
  var createdAgents = [];
  var skippedAgents = [];
  var skippedSkills = [];
  var skippedCommands = [];

  for (var a = 0; a < plan.agents.length; a += 1) {
    var agent = plan.agents[a];

    if (agent.exists && !overwrite) {
      skippedAgents.push(agent.name);
      continue;
    }

    if (!dryRun) {
      mkdirSync(join(checkResult.omcmDir, 'agents'), { recursive: true });
      writeFileSync(agent.path, renderAgentWrapper(agent.name), 'utf8');
    }

    createdAgents.push(agent.name);
  }

  for (var i = 0; i < plan.skills.length; i += 1) {
    var skill = plan.skills[i];

    if (skill.exists && !overwrite) {
      skippedSkills.push(skill.name);
      continue;
    }

    if (!dryRun) {
      mkdirSync(join(checkResult.omcmDir, 'skills', skill.name), { recursive: true });
      writeFileSync(skill.path, renderSkillWrapper(skill.name), 'utf8');
    }

    createdSkills.push(skill.name);
  }

  for (var j = 0; j < plan.commands.length; j += 1) {
    var command = plan.commands[j];

    if (command.exists && !overwrite) {
      skippedCommands.push(command.name);
      continue;
    }

    if (!dryRun) {
      mkdirSync(join(checkResult.omcmDir, 'commands'), { recursive: true });
      writeFileSync(command.path, renderCommandWrapper(command.name), 'utf8');
    }

    createdCommands.push(command.name);
  }

  return {
    ok: true,
    exitCode: 0,
    sourceDir: checkResult.sourceDir,
    omcmDir: checkResult.omcmDir,
    checkResult: checkResult,
    dryRun: dryRun,
    overwrite: overwrite,
    plan: plan,
    createdAgents: createdAgents,
    createdSkills: createdSkills,
    createdCommands: createdCommands,
    skippedAgents: skippedAgents,
    skippedSkills: skippedSkills,
    skippedCommands: skippedCommands
  };
}

export function formatSyncReport(result) {
  if (!result.ok) {
    return '[OMC COMPAT SYNC] 오류: ' + result.error;
  }

  var lines = [];
  lines.push('[OMC COMPAT SYNC] source: ' + result.sourceDir);
  lines.push('[OMC COMPAT SYNC] target: ' + result.omcmDir);
  lines.push('[OMC COMPAT SYNC] dry-run: ' + (result.dryRun ? 'ON' : 'OFF'));
  lines.push('[OMC COMPAT SYNC] created agents(' + result.createdAgents.length + '): ' + (result.createdAgents.length > 0 ? result.createdAgents.join(', ') : '없음'));
  lines.push('[OMC COMPAT SYNC] created skills(' + result.createdSkills.length + '): ' + (result.createdSkills.length > 0 ? result.createdSkills.join(', ') : '없음'));
  lines.push('[OMC COMPAT SYNC] created commands(' + result.createdCommands.length + '): ' + (result.createdCommands.length > 0 ? result.createdCommands.join(', ') : '없음'));
  lines.push('[OMC COMPAT SYNC] skipped agents(' + result.skippedAgents.length + '): ' + (result.skippedAgents.length > 0 ? result.skippedAgents.join(', ') : '없음'));
  lines.push('[OMC COMPAT SYNC] skipped skills(' + result.skippedSkills.length + '): ' + (result.skippedSkills.length > 0 ? result.skippedSkills.join(', ') : '없음'));
  lines.push('[OMC COMPAT SYNC] skipped commands(' + result.skippedCommands.length + '): ' + (result.skippedCommands.length > 0 ? result.skippedCommands.join(', ') : '없음'));

  return lines.join('\n');
}

function parseArgs(argv) {
  var options = {
    sourceDir: '',
    omcmDir: '',
    dryRun: false,
    overwrite: false,
    verboseCheck: false
  };

  for (var i = 0; i < argv.length; i += 1) {
    var current = argv[i];

    if (current === '--source') {
      if (i + 1 < argv.length) {
        options.sourceDir = argv[i + 1];
        i += 1;
      }
      continue;
    }

    if (current === '--omcm-dir') {
      if (i + 1 < argv.length) {
        options.omcmDir = argv[i + 1];
        i += 1;
      }
      continue;
    }

    if (current === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (current === '--overwrite') {
      options.overwrite = true;
      continue;
    }

    if (current === '--verbose-check') {
      options.verboseCheck = true;
      continue;
    }
  }

  return options;
}

function runFromCli() {
  var options = parseArgs(process.argv.slice(2));
  var result = runCompatSync(options);

  if (!result.ok) {
    console.error(formatSyncReport(result));
    process.exit(result.exitCode);
    return;
  }

  if (options.verboseCheck) {
    console.log(formatCheckReport(result.checkResult));
    console.log('');
  }

  console.log(formatSyncReport(result));
  process.exit(result.exitCode);
}

var currentFile = fileURLToPath(import.meta.url);
var argvFile = '';

if (process.argv.length > 1 && process.argv[1]) {
  argvFile = resolve(process.argv[1]);
}

if (currentFile === argvFile) {
  runFromCli();
}
