/**
 * context-builder.mjs - 세션 컨텍스트 수집기
 *
 * 현재 세션 상태를 수집하여 구조화된 컨텍스트 객체 생성
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, basename } from 'path';
import { execFileSync } from 'child_process';

/**
 * 세션 컨텍스트 빌드
 * @param {Object} session - 세션 정보 객체
 * @param {string} session.sessionId - 세션 ID
 * @param {string} session.projectPath - 프로젝트 경로
 * @param {string} session.startTime - 세션 시작 시간
 * @param {Object} session.claudeUsage - Claude 사용량 정보
 * @param {Object} session.task - 현재 작업 정보
 * @returns {Object} 구조화된 컨텍스트 객체
 */
export function buildContext(session) {
  if (!session) {
    session = {};
  }

  const projectPath = session.projectPath || process.cwd();
  const sessionId = session.sessionId || 'unknown';
  const startTime = session.startTime || new Date().toISOString();
  const claudeUsage = session.claudeUsage || null;

  // 작업 정보 수집
  const taskInfo = extractTaskInfo(session.task, projectPath);

  // 파일 정보 수집
  const filesInfo = {
    modified: getRecentModifiedFiles(10, projectPath),
    referenced: getReferencedFiles(projectPath)
  };

  // TODO 정보 수집
  const todosInfo = {
    pending: getTodosByStatus('pending', projectPath),
    inProgress: getTodosByStatus('in_progress', projectPath),
    completed: getTodosByStatus('completed', projectPath)
  };

  // 결정 및 학습 사항 수집
  const decisionsInfo = {
    recent: getRecentDecisions(10, projectPath),
    learnings: getSessionLearnings(projectPath)
  };

  // 메타 정보
  const metaInfo = {
    sessionId: sessionId,
    startTime: startTime,
    claudeUsage: formatClaudeUsage(claudeUsage),
    projectPath: projectPath,
    buildTime: new Date().toISOString()
  };

  return {
    task: taskInfo,
    files: filesInfo,
    todos: todosInfo,
    decisions: decisionsInfo,
    meta: metaInfo
  };
}

/**
 * 작업 정보 추출
 * @param {Object} task - 작업 객체
 * @param {string} projectPath - 프로젝트 경로
 * @returns {Object} 작업 정보
 */
function extractTaskInfo(task, projectPath) {
  const defaultTask = {
    description: null,
    goal: null,
    constraints: []
  };

  if (task) {
    return {
      description: task.description || defaultTask.description,
      goal: task.goal || defaultTask.goal,
      constraints: task.constraints || defaultTask.constraints
    };
  }

  // boulder.json에서 작업 정보 추출 시도
  const boulderFile = join(projectPath, '.omcm', 'boulder.json');
  if (existsSync(boulderFile)) {
    try {
      const boulder = JSON.parse(readFileSync(boulderFile, 'utf-8'));
      return {
        description: boulder.currentTask || boulder.activePlanPath || null,
        goal: boulder.goal || null,
        constraints: boulder.constraints || []
      };
    } catch (e) {
      // 파싱 실패 시 기본값 반환
    }
  }

  return defaultTask;
}

/**
 * 최근 수정된 파일 목록 가져오기
 * @param {number} limit - 최대 파일 수
 * @param {string} projectPath - 프로젝트 경로 (옵션)
 * @returns {Array<Object>} 파일 정보 배열
 */
export function getRecentModifiedFiles(limit, projectPath) {
  if (typeof limit !== 'number') {
    limit = 10;
  }
  if (!projectPath) {
    projectPath = process.cwd();
  }

  const files = [];

  // Git 저장소인 경우 git diff 사용
  const gitDir = join(projectPath, '.git');
  if (existsSync(gitDir)) {
    try {
      // 최근 수정된 파일 (staged + unstaged)
      const statusOutput = execFileSync('git', ['status', '--porcelain'], {
        cwd: projectPath,
        encoding: 'utf-8',
        timeout: 5000
      }).trim();

      if (statusOutput) {
        const lines = statusOutput.split('\n');
        for (let i = 0; i < lines.length && files.length < limit; i++) {
          const line = lines[i];
          if (line.length > 3) {
            const status = line.substring(0, 2).trim();
            const filepath = line.substring(3).trim();
            files.push({
              path: filepath,
              status: mapGitStatus(status),
              source: 'git-status'
            });
          }
        }
      }

      // 최근 커밋에서 수정된 파일
      if (files.length < limit) {
        try {
          const logOutput = execFileSync('git', ['log', '--name-only', '--pretty=format:', '-n', '3'], {
            cwd: projectPath,
            encoding: 'utf-8',
            timeout: 5000
          }).trim();

          if (logOutput) {
            const logFiles = logOutput.split('\n').filter(function(f) {
              return f.trim().length > 0;
            });
            const seen = {};
            for (let i = 0; i < files.length; i++) {
              seen[files[i].path] = true;
            }
            for (let j = 0; j < logFiles.length && files.length < limit; j++) {
              const f = logFiles[j].trim();
              if (!seen[f]) {
                seen[f] = true;
                files.push({
                  path: f,
                  status: 'committed',
                  source: 'git-log'
                });
              }
            }
          }
        } catch (e) {
          // 로그 가져오기 실패 무시
        }
      }
    } catch (e) {
      // Git 명령 실패 시 파일 시스템 폴백
    }
  }

  // Git이 없거나 결과가 부족한 경우 파일 시스템 탐색
  if (files.length < limit) {
    const fsFiles = getRecentFilesFromFS(projectPath, limit - files.length);
    const existingPaths = {};
    for (let k = 0; k < files.length; k++) {
      existingPaths[files[k].path] = true;
    }
    for (let l = 0; l < fsFiles.length; l++) {
      if (!existingPaths[fsFiles[l].path]) {
        files.push(fsFiles[l]);
      }
    }
  }

  return files.slice(0, limit);
}

/**
 * 파일 시스템에서 최근 수정 파일 가져오기
 * @param {string} dir - 디렉토리 경로
 * @param {number} limit - 최대 파일 수
 * @returns {Array<Object>} 파일 정보 배열
 */
function getRecentFilesFromFS(dir, limit) {
  const results = [];
  const excludeDirs = ['.git', 'node_modules', '.omcm', 'dist', 'build', '__pycache__'];

  function walk(currentDir, depth) {
    if (depth > 3) return; // 깊이 제한

    try {
      const entries = readdirSync(currentDir, { withFileTypes: true });
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const fullPath = join(currentDir, entry.name);
        const relativePath = fullPath.replace(dir + '/', '');

        if (entry.isDirectory()) {
          if (excludeDirs.indexOf(entry.name) === -1) {
            walk(fullPath, depth + 1);
          }
        } else {
          try {
            const stat = statSync(fullPath);
            results.push({
              path: relativePath,
              mtime: stat.mtimeMs,
              status: 'filesystem',
              source: 'fs'
            });
          } catch (e) {
            // stat 실패 무시
          }
        }
      }
    } catch (e) {
      // 디렉토리 읽기 실패 무시
    }
  }

  walk(dir, 0);

  // 수정 시간 기준 정렬
  results.sort(function(a, b) {
    return b.mtime - a.mtime;
  });

  // mtime 제거하고 반환
  const trimmed = [];
  for (let i = 0; i < results.length && i < limit; i++) {
    trimmed.push({
      path: results[i].path,
      status: results[i].status,
      source: results[i].source
    });
  }
  return trimmed;
}

/**
 * Git 상태 코드 매핑
 * @param {string} code - Git 상태 코드
 * @returns {string} 읽기 쉬운 상태
 */
function mapGitStatus(code) {
  const map = {
    'M': 'modified',
    'A': 'added',
    'D': 'deleted',
    'R': 'renamed',
    'C': 'copied',
    'U': 'unmerged',
    '?': 'untracked'
  };
  return map[code] || 'changed';
}

/**
 * 참조된 파일 목록 가져오기 (최근 읽은/열린 파일)
 * @param {string} projectPath - 프로젝트 경로 (옵션)
 * @returns {Array<string>} 파일 경로 배열
 */
export function getReferencedFiles(projectPath) {
  if (!projectPath) {
    projectPath = process.cwd();
  }

  const references = [];

  // .omc/state에서 참조 파일 정보 확인
  const stateDir = join(projectPath, '.omc', 'state');
  const referencesFile = join(stateDir, 'referenced-files.json');

  if (existsSync(referencesFile)) {
    try {
      const data = JSON.parse(readFileSync(referencesFile, 'utf-8'));
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          references.push(data[i]);
        }
      } else if (data.files && Array.isArray(data.files)) {
        for (let i = 0; i < data.files.length; i++) {
          references.push(data.files[i]);
        }
      }
    } catch (e) {
      // 파싱 실패 무시
    }
  }

  // .omcm/session에서도 확인
  const omcmSessionFile = join(projectPath, '.omcm', 'session', 'references.json');
  if (existsSync(omcmSessionFile)) {
    try {
      const data = JSON.parse(readFileSync(omcmSessionFile, 'utf-8'));
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          if (references.indexOf(data[i]) === -1) {
            references.push(data[i]);
          }
        }
      }
    } catch (e) {
      // 파싱 실패 무시
    }
  }

  return references;
}

/**
 * 상태별 TODO 목록 가져오기
 * @param {string} status - TODO 상태 ('pending', 'in_progress', 'completed')
 * @param {string} projectPath - 프로젝트 경로 (옵션)
 * @returns {Array<Object>} TODO 항목 배열
 */
export function getTodosByStatus(status, projectPath) {
  if (!projectPath) {
    projectPath = process.cwd();
  }

  const todos = [];
  const validStatuses = ['pending', 'in_progress', 'completed'];

  if (validStatuses.indexOf(status) === -1) {
    return todos;
  }

  // .omc/todos.json 확인
  const todoFile = join(projectPath, '.omc', 'todos.json');
  if (existsSync(todoFile)) {
    try {
      const data = JSON.parse(readFileSync(todoFile, 'utf-8'));
      const items = Array.isArray(data) ? data : (data.todos || []);
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.status === status) {
          todos.push({
            id: item.id || i,
            content: item.content || item.subject || '',
            priority: item.priority || 'medium',
            status: item.status
          });
        }
      }
    } catch (e) {
      // 파싱 실패 무시
    }
  }

  // boulder.json의 activePlanPath에서 TODO 추출
  const boulderFile = join(projectPath, '.omcm', 'boulder.json');
  if (existsSync(boulderFile)) {
    try {
      const boulder = JSON.parse(readFileSync(boulderFile, 'utf-8'));
      if (boulder.activePlanPath && existsSync(boulder.activePlanPath)) {
        const planContent = readFileSync(boulder.activePlanPath, 'utf-8');
        const todoPattern = status === 'completed'
          ? /^\s*-\s*\[x\]\s*(.+)$/gm
          : status === 'in_progress'
          ? /^\s*-\s*\[~\]\s*(.+)$/gm
          : /^\s*-\s*\[\s*\]\s*(.+)$/gm;

        let match;
        while ((match = todoPattern.exec(planContent)) !== null) {
          todos.push({
            id: 'plan-' + todos.length,
            content: match[1].trim(),
            priority: 'medium',
            status: status,
            source: 'plan'
          });
        }
      }
    } catch (e) {
      // 파싱 실패 무시
    }
  }

  return todos;
}

/**
 * 최근 결정 사항 가져오기
 * @param {number} limit - 최대 항목 수
 * @param {string} projectPath - 프로젝트 경로 (옵션)
 * @returns {Array<Object>} 결정 사항 배열
 */
export function getRecentDecisions(limit, projectPath) {
  if (typeof limit !== 'number') {
    limit = 10;
  }
  if (!projectPath) {
    projectPath = process.cwd();
  }

  const decisions = [];

  // .omcm/notepads에서 decisions.md 파일 검색
  const notepadsDir = join(projectPath, '.omcm', 'notepads');
  if (existsSync(notepadsDir)) {
    try {
      const notepads = readdirSync(notepadsDir, { withFileTypes: true });
      for (let i = 0; i < notepads.length && decisions.length < limit; i++) {
        const notepad = notepads[i];
        if (notepad.isDirectory()) {
          const decisionsFile = join(notepadsDir, notepad.name, 'decisions.md');
          if (existsSync(decisionsFile)) {
            try {
              const content = readFileSync(decisionsFile, 'utf-8');
              const parsed = parseDecisionsFile(content);
              for (let j = 0; j < parsed.length && decisions.length < limit; j++) {
                parsed[j].source = notepad.name;
                decisions.push(parsed[j]);
              }
            } catch (e) {
              // 파일 읽기 실패 무시
            }
          }
        }
      }
    } catch (e) {
      // 디렉토리 읽기 실패 무시
    }
  }

  return decisions.slice(0, limit);
}

/**
 * decisions.md 파일 파싱
 * @param {string} content - 파일 내용
 * @returns {Array<Object>} 결정 사항 배열
 */
function parseDecisionsFile(content) {
  const decisions = [];
  const lines = content.split('\n');
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // ## 또는 ### 헤더로 시작하는 결정 사항
    if (line.indexOf('## ') === 0 || line.indexOf('### ') === 0) {
      if (current) {
        decisions.push(current);
      }
      const title = line.replace(/^#+\s*/, '').trim();
      current = {
        title: title,
        description: '',
        timestamp: null
      };
    } else if (current && line.trim().length > 0) {
      // 타임스탬프 패턴 검색
      const timestampMatch = line.match(/\d{4}-\d{2}-\d{2}/);
      if (timestampMatch) {
        current.timestamp = timestampMatch[0];
      }
      current.description += line.trim() + ' ';
    }
  }

  if (current) {
    decisions.push(current);
  }

  // description 정리
  for (let i = 0; i < decisions.length; i++) {
    decisions[i].description = decisions[i].description.trim();
  }

  return decisions;
}

/**
 * 세션 학습 사항 가져오기
 * @param {string} projectPath - 프로젝트 경로 (옵션)
 * @returns {Array<Object>} 학습 사항 배열
 */
export function getSessionLearnings(projectPath) {
  if (!projectPath) {
    projectPath = process.cwd();
  }

  const learnings = [];

  // .omcm/notepads에서 learnings.md 파일 검색
  const notepadsDir = join(projectPath, '.omcm', 'notepads');
  if (existsSync(notepadsDir)) {
    try {
      const notepads = readdirSync(notepadsDir, { withFileTypes: true });
      for (let i = 0; i < notepads.length; i++) {
        const notepad = notepads[i];
        if (notepad.isDirectory()) {
          const learningsFile = join(notepadsDir, notepad.name, 'learnings.md');
          if (existsSync(learningsFile)) {
            try {
              const content = readFileSync(learningsFile, 'utf-8');
              const parsed = parseLearningsFile(content);
              for (let j = 0; j < parsed.length; j++) {
                parsed[j].source = notepad.name;
                learnings.push(parsed[j]);
              }
            } catch (e) {
              // 파일 읽기 실패 무시
            }
          }
        }
      }
    } catch (e) {
      // 디렉토리 읽기 실패 무시
    }
  }

  return learnings;
}

/**
 * learnings.md 파일 파싱
 * @param {string} content - 파일 내용
 * @returns {Array<Object>} 학습 사항 배열
 */
function parseLearningsFile(content) {
  const learnings = [];
  const lines = content.split('\n');
  let current = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // - 로 시작하는 항목
    if (line.indexOf('- ') === 0) {
      if (current) {
        learnings.push(current);
      }
      current = {
        content: line.substring(2).trim(),
        category: 'general'
      };
    } else if (line.indexOf('## ') === 0 || line.indexOf('### ') === 0) {
      // 카테고리 헤더
      if (current) {
        learnings.push(current);
        current = null;
      }
    } else if (current && line.trim().length > 0) {
      current.content += ' ' + line.trim();
    }
  }

  if (current) {
    learnings.push(current);
  }

  return learnings;
}

/**
 * Claude 사용량 정보 포맷팅
 * @param {Object} usage - 사용량 객체
 * @returns {Object|null} 포맷된 사용량 정보
 */
function formatClaudeUsage(usage) {
  if (!usage) {
    return null;
  }

  return {
    fiveHour: usage.fiveHour || usage.fiveHourPercent || null,
    weekly: usage.weekly || usage.weeklyPercent || null,
    tokens: usage.tokens || null,
    provider: usage.provider || 'claude'
  };
}
