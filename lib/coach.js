// LoveCoach 本地分析引擎：不联网、不调模型，纯规则把一段描述拆成结构化诊断。
// 输出给两处用：模型（合成最终话术）和 dsh-go 原生面板（直接画）。
import {
  ATTACHMENT,
  COLD_WAR,
  CONFLICT,
  ESCALATION,
  PAIRINGS,
  POST_DATE_SIGNALS,
  RECOVERY,
  REPLY_STYLES,
  SAFETY,
  SHIT_TESTS,
  SIGNALS,
  STAGES,
  TONES,
} from './data.js'

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n))

/** 中文数字 → 阿拉伯数字，只处理 1-99（「两天」「十几条」这类描述里够用）。 */
const CN_DIGIT = { 零: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }

/**
 * 解析「两天」「3 周」「a week」这类时长里的数字。
 * @param {string} raw
 * @returns {number|undefined}
 */
const EN_NUM = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, a: 1, an: 1 }

/**
 * 解析时长里的数字：阿拉伯数字、中文数字，或英文数词（two / a couple）。
 * @param {string} raw
 * @returns {number|undefined}
 */
export function toNumber(raw) {
  if (raw === undefined) return undefined
  const s = String(raw).trim().toLowerCase()
  if (/^\d+$/.test(s)) return Number(s)
  if (s in EN_NUM) return EN_NUM[s]
  if (s === 'a couple' || s === 'couple') return 2
  if (s.startsWith('十')) return 10 + (CN_DIGIT[s[1]] ?? 0)
  if (s.includes('十')) {
    const [a, b] = s.split('十')
    return (CN_DIGIT[a] ?? 0) * 10 + (CN_DIGIT[b] ?? 0)
  }
  if (s.length === 1 && s in CN_DIGIT) return CN_DIGIT[s]
  return undefined
}

/**
 * 从自由描述里打分挑出命中的信号。
 * @param {string} text 用户描述
 * @returns {{ tag: string, zh: string, stage: string, score: number, hits: string[] }[]}
 */
export function detectSignals(text) {
  const hay = ` ${String(text ?? '').toLowerCase()} `
  const out = []
  for (const sig of SIGNALS) {
    const hits = []
    for (const p of sig.pattern) {
      const needle = p.toLowerCase()
      if (needle.trim() === '') continue
      // 中文短词直接包含；英文词要求词边界，避免 "date" 命中 "update"
      const isLatin = /^[\x00-\x7F]/.test(needle)
      const matched = isLatin ? new RegExp(`(^|[^a-z])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(hay) : hay.includes(needle)
      if (matched) hits.push(p)
    }
    if (hits.length > 0) out.push({ tag: sig.tag, zh: sig.zh, stage: sig.stage, score: sig.weight * (1 + 0.15 * (hits.length - 1)), hits })
  }
  return out.sort((a, b) => b.score - a.score)
}

/** 判断依恋风格；返回 { role: 'user'|'partner', style, confidence } 列表。 */
export function detectAttachment(text) {
  const t = String(text ?? '').toLowerCase()
  const rules = [
    { style: 'anxious', zh: ['焦虑', '怕被抛弃', '不回我', '是不是不爱', '反复看', '想太多', '黏', '确认', 'anxious', 'overthink', 'checking my phone', 'afraid', 'abandon'] },
    { style: 'avoidant', zh: ['回避', '需要空间', '想一个人', '消失', '不想被束缚', '怕亲密', 'avoidant', 'needs space', 'withdraw', 'smother', 'too close'] },
    { style: 'fearful-avoidant', zh: ['忽冷忽热', '靠近又退', '又想又怕', 'fearful', 'push and pull', 'hot and cold'] },
    { style: 'secure', zh: ['坦白沟通', '直接说', '安全感好', 'secure', 'communicate openly', 'feels safe'] },
  ]
  const found = []
  for (const r of rules) {
    const hits = r.zh.filter((p) => t.includes(p.toLowerCase()))
    if (hits.length > 0) found.push({ style: r.style, confidence: clamp(0.35 + 0.2 * hits.length, 0, 0.9), hits })
  }
  return found.sort((a, b) => b.confidence - a.confidence)
}

/** 配对动态：把双方风格组合成 PAIRINGS 的 key。 */
export function pairingOf(styles) {
  const uniq = [...new Set(styles)].filter((s) => s in ATTACHMENT)
  if (uniq.length < 2) return undefined
  const pair = [uniq[0], uniq[1]].sort().join('+')
  return PAIRINGS[pair] ? { key: pair, ...PAIRINGS[pair] } : undefined
}

/** 废物测试识别：返回命中的类型列表（按命中数排序）。 */
export function detectShitTest(text) {
  const t = String(text ?? '').toLowerCase()
  const out = []
  for (const [id, def] of Object.entries(SHIT_TESTS)) {
    const hits = def.patterns.filter((p) => t.includes(p.toLowerCase()))
    if (hits.length > 0) out.push({ id, ...def, hits })
  }
  return out.sort((a, b) => b.hits.length - a.hits.length)
}

/** 冷战诊断：类型 + 时长（能解析出「N 天」就用）。 */
export function detectColdWar(text) {
  const t = String(text ?? '')
  const { days } = extractCounts(t)
  const lower = t.toLowerCase()
  let id
  if (['取关', '删了合照', '删合照', '退回', '退了', '还我', '还给我', 'unfollow', 'deleted our photos', 'returned my', 'gave back'].some((p) => lower.includes(p.toLowerCase()))) id = 'exit'
  else if (['拉黑', '删了我', '当众', 'blocked', 'blocked me'].some((p) => lower.includes(p.toLowerCase()))) id = 'punishment'
  else if (['完全不回', '一条都不回', '彻底不回', 'no reply at all', 'gone silent'].some((p) => lower.includes(p.toLowerCase()))) id = 'shutdown'
  else if (days !== undefined && days >= 3) id = 'punishment'
  else if (days !== undefined && days >= 1) id = 'shutdown'
  else id = 'sulking'
  return { id, ...COLD_WAR[id], days }
}

/** 阶段推断：显式信号 > 描述的词汇线索 > 兜底 building。 */
export function detectStage(text, signals) {
  const top = signals.filter((s) => s.stage).sort((a, b) => b.score - a.score)[0]
  if (top) return { id: top.stage, ...STAGES[top.stage], why: `命中「${top.zh}」` }
  const t = String(text ?? '').toLowerCase()
  if (['刚认识', '刚加', '刚加上', '刚聊', '匹配', '相亲', '刚见', 'just met', 'matched on', 'matched with', 'first message', 'just started talking'].some((p) => t.includes(p.toLowerCase()))) return { id: 'ice-breaking', ...STAGES['ice-breaking'], why: '描述像刚接触' }
  if (['在一起', '男朋友', '女朋友', '老公', '老婆', 'committed', 'my girlfriend', 'my boyfriend', 'exclusive'].some((p) => t.includes(p.toLowerCase()))) return { id: 'committed', ...STAGES.committed, why: '描述里已是稳定关系' }
  return { id: 'building', ...STAGES.building, why: '按默认暧昧期处理' }
}

/**
 * 安全风险扫描：命中就强制让所有约会策略让位。
 *
 * 这里刻意用「动词 + 人称」而不是裸词，避免「打扰我」「打游戏」「推掉约会」这类误报；
 * 同时容忍「打了我」「推了我一把」这种中间插字。
 */
const SAFETY_RULES = [
  {
    code: 'violence',
    zh: '动手/威胁',
    re: [
      // 中文：动词 + 我/她/他/你/人（中间可插 了/着/过/得/到）
      /(?:打|推|掐|踢|扇|摔|揍|拽|抓|勒|咬|踹|捅|砸|拧|拖|绑)(?:了|着|过|得|到)?(?:我|她|他|你|人)(?![一几两\d]*(?:个|次|通)?(?:电话|游戏|字|车|卡|招呼))/,
      // 中文：把我/她/他 + 任意动词
      /把(?:我|她|他)[^。！？!?，,]{0,4}(?:按|推|打|掐|摔|拽|抓|撞|压|扔|踢|扇|勒|绑|锁|关)/,
      /(?:动手|威胁|家暴|殴打|掐脖子|按在墙上|摔东西|砸东西|拿刀|举拳)/,
      // 英文：暴力动词 + me/my
      /\b(?:hit|push|shove|slap|punch|kick|choke|strangle|grab|drag|pin|restrain|throw|threw|smack|bite|burn|stab)\s+(?:me|my)\b/,
      /\b(?:threw|throw|thrown|shoved|pushed|kicked|slapped|punched)\b[^.?!]{0,25}\bat\s+(?:me|my)\b/,
      /\b(?:he|she|they)\b[^.?!]{0,15}\b(?:hit|pushed|shoved|slapped|punched|kicked|choked|grabbed|dragged|pinned|threw)\s+(?:me|my|us)\b/,
      /\b(?:threatened|threaten|threats?)\b/,
      /\b(?:blocked|blocking)\b[^.?!]{0,20}\b(?:door|way|exit|leaving|from leaving)\b/,
      /\b(?:domestic violence|physical abuse|beat me up)\b/,
    ],
  },
  {
    code: 'control',
    zh: '控制/孤立',
    re: [
      /(?:不准|不许|不让|禁止|控制|限制)(?:我|她|他)/,
      /(?:查我手机|查手机|看我的手机|翻我手机|定位我|监控我|跟踪我|不让我见|不许我见|不准我见|孤立我)/,
      /\b(?:cannot|can ?not|can't|not allowed to|forbid(?:s|den)?|banned me)\b[^.?!]{0,30}\b(?:see|talk to|contact|leave|go out|friends?|family)\b/,
      /\b(?:checks?|checking|goes? through)\b[^.?!]{0,15}\b(?:my phone|my messages|my texts)\b/,
      /\b(?:tracks?|tracking|monitors?|monitoring|spies on|spying on)\b[^.?!]{0,15}\b(?:my|me|location|phone)\b/,
      /\b(?:isolat(?:e|es|ed|ing)|controls?|controlling)\b/,
      /\b(?:would do worse|will do worse|regret it|you'll be sorry)\b/,
      /\b(?:gets? angry|yells?|screams?)\b[^.?!]{0,25}\b(?:when i|if i|whenever i)\b/,
    ],
  },
  {
    code: 'selfharm',
    zh: '自伤/极端情绪',
    re: [
      /(?:自残|自杀|不想活|活不下去|活着没意思|想死|不如死了|伤害自己|结束生命)/,
      /\b(?:self[- ]?harm|suicid(?:e|al)|kill myself|want to die|end my life|cutting myself|hurt myself|cannot go on living|can't go on living|no reason to live)\b/,
    ],
  },
  {
    code: 'stalking',
    zh: '跟踪/骚扰倾向',
    re: [
      /(?:跟踪|蹲点|黑进|黑客|破解(?:她|他|对方)的|监视)/,
      /\b(?:stalk(?:ing)?|hack (?:her|his|their)|spy on|spying on|break into (?:her|his|their)|track (?:her|his|their) (?:location|phone))\b/,
    ],
  },
]

/**
 * 安全风险扫描：命中就强制优先提示。
 * @param {string} text
 * @returns {{ code: string, zh: string }[]}
 */
export function detectSafety(text) {
  const raw = String(text ?? '')
  const t = raw.toLowerCase()
  const risk = []
  for (const g of SAFETY_RULES) {
    if (g.re.some((re) => re.test(t))) risk.push({ code: g.code, zh: g.zh })
  }
  return risk
}

/** 把「N 条消息没回」「等 N 天」这类数字抽出来，供节奏建议使用。 */
export function extractCounts(text) {
  const t = String(text ?? '')
  const NUM = '(\\d+|[零一二两三四五六七八九十]+|a couple|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|an?)'
  const days = t.match(new RegExp(`${NUM}\\s*(天|日|day)`, 'i'))
  const weeks = t.match(new RegExp(`${NUM}\\s*(个?星期|周|weeks?)`, 'i'))
  const msgs = t.match(new RegExp(`${NUM}\\s*(条|次)?\\s*(微信|消息|message|text)`, 'i'))
  const d = toNumber(days?.[1])
  const w = toNumber(weeks?.[1])
  return {
    days: d !== undefined ? d : w !== undefined ? w * 7 : undefined,
    weeks: w,
    messages: toNumber(msgs?.[1]),
  }
}

/**
 * 主入口：把一段描述变成结构化诊断。
 * @param {{ text: string, tone?: 'gentle'|'direct'|'blunt', locale?: string }} input
 */
export function analyze({ text = '', tone = 'direct', locale = 'zh' } = {}) {
  const en = String(locale).startsWith('en')
  const signals = detectSignals(text)
  const stage = detectStage(text, signals)
  const attachment = detectAttachment(text)
  const pairing = pairingOf(attachment.map((a) => a.style))
  const tests = detectShitTest(text)
  const coldWar = signals.some((s) => s.tag === 'cold-war') ? detectColdWar(text) : undefined
  const safety = detectSafety(text)
  const counts = extractCounts(text)
  const toneDef = TONES[tone] ?? TONES.direct

  const steps = []
  if (coldWar) {
    steps.push({ label: en ? `Cold war: ${coldWar.en}` : `冷战类型：${coldWar.zh}`, status: 'current', detail: coldWar.move })
    steps.push({ label: en ? 'Stop the bombing' : '停止轰炸消息', status: 'todo', detail: en ? 'One message replaces ten. Silence is a move.' : '一条顶十条。先把消息停下来。' })
    if (coldWar.severity === 'critical') steps.push({ label: en ? 'Treat it as a breakup' : '按分手处理', status: 'todo', detail: en ? 'Respect it, do not beg.' : '尊重对方决定，不乞求。' })
  }
  if (signals.some((s) => s.tag === 'breakup')) {
    for (const s of RECOVERY) steps.push({ label: `${s.zh}（${s.days}）`, status: 'todo', detail: s.goal })
  }
  if (signals.some((s) => s.tag === 'postdate')) {
    for (const [, def] of Object.entries(POST_DATE_SIGNALS)) steps.push({ label: def.zh, status: 'current', detail: def.checks[0] })
  }
  if (stage.id === 'crisis') {
    steps.push({ label: en ? 'De-escalate first' : '先降温', status: 'current', detail: CONFLICT.principles[0] })
    steps.push({ label: en ? 'Then the root cause' : '再谈根因', status: 'todo', detail: CONFLICT.principles[2] })
  }

  const strategy = []
  if (coldWar) strategy.push(coldWar.move)
  if (stage.do) strategy.push(...stage.do.slice(0, 2))
  if (pairing) strategy.push(pairing.move)
  if (tests.length > 0) strategy.push(`${tests[0].zh}：${tests[0].pass}`)

  const traps = []
  if (stage.dont) traps.push(...stage.dont.slice(0, 2))
  if (coldWar && coldWar.severity === 'high') traps.push('不要再用长道歉文；重复的道歉会被读成敷衍。')
  if (tests.length > 0) traps.push('不要自证、不要解释太多 —— 越是解释越像心虚。')

  // 安全风险出现时， Dating 策略全部让位：先给安全结论，不教任何「怎么回她」。
  const escalated = safety.length > 0
  const safeStrategy = escalated
    ? [
        en ? 'This is not a dating problem. Name the safety issue first.' : '这不是恋爱技巧问题，先把安全问题指出来。',
        en ? 'Do not coach persistence, jealousy games or surveillance.' : '不做任何挽回、吃醋、查岗类建议。',
        en ? 'Suggest concrete support: a trusted person, a professional, or emergency services.' : '建议具体的支持：可信任的人、专业人士，必要时报警。',
      ]
    : strategy
  const safeTraps = escalated
    ? [en ? 'Do not treat violence or control as a communication problem.' : '不要把动手或控制当成「沟通问题」来和稀泥。']
    : traps
  const safeSteps = escalated
    ? [
        { label: en ? 'Safety first' : '先确认安全', status: 'current', detail: safety.map((s) => s.zh).join('、') },
        { label: en ? 'Reach a real person' : '找一个真实的人', status: 'todo', detail: en ? 'A friend, family member or professional — today.' : '朋友、家人或专业人士，今天就说。' },
      ]
    : steps

  return {
    locale,
    tone: { id: tone, ...toneDef },
    stage,
    signals,
    attachment,
    pairing,
    tests: escalated ? [] : tests,
    coldWar: escalated ? undefined : coldWar,
    safety,
    escalated,
    counts,
    steps: safeSteps,
    strategy: safeStrategy,
    traps: safeTraps,
    conflict: !escalated && stage.id === 'crisis' ? CONFLICT : undefined,
    escalation: !escalated && stage.id === 'heating' ? ESCALATION : undefined,
    recovery: !escalated && signals.some((s) => s.tag === 'breakup') ? RECOVERY : undefined,
    replyStyles: !escalated && signals.some((s) => s.tag === 'message') ? REPLY_STYLES : undefined,
    lines: SAFETY,
  }
}

/** 把诊断压成一段给模型看的紧凑文本（喂给工具返回，不写回聊天）。 */
export function brief(result) {
  const L = []
  L.push(`stage=${result.stage.id}(${result.stage.zh}) signals=${result.signals.map((s) => s.tag).join(',') || 'none'}`)
  if (result.attachment.length) L.push(`attachment=${result.attachment.map((a) => `${a.style}:${a.confidence.toFixed(2)}`).join(',')}`)
  if (result.pairing) L.push(`pairing=${result.pairing.key}`)
  if (result.tests.length) L.push(`shit_tests=${result.tests.map((t) => t.id).join(',')}`)
  if (result.coldWar) L.push(`cold_war=${result.coldWar.id}:${result.coldWar.severity}`)
  if (result.safety.length) L.push(`SAFETY=${result.safety.map((s) => s.code).join(',')}`)
  if (result.strategy.length) L.push(`strategy=${result.strategy.slice(0, 4).join(' | ')}`)
  if (result.traps.length) L.push(`traps=${result.traps.slice(0, 3).join(' | ')}`)
  return L.join('\n')
}
