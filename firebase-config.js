// ============================================================
//  KONFIGURASI FIREBASE
// ============================================================
// Isi dari Firebase Console → Project settings → Your apps → Web app.
// Nilai ini bukan rahasia; data dilindungi oleh login + firestore.rules.
// Isi CONFIG dengan null untuk memakai aplikasi tanpa sinkron (data hanya di perangkat ini).

export const CONFIG = {
  apiKey: "AIzaSyA1GMDmPSMcQCguXS3TFh1kTF2OBaIYxFo",
  authDomain: "habittracker-2fc96.firebaseapp.com",
  projectId: "habittracker-2fc96",
  storageBucket: "habittracker-2fc96.firebasestorage.app",
  messagingSenderId: "414523610962",
  appId: "1:414523610962:web:e0444008c17d1ec1f30c8b"
};

// Versi library Firebase (dikunci supaya tidak berubah sendiri).
export const SDK = '12.19.0';

// Hanya untuk pengujian dengan emulator lokal. Biarkan null.
export const EMULATOR = null;
