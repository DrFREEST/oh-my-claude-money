/**
 * parallel-executor.test.mjs - v1.0.0 병렬 실행기 테스트
 *
 * 주의: ParallelExecutor는 아직 구현되지 않았으므로,
 * 이 테스트는 예상되는 인터페이스를 기반으로 작성되었습니다.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert';

// ParallelExecutor 스텁 구현 (실제 구현 전까지 테스트용)
class ParallelExecutorStub {
  constructor(options) {
    this.options = options || {};
    this.maxWorkers = this.options.maxWorkers || 3;
    this.strategy = this.options.strategy || 'auto';
  }

  /**
   * 작업이 병렬화 가능한지 판단
   */
  canRunInParallel(tasks) {
    if (!Array.isArray(tasks) || tasks.length < 2) {
      return false;
    }

    // 파일 의존성 체크 (간단한 구현)
    const fileUsage = new Map();
    for (const task of tasks) {
      const files = task.files || [];
      for (const file of files) {
        if (!fileUsage.has(file)) {
          fileUsage.set(file, []);
        }
        fileUsage.get(file).push(task.id);
      }
    }

    // 같은 파일을 여러 작업이 사용하면 병렬화 불가
    for (const [file, taskIds] of fileUsage) {
      if (taskIds.length > 1) {
        return false;
      }
    }

    return true;
  }

  /**
   * 병렬 실행 전략 선택
   */
  selectStrategy(tasks) {
    if (!tasks || tasks.length === 0) {
      return 'none';
    }

    if (tasks.length === 1) {
      return 'sequential';
    }

    if (!this.canRunInParallel(tasks)) {
      return 'sequential';
    }

    // 작업 복잡도 기반 선택
    const avgComplexity = tasks.reduce((sum, t) => sum + (t.complexity || 1), 0) / tasks.length;

    if (avgComplexity > 5) {
      return 'batch'; // 고복잡도는 배치 처리
    }

    return 'concurrent'; // 저복잡도는 동시 실행
  }

  /**
   * 병렬 실행 (모킹)
   */
  async execute(tasks) {
    if (!this.canRunInParallel(tasks)) {
      throw new Error('Tasks cannot be parallelized due to file conflicts');
    }

    const strategy = this.selectStrategy(tasks);

    // 모킹된 실행 결과
    const results = [];
    for (const task of tasks) {
      results.push({
        taskId: task.id,
        status: 'success',
        duration: Math.random() * 1000,
        strategy: strategy
      });
    }

    return {
      strategy: strategy,
      totalTasks: tasks.length,
      successCount: results.length,
      failureCount: 0,
      results: results
    };
  }
}

describe('병렬화 가능 판단 테스트', () => {
  test('canRunInParallel() - 독립적인 작업은 병렬화 가능', () => {
    const executor = new ParallelExecutorStub();

    const tasks = [
      { id: 'task1', files: ['src/file1.js'] },
      { id: 'task2', files: ['src/file2.js'] },
      { id: 'task3', files: ['src/file3.js'] }
    ];

    const result = executor.canRunInParallel(tasks);

    assert.strictEqual(result, true);
  });

  test('canRunInParallel() - 파일 충돌이 있으면 병렬화 불가', () => {
    const executor = new ParallelExecutorStub();

    const tasks = [
      { id: 'task1', files: ['src/common.js'] },
      { id: 'task2', files: ['src/common.js'] }
    ];

    const result = executor.canRunInParallel(tasks);

    assert.strictEqual(result, false);
  });

  test('canRunInParallel() - 작업이 1개면 병렬화 불필요', () => {
    const executor = new ParallelExecutorStub();

    const tasks = [
      { id: 'task1', files: ['src/file1.js'] }
    ];

    const result = executor.canRunInParallel(tasks);

    assert.strictEqual(result, false);
  });

  test('canRunInParallel() - 빈 배열은 병렬화 불가', () => {
    const executor = new ParallelExecutorStub();

    const result = executor.canRunInParallel([]);

    assert.strictEqual(result, false);
  });

  test('canRunInParallel() - 파일 정보가 없는 작업', () => {
    const executor = new ParallelExecutorStub();

    const tasks = [
      { id: 'task1' },
      { id: 'task2' }
    ];

    const result = executor.canRunInParallel(tasks);

    assert.strictEqual(result, true);
  });

  test('canRunInParallel() - 일부만 파일 정보 있음', () => {
    const executor = new ParallelExecutorStub();

    const tasks = [
      { id: 'task1', files: ['src/file1.js'] },
      { id: 'task2' },
      { id: 'task3', files: ['src/file3.js'] }
    ];

    const result = executor.canRunInParallel(tasks);

    assert.strictEqual(result, true);
  });
});

describe('전략 선택 테스트', () => {
  test('selectStrategy() - 단일 작업은 sequential', () => {
    const executor = new ParallelExecutorStub();

    const tasks = [
      { id: 'task1', complexity: 3 }
    ];

    const strategy = executor.selectStrategy(tasks);

    assert.strictEqual(strategy, 'sequential');
  });

  test('selectStrategy() - 저복잡도 작업은 concurrent', () => {
    const executor = new ParallelExecutorStub();

    const tasks = [
      { id: 'task1', complexity: 2, files: ['file1.js'] },
      { id: 'task2', complexity: 3, files: ['file2.js'] }
    ];

    const strategy = executor.selectStrategy(tasks);

    assert.strictEqual(strategy, 'concurrent');
  });

  test('selectStrategy() - 고복잡도 작업은 batch', () => {
    const executor = new ParallelExecutorStub();

    const tasks = [
      { id: 'task1', complexity: 8, files: ['file1.js'] },
      { id: 'task2', complexity: 7, files: ['file2.js'] }
    ];

    const strategy = executor.selectStrategy(tasks);

    assert.strictEqual(strategy, 'batch');
  });

  test('selectStrategy() - 파일 충돌이 있으면 sequential', () => {
    const executor = new ParallelExecutorStub();

    const tasks = [
      { id: 'task1', complexity: 2, files: ['common.js'] },
      { id: 'task2', complexity: 2, files: ['common.js'] }
    ];

    const strategy = executor.selectStrategy(tasks);

    assert.strictEqual(strategy, 'sequential');
  });

  test('selectStrategy() - 빈 배열은 none', () => {
    const executor = new ParallelExecutorStub();

    const strategy = executor.selectStrategy([]);

    assert.strictEqual(strategy, 'none');
  });

  test('selectStrategy() - complexity 없으면 기본값 1', () => {
    const executor = new ParallelExecutorStub();

    const tasks = [
      { id: 'task1', files: ['file1.js'] },
      { id: 'task2', files: ['file2.js'] }
    ];

    const strategy = executor.selectStrategy(tasks);

    assert.strictEqual(strategy, 'concurrent');
  });
});

describe('ParallelExecutor 실행 테스트 (모킹)', () => {
  test('execute() - 병렬 가능한 작업 실행', async () => {
    const executor = new ParallelExecutorStub({ maxWorkers: 3 });

    const tasks = [
      { id: 'task1', files: ['file1.js'], complexity: 2 },
      { id: 'task2', files: ['file2.js'], complexity: 2 },
      { id: 'task3', files: ['file3.js'], complexity: 2 }
    ];

    const result = await executor.execute(tasks);

    assert.strictEqual(result.totalTasks, 3);
    assert.strictEqual(result.successCount, 3);
    assert.strictEqual(result.failureCount, 0);
    assert.ok(['concurrent', 'batch'].includes(result.strategy));
  });

  test('execute() - 파일 충돌이 있으면 에러', async () => {
    const executor = new ParallelExecutorStub();

    const tasks = [
      { id: 'task1', files: ['common.js'] },
      { id: 'task2', files: ['common.js'] }
    ];

    await assert.rejects(
      async () => {
        await executor.execute(tasks);
      },
      {
        message: /cannot be parallelized/
      }
    );
  });

  test('execute() - 결과에 개별 작업 정보 포함', async () => {
    const executor = new ParallelExecutorStub();

    const tasks = [
      { id: 'task1', files: ['file1.js'] },
      { id: 'task2', files: ['file2.js'] }
    ];

    const result = await executor.execute(tasks);

    assert.strictEqual(result.results.length, 2);
    assert.strictEqual(result.results[0].taskId, 'task1');
    assert.strictEqual(result.results[0].status, 'success');
    assert.strictEqual(result.results[1].taskId, 'task2');
  });

  test('execute() - maxWorkers 설정 반영', async () => {
    const executor = new ParallelExecutorStub({ maxWorkers: 2 });

    assert.strictEqual(executor.maxWorkers, 2);
  });
});

describe('ParallelExecutor 옵션 테스트', () => {
  test('생성자 - 기본 옵션', () => {
    const executor = new ParallelExecutorStub();

    assert.strictEqual(executor.maxWorkers, 3);
    assert.strictEqual(executor.strategy, 'auto');
  });

  test('생성자 - 커스텀 옵션', () => {
    const executor = new ParallelExecutorStub({
      maxWorkers: 5,
      strategy: 'concurrent'
    });

    assert.strictEqual(executor.maxWorkers, 5);
    assert.strictEqual(executor.strategy, 'concurrent');
  });

  test('생성자 - 옵션 없이 호출', () => {
    const executor = new ParallelExecutorStub(null);

    assert.ok(executor);
    assert.strictEqual(executor.maxWorkers, 3);
  });
});

describe('실제 사용 시나리오 테스트', () => {
  test('시나리오: 여러 파일 동시 수정', async () => {
    const executor = new ParallelExecutorStub();

    const tasks = [
      { id: 'fix-error-1', files: ['src/module1.js'], complexity: 2 },
      { id: 'fix-error-2', files: ['src/module2.js'], complexity: 2 },
      { id: 'fix-error-3', files: ['src/module3.js'], complexity: 3 }
    ];

    const canParallelize = executor.canRunInParallel(tasks);
    assert.strictEqual(canParallelize, true);

    const strategy = executor.selectStrategy(tasks);
    assert.ok(['concurrent', 'batch'].includes(strategy));

    const result = await executor.execute(tasks);
    assert.strictEqual(result.successCount, 3);
  });

  test('시나리오: 공통 파일 수정으로 순차 실행', () => {
    const executor = new ParallelExecutorStub();

    const tasks = [
      { id: 'update-config', files: ['config.js'], complexity: 3 },
      { id: 'fix-config-bug', files: ['config.js'], complexity: 2 }
    ];

    const canParallelize = executor.canRunInParallel(tasks);
    assert.strictEqual(canParallelize, false);

    const strategy = executor.selectStrategy(tasks);
    assert.strictEqual(strategy, 'sequential');
  });

  test('시나리오: 복잡한 리팩토링 (batch 처리)', () => {
    const executor = new ParallelExecutorStub();

    const tasks = [
      { id: 'refactor-1', files: ['src/old1.js'], complexity: 8 },
      { id: 'refactor-2', files: ['src/old2.js'], complexity: 9 },
      { id: 'refactor-3', files: ['src/old3.js'], complexity: 7 }
    ];

    const strategy = executor.selectStrategy(tasks);
    assert.strictEqual(strategy, 'batch');
  });

  test('시나리오: 단순 작업 다수 (concurrent 처리)', async () => {
    const executor = new ParallelExecutorStub({ maxWorkers: 5 });

    const tasks = [];
    for (let i = 1; i <= 10; i++) {
      tasks.push({
        id: `simple-task-${i}`,
        files: [`file${i}.js`],
        complexity: 1
      });
    }

    const canParallelize = executor.canRunInParallel(tasks);
    assert.strictEqual(canParallelize, true);

    const strategy = executor.selectStrategy(tasks);
    assert.strictEqual(strategy, 'concurrent');

    const result = await executor.execute(tasks);
    assert.strictEqual(result.totalTasks, 10);
  });
});

console.log('✓ parallel-executor.test.mjs 로드 완료');
console.log('  (주의: ParallelExecutor 실제 구현 전까지 스텁 버전 사용)');
