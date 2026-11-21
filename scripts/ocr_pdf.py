"""OCR selektif untuk PDF scan Longman (Fase 2C).

Hanya meng-OCR halaman kandidat (teks asli < CANDIDATE_THRESHOLD karakter).
Halaman bertekstur biasa tetap pakai teks asli dari PyMuPDF.

Read-only terhadap D:\\Belajar TOEFL. Output ditimpa di materials_txt/
(nama file sama seperti hasil scripts/extract_pdf.py), dengan penanda
"--- Halaman N ---" per halaman dan "[OCR]" di baris pertama halaman
hasil OCR.

Cache per-halaman di tmp/ocr_cache/ supaya script bisa dijalankan ulang
tanpa mengulang OCR halaman yang sudah diproses.
"""

import sys
import pymupdf
import pytesseract
from PIL import Image
from pathlib import Path

SOURCE_DIR = Path(r"D:\Belajar TOEFL")
OUT_DIR = Path(__file__).resolve().parent.parent / "materials_txt"
CACHE_DIR = Path(__file__).resolve().parent.parent / "tmp" / "ocr_cache"

CANDIDATE_THRESHOLD = 50
OCR_DPI = 300

pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

TARGETS = [
    r"Longman - Practice\Test 1\CT 1.pdf",
    r"Longman - Practice\Test 2\CT 2.pdf",
    r"Longman - Practice\Test 3\CT 3.pdf",
    r"Longman - Practice\Test 4\CT 4.pdf",
    r"Longman - Practice\Test 5\CT 5.pdf",
    r"Longman - Practice\Post test\Post-test b.pdf",
]


def relpath_to_txt_name(pdf_rel: str) -> str:
    rel = Path(pdf_rel)
    parts = list(rel.parts[:-1]) + [rel.stem]
    safe_parts = [p.replace(" ", "_") for p in parts]
    return "__".join(safe_parts) + ".txt"


def cache_key(pdf_rel: str, page_num: int) -> Path:
    safe = pdf_rel.replace("\\", "__").replace(" ", "_").replace(".pdf", "")
    return CACHE_DIR / f"{safe}__p{page_num:03d}.txt"


def ocr_page(page) -> str:
    pix = page.get_pixmap(dpi=OCR_DPI, colorspace=pymupdf.csGRAY)
    img = Image.frombytes("L", [pix.width, pix.height], pix.samples)
    return pytesseract.image_to_string(img, lang="eng")


def process_pdf(pdf_rel: str):
    pdf_path = SOURCE_DIR / pdf_rel
    doc = pymupdf.open(pdf_path)
    out_name = relpath_to_txt_name(pdf_rel)
    out_path = OUT_DIR / out_name

    n_pages = doc.page_count
    n_ocr_cached = 0
    n_ocr_new = 0
    n_plain = 0

    with open(out_path, "w", encoding="utf-8") as f:
        for i in range(1, n_pages + 1):
            page = doc[i - 1]
            text = page.get_text()

            if len(text.strip()) < CANDIDATE_THRESHOLD:
                ckey = cache_key(pdf_rel, i)
                if ckey.exists():
                    ocr_text = ckey.read_text(encoding="utf-8")
                    n_ocr_cached += 1
                else:
                    ocr_text = ocr_page(page)
                    CACHE_DIR.mkdir(parents=True, exist_ok=True)
                    ckey.write_text(ocr_text, encoding="utf-8")
                    n_ocr_new += 1
                f.write(f"--- Halaman {i} ---\n")
                f.write("[OCR]\n")
                f.write(ocr_text)
                f.write("\n")
            else:
                n_plain += 1
                f.write(f"--- Halaman {i} ---\n")
                f.write(text)
                f.write("\n")

    doc.close()
    print(
        f"{pdf_rel}: {n_pages} hal total, "
        f"{n_ocr_new} baru di-OCR, {n_ocr_cached} dari cache, "
        f"{n_plain} teks asli -> {out_path.name}"
    )


def main():
    targets = sys.argv[1:] if len(sys.argv) > 1 else TARGETS
    for pdf_rel in targets:
        process_pdf(pdf_rel)


if __name__ == "__main__":
    main()
