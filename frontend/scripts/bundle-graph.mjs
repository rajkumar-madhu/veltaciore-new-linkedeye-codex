// Walks the static import graph of a Vite manifest chunk. Dynamic imports are
// deliberately skipped: they are loaded on demand, not on first paint.
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
