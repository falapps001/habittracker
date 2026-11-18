# Habit Log

A compact personal habit tracker for Android, iPhone and laptop. It is an installable web app (PWA)
that works offline and syncs between devices. Everything runs on free tiers: GitHub Pages for hosting,
and Firebase Authentication (email/password) plus Firestore for sync.

There is **no build step**. The files are served as they are, and the Firebase SDK is loaded from
Google's CDN at a pinned version.

👉 Setup guide (Bahasa Indonesia): **[PANDUAN.md](PANDUAN.md)**

| File | What it does |
|---|---|
| `index.html`, `style.css`, `app.js` | UI |
| `store.js` | Saves data on the device (IndexedDB) |
| `sync.js` | Sync/merge logic (newest change wins per habit and per day) |
| `firebase.js`, `firebase-config.js` | Login and Firestore |
| `sw.js`, `manifest.webmanifest`, `icons/` | Offline support and installing as an app |
| `firestore.rules` | Each account can only read and write its own data |

Tests: `npm test` runs the sync logic tests. It needs Node.js 20 or newer and has no dependencies.
