"""Parse Longman TOEFL Pre-test (Listening, Structure, Reading) jadi
public/data/longman-pretest.json, sesuai skema src/types/question.ts.

Sumber: D:\\Belajar TOEFL\\Longman - Practice\\Pre-test\\Pre-test.pdf (read-only).

Kenapa tidak pakai materials_txt/..Pre-test.txt begitu saja:
halaman dengan layout 2 kolom di PDF ini disimpan dalam content-stream
dengan urutan baris yang TIDAK mengikuti urutan visual kolom (kiri-penuh
lalu kanan-penuh). page.get_text() polos karena itu menghasilkan teks
yang terinterleave ("1. (A) ... 8. (A) ...", dst). Script ini
merekonstruksi urutan baca per halaman dari word-level bbox:
  1. Buang blok dekoratif (baris isi 1 karakter berulang, garis hias).
  2. Cari kandidat pemisah kolom dari gap x0 (gabungkan rentetan gap kecil
     yang berdekatan jadi satu "zona kosong", karena batas kolom asli
     kadang muncul sebagai beberapa gap kecil akibat pembulatan posisi,
     bukan satu gap besar tunggal).
  3. Untuk tiap kandidat pemisah, rekonstruksi 2 pita (kiri lalu kanan,
     masing-masing dikelompokkan jadi baris berdasar y, lalu diurutkan
     berdasar x dalam baris yang sama -- ini otomatis menyatukan kembali
     kolom label "(A)(B)(C)(D)" dengan kolom isi jawaban kalau keduanya
     sejajar per baris).
  4. Pilih kandidat dengan skor terbaik: cakupan nomor soal yang
     ditemukan, tidak ada urutan nomor yang mundur (inversion), dan
     jumlah soal yang berhasil match pola "(A)...(B)...(C)...(D)...".

Nomor soal final TIDAK diambil dari label "N." hasil ekstraksi (kadang
hilang/rusak di PDF sumber, contoh: soal 23/24/32 di Reading kehilangan
label nomornya sama sekali bahkan di teks mentah PDF). Sebagai gantinya,
soal dihitung berdasar URUTAN posisi pola "(A)...(D)" di dalam teks yang
sudah direkonstruksi, lalu dicocokkan ke rentang nomor yang sudah
diketahui dari kunci jawaban (Listening 1-50, Structure 1-40, Reading
1-50). Ini jauh lebih robust terhadap label yang hilang.
"""

import json
import re
from pathlib import Path

import pymupdf

PDF_PATH = Path(r"D:\Belajar TOEFL\Longman - Practice\Pre-test\Pre-test.pdf")
ANSWER_KEY_PATH = Path(__file__).resolve().parent / "answer-keys" / "longman-pretest.json"
AUDIO_MANIFEST_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "audio-manifest.json"
OUT_PATH = Path(__file__).resolve().parent.parent / "public" / "data" / "longman-pretest.json"

SET_ID = "longman-pretest"

NUM_RE = re.compile(r"^(\d{1,2})\.")
CHUNK_SPLIT_RE = re.compile(r"\n(?=\d{1,2}\.\s)")
OPTION_INLINE_RE = re.compile(
    r"\(A\)\s*(.*?)\s*\(B\)\s*(.*?)\s*\(C\)\s*(.*?)\s*\(D\)\s*(.*?)(?=\(A\)|\n\s*\d{1,2}\.\s|\Z)",
    re.DOTALL,
)
NUM_TOKEN_RE = re.compile(r"^(\d{1,2})\.$")

# baris boilerplate/header/footer/dekoratif yang harus dibuang sebelum parsing
JUNK_LINE_PATTERNS = [
    r"^\d+\s*$",
    r"^(LISTENING|STRUCTURE|READING).{0,40}PRE-TEST",
    r"PRE-TEST\s*\d*\s*$",
    r"^GO ON TO THE NEXT PAGE",
    r"^TOEFL.{0,3} test directions",
    r"^of ETS",
    r"questions are provided",
    r"^This [Ii]s the end of",
    r"^Turn off the recording",
    r"^W?\s*hen you finish",
    r"^.\s*T\s*urn to",
    r"^\(\s*s\s*t\s*o\s*p\s*\)",
    r"\^?\s*S\s*T\s*Q\s*p\s*j",
    r"^Remember, you are not allowed",
    r"circle the n\s*u\s*m\s*b\s*ers",
    r"d\s*eterm\s*in\s*e your",
    r"score to the chart",
    r"Diagn\s*ostic Chart",
    r"Scoring In\s*form\s*ation",
    r"Progress\s*Chart",
    r"^[\W\d](\s+[\W\d]){4,}$",  # mixed decorative symbol/digit row
]
JUNK_LINE_RE = re.compile("|".join(JUNK_LINE_PATTERNS), re.IGNORECASE)
DECORATIVE_ROW_RE = re.compile(r"^(\S+)(\s+\1){3,}$")


def is_junk_line(line: str) -> bool:
    s = line.strip()
    if not s:
        return True
    if JUNK_LINE_RE.search(s):
        return True
    if DECORATIVE_ROW_RE.match(s):
        return True
    return False


def clean_lines(text: str) -> str:
    return "\n".join(l for l in text.split("\n") if not is_junk_line(l))


# ---------------------------------------------------------------------------
# Rekonstruksi urutan baca per halaman dari word-level bbox
# ---------------------------------------------------------------------------

def noise_block_nos(page):
    noise = set()
    for b in page.get_text("blocks"):
        bno = b[5]
        text = b[4]
        lines = [l for l in text.split("\n") if l.strip() != ""]
        if lines and len(lines) >= 4 and all(len(l.strip()) <= 1 for l in lines):
            noise.add(bno)
    return noise


def line_word_groups(words, tol=3.0):
    """Kelompokkan words jadi baris berdasar y berdekatan, urut berdasar x
    dalam baris yang sama. Mengabaikan kolom (dipakai juga untuk deteksi
    baris sampah lintas-kolom sebelum analisis gap)."""
    if not words:
        return []
    ws = sorted(words, key=lambda w: (w[1], w[0]))
    groups = []
    cur_y = None
    cur = []
    for w in ws:
        y0 = w[1]
        if cur_y is None or abs(y0 - cur_y) <= tol:
            cur.append(w)
            cur_y = y0 if cur_y is None else cur_y
        else:
            cur.sort(key=lambda w: w[0])
            groups.append(cur)
            cur = [w]
            cur_y = y0
    if cur:
        cur.sort(key=lambda w: w[0])
        groups.append(cur)
    return groups


EMBEDDED_LABEL_RE = re.compile(r"(?<=\S)\s+(?=\d{1,2}\.(?:\s|$))")


def split_embedded_labels(line):
    """Kalau 2 kolom kebetulan berbagi y yang sama, baris hasil gabungan bisa
    memuat label 'N.' soal lain yang nyangkut di tengah/akhir baris
    sebelumnya (bukan di awal baris, karena itu dia lolos dari
    CHUNK_SPLIT_RE yang cuma cek '\\n(?=\\d+\\.)'). Pecah baris itu jadi
    beberapa baris supaya tiap label 'N.' mulai di awal baris sendiri."""
    return EMBEDDED_LABEL_RE.sub("\n", line)


def reconstruct_band(words, tol=3.0):
    groups = line_word_groups(words, tol=tol)
    lines = [" ".join(w[4] for w in g) for g in groups]
    lines = [split_embedded_labels(l) for l in lines]
    return "\n".join(lines)


def strip_junk_words(words, tol=3.0):
    """Buang kata-kata yang membentuk baris boilerplate/footer (mis. 'GO ON
    TO THE NEXT PAGE', 'This is the end of...', nomor halaman tunggal).
    Baris-baris ini biasanya full-width dan HANYA muncul di luar rentang y
    grid soal, tapi kalau dibiarkan dalam word pool mereka mengisi celah x
    yang seharusnya jadi pemisah kolom kiri/kanan, sehingga analisis gap di
    candidate_splits salah pilih titik potong. Deteksi dilakukan di level
    baris lintas-kolom (grouping tanpa pisah kolom dulu) karena baris
    boilerplate ini tidak pernah berbagi y dengan baris isi grid soal."""
    groups = line_word_groups(words, tol=tol)
    keep = []
    for g in groups:
        line_text = " ".join(w[4] for w in g)
        if is_junk_line(line_text):
            continue
        keep.extend(g)
    return keep


def candidate_splits(words, min_gap=10, merge_gap=8):
    xs = sorted(set(round(w[0]) for w in words))
    if len(xs) < 2:
        return []
    raw_gaps = [(xs[i + 1] - xs[i], xs[i], xs[i + 1]) for i in range(len(xs) - 1)]
    regions = []
    i, n = 0, len(raw_gaps)
    while i < n:
        gap, lo, hi = raw_gaps[i]
        if gap < merge_gap:
            i += 1
            continue
        region_lo, region_hi = lo, hi
        j = i + 1
        while j < n and raw_gaps[j][0] >= merge_gap:
            region_hi = raw_gaps[j][2]
            j += 1
        regions.append((region_hi - region_lo, (region_lo + region_hi) / 2))
        i = j
    regions = [r for r in regions if r[0] >= min_gap]
    regions.sort(reverse=True)
    return [mid for _, mid in regions]


def split_chunks(text):
    parts = CHUNK_SPLIT_RE.split("\n" + text.strip())
    chunks = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        m = re.match(r"^(\d{1,2})\.\s*(.*)$", p, re.DOTALL)
        if m:
            chunks.append((int(m.group(1)), m.group(2)))
    return chunks


def score_reconstruction(text, expected_nums):
    chunks = split_chunks(text)
    seen = set()
    coverage = good = dup = inversions = 0
    last = -1
    for num, body in chunks:
        if num in expected_nums:
            if num in seen:
                dup += 1
            else:
                coverage += 1
                seen.add(num)
            if num < last:
                inversions += 1
            last = max(last, num)
        m = OPTION_INLINE_RE.search(body)
        if m and all(len(g.strip()) >= 1 for g in m.groups()):
            good += 1
        elif len(body.strip()) >= 15:
            good += 0.3
    return coverage * 10 + good - dup * 8 - inversions * 12


def split_passage_prefix(words, expected_nums):
    marker_ys = [w[1] for w in words if (m := NUM_TOKEN_RE.match(w[4])) and int(m.group(1)) in expected_nums]
    if not marker_ys:
        return None, words
    y_top = min(w[1] for w in words)
    y_first_marker = min(marker_ys)
    above = [w for w in words if w[1] < y_first_marker - 1]
    if len(above) >= 25 and (y_first_marker - y_top) > 80:
        below = [w for w in words if w[1] >= y_first_marker - 1]
        return above, below
    return None, words


def best_page_text(page, expected_nums, top_k=10):
    nb = noise_block_nos(page)
    words = [w for w in page.get_text("words") if w[5] not in nb]
    words = strip_junk_words(words)
    if not words:
        return ""

    passage_words, grid_words = split_passage_prefix(words, expected_nums)
    prefix_text = ""
    if passage_words is not None:
        prefix_text = reconstruct_band(passage_words) + "\n"
        words = grid_words

    candidates = [reconstruct_band(words)]
    for mid in candidate_splits(words)[:top_k]:
        left = [w for w in words if w[0] < mid]
        right = [w for w in words if w[0] >= mid]
        if len(left) < 5 or len(right) < 5:
            continue
        candidates.append(reconstruct_band(left) + "\n" + reconstruct_band(right))

    scored = [(score_reconstruction(prefix_text + t, expected_nums), prefix_text + t) for t in candidates]
    scored.sort(key=lambda x: -x[0])
    return scored[0][1]


# ---------------------------------------------------------------------------
# Ekstraksi soal pilihan-ganda biasa ("(A) ... (B) ... (C) ... (D) ...")
# dipakai untuk Listening, Structure (tipe "Structure"), dan Reading.
# Penomoran final berdasar URUTAN posisi match, bukan label "N." yang
# diekstrak (supaya tahan terhadap label yang hilang/rusak di PDF sumber).
# ---------------------------------------------------------------------------

def extract_plain_mc(text, start_num, expected_count):
    text = clean_lines(text)
    matches = list(OPTION_INLINE_RE.finditer(text))
    results = []
    prev_end = 0
    for i, m in enumerate(matches):
        stem_raw = text[prev_end:m.start()]
        stem = re.sub(r"^\s*\d{1,2}\.\s*", "", stem_raw.strip())
        stem = re.sub(r"\s+", " ", stem).strip()
        options = {
            "A": re.sub(r"\s+", " ", m.group(1).strip()),
            "B": re.sub(r"\s+", " ", m.group(2).strip()),
            "C": re.sub(r"\s+", " ", m.group(3).strip()),
            "D": re.sub(r"\s+", " ", m.group(4).strip()),
        }
        results.append({"number": start_num + i, "stem": stem, "options": options})
        prev_end = m.end()
    problems = []
    if len(results) != expected_count:
        problems.append(
            f"expected {expected_count} questions starting at {start_num}, found {len(results)}"
        )
    return results, problems


# ---------------------------------------------------------------------------
# Ekstraksi Written Expression: satu kalimat + 4 marker garis-bawah (A-D).
# Pemetaan marker->kata yang digarisbawahi dilakukan di level word-bbox
# (cari token 'A'/'B'/'C'/'D' persis, ambil kata konten terdekat di atasnya).
# Ini PERKIRAAN (best-effort) -- lihat catatan di laporan akhir.
# ---------------------------------------------------------------------------

MARKER_DEBRIS_TOKEN_RE = re.compile(r"^[ABCDEKIT]{1,3}$", re.IGNORECASE)
MARKER_DEBRIS_NUM_RE = re.compile(r"^\d{1,2}$")
MARKER_STRIP_CHARS = "~'‘’“”�|_^-."


def is_marker_debris_line(line):
    """Baris berisi marker underline A-D yang ikut diekstrak sebagai teks
    terpisah (bukan bagian kalimat). Di PDF sumber, glyph marker ini kadang
    rusak/berubah jadi karakter lain ('~', 'TT', 'IT', 'E', U+FFFD, nomor
    halaman nyasar, dll), jadi dicocokkan berdasar BENTUK token (pendek,
    tanpa kata nyata >=4 huruf), bukan daftar literal 'A'/'B'/'C'/'D'."""
    tokens = line.split()
    if not tokens or len(tokens) > 6:
        return False
    for t in tokens:
        tt = t.strip(MARKER_STRIP_CHARS)
        if tt == "":
            continue
        if MARKER_DEBRIS_TOKEN_RE.match(tt) or MARKER_DEBRIS_NUM_RE.match(tt):
            continue
        return False
    return True


def extract_written_expression(pages, start_num, expected_count):
    """pages: list of pymupdf Page objects belonging to the Written-Expression
    block. Setiap soal pada sumber PDF sudah diawali label 'N. ' yang utuh,
    jadi batas kalimat diambil dari label itu langsung (sama seperti
    extract_plain_mc), BUKAN dari deteksi baris marker (pendekatan lama,
    rawan drift kalau satu baris marker gagal terdeteksi). Baris marker
    underline (A-D) yang nyasar ikut diekstrak di dalam tiap chunk dibuang
    lewat is_marker_debris_line.

    Opsi A-D TETAP dikosongkan: glyph marker underline-nya sendiri rusak/
    tidak konsisten di PDF sumber (lihat is_marker_debris_line), jadi tidak
    ada cara aman untuk memetakan posisi marker ke kata yang digarisbawahi.
    Perlu isi manual dari PDF/buku asli.
    """
    joined_lines = []
    for page in pages:
        text = clean_lines(best_page_text(page, set(range(1, 41))))
        joined_lines.extend(l for l in text.split("\n") if l.strip())

    text = "\n".join(joined_lines)
    parts = CHUNK_SPLIT_RE.split("\n" + text)
    sentences = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        m = re.match(r"^(\d{1,2})\.\s*(.*)$", p, re.DOTALL)
        if not m:
            continue
        num = int(m.group(1))
        if not (start_num <= num < start_num + expected_count):
            continue
        body_lines = [l for l in m.group(2).split("\n") if not is_marker_debris_line(l)]
        sentence = re.sub(r"\s+", " ", " ".join(body_lines)).strip()
        if sentence:
            sentences.append((num, sentence))

    problems = []
    nums_found = [n for n, _ in sentences]
    missing = [n for n in range(start_num, start_num + expected_count) if n not in nums_found]
    dup_nums = {n for n in nums_found if nums_found.count(n) > 1}
    if missing:
        problems.append(f"written-expression: missing question numbers {missing}")
    if dup_nums:
        problems.append(f"written-expression: duplicate question numbers {sorted(dup_nums)}")
    problems.append(
        f"written-expression: options A-D intentionally left empty for Q{start_num}-"
        f"{start_num + expected_count - 1} -- underline markers in source PDF are "
        f"rendered with corrupted/inconsistent glyphs, auto-mapping would be unreliable. "
        f"Needs manual entry."
    )

    results = []
    for num, sentence in sentences:
        options = {"A": "", "B": "", "C": "", "D": ""}
        results.append({"number": num, "stem": sentence, "options": options})

    return results, problems


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

LISTENING_PAGES = [1, 2, 3, 4, 6]  # skip 0 (Part A intro+example), 5 (Part C intro+example)
STRUCTURE_PLAIN_PAGES = [8, 9]  # skip 7 (intro+example)
STRUCTURE_WE_PAGES = [11, 12, 13]  # skip 10 (intro+example)

READING_PASSAGES = [
    (1, 12, [15, 16]),
    (13, 21, [17, 18]),
    (22, 30, [19, 20]),
    (31, 41, [21, 22]),
    (42, 50, [23, 24]),
]

LISTENING_AUDIO_RANGES = [
    (1, 13, "longman-pretest-part-a-1-13"),
    (14, 26, "longman-pretest-part-a-14-26"),
    (27, 30, "longman-pretest-part-a-27-30"),
    (31, 34, "longman-pretest-part-b-31-34"),
    (35, 38, "longman-pretest-part-b-35-38"),
    (39, 42, "longman-pretest-part-c-39-42"),
    (43, 46, "longman-pretest-part-c-43-46"),
    (47, 50, "longman-pretest-part-c-47-50"),
]


def listening_part(num):
    if num <= 30:
        return "A"
    if num <= 38:
        return "B"
    return "C"


def listening_audio(num):
    for lo, hi, audio_id in LISTENING_AUDIO_RANGES:
        if lo <= num <= hi:
            return audio_id
    return None


def extract_reading_passage_text(pages, start_num):
    """Isolate passage prose from the question stream: find where the first
    question's 'N.' label line starts; everything before that (after the
    'Questions N-M' header) is the passage."""
    full_lines = []
    for page in pages:
        text = clean_lines(best_page_text(page, set(range(1, 51))))
        full_lines.extend(text.split("\n"))
    full_text = "\n".join(full_lines)

    header_m = re.search(r"Q\s*u\s*e\s*s\s*t\s*i\s*o\s*n\s*s\s+(\d+)\s*-\s*(\d+)", full_text)
    header_end = header_m.end() if header_m else 0

    first_q_m = re.search(rf"(?m)^{start_num}\.\s", full_text[header_end:])
    if first_q_m:
        boundary = header_end + first_q_m.start()
    else:
        # fallback: first "(A)" occurrence
        a_m = re.search(r"\(A\)", full_text[header_end:])
        boundary = header_end + a_m.start() if a_m else header_end

    passage = full_text[header_end:boundary].strip()
    passage = re.sub(r"\n{2,}", "\n", passage)
    question_stream = full_text[boundary:]
    return passage, question_stream


# ---------------------------------------------------------------------------
# Perbaikan pasca-ekstraksi: beberapa label nomor soal ("23.", "24.", "29.",
# dst) memang TIDAK ADA di layer teks PDF sumber (bukan bug rekonstruksi --
# sudah dicek langsung di koordinat kata, glyph-nya tidak ada). Akibatnya,
# kalimat soal yang kehilangan labelnya "nyangkut" di akhir opsi D soal
# sebelumnya (karena situ regex stop-lookahead cuma berhenti di '(A)' atau
# pola 'N.' baru). Ini bisa direlokasi otomatis kalau polanya jelas (satu
# kalimat soal yang utuh nyangkut di satu titik). Kalau pola lebih kacau
# (beberapa soal ter-interleave sekaligus), tidak direlokasi -- dibiarkan
# dan ditandai status "incomplete" di tahap berikutnya.
# ---------------------------------------------------------------------------

STEM_START_RE = re.compile(
    r"(The word [\"'‘’“”]|The pronoun |Which of the following|"
    r"According to the passage|It is implied|It can be inferred|Where in the passage|"
    r"What (?:is|does|can|would)|The author|In line \d|All of the following|"
    r"The phrase |The purpose of (?:the|this) passage)"
)
DISCARD_LEAK_RE = re.compile(
    r"^(Directions:|GO ON TO|This is the end of|Turn off the recording|Part [ABC]\b)", re.I
)


def _qnum(q):
    return int(q["id"].rsplit("-", 1)[1])


def repair_option_bleed(questions):
    problems = []
    by_section = {}
    for q in questions:
        by_section.setdefault(q["section"], {})[_qnum(q)] = q

    for items in by_section.values():
        for num in sorted(items):
            q = items[num]
            d = q["options"].get("D", "")
            m = STEM_START_RE.search(d)
            if not m or m.start() == 0:
                continue
            real_part = d[: m.start()].strip()
            leaked = d[m.start():].strip()
            if not real_part:
                continue  # seluruh D cuma kalimat nyasar, bukan opsi asli -- biarkan utuh
            q["options"]["D"] = real_part
            if DISCARD_LEAK_RE.match(leaked):
                problems.append(f"{q['id']}: dibuang teks boilerplate yang nyangkut di opsi D")
                continue
            nxt = items.get(num + 1)
            if nxt is not None and not (nxt.get("question") or "").strip():
                nxt["question"] = leaked
                problems.append(f"{q['id']}: kalimat soal yang nyangkut direlokasi ke {nxt['id']}")
            else:
                problems.append(
                    f"{q['id']}: ada kalimat soal nyangkut di opsi D tapi gagal direlokasi -> {leaked[:60]!r}"
                )
    return problems


MOJIBAKE_RE = re.compile("�")


def fix_mojibake(questions):
    """PyMuPDF gagal decode glyph apostrof lengkung di font sumber ini jadi
    U+FFFD. Dari semua kemunculan yang dicek manual, semuanya posisi
    apostrof ("He's", "Paine's", dst) -- aman diganti jadi right single
    quote biasa."""
    for q in questions:
        if q.get("question"):
            q["question"] = MOJIBAKE_RE.sub("’", q["question"])
        if q.get("passage"):
            q["passage"] = MOJIBAKE_RE.sub("’", q["passage"])
        for letter in "ABCD":
            if q["options"].get(letter):
                q["options"][letter] = MOJIBAKE_RE.sub("’", q["options"][letter])


CONTAMINATION_RE = re.compile(r"\([ABCD]\)|\b\d{1,2}\s*\.?\s+[A-Z]")


def mark_status(questions):
    """Tandai tiap soal "ok" atau "incomplete" berdasar state akhir setelah
    repair_option_bleed: stem kosong (selain Listening yang stem-nya
    memang konstan), opsi kosong, atau stem/opsi masih memuat tanda
    kontaminasi (marker '(A)-(D)' atau label 'N.' nyangkut dari soal lain
    -- artinya repair tidak berhasil merelokasi dengan bersih, biasanya
    karena frasa pembuka kalimat yang nyasar tidak ada di daftar
    STEM_START_RE)."""
    for q in questions:
        reasons = []
        if q.get("_placeholder"):
            reasons.append("nomor soal tidak ketemu sama sekali di PDF sumber")
        question_text = (q.get("question") or "").strip()
        bare_question = (
            question_text.replace("[Written Expression]", "").replace("[Structure]", "").strip()
        )
        if q["section"] != "listening" and not bare_question:
            reasons.append("stem soal kosong")
        elif CONTAMINATION_RE.search(question_text):
            reasons.append("stem soal masih bercampur dengan teks soal lain")
        for letter in "ABCD":
            v = q["options"].get(letter, "")
            if len(v) < 1:
                reasons.append(f"opsi {letter} kosong")
            elif CONTAMINATION_RE.search(v) or DISCARD_LEAK_RE.match(v):
                reasons.append(f"opsi {letter} masih bercampur dengan teks soal lain")
        q.pop("_placeholder", None)
        if reasons:
            q["status"] = "incomplete"
            q["statusNote"] = "; ".join(reasons)
        else:
            q["status"] = "ok"
            q["statusNote"] = None


def main():
    doc = pymupdf.open(PDF_PATH)
    answer_key = json.loads(ANSWER_KEY_PATH.read_text(encoding="utf-8"))
    questions = []
    problems = []

    # ---------------- Listening ----------------
    listening_text = "\n".join(
        clean_lines(best_page_text(doc[idx], set(range(1, 51)))) for idx in LISTENING_PAGES
    )
    listening_items, probs = extract_plain_mc(listening_text, 1, 50)
    problems += [f"listening: {p}" for p in probs]
    for item in listening_items:
        num = item["number"]
        ans = answer_key["listening"].get(str(num))
        questions.append(
            {
                "id": f"{SET_ID}-listening-{num}",
                "section": "listening",
                "setId": SET_ID,
                "part": listening_part(num),
                "audio": f"audio/{listening_audio(num)}.mp3" if listening_audio(num) else None,
                "passage": None,
                "question": "Listen and choose the best answer.",
                "options": item["options"],
                "answer": ans,
                "explanation": None,
                "source": None,
                "difficulty": None,
            }
        )
        if ans is None:
            problems.append(f"listening Q{num}: no answer key match")

    found_nums = {item["number"] for item in listening_items}
    for num in range(1, 51):
        if num in found_nums:
            continue
        problems.append(f"listening Q{num}: nomor tidak ketemu sama sekali, dibuat placeholder")
        questions.append(
            {
                "id": f"{SET_ID}-listening-{num}",
                "section": "listening",
                "setId": SET_ID,
                "part": listening_part(num),
                "audio": f"audio/{listening_audio(num)}.mp3" if listening_audio(num) else None,
                "passage": None,
                "question": "Listen and choose the best answer.",
                "options": {"A": "", "B": "", "C": "", "D": ""},
                "answer": answer_key["listening"].get(str(num)),
                "explanation": None,
                "source": None,
                "difficulty": None,
                "_placeholder": True,
            }
        )

    # ---------------- Structure: plain (Q1-15) ----------------
    structure_plain_text = "\n".join(
        clean_lines(best_page_text(doc[idx], set(range(1, 41)))) for idx in STRUCTURE_PLAIN_PAGES
    )
    structure_plain_items, probs = extract_plain_mc(structure_plain_text, 1, 15)
    problems += [f"structure(plain): {p}" for p in probs]
    for item in structure_plain_items:
        num = item["number"]
        ans = answer_key["structure"].get(str(num))
        questions.append(
            {
                "id": f"{SET_ID}-structure-{num}",
                "section": "structure",
                "setId": SET_ID,
                "part": None,
                "audio": None,
                "passage": None,
                "question": f"[Structure] {item['stem']}",
                "options": item["options"],
                "answer": ans,
                "explanation": None,
                "source": None,
                "difficulty": None,
            }
        )
        if ans is None:
            problems.append(f"structure Q{num}: no answer key match")

    # ---------------- Structure: Written Expression (Q16-40) ----------------
    we_pages = [doc[idx] for idx in STRUCTURE_WE_PAGES]
    we_items, probs = extract_written_expression(we_pages, 16, 25)
    problems += [f"structure(WE): {p}" for p in probs]
    for item in we_items:
        num = item["number"]
        ans = answer_key["structure"].get(str(num))
        questions.append(
            {
                "id": f"{SET_ID}-structure-{num}",
                "section": "structure",
                "setId": SET_ID,
                "part": None,
                "audio": None,
                "passage": None,
                "question": f"[Written Expression] {item['stem']}",
                "options": item["options"],
                "answer": ans,
                "explanation": None,
                "source": None,
                "difficulty": None,
            }
        )
        if ans is None:
            problems.append(f"structure Q{num}: no answer key match")

    found_structure_nums = {item["number"] for item in structure_plain_items} | {
        item["number"] for item in we_items
    }
    for num in range(1, 41):
        if num in found_structure_nums:
            continue
        problems.append(f"structure Q{num}: nomor tidak ketemu sama sekali, dibuat placeholder")
        questions.append(
            {
                "id": f"{SET_ID}-structure-{num}",
                "section": "structure",
                "setId": SET_ID,
                "part": None,
                "audio": None,
                "passage": None,
                "question": "",
                "options": {"A": "", "B": "", "C": "", "D": ""},
                "answer": answer_key["structure"].get(str(num)),
                "explanation": None,
                "source": None,
                "difficulty": None,
                "_placeholder": True,
            }
        )

    # ---------------- Reading ----------------
    for start_num, end_num, page_idxs in READING_PASSAGES:
        pages = [doc[idx] for idx in page_idxs]
        passage_text, question_stream = extract_reading_passage_text(pages, start_num)
        count = end_num - start_num + 1
        items, probs = extract_plain_mc(question_stream, start_num, count)
        problems += [f"reading({start_num}-{end_num}): {p}" for p in probs]
        for item in items:
            num = item["number"]
            ans = answer_key["reading"].get(str(num))
            questions.append(
                {
                    "id": f"{SET_ID}-reading-{num}",
                    "section": "reading",
                    "setId": SET_ID,
                    "part": None,
                    "audio": None,
                    "passage": passage_text,
                    "question": item["stem"],
                    "options": item["options"],
                    "answer": ans,
                    "explanation": None,
                    "source": None,
                    "difficulty": None,
                }
            )
            if ans is None:
                problems.append(f"reading Q{num}: no answer key match")

        found_reading_nums = {item["number"] for item in items}
        for num in range(start_num, end_num + 1):
            if num in found_reading_nums:
                continue
            problems.append(f"reading Q{num}: nomor tidak ketemu sama sekali, dibuat placeholder")
            questions.append(
                {
                    "id": f"{SET_ID}-reading-{num}",
                    "section": "reading",
                    "setId": SET_ID,
                    "part": None,
                    "audio": None,
                    "passage": passage_text,
                    "question": "",
                    "options": {"A": "", "B": "", "C": "", "D": ""},
                    "answer": answer_key["reading"].get(str(num)),
                    "explanation": None,
                    "source": None,
                    "difficulty": None,
                    "_placeholder": True,
                }
            )

    bleed_problems = repair_option_bleed(questions)
    problems += bleed_problems
    fix_mojibake(questions)
    mark_status(questions)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(questions, ensure_ascii=False, indent=2), encoding="utf-8")

    # ---------------- validation report ----------------
    print(f"Total questions: {len(questions)}")
    by_section = {}
    for q in questions:
        by_section.setdefault(q["section"], []).append(q)
    for sec, items in by_section.items():
        nums = sorted(_qnum(q) for q in items)
        ok_count = sum(1 for q in items if q["status"] == "ok")
        incomplete_count = sum(1 for q in items if q["status"] == "incomplete")
        print(
            f"  {sec}: {len(items)} soal, nomor {nums[0]}-{nums[-1]} "
            f"(ok={ok_count}, incomplete={incomplete_count})"
        )
        dups = [n for n in set(nums) if nums.count(n) > 1]
        if dups:
            print(f"    DUPLICATE numbers: {dups}")
        expected_max = {"listening": 50, "structure": 40, "reading": 50}[sec]
        missing = [n for n in range(1, expected_max + 1) if n not in nums]
        if missing:
            print(f"    MISSING numbers: {missing}")

    incomplete_ids = [q["id"] for q in questions if q["status"] == "incomplete"]
    if incomplete_ids:
        print(f"\nIncomplete questions: {len(incomplete_ids)}")
        for q in questions:
            if q["status"] == "incomplete":
                print(f"  - {q['id']}: {q['statusNote']}")

    no_answer = [q["id"] for q in questions if not q["answer"]]
    if no_answer:
        print(f"Questions with NO answer key match: {len(no_answer)} -> {no_answer}")

    if problems:
        print("\nParse warnings:")
        for p in problems:
            print(f"  - {p}")

    print("\n--- 3 example questions ---")
    for sec in ("listening", "structure", "reading"):
        example = next(q for q in questions if q["section"] == sec)
        print(json.dumps(example, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
