'use strict';

const MAX_NOTES = 40;
const cleanText = value => typeof value === 'string' ? value.trim().slice(0, 80) : '';
const validTime = value => Number.isFinite(value) && value > 0 && value <= 8640000000000000;

function dayKey(ms) {
  const d = new Date(ms);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function normalize(raw) {
  const seen = new Set();
  const notes = [];
  for (const note of Array.isArray(raw?.notes) ? raw.notes : []) {
    const text = cleanText(note?.text);
    if (!text || typeof note.id !== 'string' || !/^[a-z0-9-]{1,50}$/.test(note.id) || seen.has(note.id)) continue;
    seen.add(note.id);
    notes.push({
      id: note.id, text,
      dueAt: validTime(note.dueAt) ? note.dueAt : null,
      doneAt: validTime(note.doneAt) ? note.doneAt : null,
      reminded: note.reminded === true
    });
    if (notes.length === MAX_NOTES) break;
  }
  const days = {};
  for (const [date, entry] of Object.entries(raw?.days || {}).filter(([date]) => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort().slice(-31)) {
    const safeCount = n => Number.isInteger(n) && n > 0 ? Math.min(n, 1000000) : 0;
    days[date] = { rounds: safeCount(entry?.rounds), minutes: safeCount(entry?.minutes), goals: safeCount(entry?.goals), notes: safeCount(entry?.notes) };
  }
  return { notes, days, bookmark: cleanText(raw?.bookmark) };
}

function getDay(work, ms) {
  const key = dayKey(ms);
  return work.days[key] ??= { rounds: 0, minutes: 0, goals: 0, notes: 0 };
}

function addNote(work, text, reminder, now = Date.now()) {
  text = cleanText(text);
  if (!text || work.notes.length >= MAX_NOTES) return false;
  const base = Math.floor(now).toString(36);
  let suffix = 0;
  while (work.notes.some(note => note.id === base + '-' + suffix)) suffix++;
  let dueAt = null;
  if (typeof reminder === 'number') {
    if (!validTime(reminder) || reminder <= now) return false;
    dueAt = reminder;
  }
  if (reminder === 'half-hour') dueAt = now + 30 * 60000;
  if (reminder === 'evening') {
    const evening = new Date(now);
    evening.setHours(20, 0, 0, 0);
    if (+evening <= now) evening.setDate(evening.getDate() + 1);
    dueAt = +evening;
  }
  work.notes.push({ id: base + '-' + suffix, text, dueAt, doneAt: null, reminded: false });
  return true;
}

function completeNote(work, id, now = Date.now()) {
  const note = work.notes.find(n => n.id === id && !n.doneAt);
  if (!note) return false;
  note.doneAt = now;
  getDay(work, now).notes++;
  return true;
}

function claimReminders(work, now = Date.now()) {
  const due = work.notes.filter(n => !n.doneAt && !n.reminded && n.dueAt !== null && n.dueAt <= now);
  due.forEach(n => { n.reminded = true; });
  return due;
}

module.exports = { normalize, cleanText, dayKey, getDay, addNote, completeNote, claimReminders };
