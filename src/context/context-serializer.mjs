/**
 * 컨텍스트 직렬화 모듈
 * @module context-serializer
 */

/**
 * 컨텍스트를 OpenCode용 Markdown 형식으로 직렬화
 * @param {Object} context - 구조화된 컨텍스트 객체
 * @returns {string} Markdown 형식의 문자열
 */
export function serializeForOpenCode(context) {
  const lines = [];

  lines.push('# 세션 컨텍스트\n');

  // Meta 정보
  lines.push('## 메타 정보\n');
  lines.push(`- **세션 ID**: ${context.meta.sessionId}`);
  lines.push(`- **시작 시간**: ${context.meta.startTime}`);
  lines.push(`- **프로젝트 경로**: ${context.meta.projectPath}`);
  if (context.meta.claudeUsage) {
    lines.push(`- **Claude 사용량**: ${JSON.stringify(context.meta.claudeUsage)}`);
  }
  lines.push('');

  // Task 정보
  lines.push('## 작업 정보\n');
  lines.push(`**설명**: ${context.task.description}`);
  lines.push(`**목표**: ${context.task.goal}`);
  if (context.task.constraints && context.task.constraints.length > 0) {
    lines.push('\n**제약사항**:');
    for (const constraint of context.task.constraints) {
      lines.push(`- ${constraint}`);
    }
  }
  lines.push('');

  // 수정된 파일
  lines.push('## 수정된 파일\n');
  if (context.files.modified && context.files.modified.length > 0) {
    for (const file of context.files.modified) {
      lines.push(`- \`${file.path}\` (${file.mtime}, ${file.size} bytes)`);
    }
  } else {
    lines.push('없음');
  }
  lines.push('');

  // 참조된 파일
  lines.push('## 참조된 파일\n');
  if (context.files.referenced && context.files.referenced.length > 0) {
    for (const file of context.files.referenced) {
      lines.push(`- \`${file}\``);
    }
  } else {
    lines.push('없음');
  }
  lines.push('');

  // TODO 목록
  lines.push('## TODO 목록\n');

  lines.push('### 진행 중');
  if (context.todos.inProgress && context.todos.inProgress.length > 0) {
    for (const todo of context.todos.inProgress) {
      lines.push(`- [ ] ${todo.title || todo.description}`);
    }
  } else {
    lines.push('없음');
  }
  lines.push('');

  lines.push('### 대기 중');
  if (context.todos.pending && context.todos.pending.length > 0) {
    for (const todo of context.todos.pending) {
      lines.push(`- [ ] ${todo.title || todo.description}`);
    }
  } else {
    lines.push('없음');
  }
  lines.push('');

  lines.push('### 완료');
  if (context.todos.completed && context.todos.completed.length > 0) {
    for (const todo of context.todos.completed) {
      lines.push(`- [x] ${todo.title || todo.description}`);
    }
  } else {
    lines.push('없음');
  }
  lines.push('');

  // 결정 사항
  lines.push('## 최근 결정 사항\n');
  if (context.decisions.recent && context.decisions.recent.length > 0) {
    for (const decision of context.decisions.recent) {
      lines.push(`- **${decision.title}** (${decision.plan})`);
    }
  } else {
    lines.push('없음');
  }
  lines.push('');

  // 학습 내용
  lines.push('## 학습 내용\n');
  if (context.decisions.learnings && context.decisions.learnings.length > 0) {
    for (const learning of context.decisions.learnings) {
      lines.push(`- **${learning.title}** (${learning.plan})`);
    }
  } else {
    lines.push('없음');
  }

  return lines.join('\n');
}

/**
 * 컨텍스트를 JSON 형식으로 직렬화
 * @param {Object} context - 구조화된 컨텍스트 객체
 * @returns {string} JSON 문자열
 */
export function serializeForJson(context) {
  return JSON.stringify(context, null, 2);
}

/**
 * 직렬화된 데이터를 컨텍스트 객체로 역직렬화
 * @param {string} data - 직렬화된 문자열
 * @param {string} format - 데이터 형식 ('markdown' 또는 'json')
 * @returns {Object|null} 컨텍스트 객체 또는 null (실패 시)
 */
export function deserializeContext(data, format) {
  if (format === 'json') {
    try {
      return JSON.parse(data);
    } catch (error) {
      console.error('JSON 파싱 실패:', error.message);
      return null;
    }
  }

  if (format === 'markdown') {
    // Markdown 역직렬화는 복잡하므로 기본 구조만 반환
    // 실제 사용 시에는 정규식 또는 파서를 사용하여 구현
    return {
      task: { description: '', goal: '', constraints: [] },
      files: { modified: [], referenced: [] },
      todos: { pending: [], inProgress: [], completed: [] },
      decisions: { recent: [], learnings: [] },
      meta: { sessionId: 'unknown', startTime: '', claudeUsage: null, projectPath: '' }
    };
  }

  return null;
}
