// Firebase login (email & password) + Firestore, loaded from Google's CDN on first use,
// so the app opens instantly and works offline. No build step needed.
import { CONFIG, SDK, EMULATOR } from './firebase-config.js';
import { SERVER_TS } from './sync.js';

export const configured = !!(CONFIG && CONFIG.apiKey);
let fb = null;

async function load() {
  if (fb) return fb;
  const base = `https://www.gstatic.com/firebasejs/${SDK}/`;
  const [app, A, F] = await Promise.all(
    ['firebase-app.js', 'firebase-auth.js', 'firebase-firestore-lite.js'].map(f => import(base + f))
  );
  const fapp = app.initializeApp(CONFIG);
  const auth = A.getAuth(fapp);
  const db = F.getFirestore(fapp);
  if (EMULATOR) {
    A.connectAuthEmulator(auth, `http://${EMULATOR}:9099`, { disableWarnings: true });
    F.connectFirestoreEmulator(db, EMULATOR, 8080);
  }
  fb = { A, F, auth, db };
  return fb;
}

const userInfo = u => (u ? { uid: u.uid, email: u.email || 'Signed in' } : null);

function authMsg(e) {
  const c = (e && e.code) || '';
  if (c.includes('invalid-credential') || c.includes('wrong-password') || c.includes('user-not-found') || c.includes('invalid-login'))
    return 'Wrong email or password.';
  if (c.includes('invalid-email')) return 'That email address doesn\'t look right.';
  if (c.includes('email-already-in-use')) return 'An account with this email already exists. Sign in instead.';
  if (c.includes('weak-password')) return 'Use a password of at least 6 characters.';
  if (c.includes('too-many-requests')) return 'Too many attempts. Wait a few minutes and try again.';
  if (c.includes('operation-not-allowed') || c.includes('admin-restricted'))
    return 'Creating accounts is turned off for this app. Sign in with your existing account.';
  if (c.includes('unauthorized-domain') || c.includes('requests-from-referer'))
    return `This address isn't allowed yet. Add ${location.hostname} in Firebase → Authentication → Settings → Authorized domains.`;
  if (c.includes('network')) return 'No internet connection. Try again when you\'re online.';
  return 'Something went wrong. Try again.';
}

// The signed-in user, or null. Works offline once you've signed in on this device.
export async function currentUser() {
  if (!configured) return null;
  const { auth } = await load();
  await auth.authStateReady();
  return userInfo(auth.currentUser);
}

export async function signIn(email, password) {
  const { A, auth } = await load();
  try { return userInfo((await A.signInWithEmailAndPassword(auth, email, password)).user); }
  catch (e) { throw new Error(authMsg(e)); }
}

export async function signUp(email, password) {
  const { A, auth } = await load();
  try { return userInfo((await A.createUserWithEmailAndPassword(auth, email, password)).user); }
  catch (e) { throw new Error(authMsg(e)); }
}

export async function resetPassword(email) {
  const { A, auth } = await load();
  try { await A.sendPasswordResetEmail(auth, email); }
  catch (e) { throw new Error(authMsg(e)); }
}

export async function signOutUser() {
  const { A, auth } = await load();
  await A.signOut(auth);
}

export async function backend(uid) {
  const { F, db } = await load();
  const { doc, getDoc, getDocs, collection, query, where, writeBatch, serverTimestamp, Timestamp, deleteDoc } = F;
  const ref = p => doc(db, `users/${uid}/${p}`);
  const col = p => collection(db, `users/${uid}/${p}`);
  const fix = data => {
    const o = { ...data };
    for (const k in o) if (o[k] === SERVER_TS) o[k] = serverTimestamp();
    return o;
  };
  return {
    async get(path) {
      const s = await getDoc(ref(path));
      return s.exists() ? s.data() : null;
    },
    async monthsSince(ms) {
      const q = ms ? query(col('months'), where('u', '>=', Timestamp.fromMillis(ms))) : col('months');
      const r = await getDocs(q);
      return r.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    async commit(writes) {
      for (let i = 0; i < writes.length; i += 400) {
        const b = writeBatch(db);
        writes.slice(i, i + 400).forEach(w => b.set(ref(w.path), fix(w.data), { merge: true }));
        await b.commit();
      }
    },
    async devices() {
      const r = await getDocs(col('devices'));
      return r.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    removeDevice: id => deleteDoc(ref(`devices/${id}`))
  };
}
