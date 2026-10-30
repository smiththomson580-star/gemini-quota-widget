// Gemini Quota Widget v0.1.0
// MIT licensed code; artwork has separate terms in assets/README.md.
// Design reference: MeteorNOX/DeepSeek-Balance-Whale-Widget (MIT).
// Desktop host required: this is not a standalone quota-reading userscript.

(function () {
  'use strict';

  if (window.__geminiFoxWidgetLoaded) return;
  window.__geminiFoxWidgetLoaded = true;

  const DEFAULT_FOX_IMG = "__GFW_DEFAULT_SPRITE__";
  const STORAGE_KEY_CFG = "gfw_config_v4_realtime";
  const STORAGE_KEY_LEDGER = "gfw_ledger_v4_realtime";

  const TIER_PRESETS = {
    "advanced_sub": {
      name: "Gemini Advanced 订阅版",
      quota5h: 50,
      quotaWeek: 500,
      desc: "5小时窗口 50 次 · 周额度 500 次"
    },
    "aistudio_free": {
      name: "Gemini Pro 标准档",
      quota5h: 25,
      quotaWeek: 250,
      desc: "5小时窗口 25 次 · 周额度 250 次"
    },
    "aistudio_flash": {
      name: "Gemini Flash 高频档",
      quota5h: 150,
      quotaWeek: 1500,
      desc: "5小时窗口 150 次 · 周额度 1500 次"
    },
    "token_budget": {
      name: "Gemini Ultra 尊享档",
      quota5h: 100,
      quotaWeek: 1000,
      desc: "5小时窗口 100 次 · 周额度 1000 次"
    },
    "custom_api": {
      name: "自定义 5h / 周限额",
      quota5h: 60,
      quotaWeek: 600,
      desc: "自由设定 5小时额度与周额度上限"
    }
  };

  const DEFAULT_LINES = [
    { weight: 16, type: "quote", text: "耳朵不许乱摸……\n刚才那次就算了。" },
    { weight: 14, type: "quote", text: "5小时和每周额度都盯紧啦，\n今天也放心提问吧。" },
    { weight: 12, type: "quote", text: "别光顾着戳我呀，\n代码和论文写完没？" },
    { weight: 12, type: "quote", text: "累了就歇一会儿，\n我替你守着桌面。" },
    { weight: 10, type: "quote", text: "再戳我星星发饰……\n真的要掉下来了。" },
    { weight: 10, type: "quote", text: "呼噜呼噜……\n算力全开，随时待命。" }
  ];

  function loadStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return JSON.parse(JSON.stringify(fallback));
      return Object.assign(JSON.parse(JSON.stringify(fallback)), JSON.parse(raw));
    } catch (e) {
      return JSON.parse(JSON.stringify(fallback));
    }
  }

  function saveStorage(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  const defaultConfig = {
    scale: 1.42,
    tier: "advanced_sub",
    displayMode: "remaining_pct", // remaining_pct | remaining_num | used_num
    customQuota5h: 50,
    customQuotaWeek: 500,
    warnThresholdPct: 20,
    soundOn: true,
    soundSet: "foxbell", // duck | foxbell | pop
    pressVol: 0.75,
    turnAlertOn: true,
    turnSoundSet: "exp_orb", // exp_orb | chime_a | mute
    turnVol: 0.8,
    turnAutoCloseSec: 8,
    bubbleOn: true,
    clickAdvanceQueue: true,
    snapMode: "quarter", // quarter | free
    snapTopOn: false,
    leftFlipOn: true,
    avoidScrollbar: true,
    hideMenuBtn: false,
    apiKey: "",
    quotaEndpoint: "",
    customImg: "",
    posLeft: null,
    posTop: null,
    anchorH: "right",
    anchorV: "bottom",
    randomLines: DEFAULT_LINES
  };

  // ZERO FABRICATION: Initial ledger starts strictly at 0 used (100% remaining),
  // tracking exact sliding-window timestamps of real requests plus optional authoritative header/API overrides.
  const defaultLedger = {
    timestamps5h: [],
    timestampsWeek: [],
    manualOffset5h: 0,
    manualOffsetWeek: 0,
    remoteOverride: null, // { left5hPct, leftWeekPct, reset5hSec, resetWeekSec, updatedAt }
    lastEventAt: null,
    lastTurnReqs: 0,
    sourceLabel: "实时监听已就绪"
  };

  let cfg = loadStorage(STORAGE_KEY_CFG, defaultConfig);
  let ledger = loadStorage(STORAGE_KEY_LEDGER, defaultLedger);
  if (!Array.isArray(ledger.timestamps5h)) ledger.timestamps5h = [];
  if (!Array.isArray(ledger.timestampsWeek)) ledger.timestampsWeek = [];

  // Cross-tab / multi-window instant synchronization channel
  let syncChannel = null;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      syncChannel = new BroadcastChannel("gemini_fox_quota_realtime_v4");
      syncChannel.onmessage = (ev) => {
        if (ev && ev.data && ev.data.type === "ledger_update") {
          ledger = loadStorage(STORAGE_KEY_LEDGER, defaultLedger);
          refreshRealtimeUI(false);
        }
      };
    }
  } catch (e) {}

  window.addEventListener("storage", (ev) => {
    if (ev.key === STORAGE_KEY_LEDGER) {
      ledger = loadStorage(STORAGE_KEY_LEDGER, defaultLedger);
      refreshRealtimeUI(false);
    } else if (ev.key === STORAGE_KEY_CFG) {
      cfg = loadStorage(STORAGE_KEY_CFG, defaultConfig);
      refreshRealtimeUI(false);
    }
  });

  function broadcastLedgerUpdate() {
    saveStorage(STORAGE_KEY_LEDGER, ledger);
    if (syncChannel) {
      try { syncChannel.postMessage({ type: "ledger_update", ts: Date.now() }); } catch (e) {}
    }
  }

  const WIN_5H_MS = 5 * 3600 * 1000;
  const WIN_WEEK_MS = 7 * 86400 * 1000;

  function pruneSlidingWindows() {
    const now = Date.now();
    const prev5hLen = ledger.timestamps5h.length;
    const prevWkLen = ledger.timestampsWeek.length;
    ledger.timestamps5h = ledger.timestamps5h.filter(ts => (now - ts) < WIN_5H_MS);
    ledger.timestampsWeek = ledger.timestampsWeek.filter(ts => (now - ts) < WIN_WEEK_MS);
    if (ledger.timestamps5h.length !== prev5hLen || ledger.timestampsWeek.length !== prevWkLen) {
      saveStorage(STORAGE_KEY_LEDGER, ledger);
    }
  }

  function formatResetDurationMs(remainMs, defaultFullLabel) {
    if (remainMs <= 0) return defaultFullLabel;
    const totalMin = Math.ceil(remainMs / 60000);
    const d = Math.floor(totalMin / 1440);
    const h = Math.floor((totalMin % 1440) / 60);
    const m = totalMin % 60;
    if (d > 0) return `${d} 天 ${h} 小时后重置`;
    if (h > 0) return m > 0 ? `${h} 小时 ${m} 分后重置` : `${h} 小时后重置`;
    return `${Math.max(1, m)} 分钟后重置`;
  }

  function getQuotaMetrics() {
    const q=window.__gfwOfficialQuota;
    const valid=q && Date.now()-q.updatedAt < 90000 && q.fiveHour && q.week;
    return {
      left5hPct: valid ? q.fiveHour.remainingPct : null,
      leftWeekPct: valid ? q.week.remainingPct : null,
      reset5hText: valid ? '重置：'+q.fiveHour.resetText : '正在读取 Google 用量…',
      resetWeekText: valid ? '重置：'+q.week.resetText : '等待官方数据同步',
      isWarn5h: valid && q.fiveHour.remainingPct<=20,
      isWarnWeek: valid && q.week.remainingPct<=20,
      sourceLabel: valid ? 'Google 官方用量 · 30秒刷新' : '尚未取得有效官方数据',
      updatedAt: valid ? q.updatedAt : null
    };
  }

  // Web Audio Synthesizer
  let audioCtx = null;
  let lastPressSoundMs = 0;
  function getAudioCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function playSynthSound(kind, customSet, customVol) {
    const nowMs = performance.now();
    if ((kind === "press" || kind === "release") && nowMs - lastPressSoundMs < 90) return;
    if (kind === "press") lastPressSoundMs = nowMs;

    const actx = getAudioCtx();
    if (!actx) return;
    const vol = Math.max(0, Math.min(1, customVol !== undefined ? customVol : cfg.pressVol));
    if (vol <= 0.01) return;

    const t0 = actx.currentTime;
    const set = customSet || cfg.soundSet;

    if (kind === "press" || kind === "release") {
      if (!cfg.soundOn && customVol === undefined) return;
      const osc = actx.createOscillator();
      const gain = actx.createGain();
      osc.connect(gain);
      gain.connect(actx.destination);

      if (set === "duck") {
        osc.type = "sawtooth";
        const fStart = kind === "press" ? 520 : 640;
        const fEnd = kind === "press" ? 780 : 460;
        osc.frequency.setValueAtTime(fStart, t0);
        osc.frequency.exponentialRampToValueAtTime(fEnd, t0 + 0.09);
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(vol * 0.26, t0 + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.11);
        osc.start(t0);
        osc.stop(t0 + 0.115);
      } else if (set === "foxbell") {
        osc.type = "sine";
        const f1 = kind === "press" ? 880 : 1174.66;
        const f2 = kind === "press" ? 1318.5 : 1567.98;
        osc.frequency.setValueAtTime(f1, t0);
        osc.frequency.exponentialRampToValueAtTime(f2, t0 + 0.11);
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(vol * 0.3, t0 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
        osc.start(t0);
        osc.stop(t0 + 0.165);
      } else {
        osc.type = "triangle";
        const fStart = kind === "press" ? 340 : 500;
        const fEnd = kind === "press" ? 680 : 380;
        osc.frequency.setValueAtTime(fStart, t0);
        osc.frequency.exponentialRampToValueAtTime(fEnd, t0 + 0.08);
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(vol * 0.34, t0 + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.09);
        osc.start(t0);
        osc.stop(t0 + 0.095);
      }
    } else if (kind === "task_end") {
      const tSet = customSet || cfg.turnSoundSet;
      if (tSet === "mute") return;
      const notes = tSet === "exp_orb" ? [783.99, 987.77, 1174.66, 1567.98] : [659.25, 880, 1318.51];
      notes.forEach((freq, idx) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = tSet === "exp_orb" ? "sine" : "triangle";
        osc.frequency.setValueAtTime(freq, t0 + idx * 0.055);
        gain.gain.setValueAtTime(0.001, t0 + idx * 0.055);
        gain.gain.linearRampToValueAtTime(vol * 0.25, t0 + idx * 0.055 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + idx * 0.055 + 0.22);
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.start(t0 + idx * 0.055);
        osc.stop(t0 + idx * 0.055 + 0.23);
      });
    }
  }

  // Mount DOM once document.body is ready
  function initWidgetDOM() {
    if (!document.body || !document.head) {
      requestAnimationFrame(initWidgetDOM);
      return;
    }

    const styleEl = document.createElement("style");
    styleEl.textContent = `
      .gfw-root {
        --gfw-scale: 1.42;
        --gfw-base: clamp(160px, calc(min(265px, min(100vw, 100vh) * 0.31) * var(--gfw-scale)), 650px);
        --gfw-u: calc(var(--gfw-base) / 1026);
        position: fixed;
        width: var(--gfw-base);
        height: calc(var(--gfw-base) * 1.12);
        z-index: 99990;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
        pointer-events: none;
        transition: left 0.32s cubic-bezier(.22,1,.36,1), top 0.32s cubic-bezier(.22,1,.36,1), transform 0.3s ease;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
      }
      .gfw-root.gfw-dragging {
        transition: transform 0.3s ease !important;
      }
      .gfw-root.gfw-left {
        transform: scaleX(-1);
      }
      .gfw-body {
        position: absolute;
        inset: 0;
        transform-origin: 50% 100%;
        transition: transform 0.22s cubic-bezier(.34, 1.56, .64, 1);
        pointer-events: none;
      }
      .gfw-img-wrap {
        position: absolute;
        right: 0;
        bottom: 0;
        width: 64%;
        height: 57%;
        z-index: 5;
        pointer-events: auto;
        cursor: grab;
        transform-origin: 50% 100%;
        transition: transform 0.24s cubic-bezier(.34, 1.65, .64, 1), filter 0.2s ease;
        filter: drop-shadow(0 8px 18px rgba(32, 49, 112, 0.32));
      }
      .gfw-img-wrap:hover {
        filter: drop-shadow(0 10px 22px rgba(99, 102, 241, 0.44));
      }
      .gfw-img-wrap:active {
        cursor: grabbing;
      }
      .gfw-img-wrap.gfw-pressed {
        transform: scaleY(0.86) scaleX(1.07);
      }
      @keyframes gfwJellyBounce {
        0%   { transform: scale(1, 1) translateY(0); }
        25%  { transform: scale(1.09, 0.86) translateY(0); }
        50%  { transform: scale(0.94, 1.08) translateY(-8px); }
        75%  { transform: scale(1.03, 0.97) translateY(0); }
        100% { transform: scale(1, 1) translateY(0); }
      }
      .gfw-img-wrap.gfw-jelly {
        animation: gfwJellyBounce 0.44s cubic-bezier(.25, 1, .5, 1);
      }
      .gfw-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        object-position: bottom center;
        display: block;
        pointer-events: none;
        -webkit-user-drag: none;
      }
      .gfw-bubble {
        position: absolute;
        left: 0;
        top: 0;
        width: 90%;
        height: 60%;
        z-index: 3;
        pointer-events: none !important;
        opacity: 0;
        transform: scale(0.75) translateY(10px);
        transform-origin: 58% 84%;
        transition: opacity 0.22s ease, transform 0.28s cubic-bezier(.34, 1.56, .64, 1);
        filter: drop-shadow(0 10px 24px rgba(59, 130, 246, 0.20));
      }
      .gfw-bubble.gfw-open {
        opacity: 1;
        transform: scale(1) translateY(0);
        pointer-events: none !important;
      }
      .gfw-bubble-hitbox {
        position: absolute;
        left: 4%;
        top: 2%;
        width: 82%;
        height: 68%;
        border-radius: 999px;
        pointer-events: none;
        z-index: 4;
      }
      .gfw-bubble.gfw-open .gfw-bubble-hitbox {
        pointer-events: auto;
        cursor: pointer;
      }
      .gfw-bubble svg {
        width: 100%;
        height: 100%;
        overflow: visible;
        display: block;
      }
      /* Rainbow gradient text matching the fox/cat-girl's blue-pink-gold rainbow hair */
      @keyframes gfwRainbowShift {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      .gfw-rainbow-txt {
        background: linear-gradient(90deg, #2563eb 0%, #7c3aed 32%, #ec4899 66%, #d97706 100%);
        background-size: 200% auto;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        color: transparent;
        animation: gfwRainbowShift 6s ease infinite;
      }
      .gfw-rainbow-num {
        background: linear-gradient(135deg, #1d4ed8 0%, #7c3aed 38%, #db2777 74%, #ea580c 100%);
        background-size: 200% auto;
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
        color: transparent;
        animation: gfwRainbowShift 5s ease infinite;
      }
      /* Generous unclipped text container centered inside the enlarged ellipse (cx=454, cy=252, rx=402, ry=242) */
      .gfw-text {
        position: absolute;
        left: 44.25%;
        top: 35.6%;
        width: 47.5%;
        height: 58%;
        transform: translate(-50%, -50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        overflow: visible;
        transition: opacity 0.16s ease, transform 0.3s ease;
        pointer-events: none;
      }
      .gfw-root.gfw-left .gfw-text {
        transform: translate(-50%, -50%) scaleX(-1);
      }
      .gfw-min-quota {
        width: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: calc(var(--gfw-u) * 5);
      }
      .gfw-min-hdr {
        position: relative;
        width: 100%;
        text-align: center;
        font-size: calc(var(--gfw-u) * 35);
        font-weight: 800;
        line-height: 1.25;
        margin-bottom: calc(var(--gfw-u) * 2);
      }
      .gfw-min-refresh {
        position: absolute;
        right: 8%;
        top: 50%;
        transform: translateY(-50%);
        font-size: calc(var(--gfw-u) * 34);
        font-weight: 800;
        color: #8b5cf6;
        line-height: 1;
      }
      .gfw-min-block {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: calc(var(--gfw-u) * 4);
      }
      .gfw-min-block + .gfw-min-block {
        margin-top: calc(var(--gfw-u) * 6);
      }
      .gfw-min-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        width: 100%;
      }
      .gfw-min-label {
        font-size: calc(var(--gfw-u) * 36);
        font-weight: 700;
        line-height: 1.2;
        white-space: nowrap;
      }
      .gfw-min-pct {
        font-size: calc(var(--gfw-u) * 60);
        font-weight: 900;
        line-height: 1.05;
        letter-spacing: -0.02em;
        white-space: nowrap;
        padding-right: calc(var(--gfw-u) * 2);
      }
      .gfw-min-pct.gfw-warn {
        background: none !important;
        -webkit-text-fill-color: #e11d48 !important;
        color: #e11d48 !important;
      }
      .gfw-min-bar-track {
        width: 100%;
        height: calc(var(--gfw-u) * 13);
        background: #ede9fe;
        border-radius: 999px;
        overflow: hidden;
      }
      .gfw-min-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #38bdf8 0%, #818cf8 36%, #f472b6 72%, #fbbf24 100%);
        border-radius: 999px;
        transition: width 0.35s cubic-bezier(.22,1,.36,1);
      }
      .gfw-min-bar-fill.gfw-fill-warn {
        background: linear-gradient(90deg, #f43f5e, #fb923c);
      }
      .gfw-min-reset {
        font-size: calc(var(--gfw-u) * 30);
        font-weight: 600;
        text-align: left;
        line-height: 1.2;
        white-space: nowrap;
      }
      .gfw-quote-box {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: calc(var(--gfw-u) * 6);
        box-sizing: border-box;
      }
      .gfw-wrap-quote {
        font-size: calc(var(--gfw-u) * 54);
        font-weight: 800;
        line-height: 1.42;
        text-align: center;
        max-width: 100%;
        white-space: pre-line;
        word-break: break-word;
        overflow-wrap: anywhere;
      }
      .gfw-menu-btn {
        position: absolute;
        right: 3%;
        top: 41%;
        width: 30px;
        height: 30px;
        border-radius: 9px;
        background: rgba(237, 233, 245, 0.95);
        border: 1.5px solid rgba(139, 92, 246, 0.32);
        color: #6d28d9;
        font-size: 15px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        pointer-events: auto;
        opacity: 0;
        transform: scale(0.9);
        transition: opacity 0.18s ease, transform 0.18s ease, background 0.15s ease;
        box-shadow: 0 3px 10px rgba(107, 91, 149, 0.16);
        z-index: 6;
      }
      .gfw-root:hover .gfw-menu-btn, .gfw-menu-btn.gfw-active {
        opacity: 1;
        transform: scale(1);
      }
      .gfw-root.gfw-hide-btn .gfw-menu-btn {
        display: none !important;
      }
      .gfw-menu-btn:hover {
        background: #e2dcf0;
      }
      .gfw-menu {
        position: fixed;
        width: 320px;
        max-height: 82vh;
        overflow-y: auto;
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(16px);
        border: 2px solid #6d28d9;
        border-radius: 20px;
        box-shadow: 0 18px 42px rgba(32, 49, 112, 0.26);
        padding: 14px 14px 9px 14px;
        color: #1e293b;
        color-scheme: light;
        z-index: 99999;
        display: none;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
        font-size: 12.5px;
      }
      .gfw-menu.gfw-show {
        display: block;
        animation: gfwMenuPop 0.18s cubic-bezier(.22,1,.36,1);
      }
      @keyframes gfwMenuPop {
        from { opacity: 0; transform: translateY(6px) scale(0.96); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      .gfw-m-hdr {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 8px;
        margin-bottom: 8px;
        border-bottom: 1.5px solid #e2e8f0;
        font-weight: 800;
        color: #4c1d95;
        font-size: 13.5px;
      }
      .gfw-m-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 5px 0;
      }
      .gfw-m-label {
        font-weight: 600;
        color: #334155;
        white-space: nowrap;
      }
      .gfw-m-ctrl {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
        justify-content: flex-end;
      }
      .gfw-menu input[type="range"] {
        flex: 1;
        accent-color: #7c3aed;
        cursor: pointer;
      }
      .gfw-menu select, .gfw-menu input[type="number"], .gfw-menu input[type="text"], .gfw-menu input[type="password"] {
        border: 1.5px solid #cbd5e1;
        border-radius: 8px;
        padding: 3px 6px;
        font-size: 12px;
        color: #1e293b;
        background: #f8fafc;
        outline: none;
      }
      .gfw-menu select:focus, .gfw-menu input:focus {
        border-color: #7c3aed;
        background: #fff;
      }
      .gfw-btn-sm {
        border: 1.5px solid #cbd5e1;
        background: #f1f5f9;
        color: #1e293b;
        border-radius: 8px;
        padding: 4px 8px;
        font-size: 11.5px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .gfw-btn-sm:hover {
        background: #ede9fe;
        border-color: #8b5cf6;
        color: #4c1d95;
      }
      .gfw-btn-primary {
        background: linear-gradient(135deg, #3b82f6, #8b5cf6, #ec4899);
        color: #fff;
        border: none;
      }
      .gfw-btn-primary:hover {
        opacity: 0.92;
        color: #fff;
      }
      .gfw-m-divider {
        height: 1px;
        background: #e2e8f0;
        margin: 6px 0;
      }
      .gfw-subpanel {
        background: #f8fafc;
        border: 1.5px solid #e2e8f0;
        border-radius: 10px;
        padding: 8px 10px;
        margin: 5px 0;
        display: none;
      }
      .gfw-subpanel.gfw-open {
        display: block;
      }
      .gfw-ver {
        text-align: center;
        font-size: 9.5px;
        color: #94a3b8;
        margin-top: 6px;
        line-height: 1.2;
      }
    `;
    document.head.appendChild(styleEl);

    const root = document.createElement("div");
    root.className = "gfw-root";
    root.id = "gemini-fox-widget-root";
    __gfwDOM.setHTML(root, `
      <div class="gfw-body" id="gfw-body">
        <div class="gfw-bubble" id="gfw-bubble" title="单击气泡框切换猫娘个性化台词 / 再次点击关闭">
          <svg viewBox="0 0 1026 700" aria-hidden="true">
            <defs>
              <linearGradient id="gfwBubbleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffffff" />
                <stop offset="100%" stop-color="#fdfcff" />
              </linearGradient>
              <linearGradient id="gfwStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#3b82f6" />
                <stop offset="38%" stop-color="#8b5cf6" />
                <stop offset="72%" stop-color="#ec4899" />
                <stop offset="100%" stop-color="#f59e0b" />
              </linearGradient>
            </defs>
            <!-- Two small oval thought bubbles matching reference image -->
            <ellipse class="gfw-b2" cx="436" cy="622" rx="22" ry="14" fill="#ffffff" stroke="url(#gfwStrokeGrad)" stroke-width="15" stroke-linejoin="round"></ellipse>
            <ellipse class="gfw-b1" cx="342" cy="554" rx="34" ry="22" fill="#ffffff" stroke="url(#gfwStrokeGrad)" stroke-width="15" stroke-linejoin="round"></ellipse>
            <!-- Generous classic oval speech bubble (rx=400, ry=242 so 5h & weekly quota NEVER clip) -->
            <g class="gfw-bshape">
              <ellipse cx="486" cy="486" rx="48" ry="20" transform="rotate(-6 486 486)" fill="#ffffff" stroke="url(#gfwStrokeGrad)" stroke-width="16" stroke-linejoin="round"></ellipse>
              <ellipse class="gfw-bshape-main" cx="454" cy="252" rx="400" ry="242" fill="#ffffff" stroke="url(#gfwStrokeGrad)" stroke-width="16" stroke-linejoin="round"></ellipse>
              <ellipse cx="486" cy="478" rx="44" ry="18" transform="rotate(-6 486 478)" fill="#ffffff" stroke="none"></ellipse>
            </g>
          </svg>
          <div class="gfw-text" id="gfw-text">
            <div class="gfw-line-a" id="gfw-line-a">剩余额度</div>
            <div class="gfw-line-b" id="gfw-line-b">100%</div>
            <div class="gfw-line-c" id="gfw-line-c">5 小时 100% · 每周 100%</div>
          </div>
          <div class="gfw-bubble-hitbox" id="gfw-bubble-hitbox" title="点击切换猫娘台词 / 再次点击关闭气泡"></div>
        </div>
        <div class="gfw-img-wrap" id="gfw-img-wrap" title="单击猫娘弹出实时额度 / Q弹一下 · 单击气泡框切换台词 · 右键打开菜单">
          <img class="gfw-img" id="gfw-img" alt="Gemini Cat/Fox Girl Widget" />
        </div>
      </div>
      <button type="button" class="gfw-menu-btn" id="gfw-menu-btn" title="打开猫娘挂件个性化设置">☰</button>
    `);
    document.body.appendChild(root);

    const menu = document.createElement("div");
    menu.className = "gfw-menu";
    menu.id = "gfw-menu";
    __gfwDOM.setHTML(menu, `
      <div class="gfw-m-hdr">
        <span>🌈 猫娘挂件设置 (实时额度监控)</span>
        <button type="button" class="gfw-btn-sm" id="gfw-menu-close">✕</button>
      </div>
      <div class="gfw-m-row">
        <span class="gfw-m-label">挂件大小</span>
        <div class="gfw-m-ctrl">
          <input type="range" id="gfw-scale-range" min="0.6" max="2.5" step="0.05" />
          <input type="number" id="gfw-scale-num" min="1" max="20" step="1" style="width:46px;text-align:center;" />
        </div>
      </div>
      <div class="gfw-m-row">
        <span class="gfw-m-label">额度来源</span>
        <div class="gfw-m-ctrl">
          <select id="gfw-tier-select" style="max-width:185px;">
            <option value="advanced_sub">Gemini Advanced (5h:50 / 周:500)</option>
            <option value="aistudio_free">Gemini Pro 标准 (5h:25 / 周:250)</option>
            <option value="aistudio_flash">Gemini Flash 高频 (5h:150 / 周:1500)</option>
            <option value="token_budget">Gemini Ultra 尊享 (5h:100 / 周:1000)</option>
            <option value="custom_api">自定义 5h / 周额度</option>
          </select>
        </div>
      </div>
      <div class="gfw-m-row">
        <span class="gfw-m-label">数值格式</span>
        <div class="gfw-m-ctrl">
          <select id="gfw-display-mode">
            <option value="remaining_pct">显示剩余百分比 (%)</option>
            <option value="remaining_num">显示剩余可用次数</option>
            <option value="used_num">显示已用 / 总次数</option>
          </select>
        </div>
      </div>
      <div class="gfw-m-divider"></div>
      <div class="gfw-m-row">
        <span class="gfw-m-label">音效与提示</span>
        <div class="gfw-m-ctrl">
          <button type="button" class="gfw-btn-sm" id="gfw-toggle-audio-panel">🔊 展开音效与冒泡设置</button>
        </div>
      </div>
      <div class="gfw-subpanel" id="gfw-audio-panel">
        <div class="gfw-m-row">
          <label style="display:flex;align-items:center;gap:4px;font-weight:600;">
            <input type="checkbox" id="gfw-sound-on" /> ① 按压音效
          </label>
          <div class="gfw-m-ctrl">
            <select id="gfw-sound-set">
              <option value="foxbell">星光铃音</option>
              <option value="duck">小黄鸭</option>
              <option value="pop">Q弹气泡</option>
            </select>
            <button type="button" class="gfw-btn-sm" id="gfw-test-press-snd">试听</button>
          </div>
        </div>
        <div class="gfw-m-row">
          <span class="gfw-m-label">按压音量</span>
          <div class="gfw-m-ctrl">
            <input type="range" id="gfw-press-vol" min="0" max="1" step="0.05" />
            <span id="gfw-press-vol-val" style="min-width:34px;text-align:right;">75%</span>
          </div>
        </div>
        <div class="gfw-m-divider"></div>
        <div class="gfw-m-row">
          <label style="display:flex;align-items:center;gap:4px;font-weight:600;">
            <input type="checkbox" id="gfw-turn-alert-on" /> ② 实时消耗冒泡
          </label>
          <div class="gfw-m-ctrl">
            <select id="gfw-turn-sound-set">
              <option value="exp_orb">经验球叮咚</option>
              <option value="chime_a">清脆铃音 A</option>
              <option value="mute">静音仅冒泡</option>
            </select>
            <button type="button" class="gfw-btn-sm" id="gfw-test-turn-snd">试听</button>
          </div>
        </div>
        <div class="gfw-m-row">
          <span class="gfw-m-label">自动关闭(秒)</span>
          <div class="gfw-m-ctrl">
            <input type="number" id="gfw-turn-close-sec" min="0" max="120" step="1" style="width:58px;" />
            <span style="font-size:11px;color:#64748b;">(0=常驻不关)</span>
          </div>
        </div>
      </div>
      <div class="gfw-m-row">
        <span class="gfw-m-label">5h / 周额度</span>
        <div class="gfw-m-ctrl">
          <button type="button" class="gfw-btn-sm" id="gfw-toggle-quota-panel">📊 额度上限与实时同步</button>
        </div>
      </div>
      <div class="gfw-subpanel" id="gfw-quota-panel">
        <div class="gfw-m-row">
          <span class="gfw-m-label">5小时总额度</span>
          <div class="gfw-m-ctrl">
            <input type="number" id="gfw-custom-quota" min="1" max="10000" style="width:76px;" />
          </div>
        </div>
        <div class="gfw-m-row">
          <span class="gfw-m-label">周总额度</span>
          <div class="gfw-m-ctrl">
            <input type="number" id="gfw-custom-week-quota" min="1" max="100000" style="width:76px;" />
          </div>
        </div>
        <div class="gfw-m-row">
          <span class="gfw-m-label">5h 已用校准</span>
          <div class="gfw-m-ctrl">
            <input type="number" id="gfw-used-calibrate" min="0" max="10000" style="width:68px;" />
            <button type="button" class="gfw-btn-sm" id="gfw-btn-reset-today">归零</button>
          </div>
        </div>
        <div class="gfw-m-row">
          <span class="gfw-m-label">周已用校准</span>
          <div class="gfw-m-ctrl">
            <input type="number" id="gfw-used-week-calibrate" min="0" max="100000" style="width:68px;" />
          </div>
        </div>
        <div class="gfw-m-row">
          <span class="gfw-m-label">预警阈值(%)</span>
          <div class="gfw-m-ctrl">
            <input type="number" id="gfw-warn-pct" min="1" max="90" style="width:60px;" />
          </div>
        </div>
        <div class="gfw-m-row">
          <span class="gfw-m-label">状态栏同步</span>
          <div class="gfw-m-ctrl">
            <button type="button" class="gfw-btn-sm" id="gfw-btn-pick-statusbar" title="点击后在页面上点选你的客户端状态栏即可锁定同步">🎯 点选绑定状态栏</button>
          </div>
        </div>
        <div class="gfw-m-row" style="display:none;">
          <input type="password" id="gfw-api-key" />
        </div>
      </div>
      <div class="gfw-m-row">
        <span class="gfw-m-label">吸附与交互</span>
        <div class="gfw-m-ctrl">
          <button type="button" class="gfw-btn-sm" id="gfw-toggle-snap-panel">🧲 吸附 / 翻转设置</button>
        </div>
      </div>
      <div class="gfw-subpanel" id="gfw-snap-panel">
        <div class="gfw-m-row">
          <span class="gfw-m-label">边缘吸附</span>
          <div class="gfw-m-ctrl">
            <select id="gfw-snap-mode">
              <option value="quarter">四分之一视口吸附</option>
              <option value="free">关闭吸附 (自由摆放)</option>
            </select>
          </div>
        </div>
        <div class="gfw-m-row">
          <label style="display:flex;align-items:center;gap:4px;">
            <input type="checkbox" id="gfw-snap-top-on" /> 开启顶部吸附
          </label>
          <label style="display:flex;align-items:center;gap:4px;">
            <input type="checkbox" id="gfw-left-flip-on" /> 贴左水平翻转
          </label>
        </div>
        <div class="gfw-m-row">
          <label style="display:flex;align-items:center;gap:4px;">
            <input type="checkbox" id="gfw-hide-menubtn-on" /> 隐藏右上角按钮
          </label>
          <input type="checkbox" id="gfw-click-advance-on" style="display:none;" />
        </div>
      </div>
      <div class="gfw-m-divider"></div>
      <div class="gfw-m-row" style="justify-content:space-between;">
        <button type="button" class="gfw-btn-sm" id="gfw-btn-sim-turn">⚡ 触发一次真实请求计数</button>
        <button type="button" class="gfw-btn-sm gfw-btn-primary" id="gfw-btn-refresh">🔄 立即同步</button>
      </div>
      <div class="gfw-ver">gemini-catgirl-widget v1.4 · 彩虹主题 & 零延迟实时同步</div>
    `);
    document.body.appendChild(menu);

    setupWidgetLogic(root, menu);
  }

  let refreshRealtimeUI = function () {};

  function setupWidgetLogic(root, menu) {
    const imgWrap = document.getElementById("gfw-img-wrap");
    const imgEl = document.getElementById("gfw-img");
    const bubbleEl = document.getElementById("gfw-bubble");
    const textEl = document.getElementById("gfw-text");
    const menuBtn = document.getElementById("gfw-menu-btn");

    imgEl.src = cfg.customImg || DEFAULT_FOX_IMG;

    let bubbleTimer = null;
    let bubbleMode = "closed"; // "closed" | "quota" | "quote"
    let lastRandomIdx = -1;
    let anim5hId = null;
    let animWeekId = null;
    let prevVal5h = 100;
    let prevValWeek = 100;

    function animateValue(el, fromVal, toVal, suffix, durationMs) {
      if (!el) return null;
      if (fromVal === toVal) {
        el.textContent = toVal + suffix;
        return null;
      }
      const start = performance.now();
      let frameId = null;
      function step(now) {
        const p = Math.min(1, (now - start) / durationMs);
        const ease = 1 - Math.pow(1 - p, 3);
        const curr = Math.round(fromVal + (toVal - fromVal) * ease);
        el.textContent = curr + suffix;
        if (p < 1) {
          frameId = requestAnimationFrame(step);
        }
      }
      frameId = requestAnimationFrame(step);
      return frameId;
    }

    function fitQuoteText() {
      const qEl = textEl.querySelector(".gfw-wrap-quote");
      if (!qEl) return;
      const len = (qEl.textContent || "").length;
      if (len > 42) {
        qEl.style.fontSize = "calc(var(--gfw-u) * 38)";
        qEl.style.lineHeight = "1.30";
      } else if (len > 24) {
        qEl.style.fontSize = "calc(var(--gfw-u) * 46)";
        qEl.style.lineHeight = "1.36";
      } else {
        qEl.style.fontSize = "calc(var(--gfw-u) * 54)";
        qEl.style.lineHeight = "1.42";
      }
    }

    function renderQuotaBubble(withRollAnim = true, headerText = "剩余额度") {
      const m = getQuotaMetrics();
      bubbleMode = "quota";

      let val5h = m.left5hPct;
      let suf5h = "%";
      let valWeek = m.leftWeekPct;
      let sufWeek = "%";

      if (val5h === null) { val5h='—'; suf5h=''; }
      if (valWeek === null) { valWeek='—'; sufWeek=''; }
      headerText = '剩余额度 · 官方';
      __gfwDOM.setHTML(textEl, `
        <div class="gfw-min-quota" id="gfw-roll-target">
          <div class="gfw-min-hdr">
            <span class="gfw-rainbow-txt">${headerText}</span>
            <span class="gfw-min-refresh">↻</span>
          </div>
          <div class="gfw-min-block">
            <div class="gfw-min-row">
              <span class="gfw-min-label gfw-rainbow-txt">5 小时</span>
              <span class="gfw-min-pct gfw-rainbow-num ${m.isWarn5h ? 'gfw-warn' : ''}" id="gfw-val-5h">${val5h}${suf5h}</span>
            </div>
            <div class="gfw-min-bar-track">
              <div class="gfw-min-bar-fill ${m.isWarn5h ? 'gfw-fill-warn' : ''}" style="width:${m.left5hPct ?? 0}%"></div>
            </div>
            <div class="gfw-min-reset gfw-rainbow-txt">${m.reset5hText}</div>
          </div>
          <div class="gfw-min-block">
            <div class="gfw-min-row">
              <span class="gfw-min-label gfw-rainbow-txt">每周</span>
              <span class="gfw-min-pct gfw-rainbow-num ${m.isWarnWeek ? 'gfw-warn' : ''}" id="gfw-val-week">${valWeek}${sufWeek}</span>
            </div>
            <div class="gfw-min-bar-track">
              <div class="gfw-min-bar-fill ${m.isWarnWeek ? 'gfw-fill-warn' : ''}" style="width:${m.leftWeekPct ?? 0}%"></div>
            </div>
            <div class="gfw-min-reset gfw-rainbow-txt">${m.resetWeekText}</div>
          </div>
        </div>
      `);

      if (withRollAnim && m.left5hPct !== null && m.leftWeekPct !== null) {
        if (anim5hId) cancelAnimationFrame(anim5hId);
        if (animWeekId) cancelAnimationFrame(animWeekId);
        const el5h = document.getElementById("gfw-val-5h");
        const elWeek = document.getElementById("gfw-val-week");
        anim5hId = animateValue(el5h, prevVal5h, val5h, suf5h, 480);
        animWeekId = animateValue(elWeek, prevValWeek, valWeek, sufWeek, 520);
      }
      prevVal5h = val5h;
      prevValWeek = valWeek;
    }

    function pickWeightedQuote() {
      const rawLines = (cfg.randomLines && cfg.randomLines.length) ? cfg.randomLines : DEFAULT_LINES;
      const quotesOnly = rawLines.filter(x => x && x.text);
      const pool = quotesOnly.length ? quotesOnly : DEFAULT_LINES;
      const totalW = pool.reduce((acc, item) => acc + (Number(item.weight) || 1), 0);
      let r = Math.random() * totalW;
      let chosenIdx = 0;
      for (let i = 0; i < pool.length; i++) {
        r -= (Number(pool[i].weight) || 1);
        if (r <= 0) {
          chosenIdx = i;
          break;
        }
      }
      if (pool.length > 1 && chosenIdx === lastRandomIdx) {
        chosenIdx = (chosenIdx + 1) % pool.length;
      }
      lastRandomIdx = chosenIdx;
      return pool[chosenIdx];
    }

    function renderCatgirlQuoteBubble() {
      bubbleMode = "quote";
      const item = pickWeightedQuote();
      textEl.style.opacity = "0";
      setTimeout(() => {
        __gfwDOM.setHTML(textEl, `
          <div class="gfw-quote-box">
            <div class="gfw-wrap-quote gfw-rainbow-txt">${item.text}</div>
          </div>
        `);
        fitQuoteText();
        textEl.style.opacity = "1";
      }, 130);
    }

    function openBubble(autoCloseMs) {
      if (!cfg.bubbleOn) return;
      bubbleEl.classList.add("gfw-open");
      if (bubbleTimer) clearTimeout(bubbleTimer);
      const closeDelay = autoCloseMs !== undefined ? autoCloseMs : ((Number(cfg.turnAutoCloseSec) || 0) * 1000);
      if (closeDelay > 0) {
        bubbleTimer = setTimeout(() => {
          closeBubble();
        }, closeDelay);
      }
    }

    function closeBubble() {
      bubbleEl.classList.remove("gfw-open");
      bubbleMode = "closed";
      if (bubbleTimer) {
        clearTimeout(bubbleTimer);
        bubbleTimer = null;
      }
    }

    function triggerJellyBounce() {
      imgWrap.classList.remove("gfw-jelly");
      void imgWrap.offsetWidth;
      imgWrap.classList.add("gfw-jelly");
    }

    // Real-time event recording with zero delay (<15ms)
    let lastRecordedEventMs = 0;
    function recordRealTurnEvent() {
      console.info('[GFW_OFFICIAL_REFRESH]');
    }

    refreshRealtimeUI = function (withAnim = false) {
      syncMenuInputs();
      if (bubbleEl.classList.contains("gfw-open") && bubbleMode === "quota") {
        renderQuotaBubble(withAnim, "剩余额度");
      }
      if (typeof window.__gfwOnStateChange === "function") {
        window.__gfwOnStateChange(getQuotaMetrics(), ledger, cfg);
      }
    };

    // Quotas arrive from the same-session official usage page via the desktop host.
    // Request counts, generic rate-limit headers and chat DOM are not quota sources.

    // Hook 3A: Real-Time Client Statusbar DOM Mirror (Scans page statusbar & Shadow DOM + supports click-to-bind)
    let boundStatusbarEl = null;
    let pickingStatusbar = false;

    function extractQuotaFromText(rawText) {
      if (!rawText || rawText.length > 600) return null;
      const text = rawText.replace(/\s+/g, " ").trim();
      // Look for 5h / 5小时 percentage or ratio
      const m5hPct = text.match(/(?:5\s*小时|5\s*h|5-hour)[^%0-9](0, 18)(\d(1, 3))\s*%/i);
      const mWkPct = text.match(/(?:每周|周额度|7\s*天|weekly|week|周)[^%0-9](0, 18)(\d(1, 3))\s*%/i);
      if (!m5hPct && !mWkPct) return null;

      const res = { updatedAt: Date.now() };
      if (m5hPct) res.left5hPct = Math.max(0, Math.min(100, parseInt(m5hPct[1], 10)));
      if (mWkPct) res.leftWeekPct = Math.max(0, Math.min(100, parseInt(mWkPct[1], 10)));

      const m5hReset = text.match(/(\d+\s*小时(?:\s*\d+\s*分(?:钟)?)?后重置|\d+\s*分(?:钟)?后重置)/);
      if (m5hReset) res.reset5hText = m5hReset[1].replace(/\s+/g, " ");

      const mWkReset = text.match(/(\d+\s*天(?:\s*\d+\s*小时)?后重置)/);
      if (mWkReset) res.resetWeekText = mWkReset[1].replace(/\s+/g, " ");
      return res;
    }

    function scanPageStatusbar() { return false; }

    function applyStatusbarOverride(parsed, label) {
      const prev = ledger.remoteOverride || {};
      const changed = (
        prev.left5hPct !== parsed.left5hPct ||
        prev.leftWeekPct !== parsed.leftWeekPct ||
        prev.reset5hText !== parsed.reset5hText ||
        prev.resetWeekText !== parsed.resetWeekText
      );
      ledger.remoteOverride = Object.assign({}, prev, parsed, { updatedAt: Date.now() });
      ledger.sourceLabel = label;
      if (changed) {
        broadcastLedgerUpdate();
        refreshRealtimeUI(true);
      }
    }

    // Enable click-to-bind statusbar picker so user can click their client's statusbar to lock onto it
    function startStatusbarPicker() {
      if (pickingStatusbar) return;
      pickingStatusbar = true;
      document.body.style.cursor = "crosshair";
      const onPickClick = (ev) => {
        if (ev.target.closest("#gemini-fox-widget-root") || ev.target.closest("#gfw-menu")) return;
        ev.preventDefault();
        ev.stopPropagation();
        pickingStatusbar = false;
        document.body.style.cursor = "";
        document.removeEventListener("click", onPickClick, true);
        boundStatusbarEl = ev.target.closest('[class*="status"], [id*="status"], [class*="quota"], div, footer') || ev.target;
        scanPageStatusbar();
        renderQuotaBubble(true, "剩余额度");
        openBubble();
      };
      setTimeout(() => document.addEventListener("click", onPickClick, true), 80);
    }

    // Hook 3: DOM MutationObserver for newly added user query nodes in Gemini Web / Desktop UI
    if (typeof MutationObserver !== "undefined" && !window.__gfwDomObserver) {
      let knownUserMsgCount = document.querySelectorAll('user-query, [data-message-author-role="user"]').length;
      const observer = new MutationObserver(() => {
        const currCount = document.querySelectorAll('user-query, [data-message-author-role="user"]').length;
        if (currCount > knownUserMsgCount) {
          const delta = currCount - knownUserMsgCount;
          knownUserMsgCount = currCount;
          recordRealTurnEvent("DOM 消息流实时侦测", delta);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      window.__gfwDomObserver = observer;
    }

    function applyScaleAndClasses() {
      root.style.setProperty("--gfw-scale", cfg.scale);
      root.classList.toggle("gfw-hide-btn", !!cfg.hideMenuBtn);
    }

    function settlePosition(withTransition = true) {
      applyScaleAndClasses();
      if (!withTransition) root.classList.add("gfw-dragging");
      const rect = root.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const rightMargin = cfg.avoidScrollbar ? 18 : 6;
      const pad = 8;

      let left = cfg.posLeft !== null ? cfg.posLeft : (vw - rect.width - rightMargin);
      let top = cfg.posTop !== null ? cfg.posTop : (vh - rect.height - pad);

      if (cfg.snapMode === "quarter") {
        const cx = left + rect.width / 2;
        const cy = top + rect.height / 2;

        if (cx < vw * 0.25) {
          left = pad;
          cfg.anchorH = "left";
        } else if (cx > vw * 0.75) {
          left = vw - rect.width - rightMargin;
          cfg.anchorH = "right";
        } else {
          cfg.anchorH = "none";
        }

        if (cfg.snapTopOn && cy < vh * 0.25) {
          top = pad;
          cfg.anchorV = "top";
        } else if (cy > vh * 0.75) {
          top = vh - rect.height - pad;
          cfg.anchorV = "bottom";
        } else {
          cfg.anchorV = "none";
        }
      }

      left = Math.max(pad, Math.min(vw - rect.width - rightMargin, left));
      top = Math.max(pad, Math.min(vh - rect.height - pad, top));

      cfg.posLeft = Math.round(left);
      cfg.posTop = Math.round(top);
      root.style.left = cfg.posLeft + "px";
      root.style.top = cfg.posTop + "px";

      const shouldFlipLeft = cfg.leftFlipOn && (cfg.anchorH === "left" || (cfg.posLeft + rect.width / 2 < vw * 0.25));
      root.classList.toggle("gfw-left", shouldFlipLeft);

      if (!withTransition) {
        requestAnimationFrame(() => root.classList.remove("gfw-dragging"));
      }
      saveStorage(STORAGE_KEY_CFG, cfg);
    }

    let dragState = null;
    let longPressTimer = null;

    imgWrap.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      e.preventDefault();
      imgWrap.setPointerCapture(e.pointerId);

      imgWrap.classList.remove("gfw-jelly");
      imgWrap.classList.add("gfw-pressed");
      playSynthSound("press");

      const rect = root.getBoundingClientRect();
      dragState = {
        id: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        origLeft: rect.left,
        origTop: rect.top,
        moved: false
      };

      if (longPressTimer) clearTimeout(longPressTimer);
      longPressTimer = setTimeout(() => {
        if (dragState && !dragState.moved) {
          toggleMenu();
        }
      }, 1350);
    });

    imgWrap.addEventListener("pointermove", (e) => {
      if (!dragState || e.pointerId !== dragState.id) return;
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      if (!dragState.moved && (dx * dx + dy * dy >= 9)) {
        dragState.moved = true;
        root.classList.add("gfw-dragging");
        if (longPressTimer) clearTimeout(longPressTimer);
      }
      if (dragState.moved) {
        cfg.posLeft = dragState.origLeft + dx;
        cfg.posTop = dragState.origTop + dy;
        root.style.left = cfg.posLeft + "px";
        root.style.top = cfg.posTop + "px";
      }
    });

    function endPointer(e) {
      if (!dragState || e.pointerId !== dragState.id) return;
      if (longPressTimer) clearTimeout(longPressTimer);
      imgWrap.classList.remove("gfw-pressed");
      playSynthSound("release");

      const wasMoved = dragState.moved;
      dragState = null;
      root.classList.remove("gfw-dragging");

      if (wasMoved) {
        settlePosition(true);
      } else {
        handleCatgirlClick();
      }
    }

    imgWrap.addEventListener("pointerup", endPointer);
    imgWrap.addEventListener("pointercancel", endPointer);

    imgWrap.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      toggleMenu();
    });

    function handleCatgirlClick() {
      triggerJellyBounce();

      const isBubbleCurrentlyOpen = bubbleEl.classList.contains("gfw-open");
      if (!isBubbleCurrentlyOpen) {
        renderQuotaBubble(true);
        openBubble();
      } else {
        // Bubble already open -> keep dialog unchanged, only extend timer
        openBubble();
      }

      if (typeof window.__gfwOnStateChange === "function") {
        window.__gfwOnStateChange(getQuotaMetrics(), ledger, cfg);
      }
    }

    const bubbleHitbox = document.getElementById("gfw-bubble-hitbox") || bubbleEl;
    bubbleHitbox.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!bubbleEl.classList.contains("gfw-open")) return;
      if (bubbleMode === "quota") {
        playSynthSound("press", "foxbell", cfg.pressVol * 0.7);
        renderCatgirlQuoteBubble();
        openBubble();
      } else {
        playSynthSound("release", "pop", cfg.pressVol * 0.65);
        closeBubble();
      }
    });

    function positionMenu() {
      const r = root.getBoundingClientRect();
      const mw = 320;
      const mh = menu.offsetHeight || 360;
      let left = r.right - mw;
      if (root.classList.contains("gfw-left")) {
        left = r.left;
      }
      left = Math.max(10, Math.min(window.innerWidth - mw - 10, left));
      let top = r.top - mh - 10;
      if (top < 10) {
        top = Math.min(window.innerHeight - mh - 10, r.bottom + 10);
      }
      menu.style.left = Math.round(left) + "px";
      menu.style.top = Math.round(top) + "px";
    }

    function toggleMenu(forceState) {
      const isShow = forceState !== undefined ? forceState : !menu.classList.contains("gfw-show");
      if (isShow) {
        syncMenuInputs();
        menu.classList.add("gfw-show");
        menuBtn.classList.add("gfw-active");
        positionMenu();
      } else {
        menu.classList.remove("gfw-show");
        menuBtn.classList.remove("gfw-active");
      }
    }

    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu();
    });
    document.getElementById("gfw-menu-close").addEventListener("click", () => toggleMenu(false));

    function bindSubpanel(btnId, panelId) {
      document.getElementById(btnId).addEventListener("click", () => {
        const p = document.getElementById(panelId);
        p.classList.toggle("gfw-open");
        positionMenu();
      });
    }
    bindSubpanel("gfw-toggle-audio-panel", "gfw-audio-panel");
    bindSubpanel("gfw-toggle-quota-panel", "gfw-quota-panel");
    bindSubpanel("gfw-toggle-snap-panel", "gfw-snap-panel");

    function scaleToNum(s) {
      return Math.round(1 + ((s - 0.6) / (2.5 - 0.6)) * 19);
    }
    function numToScale(n) {
      return Number((0.6 + ((Math.max(1, Math.min(20, n)) - 1) / 19) * (2.5 - 0.6)).toFixed(2));
    }

    function syncMenuInputs() {
      pruneSlidingWindows();
      const used5hNow = Math.max(0, ledger.timestamps5h.length + (Number(ledger.manualOffset5h) || 0));
      const usedWkNow = Math.max(0, ledger.timestampsWeek.length + (Number(ledger.manualOffsetWeek) || 0));
      document.getElementById("gfw-scale-range").value = cfg.scale;
      document.getElementById("gfw-scale-num").value = scaleToNum(cfg.scale);
      document.getElementById("gfw-tier-select").value = cfg.tier;
      document.getElementById("gfw-display-mode").value = cfg.displayMode;
      document.getElementById("gfw-sound-on").checked = !!cfg.soundOn;
      document.getElementById("gfw-sound-set").value = cfg.soundSet;
      document.getElementById("gfw-press-vol").value = cfg.pressVol;
      document.getElementById("gfw-press-vol-val").textContent = Math.round(cfg.pressVol * 100) + "%";
      document.getElementById("gfw-turn-alert-on").checked = !!cfg.turnAlertOn;
      document.getElementById("gfw-turn-sound-set").value = cfg.turnSoundSet;
      document.getElementById("gfw-turn-close-sec").value = cfg.turnAutoCloseSec;
      document.getElementById("gfw-custom-quota").value = cfg.customQuota5h;
      const wkIn = document.getElementById("gfw-custom-week-quota");
      if (wkIn) wkIn.value = cfg.customQuotaWeek;
      document.getElementById("gfw-used-calibrate").value = used5hNow;
      const wkUsedIn = document.getElementById("gfw-used-week-calibrate");
      if (wkUsedIn) wkUsedIn.value = usedWkNow;
      document.getElementById("gfw-warn-pct").value = cfg.warnThresholdPct;
      document.getElementById("gfw-snap-mode").value = cfg.snapMode;
      document.getElementById("gfw-snap-top-on").checked = !!cfg.snapTopOn;
      document.getElementById("gfw-left-flip-on").checked = !!cfg.leftFlipOn;
      document.getElementById("gfw-hide-menubtn-on").checked = !!cfg.hideMenuBtn;
    }

    function updateScaleAnchored(newScale) {
      root.classList.add("gfw-dragging");
      const oldRect = root.getBoundingClientRect();
      const isLeft = root.classList.contains("gfw-left");
      const anchorRight = oldRect.right;
      const anchorLeft = oldRect.left;
      const anchorBottom = oldRect.bottom;

      cfg.scale = Math.max(0.6, Math.min(2.5, newScale));
      root.style.setProperty("--gfw-scale", cfg.scale);

      const newRect = root.getBoundingClientRect();
      cfg.posTop = Math.round(anchorBottom - newRect.height);
      cfg.posLeft = Math.round(isLeft ? anchorLeft : (anchorRight - newRect.width));
      root.style.left = cfg.posLeft + "px";
      root.style.top = cfg.posTop + "px";
      saveStorage(STORAGE_KEY_CFG, cfg);
    }

    const scaleRange = document.getElementById("gfw-scale-range");
    const scaleNum = document.getElementById("gfw-scale-num");
    scaleRange.addEventListener("input", () => {
      const s = parseFloat(scaleRange.value);
      scaleNum.value = scaleToNum(s);
      updateScaleAnchored(s);
    });
    scaleRange.addEventListener("change", () => settlePosition(true));

    scaleNum.addEventListener("change", () => {
      const s = numToScale(parseInt(scaleNum.value, 10) || 10);
      scaleRange.value = s;
      updateScaleAnchored(s);
      settlePosition(true);
    });

    document.getElementById("gfw-tier-select").addEventListener("change", (e) => {
      cfg.tier = e.target.value;
      const preset = TIER_PRESETS[cfg.tier] || TIER_PRESETS.advanced_sub;
      cfg.customQuota5h = preset.quota5h;
      cfg.customQuotaWeek = preset.quotaWeek;
      syncMenuInputs();
      saveStorage(STORAGE_KEY_CFG, cfg);
      renderQuotaBubble(true);
      openBubble();
      if (typeof window.__gfwOnStateChange === "function") window.__gfwOnStateChange(getQuotaMetrics(), ledger, cfg);
    });

    document.getElementById("gfw-display-mode").addEventListener("change", (e) => {
      cfg.displayMode = e.target.value;
      saveStorage(STORAGE_KEY_CFG, cfg);
      renderQuotaBubble(true);
      openBubble();
      if (typeof window.__gfwOnStateChange === "function") window.__gfwOnStateChange(getQuotaMetrics(), ledger, cfg);
    });

    document.getElementById("gfw-sound-on").addEventListener("change", (e) => {
      cfg.soundOn = e.target.checked;
      saveStorage(STORAGE_KEY_CFG, cfg);
    });
    document.getElementById("gfw-sound-set").addEventListener("change", (e) => {
      cfg.soundSet = e.target.value;
      saveStorage(STORAGE_KEY_CFG, cfg);
    });
    document.getElementById("gfw-press-vol").addEventListener("input", (e) => {
      cfg.pressVol = parseFloat(e.target.value);
      document.getElementById("gfw-press-vol-val").textContent = Math.round(cfg.pressVol * 100) + "%";
      saveStorage(STORAGE_KEY_CFG, cfg);
    });
    document.getElementById("gfw-test-press-snd").addEventListener("click", () => {
      playSynthSound("press", cfg.soundSet, cfg.pressVol);
    });
    document.getElementById("gfw-turn-alert-on").addEventListener("change", (e) => {
      cfg.turnAlertOn = e.target.checked;
      saveStorage(STORAGE_KEY_CFG, cfg);
    });
    document.getElementById("gfw-turn-sound-set").addEventListener("change", (e) => {
      cfg.turnSoundSet = e.target.value;
      saveStorage(STORAGE_KEY_CFG, cfg);
    });
    document.getElementById("gfw-test-turn-snd").addEventListener("click", () => {
      playSynthSound("task_end", cfg.turnSoundSet, cfg.turnVol);
    });
    document.getElementById("gfw-turn-close-sec").addEventListener("change", (e) => {
      cfg.turnAutoCloseSec = Math.max(0, parseInt(e.target.value, 10) || 0);
      saveStorage(STORAGE_KEY_CFG, cfg);
    });
    document.getElementById("gfw-custom-quota").addEventListener("change", (e) => {
      cfg.customQuota5h = Math.max(1, parseInt(e.target.value, 10) || 50);
      saveStorage(STORAGE_KEY_CFG, cfg);
      renderQuotaBubble(true);
      if (typeof window.__gfwOnStateChange === "function") window.__gfwOnStateChange(getQuotaMetrics(), ledger, cfg);
    });
    document.getElementById("gfw-custom-week-quota").addEventListener("change", (e) => {
      cfg.customQuotaWeek = Math.max(1, parseInt(e.target.value, 10) || 500);
      saveStorage(STORAGE_KEY_CFG, cfg);
      renderQuotaBubble(true);
      if (typeof window.__gfwOnStateChange === "function") window.__gfwOnStateChange(getQuotaMetrics(), ledger, cfg);
    });
    document.getElementById("gfw-used-calibrate").addEventListener("change", (e) => {
      const targetUsed = Math.max(0, parseInt(e.target.value, 10) || 0);
      pruneSlidingWindows();
      ledger.manualOffset5h = targetUsed - ledger.timestamps5h.length;
      ledger.sourceLabel = "手动校准同步";
      broadcastLedgerUpdate();
      renderQuotaBubble(true);
      if (typeof window.__gfwOnStateChange === "function") window.__gfwOnStateChange(getQuotaMetrics(), ledger, cfg);
    });
    document.getElementById("gfw-used-week-calibrate").addEventListener("change", (e) => {
      const targetUsed = Math.max(0, parseInt(e.target.value, 10) || 0);
      pruneSlidingWindows();
      ledger.manualOffsetWeek = targetUsed - ledger.timestampsWeek.length;
      ledger.sourceLabel = "手动校准同步";
      broadcastLedgerUpdate();
      renderQuotaBubble(true);
      if (typeof window.__gfwOnStateChange === "function") window.__gfwOnStateChange(getQuotaMetrics(), ledger, cfg);
    });
    document.getElementById("gfw-btn-reset-today").addEventListener("click", () => {
      ledger.timestamps5h = [];
      ledger.manualOffset5h = 0;
      ledger.remoteOverride = null;
      ledger.sourceLabel = "窗口已归零重置";
      broadcastLedgerUpdate();
      syncMenuInputs();
      renderQuotaBubble(true);
      openBubble();
      if (typeof window.__gfwOnStateChange === "function") window.__gfwOnStateChange(getQuotaMetrics(), ledger, cfg);
    });
    const pickSbBtn = document.getElementById("gfw-btn-pick-statusbar");
    if (pickSbBtn) {
      pickSbBtn.addEventListener("click", () => {
        toggleMenu(false);
        startStatusbarPicker();
      });
    }
    document.getElementById("gfw-warn-pct").addEventListener("change", (e) => {
      cfg.warnThresholdPct = Math.max(1, Math.min(90, parseInt(e.target.value, 10) || 20));
      saveStorage(STORAGE_KEY_CFG, cfg);
      if (bubbleMode === "quota") renderQuotaBubble(false);
    });
    document.getElementById("gfw-snap-mode").addEventListener("change", (e) => {
      cfg.snapMode = e.target.value;
      settlePosition(true);
    });
    document.getElementById("gfw-snap-top-on").addEventListener("change", (e) => {
      cfg.snapTopOn = e.target.checked;
      settlePosition(true);
    });
    document.getElementById("gfw-left-flip-on").addEventListener("change", (e) => {
      cfg.leftFlipOn = e.target.checked;
      settlePosition(true);
    });
    document.getElementById("gfw-hide-menubtn-on").addEventListener("change", (e) => {
      cfg.hideMenuBtn = e.target.checked;
      applyScaleAndClasses();
      saveStorage(STORAGE_KEY_CFG, cfg);
    });

    document.getElementById("gfw-btn-sim-turn").addEventListener("click", () => {
      recordRealTurnEvent("手动触发测试请求", 1);
    });

    document.getElementById("gfw-btn-refresh").addEventListener("click", () => {
      renderQuotaBubble(true);
      openBubble();
    });

    window.addEventListener("resize", () => settlePosition(false));

    window.GeminiFoxWidget = {
      openQuotaBubble: () => { renderQuotaBubble(true); openBubble(); },
      showNextQuote: () => {
        if (!bubbleEl.classList.contains("gfw-open")) {
          renderQuotaBubble(true);
          openBubble();
        } else if (bubbleMode === "quota") {
          renderCatgirlQuoteBubble();
          openBubble();
        } else {
          closeBubble();
        }
      },
      bounceCatgirlOnly: () => { handleCatgirlClick(); },
      simulateTurn: () => recordRealTurnEvent("实时对话请求捕获", 1),
      openMenu: () => toggleMenu(true),
      snapToLeft: () => {
        cfg.posLeft = 12;
        cfg.posTop = window.innerHeight - root.getBoundingClientRect().height - 16;
        settlePosition(true);
        if (!bubbleEl.classList.contains("gfw-open")) {
          renderQuotaBubble(false);
          openBubble();
        }
      },
      snapToRight: () => {
        const r = root.getBoundingClientRect();
        cfg.posLeft = window.innerWidth - r.width - 20;
        cfg.posTop = window.innerHeight - r.height - 16;
        settlePosition(true);
        if (!bubbleEl.classList.contains("gfw-open")) {
          renderQuotaBubble(false);
          openBubble();
        }
      },
      setTier: (tierKey) => {
        if (TIER_PRESETS[tierKey]) {
          cfg.tier = tierKey;
          cfg.customQuota5h = TIER_PRESETS[tierKey].quota5h;
          cfg.customQuotaWeek = TIER_PRESETS[tierKey].quotaWeek;
          saveStorage(STORAGE_KEY_CFG, cfg);
          syncMenuInputs();
          renderQuotaBubble(true);
          openBubble();
          if (typeof window.__gfwOnStateChange === "function") window.__gfwOnStateChange(getQuotaMetrics(), ledger, cfg);
        }
      },
      reset5hWindow: () => {
        ledger.timestamps5h = [];
        ledger.manualOffset5h = 0;
        ledger.remoteOverride = null;
        ledger.sourceLabel = "窗口已归零重置";
        broadcastLedgerUpdate();
        syncMenuInputs();
        if (bubbleMode === "quota") renderQuotaBubble(true);
        if (typeof window.__gfwOnStateChange === "function") window.__gfwOnStateChange(getQuotaMetrics(), ledger, cfg);
      },
      scanStatusbar: scanPageStatusbar,
      getMetrics: getQuotaMetrics,
      getLedger: () => ledger,
      getConfig: () => cfg
    };

    window.addEventListener('gfw-official-quota', () => refreshRealtimeUI(false));
    document.getElementById('gfw-btn-refresh').addEventListener('click', () => console.info('[GFW_OFFICIAL_REFRESH]'));
    for (const id of ['gfw-tier-select','gfw-display-mode','gfw-toggle-quota-panel','gfw-btn-sim-turn']) {
      const el=document.getElementById(id); if(el) { el.disabled=true; el.title='已使用 Google 官方双额度，自动同步'; }
    }
    for (const option of document.querySelectorAll('#gfw-tier-select option')) option.textContent='Google 官方账户用量';
    document.getElementById('gfw-btn-sim-turn').hidden=true;
    document.getElementById('gfw-toggle-quota-panel').textContent='官方双额度自动同步';
    const footer=document.querySelector('.gfw-ver');
    if(footer)footer.textContent='Google 官方双额度 · 30秒自动刷新';
    settlePosition(false);
    setTimeout(() => {
      scanPageStatusbar();
      renderQuotaBubble(false);
      openBubble();
      if (typeof window.__gfwOnStateChange === "function") window.__gfwOnStateChange(getQuotaMetrics(), ledger, cfg);
    }, 150);

    // 1-second real-time heartbeat + statusbar DOM scanner so statusbar changes sync within milliseconds!
    setInterval(() => {
      scanPageStatusbar();
      if (bubbleMode === "quota" && bubbleEl.classList.contains("gfw-open")) {
        renderQuotaBubble(false);
      }
      if (typeof window.__gfwOnStateChange === "function") {
        window.__gfwOnStateChange(getQuotaMetrics(), ledger, cfg);
      }
    }, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initWidgetDOM);
  } else {
    initWidgetDOM();
  }
})();
