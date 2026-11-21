"""Render 2 halaman contoh PDF ke PNG untuk verifikasi visual (Fase 2C).

Read-only terhadap D:\\Belajar TOEFL. Output ke tmp/.
"""

import pymupdf
from pathlib import Path

SOURCE_DIR = Path(r"D:\Belajar TOEFL")
OUT_DIR = Path(__file__).resolve().parent.parent / "tmp"

SAMPLES = [
    (r"Longman - Practice\Test 1\CT 1.pdf", 12, "ct1_p12.png"),
    (r"Longman - Practice\Post test\Post-test b.pdf", 6, "posttest_b_p6.png"),
]


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for pdf_rel, page_num, out_name in SAMPLES:
        pdf_path = SOURCE_DIR / pdf_rel
        doc = pymupdf.open(pdf_path)
        page = doc[page_num - 1]
        pix = page.get_pixmap(dpi=150)
        out_path = OUT_DIR / out_name
        pix.save(out_path)
        print(f"{pdf_rel} hal {page_num} -> {out_path}")
        doc.close()


if __name__ == "__main__":
    main()
