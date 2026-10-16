import assert from "node:assert/strict";
import test from "node:test";

import { collectStaticFiles } from "./bundle-graph.mjs";

test("collectStaticFiles includes recursive imports once and excludes dynamic imports", () => {
  const manifest = {
    "index.html": {
      file: "assets/index.js",
      imports: ["_state.js", "_react.js"],
      dynamicImports: ["screen.js"],
    },
    "_state.js": {
      file: "assets/state.js",
      imports: ["_react.js"],
    },
    "_react.js": { file: "assets/react.js" },
    "screen.js": { file: "assets/screen.js", imports: ["_react.js"] },
  };

  assert.deepEqual(
    [...collectStaticFiles(manifest, "index.html")].sort(),
    ["assets/index.js", "assets/react.js", "assets/state.js"],
  );
});

test("collectStaticFiles rejects a missing manifest reference", () => {
  assert.throws(
    () => collectStaticFiles({ "index.html": { file: "assets/index.js", imports: ["_missing.js"] } }, "index.html"),
    /missing chunk _missing\.js/,
  );
});

test("collectStaticFiles terminates when manifest imports form a cycle", () => {
  const manifest = {
    "index.html": { file: "assets/index.js", imports: ["_shared.js"] },
    "_shared.js": { file: "assets/shared.js", imports: ["index.html"] },
  };

  assert.deepEqual(
    [...collectStaticFiles(manifest, "index.html")].sort(),
    ["assets/index.js", "assets/shared.js"],
  );
});
