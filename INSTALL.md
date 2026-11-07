# 安装

## 前置

- DSH（本机引擎或桌面端）0.2.1-rc.2 以上
- 手机上想看胶囊和面板，需要装 dsh-go App，并且它的本机引擎在跑

## 装

```sh
git clone https://github.com/<你的用户名>/dsh-lovecoach.git
dsh plugin --profile web add ./dsh-lovecoach
```

装完不用重启引擎就能用**工具和技能**。

改过 `lib/` 里的代码之后，要在 App 的「引擎」页重启引擎才生效 —— HMR 只重建 client bundle，
不动服务端模块。只改 `package.json` 的清单部分会自动重读。

## 卸

```sh
dsh plugin --profile web remove local-lovecoach
rm -rf ./dsh-lovecoach
```

## 自查

```sh
node "$DSH_HOME/skills/dsh-go-plugin/kit/bin/check.mjs" . --load   # 清单与视图
npm test                                                           # 33 个测试
```

## 怎么确认装上了

- 对话里问一句「她现在不回我，我该怎么办」，模型应当先调 `lovecoach` 工具
- 手机上：输入框上方出现「教练看剪贴板」胶囊；对话详情页「插件」页签里有「恋爱教练」面板

## 常见问题

**插件装了但没反应？** 先看 `dsh plugin --profile web why local-lovecoach` 是否解析到目录。
profile 装的是软链，源目录不能删。

**工具报错 `content.some is not a function`？** 这是 `render` 返回了字符串而不是内容块数组。
本仓库已修（见 `lib/tools.js`），如果用的是旧版本请更新。

**中文/英文混合输入？** 分析器按中文字符占比自动选语言，给模型的提示也会跟着切换。
