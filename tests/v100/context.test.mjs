/**
 * context.test.mjs - v1.0.0 컨텍스트 시스템 테스트
 */

import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert';
import { buildContext, getRecentModifiedFiles, getReferencedFiles, getTodosByStatus, getRecentDecisions, getSessionLearnings } from '../../src/context/context-builder.mjs';
import { createHandoffContext, readHandoffContext, getHandoffHistory } from '../../src/utils/handoff-context.mjs';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';

// 테스트용 임시 디렉토리
const TEST_PROJECT_PATH = '/tmp/omcm-context-test';

describe('컨텍스트 빌더 테스트', () => {
  beforeEach(() => {
    // 테스트 디렉토리 초기화
    if (existsSync(TEST_PROJECT_PATH)) {
      rmSync(TEST_PROJECT_PATH, { recursive: true, force: true });
    }
    mkdirSync(TEST_PROJECT_PATH, { recursive: true });
  });

  test('buildContext() - 기본 세션 정보로 컨텍스트 빌드', () => {
    const session = {
      sessionId: 'test-session-001',
      projectPath: TEST_PROJECT_PATH,
      startTime: '2026-01-27T10:00:00Z',
      claudeUsage: { fiveHour: 50, weekly: 30 }
    };

    const context = buildContext(session);

    assert.strictEqual(context.meta.sessionId, 'test-session-001');
    assert.strictEqual(context.meta.projectPath, TEST_PROJECT_PATH);
    assert.strictEqual(context.meta.startTime, '2026-01-27T10:00:00Z');
    assert.ok(context.meta.claudeUsage);
    assert.strictEqual(context.meta.claudeUsage.fiveHour, 50);
    assert.strictEqual(context.meta.claudeUsage.weekly, 30);
  });

  test('buildContext() - 세션 정보 없이 호출 (기본값 사용)', () => {
    const context = buildContext();

    assert.strictEqual(context.meta.sessionId, 'unknown');
    assert.ok(context.meta.buildTime);
    assert.ok(context.task);
    assert.ok(context.files);
    assert.ok(context.todos);
    assert.ok(context.decisions);
  });

  test('buildContext() - 작업 정보 포함', () => {
    const session = {
      projectPath: TEST_PROJECT_PATH,
      task: {
        description: 'Implement feature X',
        goal: 'Complete by EOD',
        constraints: ['No breaking changes', 'Maintain test coverage']
      }
    };

    const context = buildContext(session);

    assert.strictEqual(context.task.description, 'Implement feature X');
    assert.strictEqual(context.task.goal, 'Complete by EOD');
    assert.strictEqual(context.task.constraints.length, 2);
    assert.strictEqual(context.task.constraints[0], 'No breaking changes');
  });

  test('buildContext() - 컨텍스트 구조 검증', () => {
    const context = buildContext({ projectPath: TEST_PROJECT_PATH });

    // 필수 키 존재 확인
    assert.ok(context.task);
    assert.ok(context.files);
    assert.ok(context.todos);
    assert.ok(context.decisions);
    assert.ok(context.meta);

    // files 하위 구조
    assert.ok(Array.isArray(context.files.modified));
    assert.ok(Array.isArray(context.files.referenced));

    // todos 하위 구조
    assert.ok(Array.isArray(context.todos.pending));
    assert.ok(Array.isArray(context.todos.inProgress));
    assert.ok(Array.isArray(context.todos.completed));

    // decisions 하위 구조
    assert.ok(Array.isArray(context.decisions.recent));
    assert.ok(Array.isArray(context.decisions.learnings));
  });
});

describe('파일 정보 수집 테스트', () => {
  test('getRecentModifiedFiles() - 기본 동작 (limit 10)', () => {
    const files = getRecentModifiedFiles(10, TEST_PROJECT_PATH);

    assert.ok(Array.isArray(files));
    assert.ok(files.length <= 10);
  });

  test('getRecentModifiedFiles() - limit 변경', () => {
    const files = getRecentModifiedFiles(5, TEST_PROJECT_PATH);

    assert.ok(files.length <= 5);
  });

  test('getRecentModifiedFiles() - limit 미지정 시 기본값 10', () => {
    const files = getRecentModifiedFiles();

    assert.ok(Array.isArray(files));
  });

  test('getReferencedFiles() - 기본 동작', () => {
    const files = getReferencedFiles(TEST_PROJECT_PATH);

    assert.ok(Array.isArray(files));
  });

  test('getReferencedFiles() - 참조 파일이 있는 경우', () => {
    const omcDir = join(TEST_PROJECT_PATH, '.omc', 'state');
    mkdirSync(omcDir, { recursive: true });

    const referencesFile = join(omcDir, 'referenced-files.json');
    writeFileSync(referencesFile, JSON.stringify(['src/file1.js', 'src/file2.js']));

    const files = getReferencedFiles(TEST_PROJECT_PATH);

    assert.strictEqual(files.length, 2);
    assert.strictEqual(files[0], 'src/file1.js');
    assert.strictEqual(files[1], 'src/file2.js');
  });

  test('getReferencedFiles() - .omcm/session에서도 참조', () => {
    const sessionDir = join(TEST_PROJECT_PATH, '.omcm', 'session');
    mkdirSync(sessionDir, { recursive: true });

    const sessionFile = join(sessionDir, 'references.json');
    writeFileSync(sessionFile, JSON.stringify(['lib/utils.js']));

    const files = getReferencedFiles(TEST_PROJECT_PATH);

    assert.ok(files.includes('lib/utils.js'));
  });
});

describe('TODO 수집 테스트', () => {
  test('getTodosByStatus() - pending 상태', () => {
    const todos = getTodosByStatus('pending', TEST_PROJECT_PATH);

    assert.ok(Array.isArray(todos));
  });

  test('getTodosByStatus() - in_progress 상태', () => {
    const todos = getTodosByStatus('in_progress', TEST_PROJECT_PATH);

    assert.ok(Array.isArray(todos));
  });

  test('getTodosByStatus() - completed 상태', () => {
    const todos = getTodosByStatus('completed', TEST_PROJECT_PATH);

    assert.ok(Array.isArray(todos));
  });

  test('getTodosByStatus() - 잘못된 상태는 빈 배열 반환', () => {
    const todos = getTodosByStatus('invalid-status', TEST_PROJECT_PATH);

    assert.strictEqual(todos.length, 0);
  });

  test('getTodosByStatus() - todos.json 파일에서 읽기', () => {
    const omcDir = join(TEST_PROJECT_PATH, '.omc');
    mkdirSync(omcDir, { recursive: true });

    const todosFile = join(omcDir, 'todos.json');
    const todosData = [
      { id: 1, content: 'Task 1', status: 'pending', priority: 'high' },
      { id: 2, content: 'Task 2', status: 'in_progress', priority: 'medium' },
      { id: 3, content: 'Task 3', status: 'completed', priority: 'low' }
    ];
    writeFileSync(todosFile, JSON.stringify(todosData));

    const pending = getTodosByStatus('pending', TEST_PROJECT_PATH);
    const inProgress = getTodosByStatus('in_progress', TEST_PROJECT_PATH);
    const completed = getTodosByStatus('completed', TEST_PROJECT_PATH);

    assert.strictEqual(pending.length, 1);
    assert.strictEqual(pending[0].content, 'Task 1');

    assert.strictEqual(inProgress.length, 1);
    assert.strictEqual(inProgress[0].content, 'Task 2');

    assert.strictEqual(completed.length, 1);
    assert.strictEqual(completed[0].content, 'Task 3');
  });
});

describe('결정 사항 수집 테스트', () => {
  test('getRecentDecisions() - 기본 동작 (limit 10)', () => {
    const decisions = getRecentDecisions(10, TEST_PROJECT_PATH);

    assert.ok(Array.isArray(decisions));
    assert.ok(decisions.length <= 10);
  });

  test('getRecentDecisions() - limit 변경', () => {
    const decisions = getRecentDecisions(3, TEST_PROJECT_PATH);

    assert.ok(decisions.length <= 3);
  });

  test('getRecentDecisions() - decisions.md 파일에서 읽기', () => {
    const notepadsDir = join(TEST_PROJECT_PATH, '.omcm', 'notepads', 'test-plan');
    mkdirSync(notepadsDir, { recursive: true });

    const decisionsFile = join(notepadsDir, 'decisions.md');
    const content = `
## 2026-01-27: Use TypeScript for new modules

We decided to use TypeScript for better type safety.

## 2026-01-26: Adopt ESM modules

Moving from CommonJS to ESM for better compatibility.
`;
    writeFileSync(decisionsFile, content);

    const decisions = getRecentDecisions(10, TEST_PROJECT_PATH);

    assert.ok(decisions.length >= 2);
    assert.ok(decisions[0].title.includes('TypeScript'));
    assert.ok(decisions[0].source === 'test-plan');
  });
});

describe('학습 사항 수집 테스트', () => {
  test('getSessionLearnings() - 기본 동작', () => {
    const learnings = getSessionLearnings(TEST_PROJECT_PATH);

    assert.ok(Array.isArray(learnings));
  });

  test('getSessionLearnings() - learnings.md 파일에서 읽기', () => {
    const notepadsDir = join(TEST_PROJECT_PATH, '.omcm', 'notepads', 'test-plan');
    mkdirSync(notepadsDir, { recursive: true });

    const learningsFile = join(notepadsDir, 'learnings.md');
    const content = `
## Technical Learnings

- Node.js test runner is fast and simple
- ESM modules require .mjs extension
- AsyncLocalStorage helps with context tracking
`;
    writeFileSync(learningsFile, content);

    const learnings = getSessionLearnings(TEST_PROJECT_PATH);

    assert.ok(learnings.length >= 3);
    assert.ok(learnings[0].content.includes('Node.js'));
    assert.strictEqual(learnings[0].source, 'test-plan');
  });
});

describe('핸드오프 컨텍스트 테스트', () => {
  beforeEach(() => {
    // 핸드오프 디렉토리 초기화
    if (existsSync(TEST_PROJECT_PATH)) {
      rmSync(TEST_PROJECT_PATH, { recursive: true, force: true });
    }
    mkdirSync(TEST_PROJECT_PATH, { recursive: true });
  });

  test('createHandoffContext() - 기본 동작', () => {
    const options = {
      fromModel: { name: 'Claude Opus 4.5' },
      toModel: { name: 'MCP GPT-4' },
      reason: 'Rate limit reached',
      currentTask: 'Implement feature X',
      cwd: TEST_PROJECT_PATH
    };

    const result = createHandoffContext(options);

    assert.ok(result.filepath);
    assert.ok(result.latestPath);
    assert.ok(result.timestamp);
    assert.ok(existsSync(result.filepath));
    assert.ok(existsSync(result.latestPath));
  });

  test('createHandoffContext() - todo 리스트 포함', () => {
    const options = {
      fromModel: { id: 'claude-opus-4-5' },
      toModel: { id: 'gpt-4' },
      todoList: [
        { status: 'pending', subject: 'Task 1' },
        { status: 'in_progress', subject: 'Task 2' },
        { status: 'completed', subject: 'Task 3' }
      ],
      cwd: TEST_PROJECT_PATH
    };

    const result = createHandoffContext(options);

    assert.ok(existsSync(result.filepath));
  });

  test('readHandoffContext() - 최신 컨텍스트 읽기', () => {
    const options = {
      fromModel: { name: 'Claude' },
      toModel: { name: 'GPT-4' },
      currentTask: 'Test task',
      cwd: TEST_PROJECT_PATH
    };

    createHandoffContext(options);

    const content = readHandoffContext(TEST_PROJECT_PATH);

    assert.ok(content);
    assert.ok(content.includes('Handoff Context'));
    assert.ok(content.includes('Test task'));
  });

  test('readHandoffContext() - 컨텍스트 없을 때 null 반환', () => {
    const content = readHandoffContext(TEST_PROJECT_PATH);

    assert.strictEqual(content, null);
  });

  test('getHandoffHistory() - 히스토리 조회', () => {
    const handoffDir = join(TEST_PROJECT_PATH, '.omcm', 'handoff');
    mkdirSync(handoffDir, { recursive: true });

    // 테스트용 히스토리 파일 직접 생성 (타이밍 이슈 회피)
    writeFileSync(join(handoffDir, 'context-1000001.md'), '# Test 1');
    writeFileSync(join(handoffDir, 'context-1000002.md'), '# Test 2');
    writeFileSync(join(handoffDir, 'context-1000003.md'), '# Test 3');

    const history = getHandoffHistory(TEST_PROJECT_PATH);

    assert.ok(Array.isArray(history));
    assert.strictEqual(history.length, 3);

    // 최신순 정렬 확인 (타임스탬프가 큰 것이 먼저)
    assert.ok(history[0].timestamp > history[1].timestamp);
    assert.ok(history[1].timestamp > history[2].timestamp);
  });

  test('getHandoffHistory() - 히스토리 없을 때 빈 배열 반환', () => {
    const history = getHandoffHistory(TEST_PROJECT_PATH);

    assert.strictEqual(history.length, 0);
  });
});

console.log('✓ context.test.mjs 로드 완료');
