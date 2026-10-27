// LinkedEye UI building blocks in Tailwind. Each reproduces what the old ld-*
// CSS class did, using the theme tokens in tailwind.config.js (so light / dark
// and the accent tweak keep working). Use the components for interactive and
// repeated pieces; use the `ui` class strings when the markup has to stay a
// plain element (a <ul>, an <li>, a span inside a table cell).
//
// Table / definition-list cell defaults are applied with :where(), so a class
// on a single <td> or <dd> overrides them without `!`.
import React from "react";
import { ChevronRightIcon } from "lucide-react";
import { Icon } from "@/components/Icon";

export type Tone = "crit" | "warn" | "ok" | "info" | "purple" | "muted";

/** Join class names, skipping falsy values. */
export const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(" ");

const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2";

/** Soft background + ink per tone (pills, tiles). "muted" is ink only on tiles, grey on pills. */
export const toneBg: Record<Tone, string> = {
  crit: "bg-tone-crit-soft text-tone-crit",
  warn: "bg-tone-warn-soft text-tone-warn",
  ok: "bg-tone-ok-soft text-tone-ok",
  info: "bg-tone-info-soft text-tone-info",
  purple: "bg-tone-purple-soft text-tone-purple",
  muted: "text-fg-muted",
};
/** Bold status text (was ld-text-ok / ld-text-crit / ld-text-warn …). */
export const toneText: Record<Tone, string> = {
  crit: "text-tone-crit font-semibold",
  warn: "text-tone-warn font-semibold",
  ok: "text-tone-ok font-semibold",
  info: "text-accent",
  purple: "text-tone-purple",
  muted: "text-fg-muted",
};

export const ui = {
  // page
  page: "flex flex-col gap-4 max-w-[1600px] px-6 pt-4.5 pb-8 max-sm:px-4 max-sm:pt-3.5 max-sm:pb-6",
  head: "flex flex-wrap items-end justify-between gap-3",
  h1: "text-5xl font-bold tracking-[-0.02em] text-fg",
  headSub: "text-base text-fg-muted mt-1",
  headActions: "flex flex-wrap items-center gap-2.5",
  headSide: "flex flex-col items-end gap-2.5 min-w-0 max-[720px]:items-start",
  crumbs: "flex items-center gap-2 text-sm text-fg-muted [&_.ld-icon]:text-[10px]",
  // surfaces
  card: "bg-bg-raised border border-line rounded-lg shadow-sm",
  panel: "flex flex-col gap-2.5 min-w-0 px-4.5 py-3.5",
  panelHead: "flex items-center justify-between gap-2",
  panelTitle: "text-lg font-semibold text-fg",
  // layout
  grid: "grid gap-3.5",
  cols: {
    stats: "grid-cols-[repeat(auto-fit,minmax(230px,1fr))]",
    2: "grid-cols-[repeat(auto-fit,minmax(340px,1fr))]",
    3: "grid-cols-[repeat(auto-fit,minmax(340px,1fr))] max-sm:grid-cols-1",
    5: "grid-cols-[repeat(auto-fit,minmax(200px,1fr))]",
    6: "grid-cols-[repeat(auto-fit,minmax(180px,1fr))]",
    tables: "grid-cols-[repeat(auto-fit,minmax(340px,1fr))] min-[1360px]:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)_minmax(0,1fr)] max-sm:grid-cols-1",
  },
  split: "grid grid-cols-1 gap-3.5 items-start xl:grid-cols-[minmax(0,1fr)_320px]",
  splitWide: "grid grid-cols-1 gap-3.5 items-start xl:grid-cols-[minmax(0,1fr)_420px]",
  rail: "flex flex-col gap-3.5 min-w-0",
  toolbar: "flex flex-wrap items-center gap-2.5",
  filters: "flex flex-wrap items-end gap-3 px-4.5 py-3.5",
  // text
  mono: "font-mono text-xs font-semibold",
  sub: "block text-xs text-fg-muted",
  link: cx("border-0 bg-transparent p-0 text-sm font-medium text-accent cursor-pointer hover:underline", focusRing),
  req: "text-tone-crit",
  // tables
  tableWrap: "overflow-x-auto -mx-1",
  table: cx(
    "w-full border-collapse",
    "[:where(&)_th]:text-left [:where(&)_th]:text-xs [:where(&)_th]:font-semibold [:where(&)_th]:text-fg-muted [:where(&)_th]:px-2.5 [:where(&)_th]:py-2 [:where(&)_th]:bg-bg-muted [:where(&)_th]:whitespace-nowrap",
    "[:where(&)_td]:px-2.5 [:where(&)_td]:py-[9px] [:where(&)_td]:text-sm [:where(&)_td]:text-fg [:where(&)_td]:border-b [:where(&)_td]:border-line-subtle [:where(&)_td]:whitespace-nowrap",
    "[:where(&)_tr:last-child_td]:border-b-0",
  ),
  /** a table cell that may wrap (was td.ld-wrap) */
  cellWrap: "whitespace-normal min-w-[120px]",
  rowSelected: "[&>td]:bg-info-bg",
  // forms
  form: "flex flex-col gap-2.5",
  field: "flex flex-col gap-1 text-xs text-fg-muted",
  /** filter-bar field: keeps a minimum width (was ld-field); add fieldGrow to stretch */
  filterField: "flex flex-col gap-1 text-xs text-fg-muted min-w-[150px]",
  fieldGrow: "flex-[1_1_200px]",
  input: cx("min-h-[38px] px-2.5 border border-line-strong rounded bg-bg-raised text-fg text-sm", "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"),
  select: cx("min-h-[38px] px-2.5 border border-line-strong rounded bg-bg-raised text-fg text-sm", focusRing),
  textarea: cx("min-h-[76px] px-2.5 py-2 border border-line-strong rounded bg-bg-raised text-fg text-sm resize-y leading-[1.4]", "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-1"),
  search: "flex items-center gap-2 min-h-[38px] px-3 border border-line-strong rounded bg-bg-raised text-fg-muted focus-within:outline focus-within:outline-2 focus-within:outline-accent focus-within:outline-offset-2",
  searchInput: "flex-1 min-w-0 border-0 bg-transparent text-sm text-fg outline-none focus:outline-none",
  // lists
  dl: "grid grid-cols-[minmax(110px,140px)_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm [:where(&)_dt]:text-fg-muted [:where(&)_dd]:text-fg [:where(&)_dd]:m-0 [:where(&)_dd]:[overflow-wrap:anywhere]",
  activity: "list-none flex flex-col gap-2.5",
  activityItem: "flex items-center gap-2.5 text-sm",
  activityText: "flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-fg",
  bars: "list-none flex flex-col gap-3",
  barItem: "grid grid-cols-[minmax(110px,160px)_minmax(0,1fr)_36px] items-center gap-2.5 text-sm",
  barItemWide: "grid grid-cols-[minmax(110px,160px)_minmax(0,1fr)_72px] items-center gap-2.5 text-sm",
  barLabel: "text-fg-muted overflow-hidden text-ellipsis whitespace-nowrap",
  barTrack: "h-2.5 rounded-[5px] bg-bg-muted overflow-hidden",
  barFill: "block h-2.5 rounded-[5px]",
  barValue: "font-semibold text-right text-fg",
  tags: "list-none flex flex-wrap justify-end gap-1.5 m-0 p-0 max-[720px]:justify-start",
  tag: "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-[5px] rounded-[6px] border border-line bg-bg-muted text-fg [&_.ld-icon]:text-accent",
  dot: "inline-block w-[9px] h-[9px] rounded-full",
  pillDot: "w-[7px] h-[7px] rounded-full bg-current",
  // misc
  empty: "py-7 px-2 text-center text-sm text-fg-muted",
  /** card body for "not connected" / "admins only" style notices (was ld-metrics-off) */
  notice: "flex items-start gap-3.5 p-4.5 [&_.ld-icon]:text-3xl [&_.ld-icon]:text-[#8a4b00] [&_.ld-icon]:mt-0.5 [&_b]:text-fg",
  pager: "flex flex-wrap items-center justify-between gap-2.5 pt-1.5",
  pagerBtns: "flex flex-wrap gap-1",
  live: "inline-flex items-center gap-1 ml-2 text-tone-ok",
} as const;

// ── Components ──────────────────────────────────────────────────────────────

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "primary";
  size?: "md" | "sm";
};

export const buttonClass = (variant: ButtonProps["variant"] = "default", size: ButtonProps["size"] = "md") =>
  cx(
    "inline-flex items-center justify-center gap-1.5 border rounded font-semibold cursor-pointer whitespace-nowrap no-underline",
    "disabled:opacity-[0.45] disabled:cursor-default",
    focusRing,
    size === "sm" ? "min-h-[30px] px-2.5 text-xs" : "min-h-[38px] px-3.5 text-sm",
    variant === "primary"
      ? "bg-accent border-accent text-white hover:enabled:brightness-95"
      : "bg-bg-raised border-line-strong text-fg hover:enabled:bg-bg-hover",
  );

/** Button (was ld-btn / ld-btn-primary / ld-btn-sm). Defaults to type="button". */
export function Button({ variant, size, className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={cx(buttonClass(variant, size), className)} {...rest} />;
}

/** Text-style button (was ld-link). */
export function TextButton({ className, type = "button", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={cx(ui.link, className)} {...rest} />;
}

/** Card surface (was ld-card). */
export function Card<T extends React.ElementType = "div">({ as, className, ...rest }: { as?: T; className?: string } & React.ComponentPropsWithoutRef<T>) {
  const C = (as ?? "div") as React.ElementType;
  return <C className={cx(ui.card, className)} {...rest} />;
}

/** Page wrapper (was ld-dash). */
export function Page({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx(ui.page, className)} {...rest} />;
}

/** Page title row (was ld-head): title + one-line description on the left, actions on the right. */
export function PageHead({ title, subtitle, actions, className }: {
  title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cx(ui.head, className)}>
      <div>
        <h1 className={ui.h1}>{title}</h1>
        {subtitle && <p className={ui.headSub}>{subtitle}</p>}
      </div>
      {actions && <div className={ui.headActions}>{actions}</div>}
    </div>
  );
}

/** Breadcrumb nav (was ld-crumbs). Items with onClick render as links; the last is plain text. */
export function Crumbs({ items }: { items: { label: React.ReactNode; onClick?: () => void }[] }) {
  return (
    <nav className={ui.crumbs} aria-label="Breadcrumb">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronSep />}
          {it.onClick ? <TextButton onClick={it.onClick}>{it.label}</TextButton> : <span>{it.label}</span>}
        </React.Fragment>
      ))}
    </nav>
  );
}

function ChevronSep() {
  return <Icon icon={ChevronRightIcon} />;
}

/** Table with the standard header / cell styling (was ld-table-wrap > ld-table). */
export function Table({ className, wrapClassName, ...rest }: React.TableHTMLAttributes<HTMLTableElement> & { wrapClassName?: string }) {
  return (
    <div className={cx(ui.tableWrap, wrapClassName)}>
      <table className={cx(ui.table, className)} {...rest} />
    </div>
  );
}

/** Tab strip (was ld-tabs / ld-tab). */
export function Tabs({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div role="tablist" className={cx("flex flex-wrap gap-1 border-b border-line", className)} {...rest} />;
}
export function Tab({ active, className, type = "button", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { active: boolean }) {
  return (
    <button
      type={type}
      role="tab"
      aria-selected={active}
      className={cx(
        "border-0 border-b-2 bg-transparent text-base px-3.5 py-2.5 -mb-px cursor-pointer",
        focusRing,
        active ? "text-accent border-accent font-semibold" : "text-fg-muted border-transparent hover:text-fg",
        className,
      )}
      {...rest}
    />
  );
}

/** Labelled form control wrapper (was ld-form-field / ld-field). */
export function Field({ label, htmlFor, required, className, children }: {
  label: React.ReactNode; htmlFor: string; required?: boolean; className?: string; children: React.ReactNode;
}) {
  return (
    <label className={cx(ui.field, className)} htmlFor={htmlFor}>
      <span>{label}{required && <span className={ui.req}> *</span>}</span>
      {children}
    </label>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...rest }, ref) => <input ref={ref} className={cx(ui.input, className)} {...rest} />,
);
Input.displayName = "Input";
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...rest }, ref) => <select ref={ref} className={cx(ui.select, className)} {...rest} />,
);
Select.displayName = "Select";
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...rest }, ref) => <textarea ref={ref} className={cx(ui.textarea, className)} {...rest} />,
);
Textarea.displayName = "Textarea";

/** Search box with a leading icon (was ld-search). */
export function SearchBox({ icon, className, inputClassName, ...rest }: React.InputHTMLAttributes<HTMLInputElement> & { icon?: React.ReactNode; inputClassName?: string }) {
  return (
    <span className={cx(ui.search, className)}>
      {icon}
      <input className={cx(ui.searchInput, inputClassName)} {...rest} />
    </span>
  );
}

const TILE_SIZE = {
  lg: "w-14 h-14 rounded-[12px] text-3xl",
  md: "w-11 h-11 rounded-[12px] text-2xl",
  sm: "w-7 h-7 rounded-[8px] text-xs",
} as const;

/** Icon tile (was ld-tile / ld-tile-md / ld-tile-sm + tone). */
export function Tile({ tone = "info", size = "lg", className, children, style }: {
  tone?: Tone; size?: keyof typeof TILE_SIZE; className?: string; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <span className={cx("flex-none grid place-items-center", TILE_SIZE[size], toneBg[tone], className)} style={style} aria-hidden="true">
      {children}
    </span>
  );
}
