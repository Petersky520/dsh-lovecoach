// LoveCoach 知识库：把 replyher/lovecoach-skill（MIT）的 SKILL.md 结构化成可检索的数据。
// 只放「判断依据 + 策略骨架」，具体措辞交给模型；这样插件不联网也能给出结构化诊断。
// 原文：https://github.com/replyher/lovecoach-skill (MIT, Copyright (c) 2026 ReplyHer)

/** 关系阶段。order 用于判断阶段先后，signals/advice 用于诊断。 */
export const STAGES = {
  'ice-breaking': {
    order: 1,
    zh: '破冰',
    en: 'Ice-breaking',
    signs: ['刚认识', '对话单向', '不知道聊什么', '他/她回复礼貌但短'],
    mission: '建立舒适感、展示个性，别急着证明自己',
    do: ['用具体、生活化的内容开场', '先给情绪价值再问问题', '把一次对话聊到意犹未尽就收'],
    dont: ['过早表白或暴露需求', '连发消息追问', '把对话聊成面试'],
  },
  building: {
    order: 2,
    zh: '升温',
    en: 'Building',
    signs: ['会主动找你', '开始开玩笑/调侃', '互相试探、有暧昧'],
    mission: '制造情绪起伏和张力，把好奇变成期待',
    do: ['加入一点推拉和调侃', '主动提议具体的事而不是问「有空吗」', '在她状态好时结束对话'],
    dont: ['把节奏拖成日常问候', '一直做「好好先生」', '反复确认对方是否喜欢你'],
  },
  heating: {
    order: 3,
    zh: '热恋期前',
    en: 'Heating up',
    signs: ['每天联系', '已经约过几次', '开始有肢体接触或明显依赖'],
    mission: '加深连接，避免进入平台期',
    do: ['把约会做得更有分量（时间更长、更私密）', '聊价值观和情感模式', '按顺序推进肢体接触'],
    dont: ['只做朋友式活动', '怕破坏气氛不敢推进', '用每天聊天代替真正的相处'],
  },
  committed: {
    order: 4,
    zh: '稳定期',
    en: 'Committed',
    signs: ['专属关系', '相处舒适', '开始有日常和惯性'],
    mission: '维系吸引力，别把关系过成室友',
    do: ['保留各自的生活和新鲜感', '定期做点不一样的事', '把不满在早期讲清楚'],
    dont: ['用「都这么熟了」当借口放弃经营', '把问题积攒到爆发', '把对方当成情绪垃圾桶'],
  },
  crisis: {
    order: 5,
    zh: '危机',
    en: 'Crisis',
    signs: ['吵架', '冷战', '提分手', '明显冷落'],
    mission: '先降温，再解决根因',
    do: ['先处理情绪再处理事情', '只谈具体行为不讲人格', '把根因摊开谈一次'],
    dont: ['用冷战当策略', '翻旧账', '用大动作掩盖结构性问题'],
  },
  'post-breakup': {
    order: 6,
    zh: '分手后',
    en: 'Post-breakup',
    signs: ['已经分开', '被拉黑或断联', '反复想起对方'],
    mission: '先恢复自己，再决定要不要争取',
    do: ['先断联让情绪归位', '复盘自己在关系里的那部分', '把生活重新排满'],
    dont: ['反复偷看对方社交动态', '深夜发长文', '用自我证明去换对方回头'],
  },
};

/** 依恋风格与配对动态。 */
export const ATTACHMENT = {
  secure: {
    zh: '安全型',
    en: 'Secure',
    signs: ['能自在地亲近也能独处', '冲突后愿意沟通', '不靠试探确认爱'],
    needs: '稳定和真诚就够，不需要套路',
  },
  anxious: {
    zh: '焦虑型',
    en: 'Anxious',
    signs: ['怕被抛弃', '需要频繁确认', '对方慢回就开始脑补', '过度分析每句话'],
    needs: '可预期的回应 + 自己练习自我安抚',
  },
  avoidant: {
    zh: '回避型',
    en: 'Avoidant',
    signs: ['一亲近就后退', '冲突时消失', '强调独立和空间', '不喜欢被要求'],
    needs: '安全感而不是追逐，压力越小越可能靠近',
  },
  'fearful-avoidant': {
    zh: '恐惧回避型',
    en: 'Fearful-avoidant',
    signs: ['想要亲密又害怕亲密', '靠近后突然抽离', '情绪起伏大'],
    needs: '慢节奏 + 明确的边界，避免忽冷忽热加剧不安',
  },
};

/** 配对动态：key 用 `a+b` 排序后的组合。 */
export const PAIRINGS = {
  'anxious+avoidant': {
    zh: '焦虑 + 回避：最经典的消耗型循环',
    detail: '一方越追，另一方越退；退得越远，追得越急。要点：追的一方先停手，退的一方先给一句回应。',
    move: '把「你为什么不理我」换成一句低压力的具体邀约，然后真的停下来等。',
  },
  'anxious+secure': {
    zh: '焦虑 + 安全：最有救的组合',
    detail: '安全型能提供稳定回应，但焦虑的一方必须自己承担一部分自我安抚，不能全压给对方。',
    move: '把「你不回我是不是不爱我」换成「我最近容易想多，你忙的时候给我一句话就行」。',
  },
  'avoidant+secure': {
    zh: '回避 + 安全：需要耐心但可行',
    detail: '安全型不追，回避型才有空间自己走回来。避免用情绪施压换回应。',
    move: '把要求改成邀请，给对方留出口，看他会不会主动回来。',
  },
  'avoidant+avoidant': {
    zh: '回避 + 回避：容易变成两条平行线',
    detail: '双方都会退，没人愿意先处理问题，关系会停在「还行但没进展」。',
    move: '必须有一个人先做具体动作（定时间、说一件真实感受），否则会一直悬着。',
  },
  'anxious+anxious': {
    zh: '焦虑 + 焦虑：情绪会被放大',
    detail: '双方都在等确认，容易一起焦虑互相推高，也可能一起沉溺。',
    move: '把需求说得具体可执行（几点、做什么），别用情绪强度换关注。',
  },
};

/** 废物测试类型与过法。 */
export const SHIT_TESTS = {
  compliance: {
    zh: '服从测试',
    en: 'Compliance test',
    patterns: ['你能帮我', '你帮我买', '你先', '你请我', '给我', '你陪我', '帮我个忙', '你发个红包'],
    read: '在试你是不是个有求必应的软柿子',
    pass: '给一个小让步但带上条件或玩笑，别立刻照做',
    example: '「行啊，你先请我喝一杯，我再考虑。」',
  },
  fitness: {
    zh: '资格测试',
    en: 'Fitness test',
    patterns: ['你是不是对每个', '你肯定', '你这种人', '你配', '你行不行', '你也就', '你以前是不是', '渣男', '海王'],
    read: '在试你的自信稳不稳，你急了就输了',
    pass: '别解释别自证，用玩笑把球踢回去',
    example: '「对，我见一个说一句，今天轮到你。」',
  },
  nuclear: {
    zh: '核弹测试',
    en: 'Nuclear test',
    patterns: ['还是做朋友', '做朋友吧', '我们不合适', '算了吧', '不想谈恋爱', '别联系了'],
    read: '在试你被拒绝时会不会崩，这是最危险的一类',
    pass: '稳住，不纠缠不挽留，用一句轻描淡写守住框架；如果她是认真的，就体面退出',
    example: '「行，那就当个有意思的朋友。」然后真的不再追。',
  },
  jealousy: {
    zh: '嫉妒测试',
    en: 'Jealousy test',
    patterns: ['有个男生', '有个男的', '另一个男', '别的男', '其他男', '我朋友说', '别人', '有人追', '追我', '我前任', '在跟别人聊', '同事约我', 'another guy', 'other guys', 'someone else', 'my ex', 'a guy at work'],
    read: '在看你反应多大，吃醋=掉价',
    pass: '毫不在意地接住，甚至可以顺势调侃',
    example: '「那你今天挺忙的，忙完记得跟我说点好玩的。」',
  },
};

/** 冷战类型。 */
export const COLD_WAR = {
  sulking: {
    zh: '赌气型',
    en: 'Sulking',
    duration: '几小时到 1 天',
    severity: 'low',
    read: '短句、阴阳怪气、但还在回 —— 她其实在等你追',
    move: '先发一个无关有趣的东西（表情包/吃的/猫），破冰之后再认错一句，时机 4-6 小时内',
  },
  shutdown: {
    zh: '关闭型',
    en: 'Shutdown',
    duration: '1-3 天',
    severity: 'medium',
    read: '完全不回 —— 她在消化，不是要你轰炸',
    move: '给 24 小时空间，然后只发一条温度性的：「想你了，你准备好了再聊」，不追问',
  },
  punishment: {
    zh: '惩罚型',
    en: 'Punishment',
    duration: '3 天以上',
    severity: 'high',
    read: '拉黑、删除、当众冷 —— 积怨已经形成',
    move: '不要又一段道歉长文。做一次打破模式的行动 + 「我知道对不起不够，我想弄明白我一直哪里做错了」',
  },
  exit: {
    zh: '退出信号型',
    en: 'Exit signal',
    duration: '任意',
    severity: 'critical',
    read: '退礼物、删合照、取关 —— 这不是冷战，是分手进行中',
    move: '不挽留不乞求，一句真诚收尾：「我看懂了。如果这是你要的，我尊重。但如果还有机会聊，我在。」然后安静',
  },
};

/** 挽回四阶段。 */
export const RECOVERY = [
  { zh: '断联期', en: 'No Contact', days: '第 1-30 天', goal: '让双方情绪回到基线', rules: ['不发消息、不「手滑」、不视奸', '写下分手的真实原因（自己的那部分）', '见朋友、运动、开新项目'] },
  { zh: '软着陆', en: 'Soft re-entry', days: '第 30-45 天', goal: '用低压力方式重新出现', rules: ['一条随意的、不是「我想你」的消息', '用只有你们俩懂的东西开场', '看回应温度：热→进下一阶段；平→再等两周；冷→放手'] },
  { zh: '重建期', en: 'Rebuild', days: '第 6-10 周', goal: '让对方看到不一样的你', rules: ['线下低压力见面（咖啡/散步）', '展示改变而不是宣告改变', '不提分手、不问「我们复合了吗」'] },
  { zh: '新契约', en: 'New Terms', days: '双方都准备好时', goal: '重新定义关系', rules: ['谈清「哪里坏了、现在哪里不同」', '明确新的边界和期待', '承认这是新关系，不是旧关系续集'] },
];

/** 升温时间线（暧昧到确认关系）。 */
export const ESCALATION = [
  { zh: '发现期', en: 'Discovery', goal: '建立舒适感和好奇', what: ['轻度但有节奏的联系', '话题在生活、趣味、幽默层面'] },
  { zh: '稳定联系', en: 'Consistency', goal: '形成节奏和双向投入', what: ['可以每天联系，只要双方自然', '第一次、第二次约会要低压力'] },
  { zh: '浪漫框架', en: 'Romantic framing', goal: '把关系从朋友感扭成男女感', what: ['更多调侃和个人分享', '眼神和距离上的靠近', '别一直停在朋友式互动'] },
  { zh: '升级期', en: 'Escalation', goal: '按顺序推进接触和专属感', what: ['约会时间更长更有分量', '按顺序推进肢体接触（长抱→牵手→更近）', '对方停顿或后退就顺势下移，不硬推'] },
  { zh: '定义期', en: 'Definition', goal: '把「我们是什么」说清楚', what: ['在双方节奏稳定后再谈', '不要在不确定期逼对方定义'] },
];

/** 约会后复盘的三类信号。 */
export const POST_DATE_SIGNALS = {
  chemistry: {
    zh: '现场化学反应',
    checks: ['她有没有反问你的情况？', '笑得自然吗、有没有延长约会？', '有主动靠近/接受接触/说「下次」吗？'],
  },
  investment: {
    zh: '投入度',
    checks: ['准时、在场、投入吗？', '有没有主动出主意、分担安排？', '约会结束后有没有不被催就自己回来找你？'],
  },
  shift: {
    zh: '约会后变化',
    checks: ['跟她约会前的回复速度比，变慢还是变快？', '有没有「下次/一起」这类未来导向的话？', '频率是上升、持平还是明显掉？'],
  },
};

/** 冲突处理原则。 */
export const CONFLICT = {
  principles: ['先降情绪再谈事情', '讲行为不讲人格', '只谈这一件事，不翻旧账', '承认自己的部分要具体'],
  never: ['把冷战当策略', '故意让对方吃醋来换关注', '用大动作掩盖结构性问题'],
  ifWrong: '快、具体地认错：说清你做了什么，而不是「对不起让你不开心」。',
  ifTheyWrong: '不攻击人，只描述影响：「你那样说的时候，我有点难受。」',
  ifMisunderstanding: '用「我感觉我们说的其实是同一件事」搭桥。',
  coldWar: '冷战不要用长道歉文去破，用一个意料之外的小动作。',
};

/** 安全红线。 */
export const SAFETY = [
  '对方说「不」就是「不」。被明确拒绝后不教任何纠缠和挽回。',
  '不给操控手段：不写 PUA 脚本、不教「故意让她吃醋」、不做情绪挟持。',
  '如果描述里有控制、孤立、威胁、动手，直接指出这是安全问题，不是恋爱问题。',
  '如果出现持续失眠、无法正常生活、自伤念头，温和建议寻求专业帮助。',
  '不教查手机、黑号、跟踪监控。',
];

/** 分类规则：命中即打标签，score 用于排序。 */
export const SIGNALS = [
  { tag: 'cold-war', stage: 'crisis', weight: 3, zh: '冷战', pattern: ['冷战', '不理我', '不回复我', '已读不回', '没理我', '冷落', '不说话', '沉默', 'cold war', 'cold shoulder', 'stopped replying', 'ignoring me', "won't talk"] },
  { tag: 'breakup', stage: 'post-breakup', weight: 3, zh: '分手/挽回', pattern: ['分手', '挽回', '前女友', '前男友', 'ex ', 'my ex', 'broke up', 'break up', 'get her back', 'get him back', '复合'] },
  { tag: 'conflict', stage: 'crisis', weight: 2, zh: '冲突/吵架', pattern: ['吵架', '吵了', '争执', '闹', '生气', '矛盾', 'fight', 'argument', 'angry at me', 'upset with me'] },
  { tag: 'postdate', stage: 'heating', weight: 2, zh: '约会后复盘', pattern: ['约会', 'date', '第一次见面', '见面之后', 'after the date', 'first date', '第二次约会', 'date 2', 'date two'] },
  { tag: 'date-plan', stage: 'building', weight: 1.5, zh: '约会策划', pattern: ['怎么约', '约她', '约他', '约会去哪', '去哪玩', 'first date idea', 'where should we', 'ask her out', 'ask him out'] },
  { tag: 'escalation', stage: 'heating', weight: 1.5, zh: '升温节奏', pattern: ['升温', '推进', '肢体接触', '牵手', '确定关系', '表白', 'exclusive', 'escalate', 'make a move', 'define the relationship', 'DTR'] },
  { tag: 'message', stage: 'building', weight: 1.5, zh: '消息解读', pattern: ['她说', '他回我', '她回', '他发', '她说吧', '怎么回', 'she said', 'he said', 'she texted', 'he texted', 'how do i reply', 'what does this mean'] },
  { tag: 'attachment', stage: 'building', weight: 2, zh: '依恋风格', pattern: ['依恋', '焦虑型', '回避型', 'attachment', 'anxious', 'avoidant', 'trauma', '黏人', '忽冷忽热'] },
  { tag: 'rejection', stage: 'crisis', weight: 2.5, zh: '被拒绝', pattern: ['拒绝我', '说不合适', 'better as friends', 'just friends', '做朋友', 'turned me down', 'rejected me'] },
];

/** 语气档位：影响回复生成的风格强度。 */
export const TONES = {
  gentle: { zh: '温和', en: 'Gentle', note: '先共情，再给建议；适合低自信或情绪低落的人' },
  direct: { zh: '直接', en: 'Direct', note: '默认：结论先行，直说不绕' },
  blunt: { zh: '毒舌', en: 'Blunt', note: '只在高频自我欺骗时用，说穿但不羞辱' },
};

export const REPLY_STYLES = [
  { id: 'A', zh: '调侃反转', en: 'Tease & reframe' },
  { id: 'B', zh: '果断主导', en: 'Bold & decisive' },
  { id: 'C', zh: '推拉', en: 'Push-pull' },
  { id: 'D', zh: '共情引导', en: 'Emotionally intelligent' },
  { id: 'E', zh: '极简钩子', en: 'Minimal & magnetic' },
];
