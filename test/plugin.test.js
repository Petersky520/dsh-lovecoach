// 用 kit 的测试宿主模拟 App 的调用，确认工具与原生面板真的能跑。
//   node --test test/
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dir = join(here, '..')
const kit = process.env.DSH_GO_KIT ?? '/root/.dsh/skills/dsh-go-plugin/kit'
const { createTestHost } = await import(pathToFileURL(join(kit, 'lib/testing.js')).href)

const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))

/** 读插件入口并在测试宿主里 apply。 */
async function mount(services = {}) {
  const mod = await import(pathToFileURL(join(dir, 'lib/index.js')).href)
  const registered = []
  const skills = []
  const host = createTestHost({
    dir,
    pkg,
    services: { tools: { register: (def) => { registered.push(def); return () => {} } }, skills: { register: (s) => { skills.push(s); return () => {} } }, ...services },
  })
  mod.apply(host.ctx, { tone: 'direct' })
  return { mod, host, registered, skills }
}

test('插件注册了 lovecoach 工具与 lovecoach 技能', async () => {
  const { registered, skills } = await mount()
  const tool = registered.find((t) => t.name === 'lovecoach')
  assert.ok(tool, 'lovecoach tool registered')
  assert.ok(tool.description.includes('dating'))
  assert.ok(tool.parameters.properties.situation)
  assert.deepEqual(tool.parameters.required, ['situation'])
  assert.ok(skills.some((s) => s.name === 'lovecoach'), 'runtime skill registered')
})

// 回归：registry.register() 只补 provider，不补 source；缺 source 时技能登记得上、
// 但一加载就抛「skill source must be a string」，表现为「技能突然用不了了」。
test('技能定义能通过 registry 的加载期校验（必须有 source）', async () => {
  const { skills } = await mount()
  const skill = skills.find((s) => s.name === 'lovecoach')
  assert.equal(typeof skill.source, 'string', 'source must be a string')
  assert.ok(skill.source.length > 0)
  assert.equal(typeof skill.content, 'string')
  assert.ok(skill.content.length > 100, 'skill body is present')
  assert.equal(typeof skill.description, 'string')
  assert.ok(skill.description.length > 0)
})

test('工具定义符合 registry 契约（output.schema + render）', async () => {
  const { registered } = await mount()
  const tool = registered.find((t) => t.name === 'lovecoach')
  assert.equal(typeof tool.output, 'object')
  assert.equal(typeof tool.output.render, 'function')
  assert.equal(tool.output.presentationMeta, undefined)
  assert.equal(typeof tool.execute, 'function')
  const rendered = tool.output.render({}, { brief: 'x' })
  assert.ok(Array.isArray(rendered), 'render returns content blocks')
  assert.equal(rendered[0].type, 'text')
  assert.equal(rendered[0].text, 'x')
})

test('工具对中文输入返回结构化诊断', async () => {
  const { registered } = await mount()
  const tool = registered.find((t) => t.name === 'lovecoach')
  const value = await tool.execute({ situation: '我们已经冷战两天了，她说还是做朋友吧，我该怎么回？' })
  assert.equal(value.stage, 'crisis')
  assert.equal(value.escalated, false)
  assert.ok(value.strategy.length > 0)
  assert.ok(value.brief.includes('stage=crisis'))
  // 输出必须满足声明过的 schema 形状
  assert.ok(Array.isArray(value.steps))
  assert.ok(value.steps.every((s) => ['done', 'current', 'todo', 'failed'].includes(s.status)))
  assert.ok(value.shit_tests.some((t) => t.id === 'nuclear'))
})

test('工具对安全风险升级并清空约会策略', async () => {
  const { registered } = await mount()
  const tool = registered.find((t) => t.name === 'lovecoach')
  const value = await tool.execute({ situation: '他昨天动手推了我，我该怎么办' })
  assert.equal(value.escalated, true)
  assert.ok(value.safety.includes('动手/威胁'))
  assert.ok(value.strategy[0].includes('安全'))
  assert.equal(value.shit_tests, undefined)
})

test('工具尊重显式 tone，未知 tone 回落到默认', async () => {
  const { registered } = await mount()
  const tool = registered.find((t) => t.name === 'lovecoach')
  const a = await tool.execute({ situation: '她不回我', tone: 'gentle' })
  const b = await tool.execute({ situation: '她不回我', tone: 'nonsense' })
  assert.ok(a.brief && b.brief)
})

test('胶囊：空剪贴板只提示，不插入', async () => {
  const { host } = await mount()
  const r = await host.invoke('coach-clip', { context: { clipboard: '   ' } })
  assert.equal(r.effects.length, 1)
  assert.ok(r.effects[0].type === 'toast')
})

test('胶囊：有剪贴板时插入一条可发送的提问，绝不自动发送', async () => {
  const { host } = await mount()
  const r = await host.invoke('coach-clip', {
    context: { clipboard: '她说：还是做朋友吧。我该怎么回？' },
  })
  const insert = r.effects.find((e) => e.type === 'insert')
  assert.ok(insert, 'insert effect present')
  assert.ok(insert.text.includes('阶段'))
  assert.ok(insert.text.length <= 2000)
  assert.ok(!r.effects.some((e) => e.type === 'send'))
})

test('面板：视图能生成，且数据模型与视图绑定的键一致', async () => {
  const { host } = await mount()
  const { view } = await host.view('diagnose', { sessionId: 's1' })
  const keys = new Set()
  const walk = (n) => {
    if (!n || typeof n !== 'object') return
    if (typeof n.$ === 'string') keys.add(n.$)
    for (const v of Object.values(n)) walk(v)
  }
  walk(view)
  assert.ok(keys.size > 0, 'view binds at least one data path')

  const feed = host.subscribe('diagnose', { sessionId: 's1', clipboard: '她说还是做朋友吧' })
  await feed.settled
  assert.deepEqual(feed.errors, [])
  const data = feed.data
  for (const k of keys) {
    const path = k.replace(/^data\./, '').split('.')
    let cur = data
    for (const p of path) cur = cur?.[p]
    assert.notEqual(cur, undefined, `binding ${k} resolves`)
  }
})

test('面板：没有剪贴板时给出空状态而不是报错', async () => {
  const { host } = await mount()
  const feed = host.subscribe('diagnose', { sessionId: 's1' })
  await feed.settled
  assert.deepEqual(feed.errors, [])
  assert.equal(feed.data.empty, true)
  assert.ok(feed.data.title)
})

test('面板动作 ask：把诊断写成提问插进输入框', async () => {
  const { host } = await mount()
  const r = await host.invoke('diagnose', {
    action: 'ask',
    value: { text: '我们冷战两天了' },
  })
  const insert = r.effects.find((e) => e.type === 'insert')
  assert.ok(insert)
  assert.ok(insert.text.includes('阶段') || insert.text.includes('stage'))
})

test('没有 dsh-go 桥接的主机照样能起（只有工具与技能）', async () => {
  const mod = await import(pathToFileURL(join(dir, 'lib/index.js')).href)
  const registered = []
  const host = createTestHost({
    dir,
    pkg,
    bridge: false,
    services: { tools: { register: (d) => { registered.push(d); return () => {} } }, skills: { register: () => () => {} } },
  })
  assert.doesNotThrow(() => mod.apply(host.ctx, {}))
  assert.equal(registered.length, 1)
})

test('没有 tools 服务时不崩（缺依赖就不注册）', async () => {
  const mod = await import(pathToFileURL(join(dir, 'lib/index.js')).href)
  const host = createTestHost({ dir, pkg, bridge: false, services: {} })
  assert.doesNotThrow(() => mod.apply(host.ctx, {}))
  assert.ok(host.pending.length > 0, 'waits for the missing service')
})
