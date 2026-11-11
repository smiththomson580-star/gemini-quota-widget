const GHOST = '鬼牌';
export const JOKER_REWARD = 20;
const RANKS = ['A', '2', '3', '5', '7', '9', 'J', 'K'];

function shuffle(cards) {
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function deal() {
  // In this short variant every pair starts split across the two hands.
  const hands = { player: [...RANKS], cat: [...RANKS] };
  hands[Math.random() < 0.5 ? 'player' : 'cat'].push(GHOST);
  shuffle(hands.cat);
  return hands;
}

function draw(hands, to, index) {
  const from = to === 'player' ? 'cat' : 'player';
  const [card] = hands[from].splice(index, 1);
  const match = card === GHOST ? -1 : hands[to].indexOf(card);
  if (match >= 0) hands[to].splice(match, 1);
  else hands[to].push(card);
  return { card, paired: match >= 0 };
}

function expression(dom) {
  const layer = document.createElement('span');
  layer.className = 'cp-joker-expression';
  layer.setAttribute('aria-hidden', 'true');
  dom.setHTML(layer, `
    <svg viewBox="0 0 1254 1254" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <g class="cp-joker-grin" transform="translate(611 855) rotate(-16)" stroke="#302034" stroke-width="9" stroke-linecap="round" stroke-linejoin="round">
        <path d="M-70 -18 Q0 -6 70 -20 Q59 38 4 42 Q-52 41 -70 -18Z" fill="#fffaff"/>
        <path d="M-38 -13 L-32 32 M-10 -10 L-8 39 M19 -11 L20 39 M47 -15 L46 27" fill="none" stroke-width="6"/>
      </g>
      <g class="cp-joker-cry" stroke-linecap="round">
        <path d="M431 857 Q476 887 531 850 M699 783 Q746 812 804 773" fill="none" stroke="#86d9ff" stroke-width="15"/>
        <path d="M468 873 Q463 915 451 946 M753 802 Q750 842 737 880" fill="none" stroke="#5dcaff" stroke-width="23"/>
        <path d="M471 875 Q467 915 458 935 M755 805 Q750 842 743 865" fill="none" stroke="#e4faff" stroke-width="7"/>
        <path d="M582 874 Q609 838 642 858" fill="none" stroke="#65384a" stroke-width="10"/>
        <path class="cp-joker-drop" d="M452 903 Q418 944 433 961 Q454 979 471 956 Q478 941 452 903Z" fill="#61ceff" stroke="#e2f8ff" stroke-width="6"/>
        <path class="cp-joker-drop cp-joker-drop-late" d="M745 842 Q710 886 726 902 Q747 921 764 897 Q772 882 745 842Z" fill="#61ceff" stroke="#e2f8ff" stroke-width="6"/>
        <path class="cp-joker-drop cp-joker-drop-last" d="M764 897 Q737 930 749 944 Q767 957 779 938 Q786 926 764 897Z" fill="#96e6ff"/>
      </g>
      <path class="cp-joker-sweat" d="M888 615Q842 674 864 693Q887 713 911 692Q926 670 888 615Z" fill="#7bd9ff" stroke="#e5faff" stroke-width="8"/>
    </svg>`);
  return layer;
}

export function mountJoker({ card, imageWrap, dom, canPlay, customImage, onOpen, onLayout, onStart, onComplete, persona, setPersona, animate }) {
  dom.setHTML(card, `
    <div class="cp-joker-head"><div><h3 id="gfw-joker-title">摸鬼牌</h3><p>和猫猫抽一局，完赛好感 +20</p></div><button type="button" class="cp-button cp-primary" id="gfw-joker-start" hidden>再来一局</button></div>
    <div id="gfw-joker-board" hidden>
      <p class="cp-joker-status" role="status"></p>
      <label class="cp-joker-persona" for="gfw-joker-persona">猫猫性格 <select id="gfw-joker-persona"><option value="honest">老实猫</option><option value="actor">演技猫</option></select></label>
      <p id="gfw-joker-cue" role="status" aria-live="polite"></p>
      <div class="cp-joker-label">猫猫的牌 · 点牌背抽一张</div>
      <div class="cp-joker-hand" role="group" aria-label="猫猫手牌"></div>
      <div class="cp-joker-label">你的牌 · 同点数自动配对</div>
      <div class="cp-joker-hand cp-joker-player" role="group" aria-label="你的手牌"></div>
      <button type="button" class="cp-button" id="gfw-joker-leave">退出牌局</button>
    </div>`);
  card.setAttribute('aria-labelledby', 'gfw-joker-title');
  const $ = selector => card.querySelector(selector);
  const start = $('#gfw-joker-start');
  const leave = $('#gfw-joker-leave');
  const board = $('#gfw-joker-board');
  const catCards = $('.cp-joker-hand');
  const playerCards = $('.cp-joker-player');
  const status = $('.cp-joker-status');
  const cue = $('#gfw-joker-cue');
  const personaSelect = $('#gfw-joker-persona');
  function showPersona() {
    cue.textContent = persona() === 'honest' ? '指向牌背，看猫猫有没有紧张。' : '猫猫会露馅，也会虚张声势。';
  }
  personaSelect.addEventListener('change', () => { setPersona(personaSelect.value); showPersona(); });
  const face = expression(dom);
  face.classList.add('cp-joker-on-widget');
  imageWrap.appendChild(face);

  let hands;
  let phase = 'idle';
  let turnTimer = null;
  let faceTimer = null;

  function clearExpression() {
    clearTimeout(faceTimer);
    board.removeAttribute('data-expression');
    face.removeAttribute('data-expression');
  }

  function expressionFor(kind, ms = 1650) {
    clearExpression();
    if (card.hidden) return;
    board.dataset.expression = kind;
    if (!customImage()) face.dataset.expression = kind;
    faceTimer = setTimeout(clearExpression, ms);
  }

  function react(kind) {
    if (card.hidden) return;
    if (!animate()) { expressionFor(kind); return; }
    expressionFor('stunned');
    cue.textContent = kind === 'tears' ? '……猫猫愣住了。' : '唔……猫猫先憋一下。';
    clearTimeout(faceTimer);
    faceTimer = setTimeout(() => {
      expressionFor(kind);
      cue.textContent = kind === 'tears' ? '呜哇——眼泪停不下来啦！' : '嘿嘿，还是没忍住！';
    }, 420);
  }

  function render(message) {
    status.textContent = message;
    catCards.replaceChildren();
    playerCards.replaceChildren();
    hands.cat.forEach((rank, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cp-joker-card cp-joker-back';
      button.textContent = '✦';
      button.dataset.jokerIndex = String(index);
      button.setAttribute('aria-label', '抽猫猫的第 ' + (index + 1) + ' 张牌');
      button.disabled = phase !== 'player';
      let hintMode, nervous;
      const hint = () => {
        if (phase !== 'player' || button.parentNode !== catCards || card.hidden) return;
        const mode = persona();
        if (hintMode !== mode) {
          hintMode = mode;
          nervous = mode === 'honest' ? rank === GHOST : Math.random() < (rank === GHOST ? .8 : .3);
        }
        if (nervous) expressionFor('nervous', 900);
        else clearExpression();
        cue.textContent = nervous ? '这张……猫猫才没有一直看它！' : '随便挑喵，本喵一点都不紧张。';
      };
      button.addEventListener('pointerenter', hint);
      button.addEventListener('focus', hint);
      button.addEventListener('click', () => {
        if (phase !== 'player' || button.parentNode !== catCards || !canPlay()) return;
        phase = 'cat';
        clearExpression();
        showPersona();
        take('player', index);
      });
      catCards.appendChild(button);
    });
    for (const rank of hands.player) {
      const item = document.createElement('span');
      item.className = 'cp-joker-card' + (rank === GHOST ? ' cp-joker-ghost' : '');
      item.textContent = rank;
      playerCards.appendChild(item);
    }
    if (!hands.cat.length) catCards.textContent = '已出完';
    if (!hands.player.length) playerCards.textContent = '已出完';
    onLayout();
  }

  function finish(message, lastCard) {
    const playerWon = hands.player.length === 0;
    phase = 'done';
    if (playerWon && lastCard !== GHOST) react('tears');
    const catSulks = playerWon && !card.hidden;
    const gain = onComplete(catSulks);
    start.hidden = false;
    start.textContent = '再来一局';
    leave.textContent = '收起牌桌';
    const reward = gain ? '好感 +' + gain + (gain < JOKER_REWARD ? '，已满 100' : '') : '好感已满 100';
    const hint = catSulks ? ' 刚输牌时可以去「贴贴」喂条小鱼干。' : '';
    render(message + ' ' + (playerWon ? '你赢啦！' : '鬼牌留在你手里，猫猫赢啦！') + ' ' + reward + '。' + hint);
    if (board.getClientRects?.().length) start.focus();
  }

  function take(who, index) {
    const result = draw(hands, who, index);
    const player = who === 'player';
    let message = (player ? '你' : '猫猫') + '抽到了 ' + result.card + '。';
    if (result.paired) message += ' 配成一对！';
    if (result.card === GHOST) {
      react(player ? 'grin' : 'tears');
      message += player ? ' 嘿嘿，被你摸到啦！' : ' 呜哇……鬼牌怎么又来啦！';
    }
    if (!hands.player.length || !hands.cat.length) {
      finish(message, result.card);
      return;
    }
    render(message);
    turnTimer = setTimeout(() => {
      if (!canPlay()) { reset(); return; }
      if (player) {
        take('cat', Math.floor(Math.random() * hands.player.length));
      } else {
        shuffle(hands.cat);
        phase = 'player';
        render(message + ' 轮到你了。');
        if (board.getClientRects?.().length) catCards.firstElementChild?.focus();
      }
    }, result.card === GHOST ? 1500 : 850);
  }

  function reset(focus = false) {
    clearTimeout(turnTimer);
    clearExpression();
    phase = 'idle';
    hands = undefined;
    board.hidden = true;
    start.hidden = true;
    card.hidden = true;
    onLayout();
    if (focus) imageWrap.focus();
  }

  function startRound() {
    onStart();
    clearExpression();
    hands = deal();
    phase = 'player';
    board.hidden = false;
    start.hidden = true;
    leave.textContent = '退出牌局';
    showPersona();
    render('轮到你了，从猫猫手里挑一张。');
    catCards.firstElementChild?.focus();
  }

  start.addEventListener('click', () => {
    if (canPlay() && phase === 'done') startRound();
  });
  leave.addEventListener('click', () => reset(true));
  return {
    open() {
      if (!canPlay()) return false;
      if (!card.hidden) return true;
      onOpen();
      card.hidden = false;
      if (phase === 'idle') startRound();
      else {
        onLayout();
        if (phase === 'done') start.focus();
        else if (phase === 'player') catCards.firstElementChild?.focus();
        else leave.focus();
      }
      return true;
    },
    hide() {
      if (card.hidden) return;
      card.hidden = true;
      clearExpression();
      onLayout();
    },
    closeIfVisible() {
      if (card.hidden) return false;
      reset(true);
      return true;
    },
    sync() {
      if (personaSelect.value !== persona()) personaSelect.value = persona();
      const available = canPlay();
      start.disabled = !available;
      if (!available && phase !== 'idle' && phase !== 'done') reset();
      if (customImage()) face.removeAttribute('data-expression');
    }
  };
}
