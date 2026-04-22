// Shared Stage mock — projection area with room overlays.
// Multi-animation aware: each room can have many animations stacked.
// activeMap: { [roomId]: [{ name, icon, color }, ...] }

const ROOMS_MOCK = [
  { id:"br", name:"Bridge",        points:"520,60 740,60 740,200 520,200", cx:630, cy:130 },
  { id:"eg", name:"Engine Room",   points:"280,60 500,60 500,200 280,200", cx:390, cy:130 },
  { id:"bc", name:"Brood Chamber", points:"60,210 300,210 300,400 60,400", cx:180, cy:305 },
  { id:"lb", name:"Laboratory",    points:"310,210 560,210 560,400 310,400", cx:435, cy:305 },
  { id:"md", name:"Med Bay",       points:"580,210 820,210 820,400 580,400", cx:700, cy:305 },
  { id:"ca", name:"Cargo Hold",    points:"200,410 530,410 530,620 200,620", cx:365, cy:515 },
  { id:"ag", name:"Generator",     points:"540,410 860,410 860,620 540,620", cx:700, cy:515 },
];

function RoomStage({ selected, active = new Set(), onSelect, onClear, activeMap = null, clearMode = false }) {
  return (
    <div className="rd-stage">
      <svg viewBox="0 0 1000 684" preserveAspectRatio="none"
           style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {ROOMS_MOCK.map(r => {
          const isSel = selected === r.id;
          const isActive = active.has(r.id);
          const stack = (activeMap && activeMap[r.id]) || [];
          const leadColor = stack[0]?.color;

          const fill = isActive
            ? (leadColor ? `color-mix(in oklch, ${leadColor} 18%, transparent)` : "var(--c-accent-bg)")
            : isSel ? "var(--c-room-bg)" : "transparent";
          const stroke = isActive
            ? (leadColor || "var(--c-accent)")
            : clearMode ? "var(--c-danger)"
            : isSel ? "var(--c-room)" : "var(--c-border-str)";
          const sw = isSel || isActive ? 2 : clearMode ? 1.5 : 1;
          const textFill = isActive
            ? (leadColor || "var(--c-accent)")
            : isSel ? "var(--c-room)" : "var(--c-text-2)";

          return (
            <g key={r.id} style={{ cursor: onSelect ? "pointer" : "default" }}
               onClick={() => onSelect && onSelect(r.id)}>
              <polygon points={r.points} fill={fill} stroke={stroke} strokeWidth={sw}
                       vectorEffect="non-scaling-stroke"
                       strokeDasharray={clearMode && !isActive ? "4 4" : undefined}/>
              <text x={r.cx} y={r.cy + (stack.length ? -10 : 5)}
                    style={{ fontFamily: "var(--rd-font-body)", fontWeight: 500, fontSize: 16,
                             fill: textFill, textAnchor: "middle", letterSpacing: "-0.01em",
                             pointerEvents: "none" }}>
                {r.name}
              </text>

              {/* Stacked animations — one pill per anim */}
              {stack.slice(0, 3).map((a, i) => (
                <g key={i} transform={`translate(${r.cx}, ${r.cy + 6 + i * 18})`} pointerEvents="none">
                  <rect x={-52} y={-9} width={104} height={18} rx={9}
                        fill={`color-mix(in oklch, ${a.color} 22%, var(--c-bg-raised))`}
                        stroke={a.color} strokeOpacity="0.6" strokeWidth="1" vectorEffect="non-scaling-stroke"/>
                  <circle cx={-38} cy={0} r={3} fill={a.color}/>
                  <text x={-30} y={4}
                        style={{ fontFamily: "var(--rd-font-body)", fontWeight: 500, fontSize: 11,
                                 fill: a.color, letterSpacing: "-0.005em" }}>
                    {a.name.length > 14 ? a.name.slice(0, 13) + "…" : a.name}
                  </text>
                </g>
              ))}
              {stack.length > 3 && (
                <text x={r.cx} y={r.cy + 6 + 3 * 18 + 4}
                      style={{ fontFamily: "var(--rd-font-body)", fontWeight: 500, fontSize: 11,
                               fill: "var(--c-text-3)", textAnchor: "middle", pointerEvents: "none" }}>
                  +{stack.length - 3} more
                </text>
              )}

              {/* Per-room clear badge — only shown when active */}
              {isActive && onClear && (
                <g transform={`translate(${r.cx + 72}, ${r.cy - 22})`}
                   style={{ cursor: "pointer" }}
                   onClick={(e) => { e.stopPropagation(); onClear(r.id); }}>
                  <circle r={10} fill="var(--c-bg-raised)" stroke="var(--c-border-str)"
                          strokeWidth="1" vectorEffect="non-scaling-stroke"/>
                  <line x1={-4} y1={-4} x2={4} y2={4} stroke="var(--c-text-2)" strokeWidth="1.5" strokeLinecap="round"/>
                  <line x1={4} y1={-4} x2={-4} y2={4} stroke="var(--c-text-2)" strokeWidth="1.5" strokeLinecap="round"/>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

window.RoomStage = RoomStage;
window.ROOMS_MOCK = ROOMS_MOCK;
