// People & Roles — LinkedEye layout: people summary cards, the user inventory
// table and a role-distribution rail. Users come from the local seed
// (data/core); there is no directory endpoint yet.
import { useNav } from "@/hooks/useNav";
import { useUiStore } from "@/store/ui";
import { USERS } from "@/data/core";
import { colorFor } from "@/components/Shell";
import { Empty, Panel, Pill, PillDot, StatCard, countBy, fmt } from "@/components/ld";
import { Button, Crumbs, Page, PageHead, Table, cx, ui } from "@/components/ui";
import type { Tone } from "@/components/ld";

import { Icon } from "@/components/Icon";
import { KeyRoundIcon, UserCogIcon, UserPlusIcon } from "lucide-react";
// identity cell (avatar + name / email) — were ld-admin-* classes
const who = "flex items-center gap-2.5 min-w-0";
const whoBody = "flex flex-col items-start gap-px min-w-0";
const avatar = "flex-none w-7 h-7 rounded-full grid place-items-center text-2xs font-bold text-white bg-fg-subtle";

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
    <Page>
      <Crumbs items={[{ label: "Home", onClick: () => setRoute("dashboard") }, { label: tenant.name }, { label: "People & Roles" }]} />

      <PageHead
        title="People & Roles"
        subtitle={<>Who can sign in to {tenant.name}, what role they hold and whether they are in an on-call rotation</>}
        actions={
          <>
            <Button><Icon icon={UserCogIcon} /> Role Matrix</Button>
            <Button variant="primary"><Icon icon={UserPlusIcon} /> Invite People</Button>
          </>
        }
      />

      <div className={cx(ui.grid, ui.cols[5])}>
        <StatCard icon="fa-users" tone="info" label="Total users" value={fmt(USERS.length)} note={`${teams} teams`} />
        <StatCard icon="fa-circle-check" tone="ok" label="Online" value={fmt(online)} note={`${USERS.length - online} away or offline`} />
        <StatCard icon="fa-user-shield" tone="crit" label="Admins" value={fmt(admins)} note="full workspace access" />
        <StatCard icon="fa-bell" tone="purple" label="On-call" value={fmt(rotating)} note="commanders and responders" />
        <StatCard icon="fa-user-gear" tone="muted" label="Roles" value={fmt(roles.length)} note="in use" />
      </div>

      <div className={ui.split}>
        <section className={cx(ui.card, ui.panel)} aria-labelledby="users-h">
          <div className={ui.panelHead}>
            <h2 className={ui.panelTitle} id="users-h">User Inventory</h2>
            <span className="text-fg-muted text-xs">{fmt(USERS.length)} users</span>
          </div>
          {USERS.length ? (
            <Table>
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
                        <div className={who}>
                          <span className={avatar} style={{ background: colorFor(u.color) }} aria-hidden="true">{initials(u.name)}</span>
                          <span className={whoBody}>
                            <span className="font-medium">{u.name}</span>
                            <span className={cx(ui.sub, ui.mono)}>{u.email}</span>
                          </span>
                        </div>
                      </td>
                      <td><Pill tone={ROLE_TONE[u.role] ?? "muted"}>{u.role}</Pill></td>
                      <td>{u.team}</td>
                      <td>{onCall(u.role) ? <Pill tone="info"><PillDot />Rotating</Pill> : <span className="text-fg-muted">—</span>}</td>
                      <td><Pill tone="muted"><Icon icon={KeyRoundIcon} /> SSO</Pill></td>
                      <td>{u.last}</td>
                      <td><Pill tone={STATUS_TONE[u.status] ?? "muted"}><PillDot />{u.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </Table>
          ) : (
            <Empty>No users in this workspace yet.</Empty>
          )}
        </section>

        <div className={ui.rail}>
          <Panel title="Role Distribution">
            <ul className={ui.bars}>
              {roles.map(([role, n]) => (
                <li key={role} className={ui.barItem}>
                  <span className={ui.barLabel}>{role}</span>
                  <span className={ui.barTrack}><span className={ui.barFill} style={{ width: `${(n / roleMax) * 100}%`, background: "var(--accent)" }} /></span>
                  <span className={ui.barValue}>{n}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <p className="text-fg-muted text-xs">Sample user directory — identity provisioning is not connected to the backend yet.</p>
    </Page>
  );
}
