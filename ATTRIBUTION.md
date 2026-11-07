# Attribution / 署名

## Upstream source / 上游来源

This plugin reimplements the coaching methodology of **LoveCoach**, an OpenClaw skill:

- **Repository**: <https://github.com/replyher/lovecoach-skill>
- **Author / 作者**: **ReplyHer** (`replyher`)
- **License**: MIT — Copyright (c) 2026 ReplyHer
- **Site**: <https://replyher.com>

The original project is a prompt-only OpenClaw *Skill*: a `SKILL.md` describing eight
coaching capabilities (message decode, attachment analysis, shit-test detection, stage
diagnosis, date planning, post-date review, cold-war triage, breakup recovery).

## What was reused / 借鉴了什么

| Element | Origin |
|---|---|
| Coaching framework: the six relationship stages, four attachment styles, four shit-test types, four cold-war severities, the four-stage breakup-recovery timeline, the five-stage escalation map | Restructured from `SKILL.md` |
| Behavioural rules ("never start with agreement", "short replies are more attractive", "two warm signals before each stronger move", the hard safety lines) | From `SKILL.md` |
| Skill body text (`lib/skill-body.js`) | Rewritten from `SKILL.md`, in Chinese, restructured to call the tool first |

## What is new / 新增了什么

| Element | Note |
|---|---|
| `lib/data.js` | The prose knowledge base turned into structured, queryable data |
| `lib/coach.js` | A local, offline rule engine: signal scoring, attachment pairing, cold-war severity inference, Chinese/English numeral parsing |
| `lib/tools.js` | A `lovecoach` tool with raw JSON Schema and zero `@deepseek-ai/*` imports (profile plugins cannot resolve them) |
| `lib/index.js` | dsh-go native surfaces: composer capsule, clipboard-driven panel, views |
| Safety escalation | Regex-based detection across violence / control / self-harm / stalking, in both Chinese and English; a hit clears all dating tactics. The upstream project states this principle but ships only prose, with no executable rules |
| `test/` | 33 tests, including 19 missed-detection and 14 false-positive safety regressions found while auditing |

## If you are the upstream author / 如果你是上游作者

If ReplyHer would prefer this not carry their name, or would like the attribution phrased
differently, open an issue and it will be changed or removed.
