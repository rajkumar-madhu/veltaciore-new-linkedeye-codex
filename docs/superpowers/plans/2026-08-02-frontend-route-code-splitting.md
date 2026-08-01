# Frontend Route Code Splitting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce the initial Argus frontend JavaScript payload by loading screen modules on demand while preserving every existing route and fallback redirect.

**Architecture:** Keep `App.tsx` as the route registry, replace eager screen imports with typed `React.lazy` imports, and place a shared accessible loading boundary around the route switch. Configure stable Vite vendor chunks for React and TanStack/Zustand dependencies, then enforce the initial-entry size with a small build-output verification script.

**Tech Stack:** React 18, TypeScript, React Router 6, Vite 5, Node.js

---

## File structure

- Modify `frontend/src/App.tsx`: lazy screen registry and shared suspense boundary.
- Modify `frontend/src/styles.css`: accessible route-loading presentation with reduced-motion support.
- Modify `frontend/vite.config.ts`: stable framework/state vendor chunks.
- Modify `frontend/package.json`: add a production bundle verification command.
- Create `frontend/scripts/check-bundle.mjs`: inspect Vite manifest and enforce the initial-entry budget.

### Task 1: Add an enforceable initial-bundle budget

**Files:**
- Create: `frontend/scripts/check-bundle.mjs`
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`

- [ ] **Step 1: Create the bundle verification script**

Create `frontend/scripts/check-bundle.mjs`:

```js
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(
  await readFile(resolve(root, "dist/.vite/manifest.json"), "utf8"),
);
const entry = Object.values(manifest).find((chunk) => chunk.isEntry);

if (!entry) throw new Error("Vite manifest does not contain an entry chunk");

const bytes = (await stat(resolve(root, "dist", entry.file))).size;
const limit = 350 * 1024;

if (bytes > limit) {
  throw new Error(
    `Initial entry ${entry.file} is ${(bytes / 1024).toFixed(1)} KiB; limit is ${limit / 1024} KiB`,
  );
}

console.log(`Initial entry ${entry.file}: ${(bytes / 1024).toFixed(1)} KiB`);
```

- [ ] **Step 2: Expose the manifest and verification command**

In `frontend/vite.config.ts`, add `build: { manifest: true }` to `defineConfig`. In `frontend/package.json`, add:

```json
"check:bundle": "npm run build && node scripts/check-bundle.mjs"
```

- [ ] **Step 3: Run the budget check and confirm it fails before code splitting**

Run:

```bash
cd frontend && npm run check:bundle
```

Expected: the build succeeds and `check-bundle.mjs` fails because the current initial entry is approximately 1,080 KiB, exceeding 350 KiB.

- [ ] **Step 4: Commit the failing budget guard**

```bash
git add frontend/scripts/check-bundle.mjs frontend/package.json frontend/vite.config.ts
git commit -m "test: enforce frontend entry bundle budget"
```

### Task 2: Lazy-load route screens

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Replace eager screen imports with lazy imports**

In `frontend/src/App.tsx`, retain the existing React import and replace every `import Screen from` declaration with the following pattern:

```tsx
const DashboardScreen = React.lazy(() => import("@/screens/DashboardScreen"));
const IncidentsScreen = React.lazy(() => import("@/screens/IncidentsScreen"));
const IncidentDetailScreen = React.lazy(() => import("@/screens/IncidentDetailScreen"));
```

Apply the same `React.lazy(() => import(...))` form to every default-exported screen currently registered in `App.tsx`.

For modules with named exports, use explicit projections:

```tsx
const CatalogScreen = React.lazy(() => import("@/screens/CatalogScreen"));
const CatalogRequestScreen = React.lazy(() =>
  import("@/screens/CatalogScreen").then((module) => ({ default: module.CatalogRequestScreen })),
);
const KnowledgeScreen = React.lazy(() => import("@/screens/KnowledgeScreen"));
const KnowledgeArticleScreen = React.lazy(() =>
  import("@/screens/KnowledgeScreen").then((module) => ({ default: module.KnowledgeArticleScreen })),
);
const ReportsScreen = React.lazy(() => import("@/screens/ReportsScreen"));
const SLAScreen = React.lazy(() =>
  import("@/screens/ReportsScreen").then((module) => ({ default: module.SLAScreen })),
);
```

- [ ] **Step 2: Add a shared accessible route fallback**

Add this component above `App`:

```tsx
function RouteLoading() {
  return (
    <div className="route-loading" role="status" aria-live="polite">
      <span className="route-loading-spinner" aria-hidden="true" />
      <span>Loading workspace…</span>
    </div>
  );
}
```

Wrap the existing `<Routes>` element without changing its route declarations:

```tsx
<React.Suspense fallback={<RouteLoading />}>
  <Routes>
    {/* existing Route elements remain unchanged */}
  </Routes>
</React.Suspense>
```

- [ ] **Step 3: Style the route fallback**

Append to `frontend/src/styles.css`:

```css
.route-loading {
  min-height: 45vh;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 10px;
  color: var(--fg-muted);
  font-size: 12px;
}

.route-loading-spinner {
  width: 22px;
  height: 22px;
  border: 2px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: route-loading-spin 0.7s linear infinite;
}

@keyframes route-loading-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .route-loading-spinner { animation: none; }
}
```

- [ ] **Step 4: Run TypeScript verification**

Run:

```bash
cd frontend && npm run typecheck
```

Expected: exit code 0 with no TypeScript diagnostics.

- [ ] **Step 5: Run the bundle budget check**

Run:

```bash
cd frontend && npm run check:bundle
```

Expected: exit code 0, multiple screen chunks in `dist/assets`, and the initial entry below 350 KiB.

- [ ] **Step 6: Commit route splitting**

```bash
git add frontend/src/App.tsx frontend/src/styles.css
git commit -m "perf: lazy-load frontend routes"
```

### Task 3: Stabilize vendor chunks and verify the application

**Files:**
- Modify: `frontend/vite.config.ts`

- [ ] **Step 1: Add explicit vendor chunk boundaries**

Update the build block in `frontend/vite.config.ts`:

```ts
build: {
  manifest: true,
  rollupOptions: {
    output: {
      manualChunks: {
        "react-vendor": ["react", "react-dom", "react-router-dom"],
        "state-vendor": ["@tanstack/react-query", "zustand"],
      },
    },
  },
},
```

- [ ] **Step 2: Run the complete frontend verification**

Run:

```bash
cd frontend && npm run typecheck && npm run check:bundle
```

Expected: both commands exit 0. Vite emits route chunks plus `react-vendor` and `state-vendor`; the initial entry remains below 350 KiB.

- [ ] **Step 3: Run backend regression tests**

Run:

```bash
cd backend && .venv/bin/python manage.py test apps
```

Expected: 18 tests run and all pass.

- [ ] **Step 4: Perform local route smoke tests**

Start the backend and frontend, then verify `/`, `/incidents`, `/infra`, `/metrics`, `/order-latency`, and `/sign-in`. For each route, confirm the requested screen loads after the shared fallback, navigation retains the tenant, and the browser console has no chunk-load errors.

- [ ] **Step 5: Commit vendor chunking**

```bash
git add frontend/vite.config.ts
git commit -m "perf: stabilize frontend vendor chunks"
```

- [ ] **Step 6: Verify clean repository state**

Run:

```bash
git status --short
```

Expected: no output.
