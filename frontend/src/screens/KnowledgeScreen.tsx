// Knowledge base (article list + article view).
// Ported from screens/knowledge.jsx; LinkedEye layout.
import "@/styles/servicedesk.css";
import React from "react";
import { useNav } from "@/hooks/useNav";
import { Empty, Panel, Pill, countBy, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";
import { useArticles } from "@/api/hooks";
import { USERS } from "@/data/core";


import { Icon } from "@/components/Icon";
import { BookOpenIcon, BotIcon, ChevronRightIcon, Grid3x3Icon, PencilIcon, PlusIcon, PrinterIcon, ShareIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
const CATEGORIES: { label: string; id: string; icon: string }[] = [
  { label: "Runbooks", id: "runbooks", icon: "fa-book" },
  { label: "Process", id: "process", icon: "fa-diagram-project" },
  { label: "Onboarding", id: "onboarding", icon: "fa-door-open" },
  { label: "Known errors", id: "known errors", icon: "fa-bug" },
];
const userName = (id: string) => USERS.find((u) => u.id === id)?.name ?? id;

function Summary({ icon, tone, label, value, note }: { icon: string; tone: Tone; label: string; value: React.ReactNode; note: string }) {
  return (
    <div className="ld-card ld-stat ld-sd-stat">
      <span className={`ld-tile ld-${tone}`} aria-hidden="true"><Icon className={`fa-solid ${icon}`} /></span>
      <span className="ld-stat-body">
        <span className="ld-stat-label">{label}</span>
        <span className="ld-stat-value">{value}</span>
        <span className="ld-stat-note">{note}</span>
      </span>
    </div>
  );
}

export default function KnowledgeScreen() {
  const { setRoute } = useNav();
  const { data } = useArticles();
  const articles = data ?? [];
  const [cat, setCat] = React.useState("all");
  const filtered = cat === "all" ? articles : articles.filter(a => a.cat.toLowerCase() === cat);

  const views = articles.reduce((s, a) => s + a.views, 0);
  const rated = articles.filter((a) => typeof a.rating === "number" && !Number.isNaN(a.rating));
  const avgRating = rated.length ? (rated.reduce((s, a) => s + a.rating, 0) / rated.length).toFixed(1) : "—";
  const catCount = new Set(articles.map((a) => a.cat)).size;
  const tags = countBy(articles.filter((a) => a.tag), (a) => a.tag).slice(0, 9);
  const current = CATEGORIES.find((c) => c.id === cat);

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <Icon icon={ChevronRightIcon} />
        <span>Knowledge Base</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>Knowledge Base</h1>
          <p>{fmt(articles.length)} articles in {catCount} categories · AI-assisted authoring</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn"><Icon icon={BotIcon} /> Generate from Incident</button>
          <button type="button" className="ld-btn ld-btn-primary"><Icon icon={PlusIcon} /> New Article</button>
        </div>
      </div>

      <div className="ld-grid ld-grid-5">
        <Summary icon="fa-book-open" tone="info" label="Total articles" value={fmt(articles.length)} note="published" />
        <Summary icon="fa-book" tone="ok" label="Runbooks" value={fmt(articles.filter(a => a.cat === "Runbooks").length)} note="operational" />
        <Summary icon="fa-bug" tone="warn" label="Known errors" value={fmt(articles.filter(a => a.cat === "Known errors").length)} note="documented" />
        <Summary icon="fa-star" tone="purple" label="Avg rating" value={avgRating === "—" ? avgRating : `${avgRating} / 5`} note={`across ${rated.length} articles`} />
        <Summary icon="fa-eye" tone="muted" label="Total views" value={fmt(views)} note="all time" />
      </div>

      <div className="ld-chips" role="group" aria-label="Filter by category">
        <button type="button" className={`ld-chip${cat === "all" ? " active" : ""}`} aria-pressed={cat === "all"} onClick={() => setCat("all")}>
          <Icon icon={Grid3x3Icon} />
          <span className="ld-chip-label">All</span>
          <span className="ld-chip-count">{articles.length}</span>
        </button>
        {CATEGORIES.map(({ label, id, icon }) => (
          <button key={id} type="button" className={`ld-chip${cat === id ? " active" : ""}`} aria-pressed={cat === id} onClick={() => setCat(cat === id ? "all" : id)}>
            <Icon className={`fa-solid ${icon}`} />
            <span className="ld-chip-label">{label}</span>
            <span className="ld-chip-count">{articles.filter(a => a.cat.toLowerCase() === id).length}</span>
          </button>
        ))}
      </div>

      <div className="ld-split">
        <Panel title={`${current ? current.label : "All Articles"} (${filtered.length})`}>
          {filtered.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr><th scope="col">Number</th><th scope="col">Title</th><th scope="col">Category</th><th scope="col">Author</th><th scope="col">Views</th><th scope="col">Rating</th><th scope="col">Updated</th></tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id}>
                      <td><button type="button" className="ld-link ld-mono" onClick={() => setRoute("knowledge-article")}>{a.id}</button></td>
                      <td className="ld-wrap"><span className="ld-strong">{a.title}</span><span className="ld-sub ld-mono">#{a.tag}</span></td>
                      <td><Pill tone="muted">{a.cat}</Pill></td>
                      <td>{userName(a.author)}</td>
                      <td className="ld-mono">{fmt(a.views)}</td>
                      <td className="ld-mono ld-text-ok">{a.rating}</td>
                      <td className="ld-muted">{a.upd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>{articles.length ? "No articles in this category." : "No published articles for this tenant yet."}</Empty>
          )}
        </Panel>

        <aside className="ld-rail" aria-label="Authoring">
          <Panel title="AI Authoring">
            <p className="ld-sd-entry-text">Argus-LinkedEye can draft runbooks from recently resolved incidents.</p>
            <button type="button" className="ld-btn ld-btn-primary">Review drafts</button>
          </Panel>
          <Panel title="Top tags">
            {tags.length ? (
              <ul className="ld-tags ld-sd-tags-start" aria-label="Tags">
                {tags.map(([t, n]) => <li key={t} className="ld-tag">#{t} <span className="ld-muted">{n}</span></li>)}
              </ul>
            ) : (
              <Empty>No tags yet.</Empty>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}

export function KnowledgeArticleScreen() {
  const { setRoute } = useNav();
  const { data } = useArticles();
  const a = (data ?? [])[0];
  const crumbs = (last: string) => (
    <nav className="ld-crumbs" aria-label="Breadcrumb">
      <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
      <Icon icon={ChevronRightIcon} />
      <button type="button" className="ld-link" onClick={() => setRoute("knowledge")}>Knowledge Base</button>
      <Icon icon={ChevronRightIcon} />
      <span>{last}</span>
    </nav>
  );
  if (!a) {
    return (
      <div className="ld-dash">
        {crumbs("Article")}
        <div className="ld-card">
          <Empty>
            <Icon icon={BookOpenIcon} /> <b>No articles</b>
            <br />The knowledge base has no published articles for this tenant.
          </Empty>
        </div>
      </div>
    );
  }
  return (
    <div className="ld-dash">
      {crumbs(a.id)}

      <div className="ld-head ld-entity-head">
        <div className="ld-entity">
          <span className="ld-tile ld-info" aria-hidden="true"><Icon icon={BookOpenIcon} /></span>
          <div>
            <span className="ld-sd-number">{a.id}</span>
            <h1 className="ld-entity-title">
              {a.title}
              <Pill tone="ok"><span className="ld-pill-dot" />Published</Pill>
              <Pill tone="muted">{a.cat}</Pill>
            </h1>
            <p className="ld-entity-meta">
              <span>By {userName(a.author)}</span>
              <span>Updated {a.upd}</span>
              <span>{fmt(a.views)} views</span>
              <span>Rating {a.rating} / 5</span>
            </p>
          </div>
        </div>
        <div className="ld-head-side">
          <div className="ld-head-actions">
            <button type="button" className="ld-btn"><Icon icon={ShareIcon} /> Share</button>
            <button type="button" className="ld-btn"><Icon icon={PencilIcon} /> Edit</button>
            <button type="button" className="ld-btn ld-btn-primary"><Icon icon={PrinterIcon} /> Print</button>
          </div>
        </div>
      </div>

      <div className="ld-split">
        <section className="ld-card ld-panel" aria-label="Article">
          <div className="ld-sd-prose">
            <h3>Symptoms</h3>
            <p>Elevated 5xx response rate on <code>checkout-api</code>, correlated with timeouts against Stripe. p95 latency climbs above 5s, error rate exceeds 10%.</p>
            <h3>Cause</h3>
            <p>The most common trigger is exhaustion of the database connection pool on <code>payments-primary</code>. This leaves checkout-api workers blocked on DB acquisition, exhausting Stripe HTTP client pools.</p>
            <h3>Resolution</h3>
            <ol>
              <li>Confirm via the payments-primary connection pool dashboard.</li>
              <li>If utilization is 100%, run the <code>pool-expansion-v3</code> runbook.</li>
              <li>Roll back any deploy in the last 2 hours that touched pool config.</li>
              <li>Monitor 10 minutes; update status page when recovery holds.</li>
            </ol>
            <div className="ld-sd-callout">
              <b>Tip</b> · Argus-LinkedEye can auto-execute step 2 when this runbook is tagged on an active incident.
            </div>
            <h3>Related</h3>
            <ul>
              <li><span className="ld-mono">KB-2113</span> · How to declare and lead a Sev-1 incident</li>
              <li><span className="ld-mono">PRB-3912</span> · Connection pool sizing regression</li>
            </ul>
          </div>
        </section>

        <aside className="ld-rail" aria-label="Article details">
          <Panel title="Article Properties">
            <dl className="ld-dl">
              <dt>Number</dt><dd className="ld-mono">{a.id}</dd>
              <dt>Category</dt><dd>{a.cat}</dd>
              <dt>Tag</dt><dd className="ld-mono">#{a.tag}</dd>
              <dt>Author</dt><dd>{userName(a.author)}</dd>
              <dt>Updated</dt><dd>{a.upd}</dd>
              <dt>Views</dt><dd>{fmt(a.views)}</dd>
              <dt>Rating</dt><dd className="ld-text-ok">{a.rating} / 5</dd>
              <dt>State</dt><dd><Pill tone="ok"><span className="ld-pill-dot" />Published</Pill></dd>
            </dl>
          </Panel>
          <Panel title="Was this helpful?">
            <div className="ld-sd-actions">
              <button type="button" className="ld-btn"><Icon icon={ThumbsUpIcon} /> Yes</button>
              <button type="button" className="ld-btn"><Icon icon={ThumbsDownIcon} /> No</button>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
