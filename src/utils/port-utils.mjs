/**
 * port-utils.mjs - 자동 포트 탐색 유틸리티
 *
 * 사용 가능한 로컬 포트를 자동으로 탐색합니다.
 *
 * @version 1.1.0
 */

import { createServer } from 'net';

var DEFAULT_SERVER_PORT = 4096;
var MAX_PORT_ATTEMPTS = 20;

/**
 * 포트 사용 가능 여부 확인
 */
export function isPortAvailable(port, hostname) {
  hostname = hostname || '127.0.0.1';
  return new Promise(function(resolve) {
    var server = createServer();
    server.once('error', function() { resolve(false); });
    server.once('listening', function() {
      server.close(function() { resolve(true); });
    });
    server.listen(port, hostname);
  });
}

/**
 * 사용 가능한 포트 찾기
 */
export async function findAvailablePort(startPort, hostname) {
  startPort = startPort || DEFAULT_SERVER_PORT;
  hostname = hostname || '127.0.0.1';

  for (var attempt = 0; attempt < MAX_PORT_ATTEMPTS; attempt++) {
    var port = startPort + attempt;
    var available = await isPortAvailable(port, hostname);
    if (available) return port;
  }
  throw new Error('No available port found in range ' + startPort + '-' + (startPort + MAX_PORT_ATTEMPTS - 1));
}

/**
 * 서버 포트 자동 선택
 */
export async function getAvailableServerPort(preferredPort, hostname) {
  preferredPort = preferredPort || DEFAULT_SERVER_PORT;
  hostname = hostname || '127.0.0.1';

  var available = await isPortAvailable(preferredPort, hostname);
  if (available) return { port: preferredPort, wasAutoSelected: false };

  var port = await findAvailablePort(preferredPort + 1, hostname);
  return { port: port, wasAutoSelected: true };
}

export { DEFAULT_SERVER_PORT };
