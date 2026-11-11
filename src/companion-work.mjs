import workModel from './work-model.cjs';
import { icon } from './companion-icons.mjs';
import { positionPanel } from './companion-panel.mjs';

export function mountWork({ panel, anchor, dom, readState, writeState, preferences, onOpen, react, startClock, pauseClock, stopClock, formatTime, sleep, action, reduced }) {
  dom.setHTML(panel, `
    <header class="cp-work-head"><h3 id="gfw-work-title"></h3><button type="button" class="cp-button" id="gfw-work-close" aria-label="收起面板">${icon("close")}</button></header>
    <section data-work-view="memo" hidden>
      <label for="gfw-note-input">要猫猫帮你记什么？</label>
      <div class="cp-work-row"><input id="gfw-note-input" type="text" maxlength="80" placeholder="例如，整理今天的笔记"><button type="button" class="cp-button cp-primary" id="gfw-note-add">记下</button></div>
      <div class="cp-work-row cp-work-reminder"><label for="gfw-note-reminder">提醒</label><select id="gfw-note-reminder"><option value="">不设提醒</option><option value="half-hour">30 分钟后</option><option value="evening">下一个 20:00</option><option value="custom">自选日期与时间</option></select></div>
      <div class="cp-work-row cp-work-reminder" id="gfw-note-custom" hidden><label for="gfw-note-time">本地时间</label><input id="gfw-note-time" type="datetime-local" aria-describedby="gfw-note-status"></div>
      <div id="gfw-note-list"></div><p id="gfw-note-status" role="status" aria-live="polite"></p>
    </section>
    <section data-work-view="focus" hidden>
      <div id="gfw-work-setup"><label for="gfw-focus-goal">这一轮想完成什么？</label><input id="gfw-focus-goal" type="text" maxlength="80" placeholder="可选，例如写完论文摘要">
        <div id="gfw-work-bookmark" class="cp-work-summary cp-work-bookmark" hidden>
          <div><strong>上次夹好的书签</strong><p id="gfw-bookmark-preview"></p></div>
          <button type="button" class="cp-button" id="gfw-bookmark-use">带入目标</button>
        </div>
        <div class="cp-work-row"><label for="gfw-work-duration">专注时长（分钟）</label><input id="gfw-work-duration" type="number" min="5" max="120" step="1" inputmode="numeric" aria-describedby="gfw-work-duration-hint gfw-work-duration-error"><button type="button" class="cp-button cp-primary" id="gfw-work-start">一起开始</button></div>
        <p id="gfw-work-duration-hint">可填 5–120 分钟，留空使用常用时长。</p>
        <p id="gfw-work-duration-error" role="status" hidden>请输入 5–120 之间的整数分钟。</p>
      </div>
      <div id="gfw-work-running" hidden><p id="gfw-work-current-goal"></p><strong id="gfw-work-clock" role="timer" aria-label="陪工剩余时间"></strong>
        <div class="cp-work-row"><button type="button" class="cp-button" id="gfw-work-pause">暂停</button><button type="button" class="cp-button" id="gfw-work-stop">结束计时</button></div>
      </div>
      <div id="gfw-work-check" hidden><p>时间到啦，这一小步完成了吗？</p><p id="gfw-work-finished-goal"></p><div class="cp-work-row"><button type="button" class="cp-button cp-primary" id="gfw-work-done">完成了</button><button type="button" class="cp-button" id="gfw-work-later">还差一点</button></div></div>
      <button type="button" class="cp-button cp-work-off" id="gfw-work-off">今天收工</button>
    </section>
    <section data-work-view="review" hidden>
      <div class="cp-work-summary" id="gfw-work-summary"></div>
      <p>今天做完的每一小步，都算数。</p>
      <label for="gfw-bookmark-input">工位书签 · 下次从哪继续？</label>
      <div class="cp-work-row"><input id="gfw-bookmark-input" type="text" maxlength="80" placeholder="例如，补第三节的图注"><button type="button" class="cp-button" id="gfw-bookmark-save">保存书签</button></div>
      <p id="gfw-bookmark-status" role="status">清空文字后保存，即可移除书签。</p>
      <button type="button" class="cp-button cp-primary" id="gfw-work-sleep">猫猫也休息吧</button>
    </section>
    <section data-work-view="pet" hidden><div class="cp-work-pets"></div></section>
  `);
  panel.setAttribute('aria-labelledby', 'gfw-work-title');
  const $ = selector => panel.querySelector(selector);
  const listen = (selector, fn) => $(selector).addEventListener('click', fn);
  const duration = $('#gfw-work-duration');
  const durationError = $('#gfw-work-duration-error');
  const goal = $('#gfw-focus-goal');
  const reminderMode = $('#gfw-note-reminder');
  const reminderTime = $('#gfw-note-time');
  const customReminder = $('#gfw-note-custom');
  const noteStatus = $('#gfw-note-status');
  const bookmarkInput = $('#gfw-bookmark-input');
  const bookmarkStatus = $('#gfw-bookmark-status');
  const names = { memo: '猫爪便签', focus: '猫猫陪工', review: '今天，先到这里', pet: '今天也贴贴' };
  const pets = [];
  for (const [key, title] of [['pet', '摸摸头'], ['feed', '投喂小鱼干'], ['play', '逗猫棒']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cp-button';
    button.dataset.cpDockAction = key;
    dom.setHTML(button, icon(key));
    button.appendChild(document.createTextNode(title));
    const badge = document.createElement('small');
    badge.className = 'cp-dock-cooldown';
    badge.hidden = true;
    button.appendChild(badge);
    button.addEventListener('click', () => action(key));
    $('.cp-work-pets').appendChild(button);
    pets.push({ action: key, title, button, badge });
  }
  let view = null;
  let notesSnapshot = '';
  let stamping = null;
  let stampTimer = null;
  const position = () => positionPanel(panel, anchor);

  function renderNotes(notes) {
    const snapshot = JSON.stringify(notes);
    if (snapshot === notesSnapshot) return;
    notesSnapshot = snapshot;
    const list = $('#gfw-note-list');
    list.replaceChildren();
    for (const note of notes) {
      const row = document.createElement('div');
      row.className = 'cp-note' + (note.doneAt ? ' cp-note-done' : '');
      const check = document.createElement('button');
      check.type = 'button';
      check.className = 'cp-button cp-note-check';
      check.textContent = note.doneAt ? '✓' : '○';
      check.disabled = !!note.doneAt;
      check.setAttribute('aria-label', (note.doneAt ? '已完成 ' : '完成 ') + note.text);
      check.addEventListener('click', () => finishNote(note.id));
      const detail = document.createElement('div');
      detail.className = 'cp-note-text';
      detail.textContent = note.text;
      const label = document.createElement('small');
      if (note.doneAt) label.textContent = '猫爪已阅';
      else if (note.dueAt) label.textContent = (note.reminded ? '已提醒 · ' : '提醒 · ') + new Date(note.dueAt).toLocaleString('zh-CN', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:false });
      detail.appendChild(label);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'cp-button cp-note-remove';
      remove.textContent = '×';
      remove.setAttribute('aria-label', '移除便签 ' + note.text);
      remove.addEventListener('click', () => {
        const state = readState();
        state.work.notes = state.work.notes.filter(n => n.id !== note.id);
        writeState(state);
      });
      if (note.id === stamping) row.classList.add('cp-note-stamping');
      row.append(check, detail);
      if (!note.doneAt) {
        const focus = document.createElement('button');
        focus.type = 'button';
        focus.className = 'cp-button cp-note-focus';
        focus.textContent = '去陪工';
        focus.setAttribute('aria-label', '带入陪工目标 ' + note.text);
        focus.addEventListener('click', () => focusNote(note.id));
        row.appendChild(focus);
      }
      row.appendChild(remove);
      list.appendChild(row);
    }
    noteStatus.textContent = notes.filter(n => !n.doneAt).length + ' 件待办 · 逾期提醒在返回 Gemini 时补发';
  }

  function waitingForGoal(timer) {
    return timer.status === 'done' && timer.phase === 'focus' && timer.goal && timer.goalResult === null;
  }

  function focusNote(id) {
    const state = readState();
    const note = state.work.notes.find(item => item.id === id && !item.doneAt);
    if (!note) return;
    if (['running', 'paused'].includes(state.timer.status) || waitingForGoal(state.timer)) {
      noteStatus.textContent = '请先结束当前计时，或到「陪工」确认上一轮目标。';
      return;
    }
    goal.value = note.text;
    open('focus');
    goal.focus();
  }

  function finishNote(id) {
    const state = readState();
    if (!workModel.completeNote(state.work, id)) return;
    clearTimeout(stampTimer);
    stamping = reduced() || !preferences().reactionSequences ? null : id;
    writeState(state);
    if (stamping) stampTimer = setTimeout(() => {
      panel.querySelector('.cp-note-stamping')?.classList.remove('cp-note-stamping');
      stamping = null;
    }, 2400);
    react(['等一下，猫猫要认真盖章。', '啪叽！唔，盖歪了一点。', '偷偷补一个……好猫猫认证！'], 'stamp');
  }

  function addNote() {
    const input = $('#gfw-note-input');
    const state = readState();
    const now = Date.now();
    let reminder = reminderMode.value;
    if (reminder === 'custom') {
      reminder = new Date(reminderTime.value).getTime();
      if (!Number.isFinite(reminder) || reminder <= now) {
        noteStatus.textContent = '请选择晚于现在的提醒日期和时间。';
        reminderTime.focus();
        return;
      }
    }
    if (!workModel.addNote(state.work, input.value, reminder, now)) {
      noteStatus.textContent = input.value.trim() ? '便签本已有 40 件，移除旧便签后再添加。' : '先写一句要记的事。';
      input.focus();
      return;
    }
    input.value = '';
    reminderMode.value = '';
    reminderTime.value = '';
    customReminder.hidden = true;
    writeState(state);
  }

  function answerGoal(done) {
    const state = readState();
    const timer = state.timer;
    if (timer.status !== 'done' || timer.phase !== 'focus' || !timer.goal || timer.goalResult !== null) return;
    timer.goalResult = done;
    if (done && timer.finishedAt) workModel.getDay(state.work, timer.finishedAt).goals++;
    $('#gfw-focus-goal').value = done ? '' : timer.goal;
    writeState(state);
    react(done ? ['这轮认真，猫猫给你盖章！', '伸个懒腰，再来一小步。'] : ['还差一点也没关系。猫猫替你保留这一步。'], 'stamp');
  }

  function render(state, remaining) {
    if (panel.hidden) return;
    if (view === 'memo') renderNotes(state.work.notes);
    if (view === 'focus') {
      const t = state.timer;
      const active = t.status === 'running' || t.status === 'paused';
      const awaiting = waitingForGoal(t);
      $('#gfw-work-running').hidden = !active;
      $('#gfw-work-setup').hidden = active || awaiting;
      $('#gfw-work-check').hidden = !awaiting;
      $('#gfw-work-clock').textContent = formatTime(remaining);
      $('#gfw-work-pause').textContent = t.status === 'paused' ? '继续' : '暂停';
      $('#gfw-work-current-goal').textContent = t.goal || (t.phase === 'break' ? '休息中' : '一起专注');
      $('#gfw-work-finished-goal').textContent = t.goal;
      $('#gfw-work-off').disabled = active;
      $('#gfw-work-bookmark').hidden = !state.work.bookmark;
      const preview = $('#gfw-bookmark-preview');
      if (preview.textContent !== state.work.bookmark) preview.textContent = state.work.bookmark;
    }
    if (view === 'review') {
      const day = workModel.getDay(state.work, Date.now());
      $('#gfw-work-summary').textContent = '完成便签 ' + day.notes + ' 件 · 专注 ' + day.rounds + ' 轮（' + day.minutes + ' 分钟） · 完成目标 ' + day.goals + ' 个';
    }
    position();
  }

  function open(next) {
    onOpen();
    view = next;
    panel.hidden = false;
    $('#gfw-work-title').textContent = names[next];
    for (const part of panel.querySelectorAll('[data-work-view]')) part.hidden = part.dataset.workView !== next;
    const state = readState();
    if (next === 'focus') {
      duration.placeholder = String(preferences().focusMinutes);
      if (state.timer.goalResult === false && !goal.value) goal.value = state.timer.goal;
    }
    if (next === 'review') {
      bookmarkInput.value = state.work.bookmark;
      bookmarkStatus.textContent = '清空文字后保存，即可移除书签。';
    }
    render(state, state.timer.status === 'running' ? Math.max(0, state.timer.deadline - Date.now()) : state.timer.remainingMs);
    (next === 'memo' ? $('#gfw-note-input') : $('#gfw-work-close')).focus();
  }

  function hide(restoreFocus = false) {
    if (panel.hidden) return false;
    panel.hidden = true;
    if (restoreFocus) anchor.focus();
    return true;
  }

  listen('#gfw-work-close', () => hide(true));
  listen('#gfw-note-add', addNote);
  reminderMode.addEventListener('change', () => {
    customReminder.hidden = reminderMode.value !== 'custom';
    position();
  });
  $('#gfw-note-input').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); addNote(); } });
  listen('#gfw-bookmark-save', () => {
    const state = readState();
    state.work.bookmark = workModel.cleanText(bookmarkInput.value);
    bookmarkInput.value = state.work.bookmark;
    bookmarkStatus.textContent = state.work.bookmark ? '猫猫夹好书签啦，下次开工见。' : '猫猫把书签取下来啦。';
    writeState(state);
  });
  listen('#gfw-bookmark-use', () => {
    const bookmark = readState().work.bookmark;
    if (!bookmark) return;
    goal.value = bookmark;
    goal.focus();
  });
  duration.addEventListener('input', () => {
    duration.removeAttribute('aria-invalid');
    durationError.hidden = true;
  });
  listen('#gfw-work-start', () => {
    const minutes = duration.value === '' ? preferences().focusMinutes : Number(duration.value);
    if (duration.validity?.badInput || !Number.isInteger(minutes) || minutes < Number(duration.getAttribute('min')) || minutes > Number(duration.getAttribute('max'))) {
      duration.setAttribute('aria-invalid', 'true');
      durationError.hidden = false;
      duration.focus();
      return;
    }
    startClock('focus', goal.value, minutes);
  });
  listen('#gfw-work-pause', pauseClock);
  listen('#gfw-work-stop', stopClock);
  listen('#gfw-work-done', () => answerGoal(true));
  listen('#gfw-work-later', () => answerGoal(false));
  listen('#gfw-work-off', () => {
    if (['running', 'paused'].includes(readState().timer.status)) return;
    if (!preferences().dayReview) { sleep(); return; }
    open('review');
    react(['把小书合上，今天先写到这里。', '伸个懒腰……你和猫猫都辛苦啦。'], 'book');
  });
  listen('#gfw-work-sleep', sleep);
  return { open, hide, position, render, pets };
}
