/**
 * context.mjs - 컨텍스트 내보내기 유틸리티
 *
 * 현재 작업 상태를 마크다운 형식으로 내보내기
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { execFileSync } from 'child_process';
import { join, basename } from 'path';
import { getUsageSummary, getUsageFromCache } from './usage.mjs';
import { loadConfig } from './config.mjs';

/**
 * 컨텍스트 내보내기
 * @param {string} projectDir - 프로젝트 디렉토리
 * @param {Object} options - 옵션
 * @returns {string} 컨텍스트 마크다운
 */
export function exportContext(projectDir, options = {}) {
  const config = loadConfig();
  const contextConfig = { ...config.context, ...options };

  const sections = [];

  // 헤더
  sections.push(`# 작업 핸드오프 컨텍스트

> Claude Code에서 OpenCode로 전환됨
> 생성 시간: ${new Date().toISOString()}

---`);

  // 세션 정보
  sections.push(`## 세션 정보

| 항목 | 값 |
|------|-----|
| 프로젝트 경로 | \`${projectDir}\` |
| 시간 | ${new Date().toISOString()} |
| 사용량 | ${getUsageSummary()} |

---`);

  // 현재 작업
  const currentTask = getCurrentTask(projectDir);
  sections.push(`## 현재 작업

${currentTask}

---`);

  // 미완료 TODO
  if (contextConfig.includeTodos) {
    const todos = getTodos(projectDir);
    sections.push(`## 미완료 TODO

${todos}

---`);
  }

  // 최근 수정 파일
  if (contextConfig.includeRecentFiles) {
    const recentFiles = getRecentFiles(projectDir, contextConfig.recentFilesLimit);
    sections.push(`## 최근 수정 파일

${recentFiles}

---`);
  }

  // 이전 결정 사항
  if (contextConfig.includeDecisions) {
    const decisions = getDecisions(projectDir);
    sections.push(`## 이전 결정 사항

${decisions}

---`);
  }

  // 다음 단계 지시
  sections.push(`## 다음 단계 지시

위의 컨텍스트를 바탕으로 작업을 이어서 진행해주세요.

1. 먼저 "미완료 TODO" 섹션의 항목들을 확인하세요
2. "최근 수정 파일"을 참고하여 작업 흐름을 파악하세요
3. "이전 결정 사항"을 존중하여 일관성을 유지하세요
`);

  let context = sections.join('\n\n');

  // 최대 길이 제한
  if (context.length > contextConfig.maxContextLength) {
    context = truncateContext(context, contextConfig.maxContextLength);
  }

  return context;
}

/**
 * 컨텍스트 파일로 저장
 * @param {string} projectDir - 프로젝트 디렉토리
 * @param {Object} options - 옵션
 * @returns {string} 저장된 파일 경로
 */
export function saveContext(projectDir, options = {}) {
  const context = exportContext(projectDir, options);
  const handoffDir = join(projectDir, '.omc/handoff');

  if (!existsSync(handoffDir)) {
    mkdirSync(handoffDir, { recursive: true });
  }

  const contextFile = join(handoffDir, 'context.md');
  writeFileSync(contextFile, context);

  // 마지막 핸드오프 기록 저장
  const usage = getUsageFromCache();
  const lastHandoff = {
    timestamp: new Date().toISOString(),
    project: projectDir,
    context_file: contextFile,
    usage: usage ? `5시간: ${usage.fiveHour}%, 주간: ${usage.weekly}%` : 'N/A',
  };
  writeFileSync(join(handoffDir, 'last-handoff.json'), JSON.stringify(lastHandoff, null, 2));

  return contextFile;
}

/**
 * 현재 작업 가져오기
 */
function getCurrentTask(projectDir) {
  const boulderFile = join(projectDir, '.omc/boulder.json');

  if (existsSync(boulderFile)) {
    try {
      const boulder = JSON.parse(readFileSync(boulderFile, 'utf-8'));
      return boulder.activePlanPath || boulder.currentTask || '알 수 없음';
    } catch (e) {
      // 무시
    }
  }

  return '알 수 없음';
}

/**
 * TODO 목록 가져오기
 */
function getTodos(projectDir) {
  // 1. boulder.json에서 활성 플랜 확인
  const boulderFile = join(projectDir, '.omc/boulder.json');
  if (existsSync(boulderFile)) {
    try {
      const boulder = JSON.parse(readFileSync(boulderFile, 'utf-8'));
      if (boulder.activePlanPath && existsSync(boulder.activePlanPath)) {
        const planContent = readFileSync(boulder.activePlanPath, 'utf-8');
        const todos = planContent.match(/^\s*-\s*\[\s*\].*/gm);
        if (todos && todos.length > 0) {
          return todos.slice(0, 20).join('\n');
        }
      }
    } catch (e) {
      // 무시
    }
  }

  // 2. TODO.md 파일 확인
  const todoFile = join(projectDir, 'TODO.md');
  if (existsSync(todoFile)) {
    const content = readFileSync(todoFile, 'utf-8');
    return content.slice(0, 2000);
  }

  return '(TODO 항목 없음)';
}

/**
 * 최근 수정 파일 가져오기 (안전한 execFileSync 사용)
 */
function getRecentFiles(projectDir, limit = 10) {
  try {
    // Git 저장소인 경우
    const isGit = existsSync(join(projectDir, '.git'));

    if (isGit) {
      let diffStat = '(변경 없음)';
      let status = '';

      try {
        // execFileSync 사용 (shell injection 방지)
        diffStat = execFileSync('git', ['diff', '--stat', 'HEAD~3..HEAD'], {
          cwd: projectDir,
          encoding: 'utf-8',
          timeout: 5000,
        }).trim() || '(변경 없음)';
      } catch (e) {
        diffStat = '(최근 커밋 없음)';
      }

      try {
        status = execFileSync('git', ['status', '--short'], {
          cwd: projectDir,
          encoding: 'utf-8',
          timeout: 5000,
        }).trim();
      } catch (e) {
        // 무시
      }

      let result = '### 최근 커밋 변경 파일\n```\n' + diffStat.slice(0, 1000) + '\n```\n';

      if (status) {
        result += '\n### 현재 변경 중인 파일\n```\n' + status.slice(0, 500) + '\n```';
      }

      return result;
    }
  } catch (e) {
    // Git 명령 실패
  }

  return '(Git 저장소가 아님)';
}

/**
 * 결정 사항 가져오기
 */
function getDecisions(projectDir) {
  const wisdomDir = join(projectDir, '.omc/notepads');

  if (!existsSync(wisdomDir)) {
    return '(결정 사항 없음)';
  }

  try {
    // 가장 최근 notepad 디렉토리 찾기
    const notepads = readdirSync(wisdomDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const notepad of notepads) {
      const decisionsFile = join(wisdomDir, notepad, 'decisions.md');
      if (existsSync(decisionsFile)) {
        const content = readFileSync(decisionsFile, 'utf-8');
        return content.slice(0, 2000);
      }
    }
  } catch (e) {
    // 무시
  }

  return '(결정 사항 없음)';
}

/**
 * 컨텍스트 길이 제한
 */
function truncateContext(context, maxLength) {
  if (context.length <= maxLength) return context;

  const header = `# 작업 핸드오프 (요약)

> 전체 컨텍스트가 ${context.length}자로 너무 길어 요약되었습니다.

---

`;

  const remaining = maxLength - header.length - 100;
  return header + context.slice(0, remaining) + '\n\n...(truncated)';
}
