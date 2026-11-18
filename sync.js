// Sync logic, independent of Firebase so it can be tested with a fake backend.
//
// Remote layout (all under users/{uid}/):
//   meta/habits      { items: { [habitId]: habit }, tomb: { [habitId]: deletedAtMs } }
//   meta/settings    { groupOrder: [...], ts }
//   months/{YYYY-MM} { c: { [DD]: { [habitId]: [value, tsMs] } }, u: serverTime }
//   devices/{id}     { name, kind, last }
//
// Every change carries a millisecond timestamp; the newest write wins per habit
// and per day cell, so two devices can edit different days without clobbering.
// All writes use "set with merge", which merges nested maps.

export const SERVER_TS = '__SERVER_TS__';
const MARGIN = 10 * 60 * 1000; // re-read 10 minutes of overlap to absorb clock skew

export function emptyDirty() {
  return { cells: {}, habits: {}, settings: false };
}

export function isDirty(S) {
  const d = S.dirty;
  return !!(d && (d.settings || Object.keys(d.habits).length || Object.keys(d.cells).length));
}

const clean = o => JSON.parse(JSON.stringify(o));

function remapHabit(S, from, to) {
  for (const k in S.logs) if (S.logs[k][from] !== undefined) { S.logs[k][to] = S.logs[k][from]; delete S.logs[k][from]; }
  for (const k in S.lts) if (S.lts[k][from] !== undefined) { S.lts[k][to] = S.lts[k][from]; delete S.lts[k][from]; }
  for (const k in S.dirty.cells) if (S.dirty.cells[k][from]) { S.dirty.cells[k][to] = 1; delete S.dirty.cells[k][from]; }
  delete S.dirty.habits[from];
}

// firstSync: this device has never synced. Habits it created with the same name as
// habits already in the account (e.g. both loaded the starter list) are folded into
// the account's habits instead of showing up twice; their check-ins are kept.
export function mergeHabits(S, remote, firstSync = false) {
  const items = (remote && remote.items) || {};
  const tomb = (remote && remote.tomb) || {};
  if (firstSync) {
    const norm = x => String(x || '').trim().toLowerCase();
    for (const id in items) {
      if (S.habits.some(h => h.id === id)) continue;
      const i = S.habits.findIndex(h => !items[h.id] && norm(h.name) === norm(items[id].name));
      if (i >= 0) { remapHabit(S, S.habits[i].id, id); S.habits.splice(i, 1); }
    }
  }
  for (const id in items) {
    const r = items[id];
    if ((S.tomb[id] || 0) >= (r.ts || 0)) continue; // deleted locally after this version
    const i = S.habits.findIndex(h => h.id === id);
    if (i < 0) S.habits.push(clean(r));
    else if ((r.ts || 0) > (S.habits[i].ts || 0)) {
      S.habits[i] = clean(r);
      delete S.dirty.habits[id];
    }
  }
  for (const id in tomb) {
    const ts = tomb[id];
    S.tomb[id] = Math.max(S.tomb[id] || 0, ts);
    const i = S.habits.findIndex(h => h.id === id);
    if (i >= 0 && (S.habits[i].ts || 0) <= ts) {
      S.habits.splice(i, 1);
      delete S.dirty.habits[id];
    }
  }
  S.habits.forEach((h, i) => { if (h.pos === undefined) h.pos = 1e6 + i; });
  S.habits.sort((a, b) => a.pos - b.pos);
}

export function mergeSettings(S, remote) {
  if (!remote) return;
  if ((remote.ts || 0) > (S.settings.ts || 0)) {
    if (Array.isArray(remote.groupOrder)) S.settings.groupOrder = remote.groupOrder;
    S.settings.ts = remote.ts;
    S.dirty.settings = false;
  }
}

export function mergeMonth(S, m) {
  const c = m.c || {};
  for (const dd in c) {
    const k = `${m.id}-${dd}`;
    for (const hid in c[dd]) {
      const cell = c[dd][hid];
      if (!Array.isArray(cell)) continue;
      const [v, ts] = cell;
      const lt = (S.lts[k] && S.lts[k][hid]) || 0;
      if (ts <= lt) continue;
      (S.lts[k] = S.lts[k] || {})[hid] = ts;
      if (v) (S.logs[k] = S.logs[k] || {})[hid] = v;
      else if (S.logs[k]) { delete S.logs[k][hid]; if (!Object.keys(S.logs[k]).length) delete S.logs[k]; }
      if (S.dirty.cells[k]) { delete S.dirty.cells[k][hid]; if (!Object.keys(S.dirty.cells[k]).length) delete S.dirty.cells[k]; }
    }
  }
}

export function buildWrites(S, dirty) {
  const writes = [];
  const items = {}, tomb = {};
  for (const id in dirty.habits) {
    const h = S.habits.find(x => x.id === id);
    if (h) items[id] = clean(h);
    else if (S.tomb[id]) tomb[id] = S.tomb[id];
  }
  if (Object.keys(items).length || Object.keys(tomb).length) {
    const data = {};
    if (Object.keys(items).length) data.items = items;
    if (Object.keys(tomb).length) data.tomb = tomb;
    writes.push({ path: 'meta/habits', data });
  }
  if (dirty.settings) {
    writes.push({ path: 'meta/settings', data: { groupOrder: S.settings.groupOrder || [], ts: S.settings.ts || Date.now() } });
  }
  const months = {};
  for (const k in dirty.cells) {
    const mon = k.slice(0, 7), dd = k.slice(8, 10);
    for (const hid in dirty.cells[k]) {
      const v = (S.logs[k] && S.logs[k][hid]) || 0;
      const ts = (S.lts[k] && S.lts[k][hid]) || Date.now();
      ((months[mon] = months[mon] || {})[dd] = months[mon][dd] || {})[hid] = [v, ts];
    }
  }
  for (const mon in months) writes.push({ path: `months/${mon}`, data: { c: months[mon], u: SERVER_TS } });
  return writes;
}

function restoreDirty(S, d) {
  for (const k in d.cells) for (const hid in d.cells[k]) (S.dirty.cells[k] = S.dirty.cells[k] || {})[hid] = 1;
  for (const id in d.habits) S.dirty.habits[id] = 1;
  if (d.settings) S.dirty.settings = true;
}

// backend: { get(path), monthsSince(ms), commit(writes), devices() }
export async function syncNow(S, be, device) {
  const started = Date.now();
  mergeHabits(S, await be.get('meta/habits'), !S.sync.lastPull);
  mergeSettings(S, await be.get('meta/settings'));
  const since = S.sync.lastPull ? S.sync.lastPull - MARGIN : 0;
  for (const m of await be.monthsSince(since)) mergeMonth(S, m);

  // Take the pending changes now; anything the user does while we upload stays queued.
  const pending = S.dirty;
  S.dirty = emptyDirty();
  const writes = buildWrites(S, pending);
  writes.push({ path: `devices/${device.id}`, data: { name: device.name, kind: device.kind, last: Date.now() } });
  try {
    await be.commit(writes);
  } catch (e) {
    restoreDirty(S, pending);
    throw e;
  }
  S.sync.lastPull = started;
  S.sync.lastSync = Date.now();
  return { pushed: writes.length - 1, devices: await be.devices() };
}
