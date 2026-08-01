// Outlined-continent world map panel (LinkedEye dashboard geo view).
// Continents are simplified [lng, lat] polygons projected equirectangularly and
// stroked as outlines on a dark ground; monitored datacenter locations are
// plotted by lat/long as bright, status-coloured, glowing markers.
import React from "react";

// Simplified continent outlines as [lng, lat] rings (coarse, not survey-grade).
const CONTINENTS: [number, number][][] = [
  // North America
  [[-168, 65], [-155, 71], [-128, 70], [-95, 70], [-80, 73], [-60, 60], [-55, 52], [-66, 45], [-70, 41], [-81, 25], [-97, 25], [-106, 22], [-112, 30], [-124, 40], [-125, 48], [-136, 58], [-150, 59], [-168, 65]],
  // Greenland
  [[-45, 60], [-28, 60], [-18, 70], [-24, 80], [-45, 83], [-56, 76], [-50, 68], [-45, 60]],
  // South America
  [[-80, 9], [-60, 11], [-50, 0], [-35, -8], [-40, -23], [-48, -25], [-58, -35], [-66, -42], [-73, -52], [-75, -44], [-70, -18], [-81, -5], [-80, 9]],
  // Africa
  [[-17, 15], [0, 36], [11, 37], [32, 31], [43, 12], [51, 12], [41, -5], [40, -16], [33, -26], [25, -34], [18, -35], [12, -18], [9, 4], [-8, 5], [-17, 15]],
  // Europe
  [[-10, 36], [-8, 44], [0, 49], [2, 51], [-5, 58], [6, 63], [26, 71], [40, 66], [30, 55], [28, 45], [18, 42], [12, 45], [3, 43], [-10, 36]],
  // Asia
  [[40, 66], [60, 69], [100, 76], [140, 73], [145, 60], [135, 47], [140, 45], [130, 35], [122, 30], [120, 22], [106, 10], [96, 6], [80, 8], [72, 20], [60, 25], [46, 38], [35, 42], [28, 45], [30, 55], [40, 66]],
  // Australia
  [[114, -22], [122, -18], [130, -12], [142, -11], [148, -20], [153, -28], [150, -38], [140, -38], [130, -32], [116, -35], [113, -26], [114, -22]],
  // UK
  [[-6, 50], [-2, 52], [-3, 58], [-6, 57], [-8, 54], [-6, 50]],
  // Japan
  [[131, 32], [136, 35], [141, 40], [143, 43], [140, 37], [136, 34], [131, 32]],
  // New Zealand
  [[167, -45], [174, -41], [178, -38], [173, -42], [168, -46], [167, -45]],
];

interface Marker { name: string; lat: number; lng: number; status: "ok" | "warn" | "crit" }
const MARKERS: Marker[] = [
  { name: "Mumbai DC", lat: 19.07, lng: 72.87, status: "crit" },
  { name: "Bangalore DC-1", lat: 12.97, lng: 77.59, status: "warn" },
  { name: "GIFT City · IFSC", lat: 23.16, lng: 72.68, status: "ok" },
  { name: "Singapore edge", lat: 1.35, lng: 103.82, status: "ok" },
  { name: "London LD4", lat: 51.5, lng: -0.12, status: "ok" },
  { name: "New York NY4", lat: 40.71, lng: -74.0, status: "ok" },
];
const COLOR = { ok: "#2ecc71", warn: "#f2a01e", crit: "#e0321c" } as const;

// equirectangular projection to the 360×180 viewBox
const vx = (lng: number) => lng + 180;
const vy = (lat: number) => 90 - lat;
const px = (lng: number) => ((lng + 180) / 360) * 100;
const py = (lat: number) => ((90 - lat) / 180) * 100;

export function WorldMap({ title = "Global Domain Map" }: { title?: string }) {
  return (
    <div style={{ background: "#0e0e0e", border: "1px solid #2b2b2b", borderRadius: 8, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #2b2b2b" }}>
        <span style={{ color: "#f0f0f0", fontWeight: 700, fontSize: 15 }}>{title}</span>
        <span style={{ display: "inline-flex", gap: 14, fontSize: 11.5, color: "#b8b8b8" }}>
          {(["ok", "warn", "crit"] as const).map((s) => (
            <span key={s} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: COLOR[s] }} />
              {s === "ok" ? "Healthy" : s === "warn" ? "Warning" : "Critical"}
            </span>
          ))}
        </span>
      </div>

      <div style={{ position: "relative", width: "100%", aspectRatio: "2 / 1" }}>
        <svg viewBox="0 0 360 180" preserveAspectRatio="xMidYMid meet" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {/* graticule */}
          {[30, 60, 90, 120, 150].map((y) => (
            <line key={"h" + y} x1="0" y1={y} x2="360" y2={y} stroke="#1c1c1c" strokeWidth="0.5" />
          ))}
          {[60, 120, 180, 240, 300].map((x) => (
            <line key={"v" + x} x1={x} y1="0" x2={x} y2="180" stroke="#1c1c1c" strokeWidth="0.5" />
          ))}
          {/* continents */}
          {CONTINENTS.map((ring, i) => (
            <polygon
              key={i}
              points={ring.map(([lng, lat]) => `${vx(lng)},${vy(lat)}`).join(" ")}
              fill="#161b22"
              stroke="#7d8896"
              strokeWidth="0.7"
              strokeLinejoin="round"
            />
          ))}
        </svg>

        {/* DC markers */}
        {MARKERS.map((m) => (
          <div key={m.name} title={`${m.name} · ${m.status}`} style={{ position: "absolute", left: `${px(m.lng)}%`, top: `${py(m.lat)}%`, transform: "translate(-50%,-50%)", zIndex: 2 }}>
            <span style={{ display: "block", width: 9, height: 9, borderRadius: "50%", background: COLOR[m.status], boxShadow: `0 0 0 3px ${COLOR[m.status]}33, 0 0 8px ${COLOR[m.status]}` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
