# 高清立绘修复记录

- 工具：内置 `image_gen` 编辑模式，没有使用外部下载素材或 CLI/API 密钥。
- 输入：`assets/catgirl.webp`，360×360，保留不覆盖。
- 生成：透明 RGBA PNG，实际输出 1254×1254。
- 项目资产：`assets/catgirl-hd.webp`，1254×1254，无损 WebP，1,244,050 字节。
- 用途：替换默认显示资源，用户自己配置的立绘不变。高分辨率有利于大尺寸和高 DPI 显示；它是 AI 辅助修复，不是找回的原始高清母版，线条及服饰等细节可能有变化。
- 格式转换：FFmpeg `-map_metadata -1 -c:v libwebp -lossless 1 -compression_level 6`，没有再次缩放、锐化或修改透明背景。
- 透明通道：生成 PNG 与打包 WebP 的解码 alpha 帧校验一致，MD5 为 `b8f407fd1e82bb128d6dbbc605151f77`。
- 两张图均沿用素材许可边界，不纳入代码 MIT 许可。

## 使用的完整编辑提示词

Use case: identity-preserve. Asset type: high-resolution transparent desktop mascot sprite. Edit the supplied 360x360 catgirl illustration for clarity only. Faithfully reconstruct the exact same original image at 1440x1440 or higher: same chibi bust crop and silhouette, exact same pose with fingers near her mouth, facial expression and proportions, same fluffy blue cat ears and blue hair with pastel pink/yellow/mint tips, magenta-red eye on image left and gold eye on image right, multicolor four-point star hair clip at image right, same ahoge and small star accessories, same white and dark blue outfit and ribbon. Keep the character's identity, composition, expression, costume and original flat anime illustration style invariant. Recover fine clean ink contours and crisp gentle cel shading from the small input without redesigning, beautifying, extra highlights or adding new details. Correct the coarse semi-transparent pixel fringe around the cutout to smooth alpha edges. Background must be truly transparent with preserved clean alpha, no matte and no checkerboard baked in. No added objects, no text, no watermark, no scene, no floor or new shadows. This is a careful high-fidelity restoration/upscale of the original art for a UI sprite, not a new character design.

提示词表达了保真目标；工具实际交付 1254×1254，以上方实际输出参数为准。
