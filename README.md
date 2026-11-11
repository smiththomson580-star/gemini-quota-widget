# Gemini Quota Widget · Gemini 猫娘双额度挂件

显示 Gemini **官方五小时额度、每周额度和重置时间**的 Windows 悬浮挂件。点击猫娘展开额度，点击气泡切换台词，再次点击气泡关闭；支持拖动、缩放、吸附、翻转与合成音效。

**当前版本 0.7.6。** 点击猫猫查看双额度。快捷条提供贴贴、便签、陪工、纸牌和设置。点「纸牌」在快捷条上展开 17 张牌的摸鬼牌游戏，可选择老实猫或演技猫。设置「工具」页可以检查更新。

好感度达到 100 会触发「柔情之舞」，猫娘登场时喊出“柔情猫娘来啦！”，跳完 12 秒后好感度回到 80。挂件还提供连戳哈气、31 句台词、番茄钟及高清默认立绘。[陪伴功能说明](docs/COMPANION.md)

这是社区适配项目，与 Google 无隶属关系。已对 **Gemini Windows 1.17.0 和 1.18.0** 做过实机检查。浏览器、PWA、AI Studio、Antigravity 的额度读取不在当前支持范围内。

## 额度从哪里来

桌面主进程创建后台页面，复用当前 Gemini 客户端的登录会话和 User-Agent，加载 [Google 官方用量页面](https://gemini.google.com/usage)，读取“当前用量 / Current usage”和“每周限额 / Weekly limit”的已用百分比：

```text
挂件剩余百分比 = 100 - 官方已用百分比
```

每 30 秒尝试更新。官方数据达到 90 秒未更新时，气泡显示“已过期”，数值显示“—”。网络、登录或验证码错误后退避两分钟。重置时间按官方页面原文显示，时区遵循该页面。

Google 计算额度会考虑提示复杂度、模型、功能及对话长度，不能按请求次数推算。[Google 用量说明](https://support.google.com/gemini/answer/16275805?hl=zh-Hans)。挂件展示的是观察到的官方数据，页面自身的更新延迟仍会影响结果。

## 安装

前提：Windows 10/11、已安装并登录 Gemini Windows、[Node.js 22 或更新版本](https://nodejs.org/)（本项目使用 Node.js 24 验证）。客户端 1.17.0 和 1.18.0 已做实机检查；后续版本按客户端入口结构与运行条件检测。多账号切换尚未验收。

1. 下载源码 ZIP 并完整解压；或克隆本仓库。
2. 在项目目录执行：

   ```powershell
   npm ci
   npm test
   npm run audit:release
   ```

3. 从 Gemini 菜单中正常退出客户端，包括托盘后台；安装器不会强制结束进程。
4. 双击 `install.cmd`，或在 PowerShell 执行：

   ```powershell
   .\install.ps1
   ```

5. 正常启动 Gemini。第一次取数需要等待官方页面加载，随后点击猫娘查看。

0.6.0 起提供内置更新。首次安装这版后，可在「设置 → 工具 → 检查并更新挂件」获取之后的正式 Release。安装完成后保存草稿并重开 Gemini。昵称、好感度和自定义立绘保存在原位置。

安装器还会注册当前用户登录时启动的自动适配组件。挂件运行文件保存在 Gemini 各版本之外，组件监控新客户端文件的写入，并每三秒检查一次最新目录。发现更新后读取客户端声明的主入口，核对归档结构、语法和完整性机制，再备份并接入。目标客户端正在运行时会等待它正常退出。设备睡眠、关闭或退出登录期间暂停检查。

未来客户端若更改入口类型、接口或完整性要求，仍可能需要更新适配器。检测结果写在 Gemini 安装目录的 `gemini-widget-compatibility.json`，组件会继续重试。首次安装或升级后的挂件须在客户端重新打开后生效。

如系统策略不允许运行脚本，请遵循你所在设备的管理要求；本项目不修改 PowerShell 执行策略。标准的每用户安装通常不需要管理员权限。

安装器会备份本机原始 `app.asar`，向客户端声明的主入口追加挂载代码，并逐文件校验归档。适配过程遵循客户端已有的沙箱、上下文隔离、Trusted Types 和完整性要求。

**不要上传本机生成的 `app.asar`、原版备份或 `build/` 文件夹。** 发布包只包含挂件源码与本地适配工具。自动适配组件会在客户端更新后重新检测并接入，通过卸载入口可一并停用。

## 卸载 / 恢复

先正常退出 Gemini，然后双击 `uninstall.cmd`，或运行：

```powershell
.\install.ps1 -Restore
```

这会使用安装时的备份恢复原程序。挂件设置、日志及挂件源码保留在本机，便于排查和重新安装。不会注销 Google 账户。

## 个性化

- 点击立绘：显示双额度；气泡已打开时只弹跳并延长显示时间。
- 点击额度气泡：切换一句台词；再次点击关闭。
- 拖动立绘：调整位置；右键或菜单按钮打开设置。
- 缩放、音效、吸附、翻转等沿用原有设置。
- 快捷互动条提供贴贴、便签、陪工、纸牌和设置，可在互动模块隐藏。贴贴里可以摸头、投喂和逗猫，开始计时后快捷条显示倒计时入口。
- “互动 → 满好感 · 柔情之舞”可开关满分奖励；舞台仅在触发时出现，结束或收起后恢复日常立绘与 80 好感度。舞蹈期间仍能轻点查看双额度、右键打开设置。
- 台词模块可选择猫猫玩梗、软乎贴贴、打工搭子或全部混合，也可编辑自己的台词；旧版自定义台词会迁移。
- 外观模块支持三套面板配色、猫猫昵称、透明度、位置锁定和减少动态效果；本地立绘支持 2 MB 以内的 WebP / PNG / JPG，并可恢复原图。
- 工具模块支持专注 / 休息计时和陪伴偏好的导入导出。关闭 Gemini 后不会后台响铃，重新打开时会核对截止时间。
- 构建默认使用 `assets/catgirl-hd.webp`；`assets/catgirl.webp` 保留原始立绘。替换默认图后执行 `npm run build` 并重新安装。高清修复过程与提示词见 [立绘说明](docs/ARTWORK_HD.md)。
- 柔情之舞使用独立的透明动作图集，不覆盖日常自定义立绘。它是以用户参考图重新绘制的八姿态动画，并非视频或 Live2D 模型；动作说明和提示词见 [舞蹈素材说明](docs/ARTWORK_DANCE.md)。

默认立绘预览（素材许可与代码许可分开）：

![默认猫娘立绘](assets/catgirl.webp)

## 隐私与故障排查

- 不需要提供 API Key、Cookie 或 OAuth 令牌。登录会话由现有 Gemini 客户端持有。
- 挂件代码没有设置第三方遥测或上传接口；后台页面访问 Google 服务，Google 页面的自身网络行为由 Google 控制。
- 主进程会在 Gemini 的本地用户数据目录写入 `gemini-official-quota.json` 和 `gemini-fox-widget-status.json`，用于本地诊断。不要直接上传这些文件。
- 显示“—”：可能尚未取数、数据过期、网络异常、页面结构变化或登录验证。先在 Gemini 里打开“设置 → 用量限额”，确认官方页面正常。
- 需要人机验证时由用户在官方界面完成；挂件不求解或绕过验证。
- `dist/gemini-fox-widget.user.js` 是供桌面宿主加载的编译文件。虽然保留 `.user.js` 文件名，它**不是**能独立获取账户额度的油猴脚本。

## 开发与验证

```powershell
npm ci
npm test
npm run audit:release
npm run release:zip
```

构建输出在 `dist/`；公开分发 ZIP 在 `releases/`，仅包含明确列入白名单的文件。CI 在 Windows / Node.js 24 上运行构建、解析测试、Trusted Types 挂载测试和公开文件检查。

正式发版时先更新 `package.json` 和锁文件的版本，再推送匹配的 `v版本号` 标签。Release workflow 会测试、打包并上传源码 ZIP、更新清单、挂件脚本和更新组件。更新按钮读取 GitHub 最新正式 Release，提交代码本身不会产生可下载的正式更新。旧版用户需要手动安装 0.6.0 一次。

```text
src/widget.js          立绘、气泡与交互源码
src/dom-builder.mjs    Trusted Types 兼容的节点构造
src/companion.mjs      陪伴站设置与趣味互动
src/companion-model.cjs 本地状态、台词与计时逻辑
src/companion.css      陪伴站主题与响应式布局
src/official-quota.cjs 官方用量页面解析
src/desktop-hook.cjs   同会话后台取数与页面挂载
scripts/               构建、归档适配与发布检查
tests/                 解析和挂载检查
assets/                立绘及独立素材许可说明
third_party/           打包依赖的许可证
```

验收范围见 [验证记录](docs/VERIFICATION.md)。欢迎提交脱敏的复现步骤；贡献说明见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可与致谢

代码采用 [MIT 许可](LICENSE)。最初由项目维护者借助 Gemini 生成，再对官方额度读取与 Windows 挂载进行适配。交互设计参考 [MeteorNOX/DeepSeek-Balance-Whale-Widget](https://github.com/MeteorNOX/DeepSeek-Balance-Whale-Widget)，上游代码的版权与 MIT 声明保留在 [NOTICE.md](NOTICE.md)。

立绘不适用代码的 MIT 许可，其再分发授权说明见 [assets/README.md](assets/README.md)。打包依赖的许可见 `third_party/`。Google / Gemini 名称及标识属于各自权利人。
