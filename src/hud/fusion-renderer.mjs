/**
 * Fusion Metrics Renderer
 *
 * Renders fusion mode status for HUD display.
 */

// ANSI color codes
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

/**
 * Format token count (e.g., 12500 -> "12.5k")
 */
function formatTokens(tokens) {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return String(tokens);
}

/**
 * Get mode abbreviation
 */
function getModeAbbrev(mode) {
  switch (mode) {
    case 'save-tokens':
      return 'eco';
    case 'balanced':
      return 'bal';
    case 'quality-first':
      return 'qlt';
    default:
      return mode ? mode.slice(0, 3) : 'bal';
  }
}

/**
 * Get color based on routing rate
 */
function getRateColor(rate) {
  if (rate >= 60) {
    return GREEN;  // High savings
  }
  if (rate >= 30) {
    return CYAN;   // Moderate
  }
  return YELLOW;   // Low usage
}

/**
 * Render fusion mode metrics
 *
 * Format: ⚡53% 12.5k↗ G:5|O:3 eco
 *
 * @param {Object|null} state - Fusion state from fusion-tracker
 * @returns {string|null} - Formatted output or null if disabled
 */
export function renderFusionMetrics(state) {
  if (!state) {
    return null;
  }

  if (state.enabled === false) {
    return null;  // Hide when disabled
  }

  const parts = [];

  // Routing rate with color
  const rate = state.routingRate || 0;
  const rateColor = getRateColor(rate);
  parts.push(`⚡${rateColor}${rate}%${RESET}`);

  // Saved tokens (only if > 0)
  const savedTokens = state.estimatedSavedTokens || 0;
  if (savedTokens > 0) {
    parts.push(`${GREEN}${formatTokens(savedTokens)}↗${RESET}`);
  }

  // Current mode
  const modeAbbrev = getModeAbbrev(state.mode);
  parts.push(`${DIM}${modeAbbrev}${RESET}`);

  return parts.join(' ');
}

/**
 * Render compact fusion status (for minimal display)
 * Format: ⚡53%
 */
export function renderFusionCompact(state) {
  if (!state) {
    return null;
  }

  if (state.enabled === false) {
    return null;
  }

  const rate = state.routingRate || 0;
  const rateColor = getRateColor(rate);
  return `⚡${rateColor}${rate}%${RESET}`;
}

/**
 * Get color based on percentage (for limits)
 */
function getLimitColor(percent, isLimited) {
  if (isLimited || percent >= 100) {
    return RED;
  }
  if (percent >= 80) {
    return YELLOW;
  }
  return GREEN;
}

/**
 * Render provider limits
 * Format: CL:45% OAI:85% GEM:~60%
 *
 * @param {Object|null} limits - Provider limits from getLimitsForHUD()
 * @returns {string|null} - Formatted output or null if no data
 */
export function renderProviderLimits(limits) {
  if (!limits) {
    return null;
  }

  const parts = [];

  // Claude
  if (limits.claude) {
    const percent = limits.claude.percent || 0;
    const isLimited = limits.claude.isLimited || false;
    const color = getLimitColor(percent, isLimited);
    parts.push('C:' + color + percent + '%' + RESET);
  }

  // OpenAI
  if (limits.openai && limits.openai.percent !== null && limits.openai.percent !== undefined) {
    const percent = limits.openai.percent || 0;
    const isLimited = limits.openai.isLimited || false;
    const color = getLimitColor(percent, isLimited);
    parts.push('O:' + color + percent + '%' + RESET);
  }

  // Gemini (추정치 표시)
  if (limits.gemini) {
    const percent = limits.gemini.percent || 0;
    const isLimited = limits.gemini.isLimited || false;
    const color = getLimitColor(percent, isLimited);
    const tilde = limits.gemini.isEstimated ? '~' : '';
    parts.push('G:' + color + tilde + percent + '%' + RESET);
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(' ');
}

/**
 * Render provider routing counts
 * Format: CL:7|O:8|G:1 (라우팅 카운트, 항상 모든 프로바이더 표시)
 *
 * @param {Object|null} fusionState - Fusion state with byProvider counts
 * @returns {string|null} - Formatted output or null if no data
 */
export function renderProviderCounts(fusionState) {
  if (!fusionState || !fusionState.byProvider) {
    return null;
  }

  const bp = fusionState.byProvider;

  // Claude (Anthropic) - 항상 표시
  const cCount = typeof bp.anthropic === 'number' ? bp.anthropic : 0;

  // OpenAI - 항상 표시
  const oCount = typeof bp.openai === 'number' ? bp.openai : 0;

  // Gemini - 항상 표시
  const gCount = typeof bp.gemini === 'number' ? bp.gemini : 0;

  return `C:${cCount}|O:${oCount}|G:${gCount}`;
}

/**
 * Render fallback status
 * Format: 🔄 GPT-5.2-Codex (fallback)
 *
 * @param {Object|null} fallbackState - State from getCurrentOrchestrator()
 * @returns {string|null} - Formatted output or null if not in fallback
 */
export function renderFallbackStatus(fallbackState) {
  if (!fallbackState || !fallbackState.fallbackActive) {
    return null;
  }

  const model = fallbackState.model;
  if (!model) {
    return null;
  }

  const name = model.name || model.id || 'unknown';

  return YELLOW + '🔄' + name + RESET;
}

/**
 * Render combined provider info (limits + fallback)
 * For compact display
 *
 * @param {Object|null} limits - Provider limits
 * @param {Object|null} fallbackState - Fallback state
 * @returns {string|null} - Combined output
 */
export function renderProviderInfo(limits, fallbackState) {
  const limitsOutput = renderProviderLimits(limits);
  const fallbackOutput = renderFallbackStatus(fallbackState);

  const parts = [];
  if (limitsOutput) {
    parts.push(limitsOutput);
  }
  if (fallbackOutput) {
    parts.push(fallbackOutput);
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(' | ');
}

/**
 * Render provider token usage
 * Format: C:1.2k↓0.5k↑|O:3.4k↓1.2k↑|G:0.8k↓0.3k↑
 * ↓ = input tokens, ↑ = output tokens
 *
 * @param {Object} tokenData - Token data by provider
 * @param {Object} tokenData.claude - { input, output }
 * @param {Object} tokenData.openai - { input, output }
 * @param {Object} tokenData.gemini - { input, output }
 * @returns {string|null} - Formatted output or null if no data
 */
export function renderProviderTokens(tokenData) {
  if (!tokenData) {
    return null;
  }

  const parts = [];

  // Claude (C:)
  if (tokenData.claude && (tokenData.claude.input > 0 || tokenData.claude.output > 0)) {
    const input = formatTokens(tokenData.claude.input || 0);
    const output = formatTokens(tokenData.claude.output || 0);
    parts.push(`${CYAN}C${RESET}:${input}↓ ${output}↑`);
  }

  // OpenAI (O:)
  if (tokenData.openai && (tokenData.openai.input > 0 || tokenData.openai.output > 0)) {
    const input = formatTokens(tokenData.openai.input || 0);
    const output = formatTokens(tokenData.openai.output || 0);
    parts.push(`${GREEN}O${RESET}:${input}↓ ${output}↑`);
  }

  // Gemini (G:)
  if (tokenData.gemini && (tokenData.gemini.input > 0 || tokenData.gemini.output > 0)) {
    const input = formatTokens(tokenData.gemini.input || 0);
    const output = formatTokens(tokenData.gemini.output || 0);
    parts.push(`${YELLOW}G${RESET}:${input}↓ ${output}↑`);
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join(' | ');
}
