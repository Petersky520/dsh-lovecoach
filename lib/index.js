// LoveCoach for DSH —— 把 replyher/lovecoach-skill 的能力做成 DSH 插件。
//
// 三件事：
//  1) 注册 `lovecoach` 工具：模型可调，返回结构化诊断 + 策略骨架（不写回聊天）。
//  2) 注册运行时技能 `lovecoach`：装上即可被模型按普通技能加载。
//  3) dsh-go 原生界面：输入框胶囊 + 面板，直接用剪贴板做本地诊断。
//
// 注意：这里刻意不 import 任何 @deepseek-ai/* —— 见 lib/tools.js 顶部的说明。
import { analyze } from './coach.js'
import { createTool } from './tools.js'
import { SKILL_BODY } from './skill-body.js'

export const name = 'local-lovecoach'

/** 技能目录里的短描述（≤ 500 字，会进会话技能目录）。 */
const SKILL_DESCRIPTION =
  'AI dating strategist grounded in attachment theory and real-world dynamics: decode a message and draft 5 stylistic replies, identify attachment style and pairing dynamics, spot shit tests (compliance/fitness/nuclear/jealousy), '
  + 'diagnose the relationship stage, plan dates, review how a date really went, set the flirting escalation pace, de-escalate fights and cold wars, and run breakup recovery. 恋爱教练、消息解读、依恋风格、废物测试、冷战、挽回。'

const SKILL_WHEN =
  'The user asks about attraction, texting, dating, mixed signals, a fight, a cold war, rejection or a breakup. Load it before giving any reply script or dating advice.'

/**
 * 插件入口。
 * @param {any} ctx cordis 上下文
 * @param {{ tone?: string }} [config]
 */
export function apply(ctx, config = {}) {
  const defaultTone = ['gentle', 'direct', 'blunt'].includes(config.tone) ? config.tone : 'direct'

  // 1) 模型可调的工具（没有 tools 服务的宿主上什么都不发生）
  ctx.inject(['tools'], (ctx) => {
    ctx.tools.register(createTool(defaultTone))
  })

  // 2) 运行时技能：装上即可被模型加载，不需要往 ~/.dsh/skills 里放文件
  ctx.inject(['skills'], (ctx) => {
    ctx.skills.register({
      name: 'lovecoach',
      description: SKILL_DESCRIPTION,
      whenToUse: SKILL_WHEN,
      content: SKILL_BODY,
    })
  })

  // 3) dsh-go 原生界面（只有装了桥接的主机才有 dshGo）
  ctx.inject(['dshGo'], (ctx) => {
    registerNative(ctx, defaultTone)
  })
}

/** 判断是否英文环境；视图与数据函数共用。 */
function isEn(locale) {
  return String(locale ?? '').startsWith('en')
}

/**
 * dsh-go 的胶囊与面板。全部是本地规则，不联网、不调模型。
 * @param {any} ctx
 * @param {string} defaultTone
 */
function registerNative(ctx, defaultTone) {
  ctx.dshGo.on('coach-clip', (scope, event) => {
    const zh = !isEn(event.locale)
    const text = String(scope.clipboard ?? '').trim()
    if (text === '') return { toast: zh ? '剪贴板里没有文字' : 'The clipboard is empty' }
    const result = analyze({ text, tone: defaultTone, locale: zh ? 'zh' : 'en' })
    return {
      insert: promptFor(result, zh),
      toast: zh ? `已按「${result.stage.zh}」写好提问` : `Drafted for stage: ${result.stage.en}`,
    }
  })

  ctx.dshGo.panel('diagnose', {
    view: (_scope, caps) => panelView(caps),
    data: (scope, emit, caps) => {
      const zh = !isEn(caps.locale)
      const text = String(scope.clipboard ?? '').trim()
      if (text === '') {
        emit({
          empty: true,
          title: zh ? '还没有内容' : 'Nothing yet',
          message: zh ? '复制对方的话或你的描述，再打开这里。' : 'Copy their message or your description, then open this again.',
          steps: [],
          facts: [],
          advice: [],
          traps: [],
          headline: '',
          tone: 'info',
          subtitle: '',
          raw: '',
        })
        return () => {}
      }
      const result = analyze({ text, tone: defaultTone, locale: zh ? 'zh' : 'en' })
      emit({ ...panelData(result, zh), raw: text })
      return () => {}
    },
    actions: {
      ask: (_scope, event) => {
        const zh = !isEn(event.locale)
        const text = String(event.value?.text ?? '').trim()
        if (text === '') return { toast: zh ? '没有内容' : 'Nothing to send' }
        const result = analyze({ text, tone: defaultTone, locale: zh ? 'zh' : 'en' })
        return { insert: promptFor(result, zh), toast: zh ? '已放进输入框' : 'Put in the composer' }
      },
    },
  })
}

/** 面板的结构：值都绑定到 data() 推来的模型。 */
function panelView(caps) {
  const zh = !isEn(caps.locale)
  return {
    v: 2,
    type: 'stack',
    title: zh ? '恋爱教练' : 'LoveCoach',
    children: [
      { type: 'text', text: { $: 'data.title' }, style: { size: 'title', weight: 'semibold' } },
      { type: 'text', text: { $: 'data.subtitle' }, tone: 'muted' },
      { type: 'callout', text: { $: 'data.headline' }, tone: { $: 'data.tone' } },
      { type: 'steps', items: { $: 'data.steps' } },
      { type: 'keyValue', items: { $: 'data.facts' } },
      { type: 'list', items: { $: 'data.advice' } },
      { type: 'list', items: { $: 'data.traps' } },
      {
        type: 'actions',
        items: [{ label: zh ? '写成提问' : 'Draft prompt', action: { id: 'ask', args: { text: { $: 'data.raw' } } } }],
      },
    ],
  }
}

/**
 * 面板的数据模型。空数组是合法的「暂无」，App 会隐藏空块。
 * @param {ReturnType<typeof analyze>} result
 * @param {boolean} zh
 */
function panelData(result, zh) {
  const rows = [[zh ? '阶段' : 'Stage', zh ? result.stage.zh : result.stage.en]]
  if (result.coldWar) rows.push([zh ? '冷战' : 'Cold war', `${zh ? result.coldWar.zh : result.coldWar.en} · ${result.coldWar.severity}`])
  if (result.pairing) rows.push([zh ? '配对' : 'Pairing', result.pairing.key])
  if (result.tests.length > 0) rows.push([zh ? '测试' : 'Tests', result.tests.map((t) => t.zh).join(' / ')])
  if (result.safety.length > 0) rows.push([zh ? '安全' : 'Safety', result.safety.map((s) => s.zh).join(' / ')])

  const headline = result.escalated
    ? zh
      ? '这更像安全问题，不是恋爱技巧问题。'
      : 'This reads as a safety issue, not a dating problem.'
    : zh
      ? `当前阶段：${result.stage.zh}。${result.stage.mission}。`
      : `Stage: ${result.stage.en}. ${result.stage.mission}.`

  return {
    empty: false,
    title: zh ? '恋爱教练' : 'LoveCoach',
    subtitle: zh ? '本地诊断，不上传任何内容' : 'Local diagnosis, nothing leaves the device',
    headline,
    tone: result.escalated ? 'bad' : result.stage.id === 'crisis' ? 'warn' : 'info',
    steps: result.steps.slice(0, 6).map((s) => ({ label: s.label, status: s.status, ...(s.detail ? { detail: s.detail } : {}) })),
    facts: rows,
    advice: result.strategy.slice(0, 4).map((s) => ({ title: s })),
    traps: result.traps.slice(0, 3).map((s) => ({ title: s, tone: 'warn', icon: 'warning' })),
  }
}

/**
 * 把诊断写成一段可以直接发进对话的提问，让主模型来写具体话术。
 * @param {ReturnType<typeof analyze>} result
 * @param {boolean} zh
 */
function promptFor(result, zh) {
  if (zh) {
    return [
      '帮我看看这段关系和接下来怎么走。我的情况：',
      '',
      '（把对方的话或你的描述贴在下面，替换这一行）',
      '',
      `本地初判：阶段=${result.stage.zh}${result.coldWar ? `；冷战类型=${result.coldWar.zh}` : ''}${result.tests.length ? `；疑似${result.tests[0].zh}` : ''}${result.pairing ? `；依恋配对=${result.pairing.key}` : ''}。`,
      '',
      '给我：解读 + 3 条能直接发的话 + 这周的具体动作 + 一个要避开的坑。',
    ]
      .join('\n')
      .slice(0, 2000)
  }
  return [
    'Coach me on this situation and what to do next. My situation:',
    '',
    '(paste their message or describe what happened, replacing this line)',
    '',
    `Local read: stage=${result.stage.en}${result.coldWar ? `; cold war=${result.coldWar.en}` : ''}${result.tests.length ? `; possible ${result.tests[0].en}` : ''}${result.pairing ? `; pairing=${result.pairing.key}` : ''}.`,
    '',
    'Give me: the decode, 3 sendable lines, concrete moves for this week, and one trap to avoid.',
  ]
    .join('\n')
    .slice(0, 2000)
}
