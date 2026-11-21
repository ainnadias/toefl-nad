import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

interface InfoSource {
  file: string;
  page: number | string | null;
  verified: boolean;
  seed?: boolean;
}

interface QuestionLike {
  id: string;
  source?: unknown;
}

const DATA_DIR = join(process.cwd(), "public", "data");

/** Beda data file di public/data punya field "source" dengan arti lain (misal audio-manifest.json). */
function isInfoSource(value: unknown): value is InfoSource {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.file === "string" && typeof v.verified === "boolean";
}

function pageSortKey(page: InfoSource["page"]): number {
  if (page === null) return Number.POSITIVE_INFINITY;
  if (typeof page === "number") return page;
  const match = page.match(/\d+/);
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY;
}

function main(): void {
  const files = readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  const items: { questionId: string; source: InfoSource }[] = [];

  for (const file of files) {
    const raw = readFileSync(join(DATA_DIR, file), "utf8");
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) continue;
    for (const q of data as QuestionLike[]) {
      if (isInfoSource(q.source)) items.push({ questionId: q.id, source: q.source });
    }
  }

  if (items.length === 0) {
    console.log("Tidak ada item dengan field 'source' di public/data/*.json.");
    return;
  }

  const byFile = new Map<string, { questionId: string; source: InfoSource }[]>();
  for (const item of items) {
    const list = byFile.get(item.source.file) ?? [];
    list.push(item);
    byFile.set(item.source.file, list);
  }

  let unverifiedCount = 0;
  const sortedFiles = [...byFile.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [file, list] of sortedFiles) {
    console.log(`\n=== ${file} (${list.length} item) ===`);
    const sorted = [...list].sort(
      (a, b) => pageSortKey(a.source.page) - pageSortKey(b.source.page)
    );
    for (const { questionId, source } of sorted) {
      const pageLabel = source.page === null ? "? (belum pasti)" : `hlm. ${source.page}`;
      const verifiedLabel = source.verified ? "verified" : "BELUM diverifikasi";
      const seedLabel = source.seed ? " [seed]" : "";
      console.log(`  ${questionId} -> ${pageLabel} (${verifiedLabel})${seedLabel}`);
      if (!source.verified) unverifiedCount += 1;
    }
  }

  console.log(`\nTotal item ber-source: ${items.length}`);
  console.log(`Belum diverifikasi: ${unverifiedCount}`);
}

main();
