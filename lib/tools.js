// tools.js —— 只依赖 Node 内置模块，不 import @deepseek-ai/*。
//
// 原因：profile 里装的插件（`dsh plugin --profile web add`）在 `/root/.dsh/profiles/web`
// 下解析模块，那里没有 @deepseek-ai/dsh-tools；直接 import 会让整个插件加载失败。
// ctx.tools.register() 接受的是**原始 JSON Schema**（不是 defineTool 的作者写法），
// 所以这里手写 schema + execute，和 defineTool 的产物形状一致。
import { analyze, brief } from './coach.js'

const TONES = ['gentle', 'direct', 'blunt']

const STRING = { type: 'string' }
const STRING_ARRAY = { type: 'array', items: { type: 'string' } }

const STEP = {
  type: 'object',
  additionalProperties: false,
  properties: {
    label: { type: 'string' },
    status: { type: 'string' },
    detail: { type: 'string' },
  },
  required: ['label', 'status'],
}

const OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    stage: { type: 'string' },
    stage_label: { type: 'string' },
    escalated: { type: 'boolean' },
    signals: STRING_ARRAY,
    strategy: STRING_ARRAY,
    traps: STRING_ARRAY,
    steps: { type: 'array', items: STEP },
    pairing: {
      type: 'object',
      additionalProperties: false,
      properties: { key: STRING, summary: STRING, move: STRING },
      required: ['key', 'summary', 'move'],
    },
    shit_tests: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { id: STRING, label: STRING, read: STRING, pass: STRING, example: STRING },
        required: ['id', 'label', 'read', 'pass', 'example'],
      },
    },
    cold_war: {
      type: 'object',
      additionalProperties: false,
      properties: { id: STRING, label: STRING, severity: STRING, move: STRING },
      required: ['id', 'label', 'severity', 'move'],
    },
    safety: STRING_ARRAY,
    reply_styles: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { id: STRING, label: STRING },
        required: ['id', 'label'],
      },
    },
    brief: STRING,
  },
  required: ['stage', 'stage_label', 'escalated', 'signals', 'strategy', 'traps', 'steps', 'brief'],
}

const PARAMETERS = {
  type: 'object',
  additionalProperties: false,
  properties: {
    situation: {
      type: 'string',
      description:
        "What happened, in the user's own words: the message they got, the date, the fight, how long the silence lasted. The more specific, the better the diagnosis.",
    },
    focus: {
      type: 'string',
      description:
        'Optional: what the user actually wants — "reply" (draft a message), "diagnose" (read the situation), "plan" (date or escalation plan), "recover" (breakup/cold war).',
    },
    tone: {
      type: 'string',
      enum: TONES,
      description: 'Optional coaching tone; defaults to the plugin setting (direct).',
    },
  },
  required: ['situation'],
}

const DESCRIPTION =
  'Structured dating/relationship coaching: diagnose the stage, attachment dynamic, shit tests, cold war type or post-date signals from a description, and get stage-matched strategy plus reply-style options. '
  + 'Use it before writing any advice or reply script when the user shares a message they received, describes a date, a fight, a cold war, a rejection or a breakup. '
  + "It is a local rule engine — it returns the diagnosis and the strategy skeleton; you write the actual wording in the user's language."

/**
 * 构造一个 registry-ready 的工具定义（等价于 defineTool({...}) 的产物）。
 * @param {string} defaultTone
 */
export function createTool(defaultTone) {
  return {
    name: 'lovecoach',
    description: DESCRIPTION,
    parameters: PARAMETERS,
    output: {
      schema: OUTPUT_SCHEMA,
      // render 返回消息内容块数组（不是字符串）—— dsh-tools 的 pipeline 直接读 content.some。
      render: (_args, value) => [{ type: 'text', text: value.brief }],
    },
    async execute(args) {
      const situation = String(args?.situation ?? '')
      const tone = TONES.includes(args?.tone) ? args.tone : defaultTone
      const result = analyze({
        text: situation,
        tone,
        locale: /[\u4e00-\u9fa5]/.test(situation) ? 'zh' : 'en',
      })
      return toValue(result)
    },
  }
}

/**
 * 把 analyzer 结果压成工具返回值。
 * @param {ReturnType<typeof analyze>} result
 */
export function toValue(result) {
  return {
    stage: result.stage.id,
    stage_label: result.stage.zh,
    escalated: result.escalated,
    signals: result.signals.map((s) => s.tag),
    strategy: result.strategy,
    traps: result.traps,
    steps: result.steps.map((s) => ({ label: s.label, status: s.status, ...(s.detail ? { detail: s.detail } : {}) })),
    ...(result.pairing ? { pairing: { key: result.pairing.key, summary: result.pairing.zh, move: result.pairing.move } } : {}),
    ...(result.tests.length > 0
      ? { shit_tests: result.tests.map((t) => ({ id: t.id, label: t.zh, read: t.read, pass: t.pass, example: t.example })) }
      : {}),
    ...(result.coldWar
      ? { cold_war: { id: result.coldWar.id, label: result.coldWar.zh, severity: result.coldWar.severity, move: result.coldWar.move } }
      : {}),
    ...(result.safety.length > 0 ? { safety: result.safety.map((s) => s.zh) } : {}),
    ...(result.replyStyles ? { reply_styles: result.replyStyles.map((r) => ({ id: r.id, label: r.zh })) } : {}),
    brief: brief(result),
  }
}
