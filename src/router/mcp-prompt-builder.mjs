/**
 * mcp-prompt-builder.mjs - MCP 프롬프트 최적화 빌더
 *
 * MCP-First 아키텍처에서 ask_codex/ask_gemini 호출 시
 * 프롬프트를 최적화하고 필요한 파라미터를 구성합니다.
 *
 * @version 3.0.0
 */
import { existsSync, mkdirSync } from 'fs';
import { join, basename } from 'path';

var HOME = process.env.HOME || '';
var MCP_OUTPUT_DIR = join(HOME, '.omcm', 'mcp-outputs');

/**
 * MCP 출력 디렉토리 확보
 */
function ensureOutputDir() {
  if (!existsSync(MCP_OUTPUT_DIR)) {
    mkdirSync(MCP_OUTPUT_DIR, { recursive: true });
  }
}

/**
 * MCP agent_role에 맞는 시스템 프리픽스 생성
 * @param {string} agentRole - OMC 에이전트 타입
 * @returns {string} - 역할별 프리픽스
 */
export function getRolePrefix(agentRole) {
  var prefixes = {
    'architect': 'You are a strategic architecture advisor. Analyze the code and provide architectural guidance.',
    'debugger': 'You are a root-cause analysis expert. Investigate the issue and identify the root cause.',
    'code-reviewer': 'You are an expert code reviewer. Review the code for logic defects, maintainability, and best practices.',
    'security-reviewer': 'You are a security specialist (OWASP Top 10). Identify vulnerabilities and suggest fixes.',
    'style-reviewer': 'You are a code style expert. Check formatting, naming conventions, and idioms.',
    'quality-reviewer': 'You are a quality assurance expert. Check for logic defects, SOLID principles, and anti-patterns.',
    'api-reviewer': 'You are an API design expert. Review contracts, backward compatibility, and error semantics.',
    'performance-reviewer': 'You are a performance optimization expert. Identify hotspots and suggest improvements.',
    'test-engineer': 'You are a test engineering expert. Design test strategies and write comprehensive tests.',
    'planner': 'You are a strategic planning consultant. Create detailed implementation plans.',
    'critic': 'You are a critical reviewer. Evaluate plans and implementations for completeness and correctness.',
    'analyst': 'You are a requirements analyst. Analyze requirements and identify gaps, risks, and edge cases.',
    'verifier': 'You are a verification specialist. Verify implementations against requirements with evidence.',
    'designer': 'You are a UI/UX designer-developer. Create stunning, accessible interfaces.',
    'writer': 'You are a technical documentation writer. Write clear, concise documentation.',
    'vision': 'You are a visual analysis expert. Analyze images, diagrams, and visual content.',
    'ux-researcher': 'You are a UX researcher. Conduct heuristic audits and usability analysis.',
    'quality-strategist': 'You are a quality strategy consultant. Assess release readiness, risk, and quality gates.',
    'product-manager': 'You are a product manager. Frame problems, prioritize features, and write PRDs.',
    'information-architect': 'You are an information architect. Design taxonomies, navigation models, and naming conventions.',
    'product-analyst': 'You are a product analyst. Design metrics, funnels, and experiment measurements.',
    'dependency-expert': 'You are a dependency expert. Evaluate packages, APIs, and external SDKs.',
    'scientist': 'You are a data scientist. Analyze data, test hypotheses, and derive insights.',
  };
  return prefixes[agentRole] || 'You are a helpful assistant.';
}

/**
 * MCP output_file 경로 생성
 * @param {string} agentRole - 에이전트 역할
 * @param {string} [sessionId] - 세션 ID
 * @returns {string} - 출력 파일 경로
 */
export function getOutputFilePath(agentRole, sessionId) {
  ensureOutputDir();
  var timestamp = Date.now();
  var dir = sessionId ? join(MCP_OUTPUT_DIR, sessionId) : MCP_OUTPUT_DIR;
  if (sessionId && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return join(dir, agentRole + '-' + timestamp + '.md');
}

/**
 * Task prompt에서 파일 경로 추출 (context_files용)
 * @param {string} prompt - 원본 프롬프트
 * @returns {string[]} - 발견된 파일 경로 목록
 */
export function extractFilePaths(prompt) {
  if (!prompt) return [];

  // 일반적인 파일 경로 패턴 매칭
  var patterns = [
    /(?:^|\s)(\/[\w./-]+\.(?:mjs|js|ts|tsx|jsx|py|json|md|yaml|yml|toml))/g,
    /(?:^|\s)(src\/[\w./-]+)/g,
    /(?:^|\s)(hooks\/[\w./-]+)/g,
  ];

  var found = {};
  for (var i = 0; i < patterns.length; i++) {
    var match;
    while ((match = patterns[i].exec(prompt)) !== null) {
      var filePath = match[1].trim();
      if (filePath && existsSync(filePath)) {
        found[filePath] = true;
      }
    }
  }

  return Object.keys(found);
}

/**
 * MCP 프롬프트 파일 내용 생성
 * @param {string} agentRole - 에이전트 역할
 * @param {string} prompt - 원본 Task 프롬프트
 * @returns {string} - MCP용 최적화된 프롬프트
 */
export function buildMcpPrompt(agentRole, prompt) {
  var prefix = getRolePrefix(agentRole);
  return prefix + '\n\n---\n\n' + (prompt || '');
}

/**
 * MCP 호출 파라미터 전체 구성
 * @param {string} mcpTool - 'ask_codex' | 'ask_gemini'
 * @param {string} agentRole - 에이전트 역할
 * @param {string} prompt - 원본 Task 프롬프트
 * @param {string} [sessionId] - 세션 ID
 * @returns {object} - { mcpTool, agentRole, promptContent, outputFile, contextFiles }
 */
export function buildMcpParams(mcpTool, agentRole, prompt, sessionId) {
  var promptContent = buildMcpPrompt(agentRole, prompt);
  var outputFile = getOutputFilePath(agentRole, sessionId);
  var contextFiles = extractFilePaths(prompt);

  return {
    mcpTool: mcpTool,
    agentRole: agentRole,
    promptContent: promptContent,
    outputFile: outputFile,
    contextFiles: contextFiles,
  };
}
