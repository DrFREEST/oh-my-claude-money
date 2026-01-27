/**
 * execution-strategy.mjs - 실행 전략 선택기
 *
 * 작업 유형에 따라 최적의 실행 전략(run, serve, acp)을 선택하고
 * 해당 전략에 맞는 실행 옵션을 생성합니다.
 *
 * 전략 유형:
 * - run: 단발성 실행 (빠른 응답, 컨텍스트 미유지)
 * - serve: 세션 유지형 실행 (연속 작업, MCP 재사용)
 * - acp: ACP 프로토콜 (세밀한 제어, 스트리밍)
 */

// =============================================================================
// 상수 및 타입 정의
// =============================================================================

/**
 * 실행 전략 상수
 * @readonly
 * @enum {string}
 */
export const STRATEGY = {
  /** 단발성 실행 - 빠른 응답 */
  RUN: 'run',
  /** 세션 유지형 - 연속 작업 */
  SERVE: 'serve',
  /** ACP 프로토콜 - 세밀한 제어 */
  ACP: 'acp'
};

/**
 * 작업 유형 상수
 * @readonly
 * @enum {string}
 */
export const TASK_TYPE = {
  /** 단순 탐색/조회 */
  SIMPLE_QUERY: 'simple_query',
  /** 코드 탐색 */
  CODE_EXPLORATION: 'code_exploration',
  /** 파일 수정 */
  FILE_MODIFICATION: 'file_modification',
  /** 멀티턴 대화 */
  MULTI_TURN: 'multi_turn',
  /** 복잡한 구현 */
  COMPLEX_IMPLEMENTATION: 'complex_implementation',
  /** 스트리밍 필요 */
  STREAMING: 'streaming',
  /** 알 수 없음 */
  UNKNOWN: 'unknown'
};

/**
 * 작업 유형별 전략 매핑
 */
const TASK_STRATEGY_MAP = {
  [TASK_TYPE.SIMPLE_QUERY]: STRATEGY.RUN,
  [TASK_TYPE.CODE_EXPLORATION]: STRATEGY.RUN,
  [TASK_TYPE.FILE_MODIFICATION]: STRATEGY.SERVE,
  [TASK_TYPE.MULTI_TURN]: STRATEGY.SERVE,
  [TASK_TYPE.COMPLEX_IMPLEMENTATION]: STRATEGY.SERVE,
  [TASK_TYPE.STREAMING]: STRATEGY.ACP,
  [TASK_TYPE.UNKNOWN]: STRATEGY.RUN
};

/**
 * 키워드 기반 작업 유형 분류
 */
const TASK_TYPE_KEYWORDS = {
  [TASK_TYPE.SIMPLE_QUERY]: [
    'find', 'search', 'list', 'show', 'get', 'what', 'where', 'which',
    '찾아', '검색', '보여', '뭐', '어디', '어떤'
  ],
  [TASK_TYPE.CODE_EXPLORATION]: [
    'explore', 'analyze', 'understand', 'how does', 'explain',
    '탐색', '분석', '이해', '설명', '어떻게'
  ],
  [TASK_TYPE.FILE_MODIFICATION]: [
    'create', 'edit', 'modify', 'update', 'add', 'remove', 'delete', 'fix', 'change',
    '생성', '수정', '편집', '추가', '삭제', '수정', '변경', '고쳐'
  ],
  [TASK_TYPE.MULTI_TURN]: [
    'step by step', 'iteratively', 'continue', 'next', 'then', 'after that',
    '단계별', '반복', '계속', '다음', '그 다음'
  ],
  [TASK_TYPE.COMPLEX_IMPLEMENTATION]: [
    'implement', 'build', 'refactor', 'rewrite', 'migrate', 'architecture',
    '구현', '만들어', '리팩토링', '재작성', '마이그레이션', '아키텍처'
  ],
  [TASK_TYPE.STREAMING]: [
    'stream', 'real-time', 'live', 'watch', 'monitor',
    '스트리밍', '실시간', '라이브', '모니터'
  ]
};

// =============================================================================
// 작업 유형 추론
// =============================================================================

/**
 * 작업 유형 추론
 *
 * 주어진 작업 정보를 분석하여 가장 적합한 작업 유형을 결정합니다.
 *
 * @param {Object} task - 작업 정보
 * @param {string} task.prompt - 작업 프롬프트
 * @param {string} [task.type] - 명시적 작업 유형
 * @param {Object} [task.options] - 추가 옵션
 * @param {boolean} [task.options.requiresContext] - 컨텍스트 유지 필요 여부
 * @param {boolean} [task.options.multiTurn] - 멀티턴 대화 여부
 * @param {boolean} [task.options.streaming] - 스트리밍 필요 여부
 * @param {number} [task.options.expectedDuration] - 예상 실행 시간 (ms)
 * @returns {string} 작업 유형 (TASK_TYPE 값 중 하나)
 */
export function inferTaskType(task) {
  if (!task) {
    return TASK_TYPE.UNKNOWN;
  }

  var options = task.options || {};

  // 1. 명시적 옵션 기반 판단
  if (options.streaming) {
    return TASK_TYPE.STREAMING;
  }

  if (options.multiTurn) {
    return TASK_TYPE.MULTI_TURN;
  }

  if (options.requiresContext) {
    return TASK_TYPE.COMPLEX_IMPLEMENTATION;
  }

  // 2. 명시적 타입이 있으면 사용
  if (task.type && Object.values(TASK_TYPE).indexOf(task.type) !== -1) {
    return task.type;
  }

  // 3. 프롬프트 기반 키워드 분석
  var prompt = (task.prompt || '').toLowerCase();

  // 키워드 매칭 점수 계산
  var scores = {};
  var taskTypes = Object.keys(TASK_TYPE_KEYWORDS);

  for (var i = 0; i < taskTypes.length; i++) {
    var type = taskTypes[i];
    var keywords = TASK_TYPE_KEYWORDS[type];
    var score = 0;

    for (var j = 0; j < keywords.length; j++) {
      if (prompt.indexOf(keywords[j]) !== -1) {
        score++;
      }
    }

    scores[type] = score;
  }

  // 가장 높은 점수의 작업 유형 선택
  var bestType = TASK_TYPE.UNKNOWN;
  var bestScore = 0;

  var scoreTypes = Object.keys(scores);
  for (var k = 0; k < scoreTypes.length; k++) {
    var scoreType = scoreTypes[k];
    if (scores[scoreType] > bestScore) {
      bestScore = scores[scoreType];
      bestType = scoreType;
    }
  }

  // 4. 예상 실행 시간 기반 보정
  if (options.expectedDuration) {
    // 30초 이상이면 복잡한 작업으로 판단
    if (options.expectedDuration >= 30000 && bestType === TASK_TYPE.SIMPLE_QUERY) {
      return TASK_TYPE.COMPLEX_IMPLEMENTATION;
    }
  }

  return bestType;
}

// =============================================================================
// 전략 선택
// =============================================================================

/**
 * 작업 유형에 따른 실행 전략 선택
 *
 * @param {Object} task - 작업 정보
 * @param {string} task.prompt - 작업 프롬프트
 * @param {string} [task.type] - 명시적 작업 유형
 * @param {Object} [task.options] - 추가 옵션
 * @param {boolean} [task.options.forceStrategy] - 강제 전략 지정
 * @param {boolean} [task.options.preferServe] - serve 모드 선호
 * @param {boolean} [task.options.preferAcp] - ACP 모드 선호
 * @param {Object} [context] - 실행 컨텍스트
 * @param {boolean} [context.serverRunning] - OpenCode 서버 실행 중 여부
 * @param {boolean} [context.acpAvailable] - ACP 사용 가능 여부
 * @param {number} [context.currentSessions] - 현재 활성 세션 수
 * @returns {'run' | 'serve' | 'acp'} 실행 전략
 */
export function selectStrategy(task, context) {
  if (!task) {
    return STRATEGY.RUN;
  }

  var options = task.options || {};
  context = context || {};

  // 1. 강제 지정된 전략이 있으면 사용
  if (options.forceStrategy) {
    var validStrategies = Object.values(STRATEGY);
    if (validStrategies.indexOf(options.forceStrategy) !== -1) {
      return options.forceStrategy;
    }
  }

  // 2. 선호 전략 확인
  if (options.preferAcp && context.acpAvailable !== false) {
    return STRATEGY.ACP;
  }

  if (options.preferServe && context.serverRunning !== false) {
    return STRATEGY.SERVE;
  }

  // 3. 작업 유형 추론
  var taskType = inferTaskType(task);

  // 4. 작업 유형에 따른 전략 선택
  var baseStrategy = TASK_STRATEGY_MAP[taskType] || STRATEGY.RUN;

  // 5. 컨텍스트 기반 보정
  // serve 전략인데 서버가 실행 중이 아니면 run으로 폴백
  if (baseStrategy === STRATEGY.SERVE && context.serverRunning === false) {
    return STRATEGY.RUN;
  }

  // ACP 전략인데 ACP 사용 불가능하면 serve로 폴백
  if (baseStrategy === STRATEGY.ACP && context.acpAvailable === false) {
    if (context.serverRunning !== false) {
      return STRATEGY.SERVE;
    }
    return STRATEGY.RUN;
  }

  return baseStrategy;
}

// =============================================================================
// 실행 옵션 빌드
// =============================================================================

/**
 * 전략별 기본 옵션
 */
var DEFAULT_OPTIONS = {
  [STRATEGY.RUN]: {
    timeout: 60000, // 1분
    quiet: true,
    outputFormat: 'text'
  },
  [STRATEGY.SERVE]: {
    timeout: 300000, // 5분
    keepAlive: true,
    reuseSession: true
  },
  [STRATEGY.ACP]: {
    timeout: 600000, // 10분
    streaming: true,
    bufferSize: 4096
  }
};

/**
 * 전략별 실행 옵션 생성
 *
 * @param {'run' | 'serve' | 'acp'} strategy - 실행 전략
 * @param {Object} task - 작업 정보
 * @param {string} task.prompt - 작업 프롬프트
 * @param {Object} [task.options] - 추가 옵션
 * @param {string} [task.agent] - 에이전트 타입
 * @param {string} [task.model] - 모델 이름
 * @param {string} [task.cwd] - 작업 디렉토리
 * @param {string[]} [task.files] - 첨부 파일 목록
 * @returns {Object} 실행 옵션
 */
export function buildExecutionOptions(strategy, task) {
  task = task || {};
  var taskOptions = task.options || {};

  // 기본 옵션 복사
  var baseOptions = DEFAULT_OPTIONS[strategy] || DEFAULT_OPTIONS[STRATEGY.RUN];
  var options = {};

  // 기본 옵션 복사
  var baseKeys = Object.keys(baseOptions);
  for (var i = 0; i < baseKeys.length; i++) {
    var key = baseKeys[i];
    options[key] = baseOptions[key];
  }

  // 공통 옵션 설정
  options.prompt = task.prompt || '';
  options.cwd = task.cwd || process.cwd();
  options.strategy = strategy;

  // 에이전트/모델 설정
  if (task.agent) {
    options.agent = task.agent;
  }

  if (task.model) {
    options.model = task.model;
  }

  // 파일 첨부
  if (task.files && Array.isArray(task.files)) {
    options.files = task.files;
  }

  // 전략별 특수 옵션
  switch (strategy) {
    case STRATEGY.RUN:
      // ulw 모드 활성화 여부
      options.enableUlw = taskOptions.enableUlw !== false;
      break;

    case STRATEGY.SERVE:
      // 세션 ID (기존 세션 재사용)
      if (taskOptions.sessionId) {
        options.sessionId = taskOptions.sessionId;
      }
      // 서버 포트
      options.port = taskOptions.port || 4096;
      break;

    case STRATEGY.ACP:
      // 스트리밍 콜백
      if (typeof taskOptions.onChunk === 'function') {
        options.onChunk = taskOptions.onChunk;
      }
      // 버퍼 크기
      if (taskOptions.bufferSize) {
        options.bufferSize = taskOptions.bufferSize;
      }
      break;
  }

  // 타임아웃 오버라이드
  if (taskOptions.timeout && typeof taskOptions.timeout === 'number') {
    options.timeout = taskOptions.timeout;
  }

  return options;
}

// =============================================================================
// 유틸리티 함수
// =============================================================================

/**
 * 전략 이름으로 한글 설명 반환
 *
 * @param {'run' | 'serve' | 'acp'} strategy - 전략
 * @returns {string} 한글 설명
 */
export function getStrategyDescription(strategy) {
  var descriptions = {
    [STRATEGY.RUN]: '단발성 실행 (빠른 응답)',
    [STRATEGY.SERVE]: '세션 유지형 (연속 작업)',
    [STRATEGY.ACP]: 'ACP 프로토콜 (세밀한 제어)'
  };

  return descriptions[strategy] || '알 수 없는 전략';
}

/**
 * 작업 유형 이름으로 한글 설명 반환
 *
 * @param {string} taskType - 작업 유형
 * @returns {string} 한글 설명
 */
export function getTaskTypeDescription(taskType) {
  var descriptions = {
    [TASK_TYPE.SIMPLE_QUERY]: '단순 조회',
    [TASK_TYPE.CODE_EXPLORATION]: '코드 탐색',
    [TASK_TYPE.FILE_MODIFICATION]: '파일 수정',
    [TASK_TYPE.MULTI_TURN]: '멀티턴 대화',
    [TASK_TYPE.COMPLEX_IMPLEMENTATION]: '복잡한 구현',
    [TASK_TYPE.STREAMING]: '스트리밍',
    [TASK_TYPE.UNKNOWN]: '알 수 없음'
  };

  return descriptions[taskType] || '알 수 없는 작업 유형';
}

/**
 * 작업 분석 결과 생성
 *
 * @param {Object} task - 작업 정보
 * @param {Object} [context] - 실행 컨텍스트
 * @returns {Object} 분석 결과
 */
export function analyzeTask(task, context) {
  var taskType = inferTaskType(task);
  var strategy = selectStrategy(task, context);
  var options = buildExecutionOptions(strategy, task);

  return {
    taskType: taskType,
    taskTypeDescription: getTaskTypeDescription(taskType),
    strategy: strategy,
    strategyDescription: getStrategyDescription(strategy),
    executionOptions: options,
    recommendation: generateRecommendation(taskType, strategy, context)
  };
}

/**
 * 추천 메시지 생성
 */
function generateRecommendation(taskType, strategy, context) {
  context = context || {};

  var messages = [];

  // 전략별 추천
  if (strategy === STRATEGY.SERVE && !context.serverRunning) {
    messages.push('OpenCode 서버 시작을 권장합니다: opencode serve --port 4096');
  }

  if (strategy === STRATEGY.RUN && taskType === TASK_TYPE.COMPLEX_IMPLEMENTATION) {
    messages.push('복잡한 구현 작업입니다. serve 모드 사용을 고려해주세요.');
  }

  if (strategy === STRATEGY.ACP && !context.acpAvailable) {
    messages.push('ACP 프로토콜이 필요하지만 사용 불가능합니다. serve 모드로 폴백됩니다.');
  }

  // 작업 유형별 추천
  if (taskType === TASK_TYPE.MULTI_TURN) {
    messages.push('멀티턴 대화가 감지되었습니다. 세션 ID를 유지하세요.');
  }

  if (messages.length === 0) {
    return '최적의 전략이 선택되었습니다.';
  }

  return messages.join(' ');
}
