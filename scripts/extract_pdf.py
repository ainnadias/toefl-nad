"""Ekstraksi teks dari semua PDF di folder bahan (D:\\Belajar TOEFL) ke materials_txt/.

Tidak mengubah apa pun di folder bahan (read-only). Menyimpan satu .txt per PDF,
dengan nama file yang merepresentasikan struktur subfolder asli (dipisah '__').
"""

import fitz  # PyMuPDF
import json
import sys
from pathlib import Path

SOURCE_DIR = Path(r"D:\Belajar TOEFL")
OUT_DIR = Path(__file__).resolve().parent.parent / "materials_txt"

ASLI_THRESHOLD = 200
SCAN_THRESHOLD = 50


def relpath_to_txt_name(pdf_path: Path) -> str:
    rel = pdf_path.relative_to(SOURCE_DIR)
    parts = list(rel.parts[:-1]) + [rel.stem]
    safe_parts = [p.replace(" ", "_") for p in parts]
    return "__".join(safe_parts) + ".txt"


def classify(avg_chars: float) -> str:
    if avg_chars > ASLI_THRESHOLD:
        return "teks asli"
    if avg_chars < SCAN_THRESHOLD:
        return "scan"
    return "campuran"


def extract_pdf(pdf_path: Path) -> dict:
    doc = fitz.open(pdf_path)
    out_name = relpath_to_txt_name(pdf_path)
    out_path = OUT_DIR / out_name

    total_chars = 0
    page_count = doc.page_count

    with open(out_path, "w", encoding="utf-8") as f:
        for i, page in enumerate(doc, start=1):
            text = page.get_text()
            total_chars += len(text)
            f.write(f"--- Halaman {i} ---\n")
            f.write(text)
            f.write("\n")

    doc.close()

    avg_chars = total_chars / page_count if page_count else 0
    return {
        "pdf": str(pdf_path.relative_to(SOURCE_DIR)),
        "txt": out_name,
        "pages": page_count,
        "avg_chars_per_page": round(avg_chars, 1),
        "classification": classify(avg_chars),
    }


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    pdf_files = sorted(SOURCE_DIR.rglob("*.pdf"))
    results = []
    for pdf_path in pdf_files:
        try:
            info = extract_pdf(pdf_path)
        except Exception as e:
            info = {
                "pdf": str(pdf_path.relative_to(SOURCE_DIR)),
                "txt": None,
                "pages": None,
                "avg_chars_per_page": None,
                "classification": f"ERROR: {e}",
            }
        results.append(info)

    summary_path = OUT_DIR / "_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    # Print ringkas ke stdout (tabel), tanpa isi teks
    print(f"{'PDF':<70} {'Halaman':>8} {'AvgChar/Hal':>12}  Klasifikasi")
    print("-" * 110)
    for r in results:
        print(f"{r['pdf']:<70} {str(r['pages']):>8} {str(r['avg_chars_per_page']):>12}  {r['classification']}")


if __name__ == "__main__":
    main()
