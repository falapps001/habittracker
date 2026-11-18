import test from 'node:test';
import assert from 'node:assert/strict';
import { syncNow, emptyDirty, SERVER_TS, isDirty } from '../sync.js';

// In-memory stand-in for Firestore: set-with-merge deep-merges maps, replaces arrays.
function fakeBackend() {
  const docs = {};
  let clock = 1000;
  const merge = (a, b) => {
    for (const k in b) {
      const v = b[k];
      if (v && typeof v === 'object' && !Array.isArray(v)) a[k] = merge(a[k] && typeof a[k] === 'object' ? a[k] : {}, v);
      else a[k] = v;
    }
    return a;
  };
  return {
    docs,
    async get(p) { return docs[p] ? structuredClone(docs[p]) : null; },
    async monthsSince(ms) {
      return Object.keys(docs).filter(p => p.startsWith('months/') && docs[p].u >= ms)
        .map(p => ({ id: p.slice(7), ...structuredClone(docs[p]) }));
    },
    async commit(writes) {
      for (const w of writes) {
        const data = structuredClone(w.data);
        for (const k in data) if (data[k] === SERVER_TS) data[k] = Date.now() + (clock++);
        docs[w.path] = merge(docs[w.path] || {}, data);
      }
    },
    async devices() { return Object.keys(docs).filter(p => p.startsWith('devices/')).map(p => ({ id: p.slice(8), ...docs[p] })); }
  };
}

const state = () => ({ habits: [], logs: {}, lts: {}, tomb: {}, settings: { groupOrder: [], ts: 0 }, dirty: emptyDirty(), sync: { lastPull: 0 } });
let t = 1;
const addHabit = (S, id, name) => { const h = { id, name, ts: t++, pos: S.habits.length }; S.habits.push(h); S.dirty.habits[id] = 1; return h; };
const check = (S, k, id, v = 1) => {
  (S.logs[k] = S.logs[k] || {})[id] = v; if (!v) { delete S.logs[k][id]; if (!Object.keys(S.logs[k]).length) delete S.logs[k]; }
  (S.lts[k] = S.lts[k] || {})[id] = t++; (S.dirty.cells[k] = S.dirty.cells[k] || {})[id] = 1;
};
const dev = id => ({ id, name: id, kind: 'phone' });

test('two devices exchange habits and check-ins', async () => {
  const be = fakeBackend();
  const A = state(), B = state();
  addHabit(A, 'h1', 'Subuh');
  check(A, '2026-11-18', 'h1');
  await syncNow(A, be, dev('A'));
  assert.equal(isDirty(A), false);
  await syncNow(B, be, dev('B'));
  assert.equal(B.habits.length, 1);
  assert.equal(B.logs['2026-11-18'].h1, 1);
  const r = await syncNow(B, be, dev('B'));
  assert.equal(r.devices.length, 2);
});

test('edits to different days on two devices both survive', async () => {
  const be = fakeBackend();
  const A = state(), B = state();
  addHabit(A, 'h1', 'Quran');
  await syncNow(A, be, dev('A')); await syncNow(B, be, dev('B'));
  check(A, '2026-11-17', 'h1');
  check(B, '2026-11-18', 'h1');
  await syncNow(A, be, dev('A')); await syncNow(B, be, dev('B')); await syncNow(A, be, dev('A'));
  for (const S of [A, B]) {
    assert.equal(S.logs['2026-11-17'].h1, 1);
    assert.equal(S.logs['2026-11-18'].h1, 1);
  }
});

test('unchecking a day syncs as a removal', async () => {
  const be = fakeBackend();
  const A = state(), B = state();
  addHabit(A, 'h1', 'Dhuha'); check(A, '2026-11-18', 'h1');
  await syncNow(A, be, dev('A')); await syncNow(B, be, dev('B'));
  check(B, '2026-11-18', 'h1', 0);
  await syncNow(B, be, dev('B')); await syncNow(A, be, dev('A'));
  assert.equal(A.logs['2026-11-18'], undefined);
});

test('newest edit of the same day wins', async () => {
  const be = fakeBackend();
  const A = state(), B = state();
  addHabit(A, 'h1', 'Isya');
  await syncNow(A, be, dev('A')); await syncNow(B, be, dev('B'));
  check(A, '2026-11-18', 'h1', 1);
  check(B, '2026-11-18', 'h1', 0); // later
  await syncNow(A, be, dev('A')); await syncNow(B, be, dev('B')); await syncNow(A, be, dev('A'));
  assert.equal(A.logs['2026-11-18'], undefined);
  assert.equal(B.logs['2026-11-18'], undefined);
});

test('deleting a habit removes it on the other device', async () => {
  const be = fakeBackend();
  const A = state(), B = state();
  addHabit(A, 'h1', 'Witir'); addHabit(A, 'h2', 'Tahajud');
  await syncNow(A, be, dev('A')); await syncNow(B, be, dev('B'));
  B.habits = B.habits.filter(h => h.id !== 'h1'); B.tomb.h1 = t++; B.dirty.habits.h1 = 1;
  await syncNow(B, be, dev('B')); await syncNow(A, be, dev('A'));
  assert.deepEqual(A.habits.map(h => h.id), ['h2']);
});

test('habit edits and order sync', async () => {
  const be = fakeBackend();
  const A = state(), B = state();
  addHabit(A, 'h1', 'One'); addHabit(A, 'h2', 'Two');
  await syncNow(A, be, dev('A')); await syncNow(B, be, dev('B'));
  const [h1, h2] = B.habits; h1.pos = 1; h2.pos = 0; h1.name = 'One!'; h1.ts = t++; h2.ts = t++;
  B.dirty.habits.h1 = 1; B.dirty.habits.h2 = 1; B.habits.reverse();
  await syncNow(B, be, dev('B')); await syncNow(A, be, dev('A'));
  assert.deepEqual(A.habits.map(h => h.name), ['Two', 'One!']);
});

test('starter list on a new device does not duplicate the account habits', async () => {
  const be = fakeBackend();
  const A = state(), B = state();
  addHabit(A, 'a1', 'Subuh'); check(A, '2026-11-01', 'a1');
  await syncNow(A, be, dev('A'));
  addHabit(B, 'b1', 'Subuh'); addHabit(B, 'b2', 'New one');
  check(B, '2026-11-18', 'b1');
  await syncNow(B, be, dev('B'));
  assert.deepEqual(B.habits.map(h => h.id).sort(), ['a1', 'b2']);
  assert.equal(B.logs['2026-11-18'].a1, 1);
  assert.equal(B.logs['2026-11-01'].a1, 1);
  await syncNow(A, be, dev('A'));
  assert.equal(A.logs['2026-11-18'].a1, 1);
  assert.equal(A.habits.length, 2);
});

test('failed upload keeps changes queued', async () => {
  const be = fakeBackend();
  const A = state();
  addHabit(A, 'h1', 'Ashar'); check(A, '2026-11-18', 'h1');
  const bad = { ...be, commit: async () => { throw Object.assign(new Error('offline'), { code: 'unavailable' }); } };
  await assert.rejects(syncNow(A, bad, dev('A')));
  assert.equal(isDirty(A), true);
  await syncNow(A, be, dev('A'));
  assert.equal(isDirty(A), false);
  assert.equal(be.docs['months/2026-11'].c['18'].h1[0], 1);
});
