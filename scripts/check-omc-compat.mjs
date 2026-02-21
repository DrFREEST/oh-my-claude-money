#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export var CRITICAL_COMPAT_ITEMS = ['sciomc', 'omc-help', 'omc-doctor'];

function isDirectory(pathname) {
  try {
    return statSync(pathname).isDirectory();
  } catch (error) {
    return false;
  }
}

function listMarkdownBasenames(directoryPath) {
  if (!isDirectory(directoryPath)) {
    return [];
  }

  var names = readdirSync(directoryPath);
  var result = [];

  for (var i = 0; i < names.length; i += 1) {
    var fileName = names[i];
    if (extname(fileName) !== '.md') {
      continue;
    }
    result.push(basename(fileName, '.md'));
  }

  result.sort();
  return result;
}

function listSkillNames(rootPath) {
  var skillRoot = join(rootPath, 'skills');
  if (!isDirectory(skillRoot)) {
    return [];
  }

  var entries = readdirSync(skillRoot);
  var result = [];

  for (var i = 0; i < entries.length; i += 1) {
    var entryName = entries[i];
    var skillDir = join(skillRoot, entryName);
    var skillFile = join(skillDir, 'SKILL.md');

    if (!isDirectory(skillDir)) {
      continue;
    }

    if (!existsSync(skillFile)) {
      continue;
    }

    result.push(entryName);
  }

  result.sort();
  return result;
}

function listHookEvents(rootPath) {
  var hooksFile = join(rootPath, 'hooks', 'hooks.json');
  if (!existsSync(hooksFile)) {
    return [];
  }

  try {
    var parsed = JSON.parse(readFileSync(hooksFile, 'utf8'));
    var hooks = {};

    if (parsed && typeof parsed === 'object' && parsed.hooks && typeof parsed.hooks === 'object') {
      hooks = parsed.hooks;
    }

    var keys = Object.keys(hooks);
    keys.sort();
    return keys;
  } catch (error) {
    return [];
  }
}

function parseSemver(versionName) {
  var match = versionName.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    raw: versionName,
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}

function compareSemver(a, b) {
  if (a.major !== b.major) {
    return a.major - b.major;
  }
  if (a.minor !== b.minor) {
    return a.minor - b.minor;
  }
  return a.patch - b.patch;
}

function resolveLatestCacheDir(cacheRoot) {
  if (!isDirectory(cacheRoot)) {
    return '';
  }

  var entries = readdirSync(cacheRoot);
  var versions = [];

  for (var i = 0; i < entries.length; i += 1) {
    var entryName = entries[i];
    var fullPath = join(cacheRoot, entryName);

    if (!isDirectory(fullPath)) {
      continue;
    }

    var parsed = parseSemver(entryName);
    if (!parsed) {
      continue;
    }

    versions.push(parsed);
  }

  if (versions.length === 0) {
    return '';
  }

  versions.sort(compareSemver);
  var latest = versions[versions.length - 1];
  return join(cacheRoot, latest.raw);
}

export function isValidOmcSource(sourceDir) {
  if (!sourceDir) {
    return false;
  }

  var resolved = resolve(sourceDir);
  var skillsDir = join(resolved, 'skills');
  var hooksFile = join(resolved, 'hooks', 'hooks.json');

  return isDirectory(resolved) && isDirectory(skillsDir) && existsSync(hooksFile);
}

export function resolveOmcSource(explicitSource) {
  var candidates = [];

  if (explicitSource) {
    candidates.push(explicitSource);
  }

  if (process.env.OMC_COMPAT_SOURCE) {
    candidates.push(process.env.OMC_COMPAT_SOURCE);
  }

  candidates.push('/tmp/omc_430_clone');

  var userHome = homedir();
  candidates.push(join(userHome, '.claude', 'plugins', 'marketplaces', 'omc'));

  var latestCache = resolveLatestCacheDir(
    join(userHome, '.claude', 'plugins', 'cache', 'omc', 'oh-my-claudecode')
  );

  if (latestCache) {
    candidates.push(latestCache);
  }

  for (var i = 0; i < candidates.length; i += 1) {
    var candidate = resolve(candidates[i]);
    if (isValidOmcSource(candidate)) {
      return candidate;
    }
  }

  return '';
}

export function collectInventory(rootPath, options) {
  var resolved = resolve(rootPath);
  var agentNames = listMarkdownBasenames(join(resolved, 'agents'));
  var skillNames = listSkillNames(resolved);

  var commandNames = listMarkdownBasenames(join(resolved, 'commands'));
  var fallbackToSkills = false;

  if (options && options.commandFallbackToSkills === true) {
    fallbackToSkills = true;
  }

  if (fallbackToSkills && commandNames.length === 0) {
    commandNames = skillNames.slice();
  }

  var hookEvents = listHookEvents(resolved);

  return {
    rootDir: resolved,
    agents: agentNames,
    skills: skillNames,
    commands: commandNames,
    hookEvents: hookEvents
  };
}

function diffList(referenceList, targetList) {
  var missing = [];
  var extra = [];

  for (var i = 0; i < referenceList.length; i += 1) {
    var referenceItem = referenceList[i];
    if (targetList.indexOf(referenceItem) === -1) {
      missing.push(referenceItem);
    }
  }

  for (var j = 0; j < targetList.length; j += 1) {
    var targetItem = targetList[j];
    if (referenceList.indexOf(targetItem) === -1) {
      extra.push(targetItem);
    }
  }

  return {
    missing: missing,
    extra: extra,
    referenceCount: referenceList.length,
    targetCount: targetList.length
  };
}

export function diffInventories(referenceInventory, targetInventory) {
  return {
    agents: diffList(referenceInventory.agents, targetInventory.agents),
    skills: diffList(referenceInventory.skills, targetInventory.skills),
    commands: diffList(referenceInventory.commands, targetInventory.commands),
    hookEvents: diffList(referenceInventory.hookEvents, targetInventory.hookEvents)
  };
}

export function summarizeDiff(diff) {
  var categories = ['agents', 'skills', 'commands', 'hookEvents'];
  var totalMissing = 0;
  var summary = {};

  for (var i = 0; i < categories.length; i += 1) {
    var category = categories[i];
    var details = diff[category];
    var missingCount = details.missing.length;

    totalMissing += missingCount;

    summary[category] = {
      referenceCount: details.referenceCount,
      targetCount: details.targetCount,
      missingCount: missingCount
    };
  }

  return {
    totalMissing: totalMissing,
    categories: summary
  };
}

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

export function collectCriticalMissing(diff) {
  var missing = [];

  for (var i = 0; i < CRITICAL_COMPAT_ITEMS.length; i += 1) {
    var name = CRITICAL_COMPAT_ITEMS[i];

    if (diff.skills.missing.indexOf(name) !== -1) {
      missing.push('skill:' + name);
    }

    if (diff.commands.missing.indexOf(name) !== -1) {
      missing.push('command:' + name);
    }
  }

  return uniqueSorted(missing);
}

export function runCompatCheck(options) {
  var effectiveOptions = options || {};
  var sourceDir = resolveOmcSource(effectiveOptions.sourceDir || '');

  if (!sourceDir) {
    return {
      ok: false,
      exitCode: 2,
      error: 'OMC 소스를 찾을 수 없습니다. --source 또는 OMC_COMPAT_SOURCE를 지정하세요.'
    };
  }

  var omcmDir = effectiveOptions.omcmDir ? resolve(effectiveOptions.omcmDir) : process.cwd();

  var referenceInventory = collectInventory(sourceDir, {
    commandFallbackToSkills: true
  });

  var targetInventory = collectInventory(omcmDir, {
    commandFallbackToSkills: false
  });

  var diff = diffInventories(referenceInventory, targetInventory);
  var summary = summarizeDiff(diff);
  var criticalMissing = collectCriticalMissing(diff);

  var strictMode = effectiveOptions.strict === true;
  var exitCode = 0;

  if (strictMode && summary.totalMissing > 0) {
    exitCode = 1;
  }

  return {
    ok: true,
    exitCode: exitCode,
    strict: strictMode,
    sourceDir: sourceDir,
    omcmDir: omcmDir,
    reference: referenceInventory,
    target: targetInventory,
    diff: diff,
    summary: summary,
    criticalMissing: criticalMissing
  };
}

function formatCategoryLine(label, details) {
  return '- ' + label + ': OMC ' + details.referenceCount + ' / OMCM ' + details.targetCount + ' / 누락 ' + details.missingCount;
}

function formatMissingList(label, values) {
  if (values.length === 0) {
    return '  · ' + label + ': 없음';
  }

  return '  · ' + label + ': ' + values.join(', ');
}

export function formatCheckReport(result) {
  if (!result.ok) {
    return '[OMC COMPAT] 오류: ' + result.error;
  }

  var lines = [];
  lines.push('[OMC COMPAT] 소스: ' + result.sourceDir);
  lines.push('[OMC COMPAT] 대상: ' + result.omcmDir);
  lines.push(formatCategoryLine('agents', result.summary.categories.agents));
  lines.push(formatMissingList('missing agents', result.diff.agents.missing));
  lines.push(formatCategoryLine('skills', result.summary.categories.skills));
  lines.push(formatMissingList('missing skills', result.diff.skills.missing));
  lines.push(formatCategoryLine('commands', result.summary.categories.commands));
  lines.push(formatMissingList('missing commands', result.diff.commands.missing));
  lines.push(formatCategoryLine('hookEvents', result.summary.categories.hookEvents));
  lines.push(formatMissingList('missing hookEvents', result.diff.hookEvents.missing));

  if (result.criticalMissing.length > 0) {
    lines.push('  · critical missing: ' + result.criticalMissing.join(', '));
  }

  lines.push('[OMC COMPAT] total missing: ' + result.summary.totalMissing);
  lines.push('[OMC COMPAT] strict mode: ' + (result.strict ? 'ON' : 'OFF') + ' / exitCode=' + result.exitCode);

  return lines.join('\n');
}

export function parseArgs(argv) {
  var options = {
    strict: false,
    sourceDir: '',
    omcmDir: '',
    json: false,
    silent: false
  };

  for (var i = 0; i < argv.length; i += 1) {
    var current = argv[i];

    if (current === '--strict') {
      options.strict = true;
      continue;
    }

    if (current === '--json') {
      options.json = true;
      continue;
    }

    if (current === '--silent') {
      options.silent = true;
      continue;
    }

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
  }

  return options;
}

function runFromCli() {
  var options = parseArgs(process.argv.slice(2));
  var result = runCompatCheck(options);

  if (!options.silent) {
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(formatCheckReport(result));
    }
  }

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
