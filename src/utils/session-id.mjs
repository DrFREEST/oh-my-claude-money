/**
 * session-id.mjs - OMCM 세션 ID 관리
 *
 * 세션 ID 우선순위:
 * 1. OMCM_SESSION_ID 환경변수 (명시적)
 * 2. active-session.json에서 TTY로 조회
 * 3. TTY + 타임스탬프 기반 자동 생성
 * 4. null (CI, 백그라운드 - 글로벌 폴백)
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync, readlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createHash } from 'crypto';

const OMCM_DIR = join(homedir(), '.omcm');
const ACTIVE_SESSION_FILE = join(OMCM_DIR, 'active-session.json');
const SESSIONS_DIR = join(OMCM_DIR, 'sessions');

/**
 * 현재 TTY 경로 획득 (2단계 폴백)
 * 1. /proc 파일시스템 - 조상 프로세스의 stdin fd readlink (Linux, 블로킹 없음)
 * 2. SSH_TTY 환경변수
 *
 * 주의: `tty` 명령어는 stdin이 파이프일 때 블로킹을 유발하므로 사용하지 않음
 * @returns {string|null} TTY 경로 (예: /dev/pts/0) 또는 null
 */
export function getTty() {
  // 1단계: /proc 파일시스템에서 조상 프로세스 탐색 (Linux)
  // Claude Code는 중간 프로세스를 거쳐 실행하므로 부모~5세대까지 탐색
  try {
    let pid = process.ppid;
    for (let depth = 0; depth < 5 && pid && pid > 1; depth++) {
      const fdPath = '/proc/' + pid + '/fd/0';
      if (existsSync(fdPath)) {
        try {
          const target = String(readlinkSync(fdPath));
          if (target && (target.indexOf('/dev/pts/') === 0 || target.indexOf('/dev/tty') === 0)) {
            return target;
          }
        } catch (e) {
          // readlink 실패 시 다음 조상으로
        }
      }
      // 다음 조상으로 이동
      try {
        const statContent = readFileSync('/proc/' + pid + '/stat', 'utf8');
        const parts = statContent.split(') ');
        if (parts.length >= 2) {
          const fields = parts[1].split(' ');
          pid = parseInt(fields[1], 10); // ppid 필드
        } else {
          break;
        }
      } catch (e) {
        break;
      }
    }
  } catch (e) {
    // /proc 접근 실패 시 다음 단계로
  }

  // 2단계: SSH_TTY 환경변수
  if (process.env.SSH_TTY) {
    return process.env.SSH_TTY;
  }

  return null;
}

/**
 * 세션 ID 생성
 * @returns {string} 형식: YYYYMMDD_HHMMSS_hash6
 */
export function generateSessionId() {
  const now = new Date();
  const dateStr = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') + '_' +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');

  const tty = getTty();
  const seed = (tty || '') + '_' + process.pid + '_' + Date.now();
  const hash = createHash('md5').update(seed).digest('hex').slice(0, 6);

  return dateStr + '_' + hash;
}

/**
 * active-session.json 읽기
 * @returns {object|null}
 */
export function readActiveSessionFile() {
  if (!existsSync(ACTIVE_SESSION_FILE)) return null;
  try {
    return JSON.parse(readFileSync(ACTIVE_SESSION_FILE, 'utf-8'));
  } catch (e) {
    return null;
  }
}

/**
 * active-session.json에 세션 등록
 * @param {string} sessionId
 * @returns {void}
 */
export function registerSession(sessionId) {
  const tty = getTty();
  if (!tty) return; // TTY 없으면 등록 불가

  if (!existsSync(OMCM_DIR)) {
    mkdirSync(OMCM_DIR, { recursive: true });
  }

  let data = readActiveSessionFile();
  if (!data) {
    data = { sessions: {}, lastCleanup: new Date().toISOString() };
  }
  if (!data.sessions) {
    data.sessions = {};
  }

  data.sessions[tty] = {
    sessionId: sessionId,
    pid: process.pid,
    startTime: Date.now(),
    lastActivity: Date.now()
  };

  writeFileSync(ACTIVE_SESSION_FILE, JSON.stringify(data, null, 2));
}

/**
 * TTY로 세션 ID 조회 (active-session.json에서)
 * @returns {string|null}
 */
export function getSessionIdFromTty() {
  const tty = getTty();
  if (!tty) return null;

  const data = readActiveSessionFile();
  if (!data || !data.sessions || !data.sessions[tty]) return null;

  return data.sessions[tty].sessionId || null;
}

/**
 * 세션 ID 획득 (우선순위 기반)
 * 1. OMCM_SESSION_ID 환경변수
 * 2. active-session.json에서 TTY로 조회
 * 3. TTY + 타임스탬프 자동 생성 (등록도 함)
 * 4. null (글로벌 폴백)
 * @returns {string|null}
 */
export function getSessionId() {
  // 1. 환경변수
  const envId = process.env.OMCM_SESSION_ID;
  if (envId) return envId;

  // 2. active-session.json에서 TTY로 조회
  const ttyId = getSessionIdFromTty();
  if (ttyId) return ttyId;

  // 3. TTY 기반 자동 생성 (TTY가 있는 경우에만)
  const tty = getTty();
  if (tty) {
    const newId = generateSessionId();
    // 등록 및 세션 디렉토리 생성
    registerSession(newId);
    initializeSession(newId);
    return newId;
  }

  // 4. null (CI, 백그라운드)
  return null;
}

/**
 * 세션 디렉토리 경로
 * @param {string} sessionId
 * @returns {string}
 */
export function getSessionDir(sessionId) {
  return join(SESSIONS_DIR, sessionId);
}

/**
 * 세션 초기화 (디렉토리 및 메타데이터 생성)
 * @param {string} sessionId
 */
export function initializeSession(sessionId) {
  const sessionDir = getSessionDir(sessionId);
  if (!existsSync(sessionDir)) {
    mkdirSync(sessionDir, { recursive: true });
  }

  const infoFile = join(sessionDir, 'session-info.json');
  if (!existsSync(infoFile)) {
    const info = {
      sessionId: sessionId,
      startTime: new Date().toISOString(),
      tty: getTty(),
      pid: process.pid
    };
    writeFileSync(infoFile, JSON.stringify(info, null, 2));
  }
}

/**
 * 오래된 세션 정리
 * @param {number} maxAgeDays - 최대 보관 일수 (기본 7일)
 */
export function cleanupOldSessions(maxAgeDays = 7) {
  if (!existsSync(SESSIONS_DIR)) return;

  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const now = Date.now();

  try {
    const dirs = readdirSync(SESSIONS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory());

    for (const dir of dirs) {
      const dirPath = join(SESSIONS_DIR, dir.name);
      try {
        const stat = statSync(dirPath);
        if ((now - stat.mtimeMs) > maxAgeMs) {
          rmSync(dirPath, { recursive: true, force: true });
        }
      } catch (e) {
        // 개별 디렉토리 처리 실패 무시
      }
    }
  } catch (e) {
    // 정리 실패 무시
  }

  // active-session.json에서도 만료된 세션 제거
  const data = readActiveSessionFile();
  if (data && data.sessions) {
    const sessionKeys = Object.keys(data.sessions);
    let changed = false;
    for (const key of sessionKeys) {
      const session = data.sessions[key];
      if (session && session.lastActivity && (now - session.lastActivity) > maxAgeMs) {
        delete data.sessions[key];
        changed = true;
      }
    }
    if (changed) {
      data.lastCleanup = new Date().toISOString();
      try {
        writeFileSync(ACTIVE_SESSION_FILE, JSON.stringify(data, null, 2));
      } catch (e) { /* 무시 */ }
    }
  }
}

/**
 * 세션 활동 시간 갱신
 * @param {string} sessionId
 */
export function updateSessionActivity(sessionId) {
  const tty = getTty();
  if (!tty) return;

  const data = readActiveSessionFile();
  if (!data || !data.sessions || !data.sessions[tty]) return;

  data.sessions[tty].lastActivity = Date.now();
  try {
    writeFileSync(ACTIVE_SESSION_FILE, JSON.stringify(data, null, 2));
  } catch (e) { /* 무시 */ }
}

export { OMCM_DIR, ACTIVE_SESSION_FILE, SESSIONS_DIR };
