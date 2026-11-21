"""Diagnosa per-halaman untuk PDF target OCR (Fase 2C).

Untuk tiap PDF target, hitung jumlah karakter teks dan jumlah gambar per halaman
pakai PyMuPDF. Tidak mengubah apa pun di D:\\Belajar TOEFL (read-only).
Tidak mencetak isi teks, hanya statistik.
"""

import pymupdf
from pathlib import Path

SOURCE_DIR = Path(r"D:\Belajar TOEFL")

TARGETS = [
    r"Longman - Practice\Test 1\CT 1.pdf",
    r"Longman - Practice\Test 2\CT 2.pdf",
    r"Longman - Practice\Test 3\CT 3.pdf",
    r"Longman - Practice\Test 4\CT 4.pdf",
    r"Longman - Practice\Test 5\CT 5.pdf",
    r"Longman - Practice\Post test\Post-test b.pdf",
]

TEXT_THRESHOLD = 50
MIN_IMAGE_AREA_RATIO = 0.3  # gambar dianggap "besar" kalau >= 30% luas halaman


def diagnose(pdf_rel: str):
    pdf_path = SOURCE_DIR / pdf_rel
    doc = pymupdf.open(pdf_path)
    candidates = []
    page_rows = []

    for i, page in enumerate(doc, start=1):
        text = page.get_text()
        n_chars = len(text.strip())
        images = page.get_images(full=True)
        page_area = page.rect.width * page.rect.height

        n_big_images = 0
        for img in images:
            xref = img[0]
            try:
                rects = page.get_image_rects(xref)
            except Exception:
                rects = []
            for r in rects:
                area = r.width * r.height
                if page_area > 0 and (area / page_area) >= MIN_IMAGE_AREA_RATIO:
                    n_big_images += 1

        is_candidate = n_chars < TEXT_THRESHOLD and (n_big_images > 0 or len(images) > 0)
        page_rows.append({
            "page": i,
            "n_chars": n_chars,
            "n_images": len(images),
            "n_big_images": n_big_images,
            "candidate": is_candidate,
        })
        if n_chars < TEXT_THRESHOLD:
            candidates.append(i)

    doc.close()
    return page_rows, candidates


def main():
    for rel in TARGETS:
        rows, candidates = diagnose(rel)
        total_pages = len(rows)
        print(f"\n=== {rel} ({total_pages} halaman) ===")
        print(f"Halaman dgn teks < {TEXT_THRESHOLD} char (kandidat OCR): {len(candidates)}/{total_pages}")
        # tampilkan ringkas: rentang halaman kandidat + info gambar
        for r in rows:
            if r["n_chars"] < TEXT_THRESHOLD:
                flag = "BESAR" if r["n_big_images"] > 0 else ("ada-gambar" if r["n_images"] > 0 else "TANPA-GAMBAR")
                print(f"  hal {r['page']:>3}: chars={r['n_chars']:>3} images={r['n_images']} big_images={r['n_big_images']} [{flag}]")


if __name__ == "__main__":
    main()
