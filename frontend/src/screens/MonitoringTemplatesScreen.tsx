// Monitoring Templates — LinkedEye layout: per-category count tiles, search +
// category filter, and a grid of category cards listing their templates.
// Sample catalog from data/monitoring (no backend endpoint yet).
import React from "react";
import { useNav } from "@/hooks/useNav";
import { TEMPLATE_CATEGORIES } from "@/data/monitoring";
import type { TemplateCategory } from "@/data/monitoring";
import { Empty, fmt } from "@/components/ld";

import { Icon } from "@/components/Icon";
import { LayersIcon, RadioTowerIcon, SearchIcon, ZoomInIcon } from "lucide-react";
const PREVIEW = 8;

function CategoryCard({ cat, query }: { cat: TemplateCategory; query: string }) {
  const [open, setOpen] = React.useState(false);
  const q = query.trim().toLowerCase();
  const matching = q ? cat.templates.filter((t) => t.name.toLowerCase().includes(q)) : cat.templates;
  const shown = open || q ? matching : matching.slice(0, PREVIEW);
  const headId = React.useId();
  return (
    <section className="ld-card ld-panel ld-tpl-card" aria-labelledby={headId}>
      <div className="ld-tpl-head">
        <span className="ld-tpl-icon" style={{ color: cat.color, background: `${cat.color}1a` }} aria-hidden="true">
          <Icon className={`fa-solid ${cat.icon}`} />
        </span>
        <h2 id={headId}>{cat.title}</h2>
        <span className="ld-tpl-count">{cat.templates.length} templates</span>
      </div>
      <p className="ld-tpl-desc">{cat.description}</p>
      <ul className="ld-tpl-list">
        {shown.map((t) => (
          <li key={t.name}>
            <Icon className={`fa-solid ${t.icon}`} style={{ color: cat.color }} />
            <span>{t.name}</span>
          </li>
        ))}
      </ul>
      {!q && cat.templates.length > PREVIEW && (
        <button type="button" className="ld-link ld-tpl-more" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Show fewer" : `View all ${cat.templates.length} templates`}
          <Icon className={`fa-solid fa-chevron-${open ? "up" : "down"}`} />
        </button>
      )}
    </section>
  );
}

export default function MonitoringTemplatesScreen() {
  const { setRoute } = useNav();
  const [query, setQuery] = React.useState("");
  const [cat, setCat] = React.useState("");

  const total = TEMPLATE_CATEGORIES.reduce((a, c) => a + c.templates.length, 0);
  const q = query.trim().toLowerCase();
  const visible = TEMPLATE_CATEGORIES.filter(
    (c) =>
      (!cat || c.id === cat) &&
      (!q || c.title.toLowerCase().includes(q) || c.templates.some((t) => t.name.toLowerCase().includes(q))),
  );
  // A category whose title matched shows all its templates, not a filtered list.
  const queryFor = (c: TemplateCategory) => (q && c.title.toLowerCase().includes(q) ? "" : query);

  return (
    <div className="ld-dash">
      <div className="ld-head">
        <div>
          <h1>Monitoring Templates ({fmt(total)})</h1>
          <p>Predefined monitoring templates for infrastructure, network, applications and services</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn" onClick={() => setRoute("infra-exporters")}>
            <Icon icon={RadioTowerIcon} /> Exporters
          </button>
          <button type="button" className="ld-btn ld-btn-primary" onClick={() => setRoute("infra-onboarding")}>
            <Icon icon={ZoomInIcon} /> Discover &amp; assign
          </button>
        </div>
      </div>

      <div className="ld-chips" role="group" aria-label="Filter by category">
        <button type="button" className={`ld-chip${!cat ? " active" : ""}`} aria-pressed={!cat} onClick={() => setCat("")}>
          <Icon icon={LayersIcon} />
          <span className="ld-chip-count">{fmt(total)}</span>
          <span className="ld-chip-label">All templates</span>
        </button>
        {TEMPLATE_CATEGORIES.map((c) => (
          <button key={c.id} type="button" className={`ld-chip${cat === c.id ? " active" : ""}`} aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? "" : c.id)}>
            <Icon className={`fa-solid ${c.icon}`} style={cat === c.id ? undefined : { color: c.color }} />
            <span className="ld-chip-count">{c.templates.length}</span>
            <span className="ld-chip-label">{c.title}</span>
          </button>
        ))}
      </div>

      <div className="ld-toolbar ld-card ld-filters">
        <label htmlFor="tpl-search" className="sr-only">Search templates</label>
        <span className="ld-search">
          <Icon icon={SearchIcon} />
          <input id="tpl-search" type="search" placeholder="Search templates, devices, services or categories…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </span>
        <label htmlFor="tpl-cat" className="sr-only">Category</label>
        <select id="tpl-cat" className="ld-select" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {TEMPLATE_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {visible.length ? (
        <div className="ld-grid ld-tpl-grid">
          {visible.map((c) => (
            <CategoryCard key={c.id} cat={c} query={queryFor(c)} />
          ))}
        </div>
      ) : (
        <div className="ld-card"><Empty>No templates match “{query}”.</Empty></div>
      )}

      <p className="ld-muted ld-small">Sample template catalog — template management is not connected to the backend yet.</p>
    </div>
  );
}
