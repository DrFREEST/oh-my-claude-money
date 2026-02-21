/**
 * merger.mjs - Result synthesis for True Multi-model Fusion
 *
 * Builds specialized sub-prompts for each CLI provider and
 * merges their results into a structured synthesis.
 */

/**
 * Build a Codex-specialized prompt focused on code logic, security, and performance.
 *
 * @param {string} query - The original user query
 * @param {string|undefined} context - Optional code snippet or file content
 * @param {'code'|'design'|'both'} focus - Analysis focus
 * @returns {string}
 */
export function buildCodexPrompt(query, context, focus) {
  var focusInstruction;
  if (focus === 'design') {
    focusInstruction = 'Focus on code logic correctness, security vulnerabilities, and performance characteristics relevant to the design aspects.';
  } else {
    focusInstruction = 'Focus on: (1) code logic correctness and edge cases, (2) security vulnerabilities or risks, (3) performance implications and bottlenecks.';
  }

  var parts = [
    'You are a code analysis expert. ' + focusInstruction,
    '',
    'Query: ' + query
  ];

  if (context && context.trim()) {
    parts.push('', 'Context:', context.trim());
  }

  parts.push(
    '',
    'Provide a concise, structured analysis. Be specific and technical. Focus only on the aspects described above.'
  );

  return parts.join('\n');
}

/**
 * Build a Gemini-specialized prompt focused on design patterns, alternatives, and maintainability.
 *
 * @param {string} query - The original user query
 * @param {string|undefined} context - Optional code snippet or file content
 * @param {'code'|'design'|'both'} focus - Analysis focus
 * @returns {string}
 */
export function buildGeminiPrompt(query, context, focus) {
  var focusInstruction;
  if (focus === 'code') {
    focusInstruction = 'Focus on design patterns and architectural considerations relevant to the code-level question.';
  } else {
    focusInstruction = 'Focus on: (1) applicable design patterns and architectural approaches, (2) alternative implementations or approaches, (3) long-term maintainability and extensibility.';
  }

  var parts = [
    'You are a software design and architecture expert. ' + focusInstruction,
    '',
    'Query: ' + query
  ];

  if (context && context.trim()) {
    parts.push('', 'Context:', context.trim());
  }

  parts.push(
    '',
    'Provide a concise, structured analysis. Be specific and actionable. Focus only on the aspects described above.'
  );

  return parts.join('\n');
}

/**
 * Merge Codex and Gemini results into a structured synthesis string.
 *
 * @param {{success: boolean, output: string, error: string|null}} codexResult
 * @param {{success: boolean, output: string, error: string|null}} geminiResult
 * @param {string} query - The original query (used for synthesis header)
 * @returns {string}
 */
export function mergeResults(codexResult, geminiResult, query) {
  var sections = [];

  // Codex section
  if (codexResult.success && codexResult.output) {
    sections.push('## 코드/로직 분석 (Codex)\n\n' + codexResult.output.trim());
  } else {
    var codexError = codexResult.error || 'No output';
    sections.push('## 코드/로직 분석 (Codex)\n\n_분석 실패: ' + codexError + '_');
  }

  // Gemini section
  if (geminiResult.success && geminiResult.output) {
    sections.push('## 설계/대안 분석 (Gemini)\n\n' + geminiResult.output.trim());
  } else {
    var geminiError = geminiResult.error || 'No output';
    sections.push('## 설계/대안 분석 (Gemini)\n\n_분석 실패: ' + geminiError + '_');
  }

  // Synthesis summary only when both succeeded
  if (codexResult.success && geminiResult.success) {
    sections.push(
      '## 종합\n\n' +
      'Codex는 코드 로직/보안/성능 관점에서, Gemini는 설계 패턴/대안/유지보수성 관점에서 분석했습니다. ' +
      '위 두 섹션을 함께 참조하여 최적의 결정을 내리세요.'
    );
  } else if (!codexResult.success && !geminiResult.success) {
    sections.push('## 종합\n\n_두 모델 모두 분석에 실패했습니다. CLI 설치 및 네트워크 상태를 확인하세요._');
  } else {
    sections.push('## 종합\n\n_일부 모델의 분석만 사용 가능합니다. 위 결과를 참조하세요._');
  }

  return sections.join('\n\n');
}
