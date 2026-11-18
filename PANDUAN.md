# Panduan Pemasangan Habit Log

Cukup sekali, sekitar 10–15 menit. Semua layanan yang dipakai **gratis**.
Konfigurasi Firebase kamu (`habittracker-2fc96`) sudah terisi di `firebase-config.js`.

---

## Bagian A — Firebase

### 1. Aktifkan login email & password
1. Buka https://console.firebase.google.com, lalu pilih proyek **habittracker**.
2. Di menu kiri, pilih **Build → Authentication → Get started**.
3. Buka tab **Sign-in method**, pilih **Email/Password**, aktifkan sakelar pertama (**Enable**), lalu klik **Save**.

### 2. Buat database
1. Di menu kiri, pilih **Build → Firestore Database → Create database**.
2. Untuk Location, pilih **asia-southeast2 (Jakarta)**. Lokasi tidak bisa diubah nanti.
3. Pilih **Start in production mode**, lalu klik **Create**.
4. Setelah database jadi, buka tab **Rules**. Hapus isinya dan ganti dengan isi file `firestore.rules`:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
5. Klik **Publish**.

> Jangan pernah klik **Upgrade** atau **Blaze plan**. Tetap di paket **Spark** (gratis). Kalau suatu hari
> kuota habis, aplikasi hanya berhenti sinkron sampai besok, dan tidak ada tagihan.

### 3. Izinkan alamat GitHub Pages
1. Buka **Authentication → Settings → Authorized domains → Add domain**.
2. Isi `falapps001.github.io` (tanpa `https://` dan tanpa nama folder), lalu klik **Add**.

---

## Bagian B — GitHub Pages

### 4. Unggah file
1. Buka repository GitHub kamu. **Hapus dulu file versi sebelumnya** (folder `src`, `public`,
   `vite.config.js`, dan lain-lain).
2. Klik **Add file → Upload files**.
3. Seret **semua isi folder ini** ke kotak upload: `index.html`, `app.js`, `store.js`, `sync.js`,
   `firebase.js`, `firebase-config.js`, `style.css`, `sw.js`, `manifest.webmanifest`, dan folder `icons`.
   Folder `test` dan file lainnya boleh ikut, tidak masalah.
4. Klik **Commit changes**.

### 5. Nyalakan GitHub Pages
1. Di repository, buka **Settings**, lalu pilih **Pages** di menu kiri.
2. Untuk Source, pilih **Deploy from a branch**. Branch: **main**, folder **/ (root)**, lalu klik **Save**.
3. Tunggu 1–2 menit. Alamat aplikasimu akan muncul, contohnya `https://falapps001.github.io/NAMA-REPO/`.

---

## Bagian C — Mulai memakai

### 6. Buat akun (sekali saja)
1. Buka alamat aplikasi di laptop.
2. Buka **Settings** (ikon di kanan atas), isi email dan password (minimal 6 karakter), lalu klik **Create account**.
3. Di halaman **Today**, ketuk **Load starter list** untuk memuat 33 habit kamu.

**Disarankan**, supaya orang lain tidak bisa membuat akun di aplikasimu:
buka Firebase Console **→ Authentication → Settings → User actions**, hilangkan centang
**Enable create (sign-up)**, lalu klik **Save**. Akunmu tetap bisa login seperti biasa.

### 7. Pasang di setiap perangkat
Buka alamat aplikasi, lalu:

| Perangkat | Cara memasang |
|---|---|
| **Android** (Chrome) | Menu ⋮ → **Instal aplikasi** / **Tambahkan ke layar utama** |
| **iPhone** (Safari) | Tombol **Bagikan** → **Tambah ke Layar Utama** |
| **Laptop** (Chrome / Edge) | Ikon **Instal** di ujung kanan kolom alamat |

Setelah terpasang, buka dari ikonnya, masuk ke **Settings**, lalu klik **Sign in** dengan email dan password
yang **sama**. **Jangan** ketuk *Load starter list* di perangkat kedua. Habit kamu akan muncul sendiri
setelah sync. Di iPhone, login harus dilakukan dari aplikasi yang sudah dipasang, bukan dari Safari,
karena keduanya terpisah.

---

## Pemakaian sehari-hari
- **Ketuk habit** untuk mencentang, dan ketuk lagi untuk membatalkan.
- **Ketuk ikon** habit untuk membuka kalender dan riwayatnya. Hari yang terlewat bisa dicentang dari situ.
- **Tahan lalu geser** habit atau judul section untuk memindahkan posisinya.
- Sync berjalan otomatis saat aplikasi dibuka dan saat internet kembali. Tombol 🔄 di kanan atas untuk sync manual.
- Tanpa internet tetap bisa dipakai. Perubahan dikirim saat sync berikutnya.
- **Settings → Backup (JSON)** sebulan sekali, lalu simpan filenya di Google Drive.

## Memperbarui aplikasi
Kalau ada versi baru, unggah ulang file yang berubah, lalu naikkan angka versi di baris
`const V = 'habit-log-1.0.0'` di `sw.js`, misalnya menjadi `1.0.1`. Dengan begitu, semua perangkat
mengambil versi terbaru.

## Kalau ada masalah
| Gejala | Penyebab & solusi |
|---|---|
| Muncul "This address isn't allowed yet" | Langkah 3 belum dilakukan |
| Muncul "Wrong email or password" | Cek ejaan, atau pakai **Forgot password?** |
| Muncul "Sync was refused" | Rules Firestore di langkah 2.4 belum di-Publish |
| Muncul "Creating accounts is turned off" | Sign-up sudah dimatikan (langkah 6). Gunakan **Sign in**, bukan Create account |
| Tampilan berantakan, tanpa warna | File belum lengkap terunggah, atau GitHub Pages belum selesai memproses (tunggu 2 menit) |
