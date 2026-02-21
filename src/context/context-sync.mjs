/**
 * 컨텍스트 실시간 동기화 모듈
 * @module context-sync
 */

import fs from 'fs';
import path from 'path';
import { buildContext } from './context-builder.mjs';
import { serializeForOpenCode, serializeForJson } from './context-serializer.mjs';

/**
 * 컨텍스트 실시간 동기화 클래스
 */
export class ContextSynchronizer {
  constructor() {
    this.intervalId = null;
    this.lastSyncTime = null;
    this.isRunning = false;
    this.syncIntervalMs = 5000; // 기본값 5초
  }

  /**
   * 주기적 동기화 시작
   * @param {number} intervalMs - 동기화 주기 (밀리초)
   */
  startSync(intervalMs = 5000) {
    if (this.isRunning) {
      console.log('동기화가 이미 실행 중입니다.');
      return;
    }

    this.syncIntervalMs = intervalMs;
    this.isRunning = true;

    // 즉시 한 번 실행
    this.syncContext();

    // 주기적 실행 설정
    this.intervalId = setInterval(() => {
      this.syncContext();
    }, this.syncIntervalMs);

    console.log(`컨텍스트 동기화 시작 (주기: ${intervalMs}ms)`);
  }

  /**
   * 컨텍스트 파일 갱신 (Markdown + JSON)
   */
  syncContext() {
    try {
      const projectPath = process.cwd();
      const omcStatePath = path.join(projectPath, '.omc', 'state');

      // 상태 디렉토리가 없으면 생성
      if (!fs.existsSync(omcStatePath)) {
        fs.mkdirSync(omcStatePath, { recursive: true });
      }

      // 세션 정보 읽기 (없으면 기본값 사용)
      let session = {
        id: 'default',
        description: 'Default session',
        goal: 'Complete tasks',
        constraints: [],
        projectPath: projectPath,
        startTime: new Date().toISOString()
      };

      const sessionPath = path.join(omcStatePath, 'session.json');
      if (fs.existsSync(sessionPath)) {
        try {
          session = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
        } catch (error) {
          console.error('세션 정보 읽기 실패:', error.message);
        }
      }

      // 컨텍스트 빌드
      const context = buildContext(session);

      // Markdown 형식으로 저장
      const markdownContent = serializeForOpenCode(context);
      const markdownPath = path.join(omcStatePath, 'context.md');
      fs.writeFileSync(markdownPath, markdownContent, 'utf8');

      // JSON 형식으로도 저장 (프로그래밍 접근용)
      const jsonContent = serializeForJson(context);
      const jsonPath = path.join(omcStatePath, 'context.json');
      fs.writeFileSync(jsonPath, jsonContent, 'utf8');

      this.lastSyncTime = new Date().toISOString();

      console.log(`[${this.lastSyncTime}] 컨텍스트 동기화 완료`);
    } catch (error) {
      console.error('컨텍스트 동기화 실패:', error.message);
    }
  }

  /**
   * 외부 결과 가져오기
   * @returns {Object|null} 결과 객체 또는 null
   */
  syncFromExternal() {
    try {
      const projectPath = process.cwd();
      const omcStatePath = path.join(projectPath, '.omc', 'state');
      const resultPath = path.join(omcStatePath, 'mcp-result.json');

      if (!fs.existsSync(resultPath)) {
        return null;
      }

      const data = JSON.parse(fs.readFileSync(resultPath, 'utf8'));

      // 읽은 후 파일 삭제 (한 번만 처리)
      fs.unlinkSync(resultPath);

      console.log('결과 가져오기 완료');
      return data;
    } catch (error) {
      console.error('결과 가져오기 실패:', error.message);
      return null;
    }
  }

  /**
   * @deprecated Use syncContext() instead
   */
  syncToOpenCode() { return this.syncContext(); }

  /**
   * @deprecated Use syncFromExternal() instead
   */
  syncFromOpenCode() { return this.syncFromExternal(); }

  /**
   * 동기화 중지
   */
  stopSync() {
    if (!this.isRunning) {
      console.log('동기화가 실행 중이지 않습니다.');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('컨텍스트 동기화 중지');
  }

  /**
   * 마지막 동기화 시간 조회
   * @returns {string|null} ISO 형식의 시간 문자열 또는 null
   */
  getLastSyncTime() {
    return this.lastSyncTime;
  }

  /**
   * 동기화 실행 상태 확인
   * @returns {boolean} 실행 중이면 true
   */
  isActive() {
    return this.isRunning;
  }
}
