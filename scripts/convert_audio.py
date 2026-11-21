"""Konversi audio bahan TOEFL ke mp3 mono 64kbps (Fase 2B).

Sumber: D:\\Belajar TOEFL (read-only, tidak diubah/dihapus/dipindah).
Output: public/audio/ (mp3 baru) + public/data/audio-manifest.json.

Bisa dijalankan ulang: file yang sudah ada di public/audio/ dilewati.
"""

import json
import re
import subprocess
import sys
from pathlib import Path

SOURCE_DIR = Path(r"D:\Belajar TOEFL")
PROJECT_DIR = Path(__file__).resolve().parent.parent
AUDIO_OUT_DIR = PROJECT_DIR / "public" / "audio"
MANIFEST_PATH = PROJECT_DIR / "public" / "data" / "audio-manifest.json"

FFMPEG = r"C:\Users\ainna\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.1-full_build\bin\ffmpeg.exe"
FFPROBE = r"C:\Users\ainna\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.1-full_build\bin\ffprobe.exe"

LONGMAN_ABC_RE = re.compile(r"(Pre-test|Post-test|Test \d+)\s*-?\s*([ABC])\s*\((\d+)-(\d+)\)")
TRACK_RE = re.compile(r"Track (\d+)", re.IGNORECASE)


def test_slug(raw: str) -> str:
    raw = raw.lower()
    if raw.startswith("test "):
        return "test" + raw.split()[1]
    return raw.replace("-", "")  # "pre-test" -> "pretest", "post-test" -> "posttest"


def longman_name(stem: str, test_num: int | None) -> str | None:
    m = LONGMAN_ABC_RE.search(stem)
    if m:
        test_raw, letter, start, end = m.groups()
        return f"longman-{test_slug(test_raw)}-part-{letter.lower()}-{start}-{end}"
    m = TRACK_RE.search(stem)
    if m and test_num is not None:
        track_num = int(m.group(1))
        return f"longman-test{test_num}-track-{track_num:02d}"
    return None


def cliffs_name(stem: str, cd_num: int) -> str | None:
    m = TRACK_RE.search(stem)
    if not m:
        return None
    track_num = int(m.group(1))
    return f"cliffs-cd{cd_num}-track-{track_num:02d}"


# (folder relatif dari SOURCE_DIR, ext, naming_fn)
GROUPS = [
    ("Longman - Practice/Pre-test/Audio", ".wma", lambda s: longman_name(s, None)),
    ("Longman - Practice/Test 1/Audio", ".wma", lambda s: longman_name(s, None)),
    ("Longman - Practice/Test 2/Audio", ".wma", lambda s: longman_name(s, None)),
    ("Longman - Practice/Test 3/Audio", ".wma", lambda s: longman_name(s, 3)),
    ("Longman - Practice/Test 4/Audio", ".wma", lambda s: longman_name(s, 4)),
    ("Longman - Practice/Test 5/Audio", ".wma", lambda s: longman_name(s, 5)),
    ("Longman - Practice/Post test/Audio", ".wma", lambda s: longman_name(s, None)),
    (
        "Cliffs Preparation for the Toefl PBT Tests 1997-1998 (Ebook+audio)/cd1",
        ".mp3",
        lambda s: cliffs_name(s, 1),
    ),
    (
        "Cliffs Preparation for the Toefl PBT Tests 1997-1998 (Ebook+audio)/cd2",
        ".mp3",
        lambda s: cliffs_name(s, 2),
    ),
]


def ffprobe_duration(path: Path) -> float | None:
    try:
        result = subprocess.run(
            [FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, check=True,
        )
        return round(float(result.stdout.strip()), 2)
    except Exception:
        return None


def convert_one(src: Path, dst: Path) -> tuple[bool, str | None]:
    result = subprocess.run(
        [FFMPEG, "-y", "-i", str(src), "-ac", "1", "-b:a", "64k", "-codec:a", "libmp3lame", str(dst)],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        return False, result.stderr[-500:]
    return True, None


def main():
    AUDIO_OUT_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)

    manifest = []
    failed = []
    n_converted = 0
    n_skipped = 0
    total_src_bytes = 0
    total_out_bytes = 0

    for rel_folder, ext, name_fn in GROUPS:
        folder = SOURCE_DIR / rel_folder
        files = sorted(folder.glob(f"*{ext}"))
        n_group_converted = 0
        n_group_skipped = 0
        n_group_failed = 0

        for src in files:
            stem = src.stem
            new_name = name_fn(stem)
            if new_name is None:
                failed.append({"source": str(src.relative_to(SOURCE_DIR)), "error": "nama tidak bisa diparse"})
                n_group_failed += 1
                continue

            out_file = f"{new_name}.mp3"
            dst = AUDIO_OUT_DIR / out_file
            src_size = src.stat().st_size
            total_src_bytes += src_size

            if dst.exists():
                n_skipped += 1
                n_group_skipped += 1
            else:
                ok, err = convert_one(src, dst)
                if not ok:
                    failed.append({"source": str(src.relative_to(SOURCE_DIR)), "error": err})
                    n_group_failed += 1
                    continue
                n_converted += 1
                n_group_converted += 1

            out_size = dst.stat().st_size
            total_out_bytes += out_size
            duration = ffprobe_duration(dst)
            manifest.append({
                "id": new_name,
                "source": str(src.relative_to(SOURCE_DIR)).replace("\\", "/"),
                "file": out_file,
                "durationSec": duration,
                "sizeBytes": out_size,
            })

        print(
            f"{rel_folder}: {len(files)} file, "
            f"{n_group_converted} dikonversi, {n_group_skipped} dilewati (sudah ada), "
            f"{n_group_failed} gagal"
        )

    manifest.sort(key=lambda m: m["id"])
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\nTotal dikonversi: {n_converted}, dilewati: {n_skipped}, gagal: {len(failed)}")
    print(f"Total ukuran sumber (file yang diproses): {total_src_bytes} bytes")
    print(f"Total ukuran hasil konversi: {total_out_bytes} bytes")
    if failed:
        print("Daftar gagal:")
        for f_ in failed:
            print(f"  - {f_['source']}: {f_['error']}")


if __name__ == "__main__":
    main()
