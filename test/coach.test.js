// 纯 Node 测试：不需要 App、不需要网络。
//   node --test test/
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { analyze, brief, detectShitTest, detectSignals, detectSafety, detectColdWar, extractCounts, toNumber } from '../lib/coach.js'
import { STAGES, SHIT_TESTS, SAFETY } from '../lib/data.js'

test('toNumber 解析中文与阿拉伯数字', () => {
  assert.equal(toNumber('2'), 2)
  assert.equal(toNumber('两'), 2)
  assert.equal(toNumber('十'), 10)
  assert.equal(toNumber('十二'), 12)
  assert.equal(toNumber('二十'), 20)
  assert.equal(toNumber(undefined), undefined)
})

test('extractCounts 从「两天」「5 条微信」里取数字', () => {
  const c = extractCounts('她已经两天没理我了，我发了5条微信')
  assert.equal(c.days, 2)
  assert.equal(c.messages, 5)
})

test('extractCounts 把周换算成天', () => {
  assert.equal(extractCounts('冷战三个星期了').days, 21)
  assert.equal(extractCounts('two weeks of silence').days, 14)
})

test('detectSignals 命中冷战与分手', () => {
  const tags = detectSignals('我们冷战了三天，她说要分手').map((s) => s.tag)
  assert.ok(tags.includes('cold-war'))
  assert.ok(tags.includes('breakup'))
})

test('英文匹配不误伤子串（date ≠ update）', () => {
  const tags = detectSignals('I want to update my profile').map((s) => s.tag)
  assert.ok(!tags.includes('postdate'))
  assert.ok(detectSignals('our first date went well').map((s) => s.tag).includes('postdate'))
})

test('detectShitTest 识别核弹测试与资格测试', () => {
  assert.equal(detectShitTest('她说还是做朋友吧')[0].id, 'nuclear')
  assert.equal(detectShitTest('她说你是不是对每个女生都这样')[0].id, 'fitness')
  assert.equal(detectShitTest('她提了另一个男生在追她')[0].id, 'jealousy')
  assert.equal(detectShitTest('她说你先帮我个忙')[0].id, 'compliance')
})

test('detectColdWar 按严重度分级', () => {
  assert.equal(detectColdWar('她只是回得很短，明显在赌气').id, 'sulking')
  assert.equal(detectColdWar('她一整天完全不回我').id, 'shutdown')
  assert.equal(detectColdWar('她把我拉黑了').id, 'punishment')
  assert.equal(detectColdWar('她把我送的礼物退回来了').id, 'exit')
})

test('安全风险：动手会升级并清空约会策略', () => {
  assert.ok(detectSafety('他昨天动手推了我').some((s) => s.code === 'violence'))
  const r = analyze({ text: '他昨天动手推了我' })
  assert.equal(r.escalated, true)
  assert.equal(r.tests.length, 0)
  assert.equal(r.coldWar, undefined)
  assert.ok(r.strategy[0].includes('安全'))
})

test('安全风险：自伤与跟踪也命中', () => {
  assert.ok(analyze({ text: '我不想活了' }).escalated)
  assert.ok(analyze({ text: '我想黑进她的账号看看' }).escalated)
})

test('阶段推断：冷战走 crisis，分手走 post-breakup', () => {
  assert.equal(analyze({ text: '我们已经冷战两天了' }).stage.id, 'crisis')
  assert.equal(analyze({ text: '她两周前跟我分手了' }).stage.id, 'post-breakup')
  assert.equal(analyze({ text: '我们刚在探探上匹配，还没聊过' }).stage.id, 'ice-breaking')
})

test('依恋配对：焦虑 + 回避能组出来', () => {
  const r = analyze({ text: '我很焦虑，一不回我就想太多；他说他需要空间，一亲近就消失' })
  const styles = r.attachment.map((a) => a.style)
  assert.ok(styles.includes('anxious'))
  assert.ok(styles.includes('avoidant'))
  assert.equal(r.pairing?.key, 'anxious+avoidant')
})

test('每次分析都给出可用策略与非空 brief', () => {
  for (const text of ['她说还是做朋友吧', '第一约会聊了四小时', '她把我拉黑了', '', 'hello']) {
    const r = analyze({ text })
    assert.ok(r.strategy.length > 0, `strategy for "${text}"`)
    assert.ok(brief(r).length > 0)
    assert.ok(STAGES[r.stage.id])
  }
})

test('空输入不崩，且默认阶段合理', () => {
  const r = analyze({})
  assert.equal(r.stage.id, 'building')
  assert.equal(r.escalated, false)
})

test('英文输入不返回中文话术（阶段标签有英文）', () => {
  const r = analyze({ text: 'my ex broke up with me 2 weeks ago', locale: 'en' })
  assert.ok(r.stage.en)
  assert.ok(r.traps.every((t) => typeof t === 'string'))
})

test('知识库覆盖完整', () => {
  for (const id of Object.keys(STAGES)) assert.ok(STAGES[id].signs.length > 0, id)
  for (const id of Object.keys(SHIT_TESTS)) assert.ok(SHIT_TESTS[id].pass.length > 0, id)
  assert.ok(SAFETY.length >= 4)
})

test('面板数据里的值都是 App 能画的类型', () => {
  const r = analyze({ text: '她说还是做朋友吧，我该怎么回' })
  assert.ok(r.steps.every((s) => typeof s.label === 'string' && ['done', 'current', 'todo', 'failed'].includes(s.status)))
  assert.ok(r.signals.every((s) => typeof s.zh === 'string'))
})

// ── 安全识别回归 ────────────────────────────────────────────────────────────
// 这条线是插件里最重要的：漏报会让模型在有人身危险的处境里继续教恋爱技巧。
test('安全识别：英文暴力/控制/自伤全覆盖', () => {
  const mustHit = [
    'He pushed me during the argument',
    'He slapped me',
    'He shoved me into the wall',
    'He grabbed my wrist',
    'He threw a glass at me',
    'He blocked the door so I could not leave',
    'He says I cannot see my friends anymore',
    'He tracks my location',
    'He gets angry when I talk to my family',
    'He told me he would do worse if I keep talking to my friends',
    'I cannot go on living',
    'I have been cutting myself',
  ]
  for (const text of mustHit) {
    assert.ok(detectSafety(text).length > 0, `should flag: ${text}`)
  }
})

test('安全识别：中文暴力/控制全覆盖', () => {
  const mustHit = [
    '他打了我', '他推了我一把', '他把我按在墙上', '他摔了我的手机',
    '他每天查我手机', '他限制我出门', '他掐了我脖子', '他想打我',
    '我不想活了', '我在自残', '他在跟踪我',
  ]
  for (const text of mustHit) {
    assert.ok(detectSafety(text).length > 0, `should flag: ${text}`)
  }
})

test('安全识别：日常用语不误报', () => {
  const mustMiss = [
    '我今天打游戏打到很晚',
    '别打扰我了',
    '我推掉了一个约会',
    '她打了我一个电话',
    '他打击我的自信心',
    '我们吵架了',
    '我们冷战了',
    '她不理我了',
    'He said he was upset',
    'I am sad she did not reply',
    'She pushed back on my plan',
    'He hit the gym today',
    'He forgot my birthday',
  ]
  for (const text of mustMiss) {
    assert.deepEqual(detectSafety(text), [], `should NOT flag: ${text}`)
  }
})

test('安全升级时清空测试与冷战，策略只谈安全', () => {
  const r = analyze({ text: 'He pushed me during the argument and said he would do worse.' })
  assert.equal(r.escalated, true)
  assert.deepEqual(r.tests, [])
  assert.equal(r.coldWar, undefined)
  assert.ok(r.strategy[0].includes('安全') || r.strategy[0].includes('safety'))
})

test('安全升级对英文输入也给英文策略', () => {
  const r = analyze({ text: 'He hit me last night', locale: 'en' })
  assert.equal(r.escalated, true)
  assert.ok(r.strategy[0].toLowerCase().includes('safety'))
})
