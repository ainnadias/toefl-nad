# TOEFL Quest: Web Belajar TOEFL Mandiri (Frontend Only)

## Tujuan
Web belajar TOEFL yang seru dan tidak membosankan, dengan sistem gamification. Pengguna tunggal (aku), tanpa login, tanpa backend.

## Lokasi bahan (READ-ONLY, jangan diubah/dihapus)
D:\Belajar TOEFL
Berisi PDF materi, PDF soal, dan audio listening.

## Aturan hemat konteks (WAJIB)
- JANGAN baca PDF mentah. Ekstrak ke teks pakai script, lalu baca hasilnya seperlunya.
- JANGAN baca seluruh file teks besar. Pakai head, grep, atau baca per range baris.
- JANGAN list rekursif folder bahan tanpa filter.
- Audio tidak bisa didengarkan. Cukup petakan nama file ke soal.
- Satu fase per sesi. Tanya dulu sebelum lanjut ke fase berikutnya.
- Berikan file lengkap siap pakai, bukan potongan diff.

## Stack (jangan ganti tanpa tanya)
- Vite + React + TypeScript
- Tailwind CSS
- Zustand (persist ke localStorage)
- Framer Motion (animasi)
- canvas-confetti
- React Router
- lucide-react
- Tanpa backend. Semua data statis (JSON) + localStorage.

## Struktur target
toefl-app/
├── scripts/            (script ekstraksi dan parsing, Python)
├── materials_txt/      (hasil ekstraksi PDF, jangan di-commit kalau besar)
├── public/
│   ├── audio/          (audio yang dipakai web)
│   └── data/           (JSON soal, vocab, dll)
└── src/
    ├── components/     (UI reusable)
    ├── pages/          (Home, Practice, Result, Review, Profile, Vocab)
    ├── store/          (Zustand: XP, level, streak, badges, history)
    ├── lib/            (scoring, xp, spaced-repetition)
    ├── types/          (skema TypeScript)
    └── data/           (konfigurasi badge, level, dll)

## Skema soal (types/question.ts)
{ id, section, setId, audio (nullable), passage (nullable), question,
  options: {A,B,C,D}, answer, explanation (nullable), difficulty (nullable) }

## Prinsip UI/UX
- Mobile-first dan responsive, tapi nyaman di desktop.
- Dark mode + light mode.
- Warna cerah dan hangat, sudut membulat, banyak whitespace, font mudah dibaca.
- Satu soal per layar, tombol besar, feedback instan (benar/salah + penjelasan).
- Animasi halus, jangan berlebihan. Hormati prefers-reduced-motion.
- Bahasa UI: Indonesia santai, istilah TOEFL tetap English.

## Sistem gamification (ringkas)
XP + level, streak harian, daily goal, combo jawaban benar beruntun, badge/achievement,
peta progres (learning path), mode review kesalahan (spaced repetition), mascot kecil
yang bereaksi, confetti di momen penting. Tidak ada hukuman keras (tanpa "nyawa habis"),
fokusnya motivasi, bukan tekanan.

## Gaya kerja
Komunikasi Indonesia santai, istilah teknis English. Commit git per fase.

## Hasil inventaris (fase 1)
- Root bahan: PDF vocab ("400 must have words"), panduan mengerjakan soal, 1 PDF nama generik (products_...pdf, isi belum dicek).
- Cliffs: ALL BOOK LOW QUALITY.pdf, PART 1.pdf, PART 2.pdf, audio mp3 cd1/ dan cd2/ (Track 1-9, nama generik, mapping harus digali dari isi PDF).
- Longman Practice: Pre-test, Test 1-5, Post-test. Tiap folder punya PDF soal, answer key, dan 7-8 audio .wma.
  - Pre-test: kunci jawaban berupa .xlsx. Test 1-5 dan Post-test: kunci jawaban berupa .png (baca sebagai gambar).
  - Audio Pre-test/Post-test/Test 1/Test 2 punya pola nama "[Nama Test] [A/B/C] (nomor_awal-nomor_akhir)".
  - Audio Test 3-5 bernama "Track N", mapping ke Part A/B/C harus divalidasi dari isi PDF (Test 3 dan 5 pakai track 13,14,16,17,19,20,21; Test 4 pakai 3,4,6,7,9,10,11).
- File .zip di folder audio = duplikat, abaikan.

## Keputusan teknis
- Audio .wma TIDAK bisa diputar di browser. Semua audio dikonversi ke .mp3 mono 64 kbps pakai ffmpeg, disimpan di public/audio/ dengan nama baru yang konsisten (kebab-case, misal longman-test1-part-a-1-30.mp3).
- Mapping audio ke soal disimpan di public/data/audio-manifest.json.
- PDF scan perlu OCR (Tesseract). Cek dulu mana yang punya teks asli sebelum OCR.
- Struktur learning path: Pre-test (diagnostik) -> Test 1-5 -> Post-test, Cliffs sebagai bank soal tambahan, plus Vocabulary dan Tips.
- Materi berhak cipta: app hanya dijalankan lokal, jangan dipublikasikan.

## Update hasil Fase 2A
- Python 3.12 terpasang lewat winget. PATH mungkin belum refresh, pakai full path:
  C:\Users\ainna\AppData\Local\Programs\Python\Python312\python.exe
- PyMuPDF terpasang. Pakai `import pymupdf` (bukan `import fitz`, sudah deprecated).
- Teks hasil ekstraksi ada di materials_txt/ (+ _summary.json).
- Hampir semua PDF punya teks asli (bagus). Pengecualian:
  - Longman CT 1-4: ~100 karakter/halaman, isi soal mayoritas gambar -> butuh OCR.
  - Longman CT 5: ~245 karakter/halaman, kemungkinan juga banyak gambar -> cek.
  - Longman Post-test b.pdf: scan penuh (11 hlm) -> butuh OCR.
- products_...pdf = Peterson's TOEFL 2005 TestPrep Success (406 hlm, teks bersih), buku soal ketiga.
- Cliffs ALL BOOK LOW QUALITY.pdf kemungkinan duplikat PART 1 + PART 2. Pakai PART 1 + PART 2 untuk parsing.
- Noise: baris 1 karakter non-alfanumerik (glyph dekoratif) di awal beberapa PDF, filter saat parsing.
- Urutan pilot: Longman Pre-test dulu (teks bersih, kunci .xlsx). Longman Test 1-5 menyusul setelah OCR.

## Update hasil Fase 2B dan 2C
- Audio: 68 mp3 mono 64 kbps di public/audio/ (149 MB), manifest di public/data/audio-manifest.json.
- OCR Longman (CT 1-5, Post-test b) sudah jalan, hasil di materials_txt/ dengan penanda [OCR] per halaman.
- Kualitas OCR: passage dan pilihan A-D vertikal akurat. MASALAH: soal 2 kolom ter-interleave, nomor soal di margin sering hilang, penanda underline A-D (Structure error-ID) tidak bisa diandalkan, header dekoratif jadi noise di baris pertama tiap halaman.
- Keputusan: JANGAN parse Longman CT 1-5 dan Post-test b sampai ada perbaikan (OCR per kolom). Longman Pre-test dan Post-test a (teks asli) aman.
- Urutan fase 6: Post-test a -> Peterson's -> Cliffs -> Longman CT 1-5 dan Post-test b (terakhir).
- Jangan jalankan ulang OCR atau konversi audio kecuali diminta. Hasilnya sudah di cache.

## Update hasil Fase 3 (pilot Longman Pre-test)
- public/data/longman-pretest.json: 140 soal, 106 status "ok", 34 "incomplete".
- UI HANYA menampilkan soal dengan "status": "ok". Soal "incomplete" disaring.
- Penyebab incomplete: Written Expression (Structure 16-40) marker underline A-D rusak; 9 soal Reading (5-8, 28-30, 41 dll) kalimat nyangkut/interleave.
- Soal Structure dan Reading tambahan akan datang dari Cliffs dan Peterson's (Fase 6).
- parse_questions.py membaca PDF langsung dengan koordinat kata (bukan dari materials_txt/, yang urutan kolomnya rusak). Pakai pendekatan ini untuk PDF 2-3 kolom lain.
- Commit terakhir: 7b6fd99.

## Update hasil Fase 4
- Scaffold selesai: Vite + React 19 + TypeScript strict, Tailwind v4 (@tailwindcss/vite, tema di src/index.css), Quicksand Variable.
- Halaman: Home, Practice (/practice/:section), Result (/result/:sessionId). Komponen di src/components/, store Zustand di src/store/appStore.ts (persist key "toefl-quest-store"), loader soal di src/lib/loadQuestions.ts (filter status "ok").
- Data soal di-fetch runtime dari public/data/*.json. Set soal baru cukup ditambahkan sebagai JSON baru.
- Streak dan daily goal saat ini diturunkan dari sessionHistory. Fase 5 menambah XP/level/badge dll.
- Build: `npm run build` harus selalu bersih. Dev: `npm run dev` (localhost:5173).
- ESLint tidak dipakai. canvas-confetti terinstall tapi belum dipasang ke trigger apa pun.

## Update hasil Fase 5A
- Gamification inti selesai (commit 640d4ac, mencakup scaffold Fase 4): XP dan 12 level bertema, combo (x1 / x1.5 di 3 / x2 di 5 / x3 di 10), bonus cepat < 15 detik, streak harian + daily goal (10/20/30) + streak freeze dari naik level, confetti di level up / daily goal / skor sempurna.
- Logika murni ada di src/lib/ (xp, celebrate, dll), state di Zustand yang sama (persist "toefl-quest-store").
- Jangan mengubah bentuk state yang ada tanpa migrasi, supaya progres lama tidak hilang.