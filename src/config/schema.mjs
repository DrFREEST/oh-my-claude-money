/**
 * schema.mjs - 설정 파일 스키마 검증 v0.8.0
 *
 * agent-mapping.json, routing-rules.json 등의
 * 설정 파일 유효성을 검증합니다.
 *
 * @since v0.8.0
 */

// =============================================================================
// 스키마 정의
// =============================================================================

const AGENT_MAPPING_SCHEMA = {
  type: 'object',
  required: ['mappings'],
  properties: {
    mappings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['source', 'target'],
        properties: {
          source: {
            type: 'array',
            items: { type: 'string' },
            minItems: 1,
          },
          target: { type: 'string' },
          provider: {
            type: 'string',
            enum: ['opencode', 'claude', 'openai', 'google'],
          },
          model: { type: 'string' },
          tier: {
            type: 'string',
            enum: ['HIGH', 'MEDIUM', 'LOW'],
          },
          reason: { type: 'string' },
        },
      },
    },
    fallback: {
      type: 'object',
      properties: {
        provider: { type: 'string' },
        model: { type: 'string' },
      },
    },
  },
};

const ROUTING_RULES_SCHEMA = {
  type: 'object',
  required: ['rules'],
  properties: {
    rules: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'condition', 'action'],
        properties: {
          id: { type: 'string' },
          condition: { type: 'string' },
          action: {
            type: 'string',
            enum: [
              'prefer_opencode',
              'force_opencode',
              'prefer_claude',
              'force_claude',
              'block',
              'default',
            ],
          },
          priority: { type: 'number' },
          description: { type: 'string' },
        },
      },
    },
  },
};

const CONFIG_SCHEMA = {
  type: 'object',
  properties: {
    threshold: { type: 'number', minimum: 0, maximum: 100 },
    keywords: {
      type: 'array',
      items: { type: 'string' },
    },
    fusionDefault: { type: 'boolean' },
    routing: {
      type: 'array',
      items: {
        type: 'object',
        required: ['from', 'to'],
        properties: {
          from: { type: 'string' },
          to: { type: 'string' },
          provider: { type: 'string' },
        },
      },
    },
  },
};

// =============================================================================
// 타입 검증 함수
// =============================================================================

function validateType(value, expectedType) {
  switch (expectedType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    default:
      return true;
  }
}

// =============================================================================
// 스키마 검증 함수
// =============================================================================

/**
 * 값이 스키마를 충족하는지 검증
 *
 * @param {any} value - 검증할 값
 * @param {object} schema - 스키마 정의
 * @param {string} path - 현재 경로 (에러 메시지용)
 * @returns {object} { valid: boolean, errors: string[] }
 */
function validateAgainstSchema(value, schema, path = '') {
  const errors = [];

  // 타입 검증
  if (schema.type && !validateType(value, schema.type)) {
    errors.push(`${path || 'root'}: Expected ${schema.type}, got ${typeof value}`);
    return { valid: false, errors };
  }

  // enum 검증
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path || 'root'}: Value must be one of [${schema.enum.join(', ')}]`);
  }

  // 숫자 범위 검증
  if (schema.type === 'number') {
    if (typeof schema.minimum !== 'undefined' && value < schema.minimum) {
      errors.push(`${path || 'root'}: Value must be >= ${schema.minimum}`);
    }
    if (typeof schema.maximum !== 'undefined' && value > schema.maximum) {
      errors.push(`${path || 'root'}: Value must be <= ${schema.maximum}`);
    }
  }

  // 배열 검증
  if (schema.type === 'array' && Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems) {
      errors.push(`${path || 'root'}: Array must have at least ${schema.minItems} items`);
    }
    if (schema.maxItems && value.length > schema.maxItems) {
      errors.push(`${path || 'root'}: Array must have at most ${schema.maxItems} items`);
    }
    if (schema.items) {
      value.forEach((item, index) => {
        const result = validateAgainstSchema(item, schema.items, `${path}[${index}]`);
        errors.push(...result.errors);
      });
    }
  }

  // 객체 검증
  if (schema.type === 'object' && typeof value === 'object' && value !== null) {
    // 필수 필드 검증
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in value)) {
          errors.push(`${path || 'root'}: Missing required field "${field}"`);
        }
      }
    }

    // 프로퍼티 검증
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in value) {
          const result = validateAgainstSchema(value[key], propSchema, `${path}.${key}`);
          errors.push(...result.errors);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// 공개 API
// =============================================================================

/**
 * agent-mapping.json 검증
 *
 * @param {object} config - 파싱된 설정 객체
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validateAgentMapping(config) {
  return validateAgainstSchema(config, AGENT_MAPPING_SCHEMA);
}

/**
 * routing-rules.json 검증
 *
 * @param {object} config - 파싱된 설정 객체
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validateRoutingRules(config) {
  return validateAgainstSchema(config, ROUTING_RULES_SCHEMA);
}

/**
 * config.json 검증
 *
 * @param {object} config - 파싱된 설정 객체
 * @returns {object} { valid: boolean, errors: string[] }
 */
export function validateConfig(config) {
  return validateAgainstSchema(config, CONFIG_SCHEMA);
}

/**
 * 파일에서 설정 로드 및 검증
 *
 * @param {string} filePath - 설정 파일 경로
 * @param {string} schemaType - 스키마 타입 ('agent-mapping', 'routing-rules', 'config')
 * @returns {object} { valid: boolean, errors: string[], data?: object }
 */
export async function loadAndValidate(filePath, schemaType) {
  const fs = await import('fs');

  if (!fs.existsSync(filePath)) {
    return {
      valid: false,
      errors: [`File not found: ${filePath}`],
    };
  }

  let data;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    data = JSON.parse(content);
  } catch (e) {
    return {
      valid: false,
      errors: [`JSON parse error: ${e.message}`],
    };
  }

  let result;
  switch (schemaType) {
    case 'agent-mapping':
      result = validateAgentMapping(data);
      break;
    case 'routing-rules':
      result = validateRoutingRules(data);
      break;
    case 'config':
      result = validateConfig(data);
      break;
    default:
      return {
        valid: false,
        errors: [`Unknown schema type: ${schemaType}`],
      };
  }

  if (result.valid) {
    return { ...result, data };
  }

  return result;
}

/**
 * 설정 검증 결과 포맷팅
 *
 * @param {object} result - 검증 결과
 * @returns {string} 포맷된 메시지
 */
export function formatValidationResult(result) {
  if (result.valid) {
    return '✅ Configuration is valid';
  }

  const errorList = result.errors.map((e) => `  - ${e}`).join('\n');
  return `❌ Configuration errors:\n${errorList}`;
}

// =============================================================================
// 스키마 내보내기
// =============================================================================

export const schemas = {
  agentMapping: AGENT_MAPPING_SCHEMA,
  routingRules: ROUTING_RULES_SCHEMA,
  config: CONFIG_SCHEMA,
};
