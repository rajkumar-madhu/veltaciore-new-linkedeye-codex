// Knowledge base in ServiceNow form-style.
// Ported from screens/knowledge.jsx.
import React from "react";
import { useNav } from "@/hooks/useNav";
import { Kpi, FormSection, Field, UserById } from "@/components/primitives";
import { useArticles } from "@/api/hooks";
import { ARTICLES } from "@/data/itsm";
import { USERS } from "@/data/core";

export default function KnowledgeScreen() {
  const { setRoute } = useNav();
  const { data } = useArticles();
  const articles = data ?? [];
  const [cat, setCat] = React.useState("all");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const toggle = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  const filtered = cat === "all" ? articles : articles.filter(a => a.cat.toLowerCase() === cat);

  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link">Home</a><span className="sn-bc-sep">›</span>
        <a className="sn-link">Knowledge Management</a><span className="sn-bc-sep">›</span>
        <span>Articles</span>
      </div>

      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">KB</span>
          <span className="sn-pill state-progress"><i className="fa-solid fa-spinner fa-spin" /> {articles.length} articles</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-book" /> 4 categories</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>Knowledge Base</h1>
            <div className="sn-form-sub">{articles.reduce((s,a) => s + a.views, 0).toLocaleString()} views · AI-assisted authoring · {articles.filter(a => a.cat === "Runbooks").length} runbooks published</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-robot" /> Generate from Incident</button>
            <button className="sn-btn primary"><i className="fa-solid fa-plus" /> New Article</button>
          </div>
        </div>
      </div>

      <div className="sn-kpi-strip">
        <Kpi l="Total articles" v={articles.length} s="published" tone="neutral" />
        <Kpi l="Runbooks" v={articles.filter(a => a.cat === "Runbooks").length} s="operational" tone="ok" />
        <Kpi l="Known errors" v={articles.filter(a => a.cat === "Known errors").length} s="documented" tone="warn" />
        <Kpi l="Avg rating" v="4.6 / 5" s="from users" tone="ok" />
        <Kpi l="Views (30d)" v={(articles.reduce((s,a) => s + a.views, 0) / 1000).toFixed(1) + "k"} s="engagement" tone="neutral" />
        <Kpi l="Stale > 90d" v="2" s="needs review" tone="warn" />
      </div>

      <div className="sn-form-layout">
        <div className="sn-form-main">
          <FormSection id="cats" title="Categories" collapsed={collapsed.cats} onToggle={toggle}>
            <div className="sn-kind-grid">
              {[
                ["Runbooks","runbooks","fa-book","#2563eb"],
                ["Process","process","fa-diagram-project","#8b5cf6"],
                ["Onboarding","onboarding","fa-door-open","#10b981"],
                ["Known errors","known errors","fa-bug","#f59e0b"],
              ].map(([l, id, ic, col]) => {
                const n = articles.filter(a => a.cat.toLowerCase() === id).length;
                return (
                  <div key={id} className="sn-kind-card" onClick={() => setCat(cat === id ? "all" : id)} style={{ borderLeft: cat === id ? `3px solid ${col}` : "" }}>
                    <div className="sn-kind-icon" style={{ color: col, background: col + "14" }}><i className={`fa-solid ${ic}`} /></div>
                    <div className="sn-kind-body">
                      <div className="sn-kind-count">{n}</div>
                      <div className="sn-kind-label">{l}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </FormSection>

          <FormSection id="articles" title={cat === "all" ? "All Articles" : cat} badge={`${filtered.length} items`} collapsed={collapsed.articles} onToggle={toggle}>
            <table className="sn-list-table">
              <thead><tr><th style={{width:90}}>Number</th><th>Title</th><th style={{width:120}}>Category</th><th style={{width:130}}>Author</th><th style={{width:90}}>Views</th><th style={{width:80}}>Rating</th><th style={{width:120}}>Updated</th></tr></thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} onClick={() => setRoute("knowledge-article")} style={{ cursor: "pointer" }}>
                    <td><a className="sn-link mono"><b>{a.id}</b></a></td>
                    <td><b>{a.title}</b><div className="text-mute mono" style={{ fontSize: 11, marginTop: 2 }}>#{a.tag}</div></td>
                    <td><span className="sn-state-pill state-neutral"><i className="fa-solid fa-circle" /> {a.cat}</span></td>
                    <td><UserById id={a.author} /></td>
                    <td className="mono">{a.views.toLocaleString()}</td>
                    <td className="mono tone-ok"><b>{a.rating}</b></td>
                    <td className="text-mute" style={{ fontSize: 11.5 }}>{a.upd}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </FormSection>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">AI Authoring</div>
            <div className="sn-side-body" style={{ padding: 14 }}>
              <div style={{ fontSize: 12.5, color: "#000", lineHeight: 1.6 }}>Based on your last 4 resolved incidents, Argus-LinkedEye can draft 2 new runbooks.</div>
              <button className="sn-btn primary" style={{ marginTop: 10, width: "100%", justifyContent: "center" }}>Review drafts</button>
            </div>
          </div>
          <div className="sn-side-card">
            <div className="sn-side-head">Trending Tags</div>
            <div className="sn-side-body" style={{ padding: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {["payments","k8s","incident","database","auth","postmortem","on-call","chatops","cdn"].map(t => (
                <span key={t} className="sn-state-pill state-neutral" style={{ fontSize: 11 }}>#{t}</span>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export function KnowledgeArticleScreen() {
  const { setRoute } = useNav();
  const { data } = useArticles();
  const a = (data ?? [])[0];
  if (!a) {
    return (
      <div className="page page-fade sn-dash">
        <div className="sn-breadcrumb">
          <a className="sn-link" onClick={() => setRoute("knowledge")}>Knowledge Base</a><span className="sn-bc-sep">›</span>
          <span>Article</span>
        </div>
        <div className="sn-empty" style={{ margin: 24 }}>
          <i className="fa-solid fa-book-open" /><h4>No articles</h4>
          <p>The knowledge base has no published articles for this tenant.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="page page-fade sn-dash">
      <div className="sn-breadcrumb">
        <a className="sn-link" onClick={() => setRoute("knowledge")}>Knowledge Base</a><span className="sn-bc-sep">›</span>
        <span>{a.id}</span>
      </div>
      <div className="sn-form-header">
        <div className="sn-form-title-row">
          <span className="sn-rec-number">{a.id}</span>
          <span className="sn-pill svc-healthy" style={{ background: "#ecfdf3", color: "#027a48" }}><i className="fa-solid fa-circle" /> Published</span>
          <span className="sn-pill state-neutral"><i className="fa-solid fa-circle" /> {a.cat}</span>
        </div>
        <div className="sn-form-title-meta">
          <div>
            <h1>{a.title}</h1>
            <div className="sn-form-sub">By {USERS.find(u => u.id === a.author)?.name} · updated {a.upd} · {a.views.toLocaleString()} views · ★ {a.rating}</div>
          </div>
          <div className="sn-form-actions">
            <button className="sn-btn"><i className="fa-solid fa-share" /> Share</button>
            <button className="sn-btn"><i className="fa-solid fa-pen" /> Edit</button>
            <button className="sn-btn primary"><i className="fa-solid fa-print" /> Print</button>
          </div>
        </div>
      </div>
      <div className="sn-form-layout">
        <div className="sn-form-main">
          <div className="sn-form-section">
            <div className="sn-section-content">
              <div style={{ padding: "20px 28px", maxWidth: 820, fontSize: 14, lineHeight: 1.75, color: "#000" }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: "16px 0 8px" }}>Symptoms</h3>
                <p>Elevated 5xx response rate on <code style={{ background: "#eaf0f7", padding: "1px 6px", borderRadius: 3, fontFamily: "var(--font-mono)", fontSize: 12.5, color: "#c62828" }}>checkout-api</code>, correlated with timeouts against Stripe. p95 latency climbs above 5s, error rate exceeds 10%.</p>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: "20px 0 8px" }}>Cause</h3>
                <p>The most common trigger is exhaustion of the database connection pool on <code style={{ background: "#eaf0f7", padding: "1px 6px", borderRadius: 3, fontFamily: "var(--font-mono)", fontSize: 12.5, color: "#c62828" }}>payments-primary</code>. This leaves checkout-api workers blocked on DB acquisition, exhausting Stripe HTTP client pools.</p>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: "20px 0 8px" }}>Resolution</h3>
                <ol style={{ paddingLeft: 22 }}>
                  <li>Confirm via <a className="sn-link">payments-primary connection pool dashboard</a>.</li>
                  <li>If utilization is 100%, run <a className="sn-link">pool-expansion-v3</a> runbook.</li>
                  <li>Roll back any deploy in the last 2 hours that touched pool config.</li>
                  <li>Monitor 10 minutes; update status page when recovery holds.</li>
                </ol>
                <div style={{ background: "#eaf0f7", borderLeft: "3px solid #016", padding: "12px 16px", borderRadius: 3, margin: "20px 0", fontSize: 13 }}>
                  <b>Tip</b> · Argus-LinkedEye can auto-execute step 2 when this runbook is tagged on an active incident.
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, margin: "20px 0 8px" }}>Related</h3>
                <ul style={{ paddingLeft: 22 }}>
                  <li><a className="sn-link">KB-2113</a> · How to declare and lead a Sev-1 incident</li>
                  <li><a className="sn-link">PRB-3912</a> · Connection pool sizing regression</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <aside className="sn-form-side">
          <div className="sn-side-card">
            <div className="sn-side-head">Article Properties</div>
            <div className="sn-side-body">
              <Field label="Number" value={<span className="mono">{a.id}</span>} />
              <Field label="Category" value={a.cat} />
              <Field label="Tag" value={<span className="mono">#{a.tag}</span>} />
              <Field label="Author" value={<UserById id={a.author} />} />
              <Field label="Updated" value={a.upd} />
              <Field label="Views" value={a.views.toLocaleString()} />
              <Field label="Rating" value={<span className="tone-ok"><b>{a.rating}</b> / 5</span>} />
              <Field label="State" value={<span className="sn-state-pill svc-healthy"><i className="fa-solid fa-circle" /> Published</span>} />
            </div>
          </div>
          <div className="sn-side-card">
            <div className="sn-side-head">Was this helpful?</div>
            <div className="sn-side-body" style={{ padding: 14 }}>
              <div className="row row-8">
                <button className="sn-btn" style={{ flex: 1 }}><i className="fa-solid fa-thumbs-up" /> Yes</button>
                <button className="sn-btn" style={{ flex: 1 }}><i className="fa-solid fa-thumbs-down" /> No</button>
              </div>
              <div className="text-mute" style={{ fontSize: 11, marginTop: 10 }}>96% found this helpful · 184 ratings</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
