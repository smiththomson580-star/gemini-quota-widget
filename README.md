# Gemini Quota Widget · Gemini 猫娘双额度挂件

显示 Gemini **官方五小时额度、每周额度和重置时间**的 Windows 悬浮挂件。点击猫娘展开额度，点击气泡切换台词，再次点击气泡关闭；支持拖动、缩放、吸附、翻转与合成音效。

**当前版本 0.5.0。** 快捷互动显示剩余冷却秒数，窄窗口里的快捷条会自动避开立绘。双额度预警按设置的阈值变色，气泡区分等待同步与数据过期。

好感度达到 100 会触发「柔情之舞」，猫娘登场时喊出“柔情猫娘来啦！”，跳完 12 秒后好感度回到 80。挂件还提供连戳哈气、30 句台词、番茄钟及高清默认立绘。[陪伴功能说明](docs/COMPANION.md)

这是社区适配项目，与 Google 无隶属关系。当前仅对 **Gemini Windows 1.17.0** 做过实机验证。浏览器、PWA、AI Studio、Antigravity 的额度读取不在当前支持范围内。

## 额度从哪里来

桌面主进程创建后台页面，复用当前 Gemini 客户端的登录会话和 User-Agent，加载 [Google 官方用量页面](https://gemini.google.com/usage)，读取“当前用量 / Current usage”和“每周限额 / Weekly limit”的已用百分比：

```text
挂件剩余百分比 = 100 - 官方已用百分比
```

每 30 秒尝试更新。官方数据达到 90 秒未更新时，气泡显示“已过期”，数值显示“—”。网络、登录或验证码错误后退避两分钟。重置时间按官方页面原文显示，时区遵循该页面。

Google 计算额度会考虑提示复杂度、模型、功能及对话长度，不能按请求次数推算。[Google 用量说明](https://support.google.com/gemini/answer/16275805?hl=zh-Hans)。挂件展示的是观察到的官方数据，页面自身的更新延迟仍会影响结果。

## 安装

前提：Windows 10/11、已安装并登录 Gemini Windows **1.17.0**、[Node.js 22 或更新版本](https://nodejs.org/)（本项目使用 Node.js 24 验证）。目前只支持个人默认账户；多账号切换尚未验收。

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

如系统策略不允许运行脚本，请遵循你所在设备的管理要求；本项目不修改 PowerShell 执行策略。标准的每用户安装通常不需要管理员权限。

安装器会备份本机原始 `app.asar`，随后仅向其中的 `src/main.js` 追加挂载代码，并校验其他归档文件保持一致。它不会关闭沙箱、上下文隔离或 Trusted Types，也不会禁用归档完整性校验；不满足兼容性检查时停止安装。

**不要上传本机生成的 `app.asar`、原版备份或 `build/` 文件夹。** 仓库只提供本地适配工具，不分发 Google 应用程序。客户端更新可能移除适配；新版本需要重新验证，安装器不会自动尝试未知版本。

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
- 快捷互动条可以摸头、投喂、逗猫和打开设置，可在互动模块隐藏。番茄钟从“工具”打开，开始计时后快捷条显示倒计时入口。
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
