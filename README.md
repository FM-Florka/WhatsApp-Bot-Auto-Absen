# WA Auto Absen

Bot WhatsApp yang otomatis mengisi baris absen kamu (no 19 = Muhammad Nabil)
saat ada pesan absen di grup. Deteksi pakai Gemini AI, fallback heuristik lokal
kalau API error. **Tidak pernah menimpa nama teman.**

## Jalanin lokal

1. `npm install`
2. Copy `.env.example` jadi `.env`, isi `GEMINI_API_KEY` (gratis di
   https://aistudio.google.com/apikey)
3. `npm start` lalu scan QR yang muncul di terminal pakai WA kamu
4. Tes dulu dengan `DRY_RUN=true` (bot cuma log, tidak kirim).
   Kalau hasil log sudah benar, ganti `DRY_RUN=false` dan restart.

## Cara kerja

1. Setiap pesan grup masuk -> prefilter murah (kata "absen" + list bernomor ≥ 3).
2. Lolos prefilter -> Gemini memastikan itu beneran pesan absen.
3. `fillMyRow` isi baris 19 **hanya jika kosong / placeholder** (`...`, `.`, `-`).
   - Sudah ada namamu -> skip (`already`)
   - Ada nama orang lain -> skip (`occupied`), tidak ditimpa
   - Baris 19 belum ada -> disisipkan (slot kosong di antaranya jadi `...`)
4. Cooldown per grup (default 30 menit) cegah kirim dobel.

## Deploy Pterodactyl (egg NodeJS)

1. Upload semua file **kecuali** `node_modules` dan `auth_info`.
2. Startup command: `npm start` (atau `node index.js`).
3. Pertama kali: buka console panel, scan QR dari log.
   Folder `auth_info/` menyimpan sesi — **jangan dihapus**, biar tidak scan ulang.
4. Set environment variable di panel:
   `GEMINI_API_KEY`, `GEMINI_MODEL`, `MY_NAME`, `MY_ABSEN_NO`,
   `DRY_RUN=false`, `COOLDOWN_MIN=30`.
   (Atau upload file `.env` langsung.)
5. Pastikan image Node ≥ 18.
