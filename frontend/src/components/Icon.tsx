// Icons: Lucide (lucide-react).
//
//   <Icon icon={ServerIcon} />                   static: import the Lucide icon
//   <Icon name={kind.icon} />                    a name held in data ("fa-server" / "server")
//   <Icon className={`fa-solid ${x} ld-foo`} />  a class string: the fa-* token names the
//                                                icon, other tokens stay as classes
//
// Named icons resolve through components/iconRegistry.ts, loaded as its own
// chunk; until it arrives (first paint only) a 1em blank holds the space.
// The SVG is 1em square and uses currentColor, so CSS font-size and color size
// and tint it. It has class "ld-icon" and data-icon="<lucide-name>", and is
// aria-hidden unless it has a title or aria-label.
import React from "react";
import type { LucideIcon } from "lucide-react";

type Registry = Record<string, LucideIcon>;
let registry: Registry | null = null;
const listeners = new Set<() => void>();
const loading = import("./iconRegistry").then((m) => {
  registry = m.ICONS;
  listeners.forEach((l) => l());
});
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const useRegistry = () => React.useSyncExternalStore(subscribe, () => registry, () => registry);
/** Resolves once named icons can render (tests, screenshots). */
export const iconsReady = loading;

const STYLE_TOKENS = new Set(["fa-solid", "fa-regular", "fa-brands", "fa-fw"]);

/** Split a legacy class string: "fa-solid fa-rotate fa-spin x" → rotate, spin, "x". */
function parse(className: string): { name?: string; rest: string; spin: boolean } {
  let name: string | undefined;
  const rest: string[] = [];
  let spin = false;
  for (const t of className.split(/\s+/)) {
    if (!t || STYLE_TOKENS.has(t)) continue;
    if (t === "fa-spin") spin = true;
    else if (!name && t.startsWith("fa-")) name = t.slice(3);
    else rest.push(t);
  }
  return { name, rest: rest.join(" "), spin };
}

const kebab = (s: string) => s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([A-Za-z])(\d)/g, "$1-$2").toLowerCase();

type IconProps = Omit<React.SVGProps<SVGSVGElement>, "ref" | "name"> & {
  icon?: LucideIcon;
  name?: string;
  className?: string;
  title?: string;
  spin?: boolean;
  strokeWidth?: number;
};

export function Icon({ icon, name, className = "", title, spin, strokeWidth = 2, ...rest }: IconProps) {
  const reg = useRegistry();
  const parsed = parse(className);
  let Comp: LucideIcon | undefined = icon;
  if (!Comp) {
    const key = (name ?? parsed.name ?? "").replace(/^fa-/, "");
    Comp = reg?.[key] ?? (reg ? reg["circle-question"] : undefined);
    if (import.meta.env.DEV && reg && !reg[key]) console.warn(`Icon: no Lucide icon for "${key}"`);
  }
  const cls = ["ld-icon", parsed.rest, spin || parsed.spin ? "animate-spin" : ""].filter(Boolean).join(" ");
  if (!Comp) return <span className={cls} aria-hidden="true" />;
  const labelled = !!(title || rest["aria-label"]);
  return (
    <Comp
      size="1em"
      strokeWidth={strokeWidth}
      className={cls}
      data-icon={kebab(Comp.displayName ?? "")}
      aria-hidden={labelled ? undefined : true}
      role={labelled ? "img" : undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
    </Comp>
  );
}
