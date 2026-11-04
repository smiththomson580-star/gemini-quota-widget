# 柔情猫娘舞蹈素材

- 参考素材为维护者于 2026-11-03 提供的柔情猫娘全身图。维护者于 2026-11-04 确认可随挂件公开再分发此图集。
- 工具：内置 imagegen，先按参考绘制八个姿态，再请求清理透明边缘并统一角色特征。
- 交付：`assets/gentle-dance.webp`，1254×1254，透明无损 WebP，4 列 × 2 行；逐像素检查确认所有可见 RGB 像素和 alpha 与 PNG 一致。完全透明位置的不可见 RGB 由编码器归零。构建内嵌图片，无远程图片请求。
- 姿态：迎接、左侧步猫爪、向右摆手、头顶猫耳、右侧步猫爪、向左摆手、轻跳、比心。顺序由代码组成 12 秒的短舞。它是换姿动画，非视频、逐帧动作捕捉或 Live2D；角色衣饰细节可能与参考图有差别。
- 动画采用原创猫猫舞步，素材包仅包含静态动作图集。
- 舞蹈素材与 MIT 代码许可分开，参见 `assets/README.md`。

## 第一轮提示词

```text
Use case: identity-preserve. Asset type: one transparent animation sprite atlas for a Windows desktop catgirl companion. Use the supplied image as the exact character identity and costume reference: adult anime girl, blue-purple long hair with pink ends, cat ears and fluffy tail, magenta eye on viewer left and golden eye on viewer right, prismatic star hair accessory, navy/violet/white star-themed outfit and white boots. Create ONE high-resolution square sprite sheet with exactly EIGHT full-body poses in a strict FOUR COLUMNS by TWO ROWS equal grid (3072x3072 preferred). Each cell has equal 768x1536 space; every character centered at exactly the same scale, entire head, hair, tail, hands, hanging sleeves and boots comfortably within its cell, boots resting on the same relative baseline about 94% of each cell height. Use reference-quality detailed clean anime linework, same adult proportions and clothes in ALL eight poses. In reading order: 1 gentle neutral welcome, 2 step to viewer left with both soft cat-paw hands raised beside shoulders, 3 arms lightly extended toward viewer right with head tilted left, 4 hands over head forming soft cat ears with a small knee bend, 5 mirrored side step toward right with paws beside shoulders, 6 arms lightly extended toward viewer left, 7 small joyful hop with arms lifted outward and one knee gently raised, 8 both hands forming a heart at chest with affectionate closed-eye smile. These are key poses of a cute gentle cat sway dance, NOT eight different characters. Actual transparent alpha background across the entire atlas including cell gaps; no white backing, no checkered pattern, no floor, no shadows, no labels, no cell borders, no text, no floating extra stars, no props, no cropped limbs. Keep all silhouettes separated, never overlap cell boundaries. Preserve supplied outfit rather than redesigning it.
```

## 选定图集的透明边缘修订提示词

```text
Edit target: the attached eight-pose catgirl dance sprite sheet. Change ONLY the transparency cleanup and consistency. Keep EXACT four columns by two rows, exact same positions, scale, poses, full body and outfit. Remove EVERY stray magenta, electric blue, white, black or gray speckle around the characters and in the transparent gaps. The image must have perfectly clean genuinely transparent alpha around hair, all silhouette edges and between boots. ZERO colored fringe, ZERO random particles or background marks. Preserve all fine hair edges, white boots and white sleeves; do not remove white inside character. Keep adult catgirl identity as the original reference: blue-purple long hair, star clip stays on viewer right, viewer-left eye pink, viewer-right eye gold in ALL frames (do NOT mirror eyes/clip in bottom-left frames). Crisp linework. Each of eight sprites must remain completely within its equal cell boundaries, with a modest empty transparent gap before cell boundary. Output exactly square transparent 4x2 atlas, preferably 3072x3072, not an illustration scene. No text, no grid lines, no shadows.
```

生成器实际输出为 1254 像素正方形；提示词中的 3072 是请求值，并非声称最终分辨率。图集按 CSS 百分比划分等宽单元，不对角色作额外拉伸。
