// Monitoring Templates — LinkedEye layout: per-category count tiles, search +
// category filter, and a grid of category cards listing their templates.
// Sample catalog from data/monitoring (no backend endpoint yet).
import React from "react";
import { useNav } from "@/hooks/useNav";
import { TEMPLATE_CATEGORIES } from "@/data/monitoring";
import type { TemplateCategory } from "@/data/monitoring";
import { Empty, fmt } from "@/components/ld";
import { Button, Card, Page, PageHead, SearchBox, Select, TextButton, cx, ui } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { LayersIcon, RadioTowerIcon, SearchIcon, ZoomInIcon } from "lucide-react";
const PREVIEW = 8;

const chip = "inline-flex flex-col items-center justify-center gap-1 min-w-[104px] min-h-[76px] px-3 py-2.5 border rounded-lg cursor-pointer shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 [&_.ld-icon]:text-2xl";
const chipClass = (active: boolean) => cx(chip, active ? "bg-accent border-accent text-white [&_.ld-icon]:text-white" : "bg-bg-raised border-line text-fg hover:border-line-strong [&_.ld-icon]:text-accent");
const chipLabel = (active: boolean) => cx("text-sm", active ? "text-white" : "text-fg-muted");

function CategoryCard({ cat, query }: { cat: TemplateCategory; query: string }) {
  const [open, setOpen] = React.useState(false);
  const q = query.trim().toLowerCase();
  const matching = q ? cat.templates.filter((t) => t.name.toLowerCase().includes(q)) : cat.templates;
  const shown = open || q ? matching : matching.slice(0, PREVIEW);
  const headId = React.useId();
  return (
    <Card as="section" className={cx(ui.panel, "!gap-2")} aria-labelledby={headId}>
      <div className="flex items-center gap-2.5">
        <span className="flex-none w-9 h-9 rounded-[10px] grid place-items-center text-lg" style={{ color: cat.color, background: `${cat.color}1a` }} aria-hidden="true">
          <Icon name={cat.icon} />
        </span>
        <h2 id={headId} className="flex-1 text-lg font-semibold text-fg">{cat.title}</h2>
        <span className="text-xs font-semibold text-white bg-accent rounded-[6px] px-2 py-[3px] whitespace-nowrap">{cat.templates.length} templates</span>
      </div>
      <p className="text-sm text-fg-muted">{cat.description}</p>
      <ul className="list-none grid grid-cols-2 gap-x-2.5 gap-y-1.5">
        {shown.map((t) => (
          <li key={t.name} className="flex items-start gap-2 min-h-[30px] px-2 py-1 border border-line-subtle rounded-sm text-sm text-fg leading-[1.3] [&_.ld-icon]:mt-0.5">
            <Icon name={t.icon} style={{ color: cat.color }} />
            <span>{t.name}</span>
          </li>
        ))}
      </ul>
      {!q && cat.templates.length > PREVIEW && (
        <TextButton className="self-center inline-flex items-center gap-1.5 mt-0.5" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Show fewer" : `View all ${cat.templates.length} templates`}
          <Icon name={`chevron-${open ? "up" : "down"}`} />
        </TextButton>
      )}
    </Card>
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
    <Page>
      <PageHead
        title={`Monitoring Templates (${fmt(total)})`}
        subtitle="Predefined monitoring templates for infrastructure, network, applications and services"
        actions={
          <>
            <Button onClick={() => setRoute("infra-exporters")}>
              <Icon icon={RadioTowerIcon} /> Exporters
            </Button>
            <Button variant="primary" onClick={() => setRoute("infra-onboarding")}>
              <Icon icon={ZoomInIcon} /> Discover &amp; assign
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2.5" role="group" aria-label="Filter by category">
        <button type="button" className={chipClass(!cat)} aria-pressed={!cat} onClick={() => setCat("")}>
          <Icon icon={LayersIcon} />
          <span className="text-md font-bold">{fmt(total)}</span>
          <span className={chipLabel(!cat)}>All templates</span>
        </button>
        {TEMPLATE_CATEGORIES.map((c) => (
          <button key={c.id} type="button" className={chipClass(cat === c.id)} aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? "" : c.id)}>
            <Icon name={c.icon} style={cat === c.id ? undefined : { color: c.color }} />
            <span className="text-md font-bold">{c.templates.length}</span>
            <span className={chipLabel(cat === c.id)}>{c.title}</span>
          </button>
        ))}
      </div>

      <Card className={ui.filters}>
        <label htmlFor="tpl-search" className="sr-only">Search templates</label>
        <SearchBox className="flex-[1_1_240px]" icon={<Icon icon={SearchIcon} />} id="tpl-search" type="search" placeholder="Search templates, devices, services or categories…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label htmlFor="tpl-cat" className="sr-only">Category</label>
        <Select id="tpl-cat" value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">All categories</option>
          {TEMPLATE_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </Select>
      </Card>

      {visible.length ? (
        <div className={cx(ui.grid, "grid-cols-[repeat(auto-fill,minmax(300px,1fr))]")}>
          {visible.map((c) => (
            <CategoryCard key={c.id} cat={c} query={queryFor(c)} />
          ))}
        </div>
      ) : (
        <Card><Empty>No templates match “{query}”.</Empty></Card>
      )}

      <p className="text-fg-muted text-xs">Sample template catalog — template management is not connected to the backend yet.</p>
    </Page>
  );
}
