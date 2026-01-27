/**
 * 컨텍스트 전달 시스템 - 메인 모듈
 * @module context
 */

// Context Builder
export {
  buildContext,
  getRecentModifiedFiles,
  getReferencedFiles,
  getTodosByStatus,
  getRecentDecisions,
  getSessionLearnings
} from './context-builder.mjs';

// Context Serializer
export {
  serializeForOpenCode,
  serializeForJson,
  deserializeContext
} from './context-serializer.mjs';

// Context Synchronizer
export { ContextSynchronizer } from './context-sync.mjs';
