// 原始 JSON Schema 校验器：按 @deepseek-ai/dsh-tools 的 checkSchemaNode 规则逐条复刻。
// 用于在注册前/自检时捕获 schema 违规，避免 register() 抛错被吞掉。
// 依据：_dsh_asar/node_modules/@deepseek-ai/dsh-tools/lib/index.js（CONSTRAINT_KEYWORDS /
// ANNOTATION_KEYWORDS / SCHEMA_TYPES / checkObjectSchemaTail / ONE_OF_SIBLING_KEYWORDS）。

const CONSTRAINT_KEYWORDS = new Set(['type', 'oneOf', 'properties', 'required', 'additionalProperties', 'items', 'enum', 'const'])
const ANNOTATION_KEYWORDS = new Set(['description', 'title', 'default', 'examples'])
const SCHEMA_TYPES = ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null']
const ONE_OF_SIBLING_KEYWORDS = ['properties', 'required', 'additionalProperties', 'items', 'enum', 'const']

const isRecord = (v) => typeof v === 'object' && v !== null && !Array.isArray(v)
const isLossless = (v) => {
  try { JSON.stringify(v); return true } catch { return false }
}

function checkNode(node, path, violations) {
  if (!isRecord(node)) { violations.push(`${path} must be a schema object`); return }
  for (const key of Object.keys(node)) {
    if (CONSTRAINT_KEYWORDS.has(key)) continue
    if (ANNOTATION_KEYWORDS.has(key)) {
      if (!isLossless(node[key])) violations.push(`${path}.${key} annotation must be lossless JSON data`)
      continue
    }
    violations.push(`${path}.${key} is not a supported keyword (subset: type/oneOf/properties/required/additionalProperties/items/enum/const + annotations)`)
  }
  if (Object.hasOwn(node, 'description') && typeof node.description !== 'string') violations.push(`${path}.description must be a string`)
  if (Object.hasOwn(node, 'title') && typeof node.title !== 'string') violations.push(`${path}.title must be a string`)

  const hasType = Object.hasOwn(node, 'type')
  const hasOneOf = Object.hasOwn(node, 'oneOf')
  if (hasType && hasOneOf) { violations.push(`${path} cannot declare both type and oneOf`); return }
  if (!hasType && !hasOneOf) {
    for (const key of ONE_OF_SIBLING_KEYWORDS) if (Object.hasOwn(node, key)) violations.push(`${path}.${key} requires type or oneOf`)
    return
  }
  if (hasOneOf) {
    for (const key of ONE_OF_SIBLING_KEYWORDS) if (Object.hasOwn(node, key)) violations.push(`${path}.${key} is not supported beside oneOf`)
    if (!Array.isArray(node.oneOf) || node.oneOf.length < 2) violations.push(`${path}.oneOf must be an array of at least two schemas`)
    else node.oneOf.forEach((branch, i) => checkNode(branch, `${path}.oneOf[${i}]`, violations))
    return
  }
  const type = node.type
  if (typeof type !== 'string' || !SCHEMA_TYPES.includes(type)) {
    violations.push(`${path}.type must be one of ${SCHEMA_TYPES.join('/')}（raw register 不接受 "json"）`)
    return
  }
  const keywordTypes = {
    properties: ['object'], required: ['object'], additionalProperties: ['object'],
    items: ['array'], enum: ['string', 'number', 'integer', 'boolean', 'null'], const: ['string', 'number', 'integer', 'boolean', 'null'],
  }
  for (const [key, allowed] of Object.entries(keywordTypes)) {
    if (Object.hasOwn(node, key) && !allowed.includes(type)) {
      violations.push(`${path}.${key} is not supported on type "${type}"`)
    }
  }
  if (type === 'object') {
    if (Object.hasOwn(node, 'required')) {
      const required = node.required
      if (!Array.isArray(required) || required.some(x => typeof x !== 'string')) {
        violations.push(`${path}.required must be an array of strings`)
      } else {
        const declared = isRecord(node.properties) ? node.properties : {}
        for (const key of required) if (!Object.hasOwn(declared, key)) violations.push(`${path}.required names "${key}" which is not in properties`)
      }
    }
    if (Object.hasOwn(node, 'additionalProperties') && typeof node.additionalProperties !== 'boolean') {
      violations.push(`${path}.additionalProperties must be a boolean`)
    }
    for (const [key, child] of Object.entries(isRecord(node.properties) ? node.properties : {})) {
      checkNode(child, `${path}.properties.${key}`, violations)
    }
  }
  if (type === 'array' && Object.hasOwn(node, 'items')) checkNode(node.items, `${path}.items`, violations)
}

/** 返回违规清单；空数组表示 schema 属于受支持子集。 */
export function assertSupportedJsonSchema(schema, label = 'schema') {
  const violations = []
  checkNode(schema, label, violations)
  return violations
}
