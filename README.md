# local-lovecoach — LoveCoach for DSH

> 借鉴自 **[replyher/lovecoach-skill](https://github.com/replyher/lovecoach-skill)** · 作者 **ReplyHer** · MIT · <https://replyher.com>
> 本仓库把那个提示词技能重写成可离线运行的 DSH 插件。详见 [ATTRIBUTION.md](ATTRIBUTION.md)。

把 [replyher/lovecoach-skill](https://github.com/replyher/lovecoach-skill)（MIT）的恋爱教练能力做成一个 DSH 插件。
不联网、不调模型、不上传任何内容：诊断全部在本地用规则跑完，具体话术交给当前会话的模型来写。

## 它给你什么

| 入口 | 在哪 | 做什么 |
|---|---|---|
| `lovecoach` 工具 | 模型自动调用 | 把一段描述拆成结构化诊断（阶段 / 依恋配对 / 废物测试 / 冷战类型 / 约会信号），返回策略骨架 |
| `lovecoach` 技能 | `/lovecoach` 或模型加载 | 完整的教练手册：8 项能力、回复格式、安全红线 |
| 胶囊「教练看剪贴板」 | 手机 App 输入框上方 | 复制对方的话 → 点一下 → 输入框里出现一条带本地初判的提问 |
| 面板「恋爱教练」 | 对话详情页「插件」页签 / 全部功能 | 结构化展示当前剪贴板的诊断：阶段、冷战类型、依恋配对、策略、要避开的坑 |

## 八个能力

1. **消息解读 + 5 条回复** — 调侃反转 / 果断主导 / 推拉 / 共情引导 / 极简钩子
2. **依恋风格分析** — 安全 / 焦虑 / 回避 / 恐惧回避，并按配对给建议（焦虑+回避 = 消耗循环）
3. **废物测试识别** — 服从 / 资格 / 核弹 / 嫉妒，给过法
4. **关系阶段诊断** — 破冰 → 升温 → 热恋前 → 稳定 → 危机 → 分手后
5. **约会策划** — 按阶段给方案 + 话题 + 约会后跟进
6. **约会后复盘** — 现场化学反应 / 投入度 / 约会后变化，判绿黄红
7. **冷战急救** — 赌气 / 关闭 / 惩罚 / 退出信号，各有打法
8. **挽回四阶段** — 断联 → 软着陆 → 重建 → 新契约

外加：暧昧期升温节奏（四维度）、冲突化解、安全红线。

## 安全优先

描述里出现动手、控制、自伤、跟踪时，分析器会 `escalated: true`，
**清空所有约会策略和废物测试**，只给安全建议。这条不让位。

## 怎么用

装好后直接说话就行：

- 「她说『还是做朋友吧』，我该怎么回？」
- 「我们冷战两天了，我发了 5 条微信都没回」
- 「昨天第一次约会聊了 4 小时，回家后她回复变慢了，还要不要约第二次？」
- "My ex broke up with me two weeks ago. Should I reach out?"

模型会在给建议前先调 `lovecoach` 拿诊断。手机上也可以先复制对方的话，点输入框上方的「教练看剪贴板」。

## 安装

```sh
dsh plugin --profile web add /root/.dsh/dsh-go/plugins/local-lovecoach
```

改完 `lib/` 里的代码后，要在 App 的「引擎」页重启引擎才生效（清单改动会自动重读）。

卸载：`dsh plugin --profile web remove local-lovecoach`，再删目录。

## 结构

```
lib/data.js        知识库：阶段 / 依恋 / 废物测试 / 冷战 / 挽回 / 升温 / 信号词表
lib/coach.js       本地分析引擎：分类、配对、安全升级、策略拼装（无依赖）
lib/tools.js       lovecoach 工具定义（原始 JSON Schema，零 @deepseek-ai 依赖）
lib/skill-body.js  运行时技能正文
lib/index.js       插件入口：工具 + 技能 + dsh-go 原生界面
test/              28 个测试（引擎 + 插件集成）
```

### 一条部署约束

profile 里装的插件在 `/root/.dsh/profiles/web` 下解析模块，那里**没有** `@deepseek-ai/dsh-tools`。
直接 `import { defineTool } from '@deepseek-ai/dsh-tools'` 会让整个插件加载失败，
所以这里手写 `output.schema`（原始 JSON Schema 子集）+ `render`（返回内容块数组），
形状与 `defineTool` 的产物一致，但零依赖。

## 自检

```sh
node "$DSH_HOME/skills/dsh-go-plugin/kit/bin/check.mjs" . --load   # 清单与视图
node --test "test/*.test.js"                                       # 引擎与集成
```

## 许可与署名

MIT（见 [LICENSE](LICENSE)）。

- **教练方法论与技能文本**：来自 [replyher/lovecoach-skill](https://github.com/replyher/lovecoach-skill)，
  作者 **ReplyHer**，MIT，Copyright (c) 2026 ReplyHer，官网 <https://replyher.com>。
- **本仓库新增**：结构化知识库、本地规则引擎、工具与 dsh-go 原生界面、安全识别与 33 个测试。

完整的「借鉴了什么 / 新增了什么」清单见 [ATTRIBUTION.md](ATTRIBUTION.md)。
