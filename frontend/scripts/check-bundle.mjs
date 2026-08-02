import { readFile, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function collectStaticFiles(manifest, chunkKey, files = new Set()) {
  const chunk = manifest[chunkKey];
  if (!chunk) throw new Error(`Vite manifest is missing chunk ${chunkKey}`);

  if (files.has(chunk.file)) return files;
  files.add(chunk.file);
  for (const importedKey of chunk.imports ?? []) {
    collectStaticFiles(manifest, importedKey, files);
  }
  return files;
}

async function checkBundle() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const manifest = JSON.parse(
    await readFile(resolve(root, "dist/.vite/manifest.json"), "utf8"),
  );
  const entryRecord = Object.entries(manifest).find(([, chunk]) => chunk.isEntry);

  if (!entryRecord) throw new Error("Vite manifest does not contain an entry chunk");

  const [entryKey] = entryRecord;
  const files = [...collectStaticFiles(manifest, entryKey)];
  const sizes = await Promise.all(
    files.map(async (file) => ({ file, bytes: (await stat(resolve(root, "dist", file))).size })),
  );
  const bytes = sizes.reduce((total, item) => total + item.bytes, 0);
  const limit = 350 * 1024;

  if (bytes > limit) {
    throw new Error(
      `Initial JavaScript graph is ${(bytes / 1024).toFixed(1)} KiB; limit is ${limit / 1024} KiB`,
    );
  }

  console.log(
    `Initial JavaScript graph: ${(bytes / 1024).toFixed(1)} KiB across ${files.length} files`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await checkBundle();
}
