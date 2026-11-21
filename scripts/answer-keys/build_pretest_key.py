"""Baca kunci jawaban Longman Pre-test dari Answer sheet.xlsx (sheet 'Pretest',
baris tersembunyi 31-50 menyimpan kunci asli lewat formula self-check) dan
simpan ke scripts/answer-keys/longman-pretest.json.

Sumber: D:\\Belajar TOEFL\\Longman - Practice\\Answer sheet.xlsx
(bukan "Pre-test/pretest toefl.xlsx" -- file itu cuma lembar jawaban kosong,
tanpa kunci).
"""

import json
from pathlib import Path

import openpyxl

SRC = Path(r"D:\Belajar TOEFL\Longman - Practice\Answer sheet.xlsx")
OUT = Path(__file__).resolve().parent / "longman-pretest.json"

# (row_start, row_end, no_col, answer_col) per section di sheet 'Pretest'
# No/Answer berpasangan, 3 blok kolom per section (1-20/21-40/41-50 dst)
SECTION_BLOCKS = {
    "listening": [("B", "C"), ("E", "F"), ("H", "I")],
    "structure": [("L", "M"), ("O", "P")],
    "reading": [("S", "T"), ("V", "W"), ("Y", "Z")],
}
ROW_START, ROW_END = 31, 50


def main():
    wb = openpyxl.load_workbook(SRC, data_only=True)
    ws = wb["Pretest"]

    result = {}
    for section, blocks in SECTION_BLOCKS.items():
        answers = {}
        for no_col, ans_col in blocks:
            for r in range(ROW_START, ROW_END + 1):
                no = ws[f"{no_col}{r}"].value
                ans = ws[f"{ans_col}{r}"].value
                if no is None or ans in (None, "-"):
                    continue
                answers[str(int(no))] = ans
        result[section] = dict(sorted(answers.items(), key=lambda kv: int(kv[0])))

    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    for section, answers in result.items():
        nums = [int(k) for k in answers]
        print(f"{section}: {len(answers)} soal, range {min(nums)}-{max(nums)}")


if __name__ == "__main__":
    main()
