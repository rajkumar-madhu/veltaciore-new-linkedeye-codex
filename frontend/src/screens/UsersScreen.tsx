// People & Roles — LinkedEye layout: people summary cards, the user inventory
// table and a role-distribution rail. Users come from the local seed
// (data/core); there is no directory endpoint yet.
import "@/styles/admin.css";
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { USERS } from "@/data/core";
import { colorFor } from "@/components/Shell";
import { Empty, Panel, Pill, StatCard, countBy, fmt } from "@/components/ld";
import type { Tone } from "@/components/ld";

const ROLE_TONE: Record<string, Tone> = {
  Admin: "crit",
  "Incident Commander": "purple",
  Manager: "warn",
  Responder: "info",
  Viewer: "muted",
};
const STATUS_TONE: Record<string, Tone> = { online: "ok", away: "warn" };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

const onCall = (role: string) => role === "Incident Commander" || role === "Responder";

export default function UsersScreen() {
  const { setRoute } = useNav();
  const tenant = useUiStore((s) => s.tenant);

  const roles = countBy(USERS, (u) => u.role);
  const teams = new Set(USERS.map((u) => u.team)).size;
  const online = USERS.filter((u) => u.status === "online").length;
  const admins = USERS.filter((u) => u.role === "Admin").length;
  const rotating = USERS.filter((u) => onCall(u.role)).length;
  const roleMax = roles[0]?.[1] || 1;

  return (
    <div className="ld-dash">
      <nav className="ld-crumbs" aria-label="Breadcrumb">
        <button type="button" className="ld-link" onClick={() => setRoute("dashboard")}>Home</button>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>{tenant.name}</span>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
        <span>People &amp; Roles</span>
      </nav>

      <div className="ld-head">
        <div>
          <h1>People &amp; Roles</h1>
          <p>Who can sign in to {tenant.name}, what role they hold and whether they are in an on-call rotation</p>
        </div>
        <div className="ld-head-actions">
          <button type="button" className="ld-btn"><i className="fa-solid fa-user-gear" aria-hidden="true" /> Role Matrix</button>
          <button type="button" className="ld-btn ld-btn-primary"><i className="fa-solid fa-user-plus" aria-hidden="true" /> Invite People</button>
        </div>
      </div>

      <div className="ld-grid ld-grid-5">
        <StatCard icon="fa-users" tone="info" label="Total users" value={fmt(USERS.length)} note={`${teams} teams`} />
        <StatCard icon="fa-circle-check" tone="ok" label="Online" value={fmt(online)} note={`${USERS.length - online} away or offline`} />
        <StatCard icon="fa-user-shield" tone="crit" label="Admins" value={fmt(admins)} note="full workspace access" />
        <StatCard icon="fa-bell" tone="purple" label="On-call" value={fmt(rotating)} note="commanders and responders" />
        <StatCard icon="fa-user-gear" tone="muted" label="Roles" value={fmt(roles.length)} note="in use" />
      </div>

      <div className="ld-split">
        <section className="ld-card ld-panel" aria-labelledby="users-h">
          <div className="ld-panel-head">
            <h2 id="users-h">User Inventory</h2>
            <span className="ld-muted ld-small">{fmt(USERS.length)} users</span>
          </div>
          {USERS.length ? (
            <div className="ld-table-wrap">
              <table className="ld-table">
                <thead>
                  <tr>
                    <th scope="col">User</th>
                    <th scope="col">Role</th>
                    <th scope="col">Team</th>
                    <th scope="col">On-call</th>
                    <th scope="col">Auth</th>
                    <th scope="col">Last active</th>
                    <th scope="col">State</th>
                  </tr>
                </thead>
                <tbody>
                  {USERS.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="ld-admin-who">
                          <span className="ld-admin-avatar" style={{ background: colorFor(u.color) }} aria-hidden="true">{initials(u.name)}</span>
                          <span className="ld-admin-who-body">
                            <span className="ld-strong">{u.name}</span>
                            <span className="ld-sub ld-mono">{u.email}</span>
                          </span>
                        </div>
                      </td>
                      <td><Pill tone={ROLE_TONE[u.role] ?? "muted"}>{u.role}</Pill></td>
                      <td>{u.team}</td>
                      <td>{onCall(u.role) ? <Pill tone="info"><span className="ld-pill-dot" />Rotating</Pill> : <span className="ld-muted">—</span>}</td>
                      <td><Pill tone="muted"><i className="fa-solid fa-key" aria-hidden="true" /> SSO</Pill></td>
                      <td className="ld-muted">{u.last}</td>
                      <td><Pill tone={STATUS_TONE[u.status] ?? "muted"}><span className="ld-pill-dot" />{u.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty>No users in this workspace yet.</Empty>
          )}
        </section>

        <div className="ld-rail">
          <Panel title="Role Distribution">
            <ul className="ld-bars">
              {roles.map(([role, n]) => (
                <li key={role}>
                  <span className="ld-bar-label">{role}</span>
                  <span className="ld-bar-track"><span className="ld-bar-fill" style={{ width: `${(n / roleMax) * 100}%`, background: "var(--accent)" }} /></span>
                  <span className="ld-bar-value">{n}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <p className="ld-muted ld-small">Sample user directory — identity provisioning is not connected to the backend yet.</p>
    </div>
  );
}
