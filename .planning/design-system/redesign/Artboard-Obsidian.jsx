// Artboard A — "Obsidian" (QUICK MODE, multi-stack)
// Mechanic:
//   - One animation is "armed".
//   - Tap room → toggles ARMED animation in that room (start/stop THIS animation only).
//   - Rooms can hold multiple overlapping animations — new taps of a DIFFERENT armed anim
//     stack onto the same room.
//   - Secondary mode "Clear": tap room → removes ALL animations in that room.
//   - Per-room × badge: direct clear without switching mode.

const { useState: useStateA } = React;

const ANIMATIONS = [
  { key: "Intruder Alert", icon: "bell",     color: "#FF5B5B" },
  { key: "Fire",           icon: "flame",    color: "#F5A524" },
  { key: "Malfunction",    icon: "bolt",     color: "#F5B544" },
  { key: "Burst",          icon: "sparkles", color: "#32D3A3" },
  { key: "Slime",          icon: "drop",     color: "#7DD3FC" },
  { key: "Scanning",       icon: "scan",     color: "#B794FF" },
  { key: "Power Out",      icon: "power",    color: "#7A8392" },
  { key: "Alarm",          icon: "bell",     color: "#FF5B5B" },
];

function ArtboardObsidian({ theme = "dark" }) {
  const [quickMode, setQuickMode] = useStateA(true);
  const [clearMode, setClearMode] = useStateA(false);
  const [armed, setArmed] = useStateA("Intruder Alert");
  const [opacity, setOpacity] = useStateA(0.9);
  const [speed, setSpeed] = useStateA(1.0);
  const [volume, setVolume] = useStateA(70);
  const [sound, setSound] = useStateA(true);

  // active[roomId] = Array<{ id, name, icon, color, startedAt }>
  const [active, setActive] = useStateA({
    bc: [
      { id: "a1", name: "Intruder Alert", icon: "bell", color: "#FF5B5B", startedAt: Date.now() - 22_000 },
      { id: "a2", name: "Scanning",       icon: "scan", color: "#B794FF", startedAt: Date.now() - 6_000 },
    ],
    eg: [
      { id: "a3", name: "Malfunction", icon: "bolt", color: "#F5B544", startedAt: Date.now() - 8_000 },
    ],
  });

  const armedDef = ANIMATIONS.find(a => a.key === armed) || ANIMATIONS[0];
  const activeSet = new Set(Object.keys(active).filter(k => active[k].length > 0));
  const totalRunning = Object.values(active).reduce((n, arr) => n + arr.length, 0);

  function roomClick(roomId) {
    if (clearMode) {
      clearRoom(roomId);
      return;
    }
    // toggle armed animation in this room
    setActive(prev => {
      const next = { ...prev };
      const stack = next[roomId] ? [...next[roomId]] : [];
      const existing = stack.findIndex(a => a.name === armed);
      if (existing >= 0) {
        stack.splice(existing, 1);               // stop armed only
      } else {
        stack.push({                              // add, keep others
          id: Math.random().toString(36).slice(2),
          name: armedDef.key, icon: armedDef.icon, color: armedDef.color,
          startedAt: Date.now(),
        });
      }
      if (stack.length === 0) delete next[roomId];
      else next[roomId] = stack;
      return next;
    });
  }

  function clearRoom(roomId) {
    setActive(prev => { const next = { ...prev }; delete next[roomId]; return next; });
  }
  function stopOne(roomId, animId) {
    setActive(prev => {
      const next = { ...prev };
      const stack = (next[roomId] || []).filter(a => a.id !== animId);
      if (stack.length === 0) delete next[roomId];
      else next[roomId] = stack;
      return next;
    });
  }
  function stopAll() { setActive({}); }

  return (
    <div className={`dir-obsidian-${theme}`}
         style={{ width: 1280, height: 832, background: "var(--c-bg)", display: "grid",
                  gridTemplateColumns: "1fr 380px", color: "var(--c-text)" }}>

      {/* Projection pane */}
      <div style={{ padding: 24, display: "grid", gridTemplateRows: "auto 1fr auto", gap: 16 }}>
        {/* Top chrome */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--c-accent)",
                        display: "grid", placeItems: "center", color: "var(--c-accent-fg)" }}>
            <Icon name="rocket" size={18} strokeWidth={2}/>
          </div>
          <div>
            <div className="rd-h2" style={{ fontSize: 15 }}>TableTop Beamer</div>
            <div className="rd-caption">Nemesis · Table A</div>
          </div>
          <div style={{ flex: 1 }}/>
          {totalRunning > 0 && (
            <span className="rd-chip" data-variant="accent">
              <span className="rd-dot rd-dot-pulse"/> {totalRunning} running
            </span>
          )}
          <button className="rd-icon-btn" title="Search"><Icon name="search"/></button>
          <button className="rd-icon-btn" title="Settings"><Icon name="settings"/></button>
        </div>

        {/* Stage */}
        <div style={{ position: "relative" }}>
          <div style={{
            position: "absolute", inset: 0, borderRadius: 16,
            border: quickMode
              ? clearMode
                ? "1px solid color-mix(in oklch, var(--c-danger) 60%, transparent)"
                : "1px solid color-mix(in oklch, var(--c-accent) 55%, transparent)"
              : "1px solid transparent",
            boxShadow: quickMode
              ? clearMode
                ? "0 0 0 4px color-mix(in oklch, var(--c-danger) 14%, transparent)"
                : "0 0 0 4px color-mix(in oklch, var(--c-accent) 15%, transparent)"
              : "none",
            pointerEvents: "none", transition: "all var(--rd-t-med)", zIndex: 2,
          }}/>

          <RoomStage
            selected={null}
            active={activeSet}
            activeMap={active}
            clearMode={clearMode}
            onSelect={quickMode ? roomClick : undefined}
            onClear={quickMode ? clearRoom : undefined}
          />

          {/* Quick Mode indicator + action switcher */}
          {quickMode && (
            <div style={{ position: "absolute", top: 16, left: 16, display: "flex", gap: 6,
                          padding: 4, background: "color-mix(in oklch, var(--c-bg-raised) 88%, transparent)",
                          backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
                          border: "1px solid var(--c-border)", borderRadius: 999 }}>
              <button
                onClick={() => setClearMode(false)}
                aria-pressed={!clearMode}
                style={{
                  border: 0, cursor: "pointer", font: "inherit", fontSize: 12, fontWeight: 600,
                  padding: "6px 12px", borderRadius: 999,
                  background: !clearMode ? "var(--c-accent)" : "transparent",
                  color: !clearMode ? "var(--c-accent-fg)" : "var(--c-text-2)",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                <Icon name="bolt" size={13} strokeWidth={2.4}/> Tap = Toggle
              </button>
              <button
                onClick={() => setClearMode(true)}
                aria-pressed={clearMode}
                style={{
                  border: 0, cursor: "pointer", font: "inherit", fontSize: 12, fontWeight: 600,
                  padding: "6px 12px", borderRadius: 999,
                  background: clearMode ? "var(--c-danger)" : "transparent",
                  color: clearMode ? "#fff" : "var(--c-text-2)",
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                <Icon name="x" size={13} strokeWidth={2.4}/> Tap = Clear room
              </button>
            </div>
          )}

          {/* Armed badge — shows what's loaded */}
          {quickMode && !clearMode && (
            <div style={{ position: "absolute", top: 16, right: 16, display: "flex", alignItems: "center", gap: 8,
                          padding: "6px 12px 6px 8px",
                          background: `color-mix(in oklch, ${armedDef.color} 16%, var(--c-bg-raised))`,
                          border: `1px solid color-mix(in oklch, ${armedDef.color} 45%, transparent)`,
                          borderRadius: 999, color: armedDef.color, fontSize: 12, fontWeight: 600 }}>
              <Icon name={armedDef.icon} size={14} strokeWidth={2}/>
              Armed · {armedDef.key}
            </div>
          )}

          <div style={{ position: "absolute", bottom: 16, right: 16, display: "flex", gap: 6 }}>
            <button className="rd-icon-btn" title="Align"><Icon name="target"/></button>
            <button className="rd-icon-btn" title="Edit rooms"><Icon name="edit"/></button>
            <button className="rd-icon-btn" title="Calibrate"><Icon name="frame"/></button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className={`rd-btn ${quickMode ? "rd-btn-primary" : ""}`}
                  onClick={() => { setQuickMode(q => !q); setClearMode(false); }}
                  style={{ paddingLeft: 12 }}>
            <Icon name={quickMode ? "bolt" : "target"} size={16} strokeWidth={2.2}/>
            Quick Mode · {quickMode ? "on" : "off"}
          </button>
          <button className="rd-btn"><Icon name="power" size={16}/> Projector</button>
          <button className="rd-btn"><Icon name="wifi" size={16}/> Connected</button>
          <div style={{ flex: 1 }}/>
          {totalRunning > 0 && (
            <button className="rd-btn" onClick={stopAll}
                    style={{ color: "var(--c-danger)", borderColor: "var(--c-border)" }}>
              <Icon name="x" size={16} strokeWidth={2.4}/> Stop all ({totalRunning})
            </button>
          )}
          <button className="rd-btn rd-btn-ghost"><Icon name="info" size={16}/> Shortcuts</button>
        </div>
      </div>

      {/* Sidebar */}
      <aside style={{ borderLeft: "1px solid var(--c-border)", background: "var(--c-bg-raised)",
                      display: "grid", gridTemplateRows: "auto 1fr auto", height: "100%", overflow: "hidden" }}>

        {/* Armed header */}
        <div style={{ padding: "22px 20px 16px", borderBottom: "1px solid var(--c-border)",
                      background: "linear-gradient(180deg, var(--c-surface-2), var(--c-bg-raised))" }}>
          <div className="rd-eyebrow" style={{ marginBottom: 10 }}>
            Armed · tap a room to {clearMode ? "clear" : "toggle"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16,
                          background: `color-mix(in oklch, ${armedDef.color} 22%, var(--c-bg-raised))`,
                          color: armedDef.color,
                          border: `1px solid color-mix(in oklch, ${armedDef.color} 40%, transparent)`,
                          display: "grid", placeItems: "center" }}>
              <Icon name={armedDef.icon} size={26} strokeWidth={1.5}/>
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="rd-h1" style={{ fontSize: 22, lineHeight: 1.05 }}>{armedDef.key}</div>
              <div className="rd-caption" style={{ marginTop: 4 }}>
                {(opacity*100).toFixed(0)}% · {speed.toFixed(1)}× · {sound ? `${volume}% sound` : "muted"}
              </div>
            </div>
          </div>
        </div>

        <section className="rd-scroll" style={{ padding: 20, display: "grid", gap: 20 }}>
          {/* Library */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div className="rd-eyebrow">Library</div>
              <button className="rd-btn rd-btn-sm rd-btn-ghost" style={{ height: 28, padding: "0 8px" }}>
                See all <Icon name="chev_right" size={14}/>
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {ANIMATIONS.map(a => {
                const sel = armed === a.key;
                return (
                  <button key={a.key} onClick={() => setArmed(a.key)}
                          style={{
                            aspectRatio: "1", border: 0, cursor: "pointer",
                            background: sel
                              ? `color-mix(in oklch, ${a.color} 18%, var(--c-bg-raised))`
                              : "var(--c-surface)",
                            color: sel ? a.color : "var(--c-text-2)",
                            outline: sel ? `1.5px solid ${a.color}` : "1px solid transparent",
                            outlineOffset: -1.5,
                            borderRadius: 12,
                            display: "grid", placeItems: "center", gap: 4,
                            font: "inherit", fontSize: 10, fontWeight: 500,
                            transition: "all var(--rd-t-quick)", padding: 4,
                          }}>
                    <Icon name={a.icon} size={20} strokeWidth={1.5}/>
                    <span style={{ textAlign: "center", lineHeight: 1.1, overflow: "hidden",
                                   textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                      {a.key}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Parameters */}
          <div className="rd-card rd-card-tight" style={{ padding: 0 }}>
            <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="rd-row-title" style={{ fontSize: 13 }}>Opacity</div>
              <div className="rd-num rd-caption" style={{ color: "var(--c-text)", fontSize: 13 }}>
                {(opacity*100).toFixed(0)}%
              </div>
            </div>
            <div style={{ padding: "0 14px 6px" }}>
              <input type="range" min={0.1} max={1} step={0.05} value={opacity}
                     onChange={e => setOpacity(parseFloat(e.target.value))}
                     className="rd-slider rd-slider-accent"
                     style={{ "--fill": `${(opacity-0.1)/0.9*100}%` }}/>
            </div>
            <div className="rd-divider"/>
            <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="rd-row-title" style={{ fontSize: 13 }}>Speed</div>
              <div className="rd-num rd-caption" style={{ color: "var(--c-text)", fontSize: 13 }}>{speed.toFixed(2)}×</div>
            </div>
            <div style={{ padding: "0 14px 6px" }}>
              <input type="range" min={0.1} max={2.5} step={0.05} value={speed}
                     onChange={e => setSpeed(parseFloat(e.target.value))}
                     className="rd-slider rd-slider-accent"
                     style={{ "--fill": `${(speed-0.1)/2.4*100}%` }}/>
            </div>
            <div className="rd-divider"/>
            <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <Icon name={sound ? "sound_on" : "sound_off"} size={16}/>
              <div className="rd-row-title" style={{ fontSize: 13, flex: 1 }}>Sound</div>
              <div className="rd-num rd-caption" style={{ color: "var(--c-text)", fontSize: 13, minWidth: 32, textAlign: "right" }}>
                {sound ? `${volume}%` : "Off"}
              </div>
              <button className="rd-toggle" role="switch" aria-checked={sound} onClick={() => setSound(s => !s)}/>
            </div>
            {sound && (
              <div style={{ padding: "0 14px 12px" }}>
                <input type="range" min={0} max={100} step={1} value={volume}
                       onChange={e => setVolume(parseInt(e.target.value))}
                       className="rd-slider rd-slider-accent"
                       style={{ "--fill": `${volume}%` }}/>
              </div>
            )}
          </div>

          {/* Running — grouped by room with per-anim stop + per-room clear */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div className="rd-eyebrow">Running</div>
              {totalRunning > 0 && (
                <button className="rd-btn rd-btn-sm rd-btn-ghost" style={{ height: 28, padding: "0 8px" }}
                        onClick={stopAll}>
                  <Icon name="trash" size={13}/> Stop all
                </button>
              )}
            </div>
            {totalRunning === 0 ? (
              <div className="rd-card rd-card-tight" style={{ padding: 14, textAlign: "center",
                                                              color: "var(--c-text-3)", fontSize: 13 }}>
                Nothing running. Tap any room on the stage.
              </div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {Object.entries(active).map(([rid, stack]) => {
                  if (!stack.length) return null;
                  const room = ROOMS_MOCK.find(r => r.id === rid);
                  return (
                    <div key={rid} className="rd-card rd-card-tight" style={{ padding: 0 }}>
                      <div style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 8,
                                    borderBottom: "1px solid var(--c-border)" }}>
                        <Icon name="room" size={14} style={{ color: "var(--c-text-2)" }}/>
                        <div style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{room?.name}</div>
                        <span className="rd-caption">{stack.length} anim{stack.length > 1 ? "s" : ""}</span>
                        <button className="rd-btn rd-btn-sm rd-btn-ghost" style={{ height: 24, padding: "0 8px", fontSize: 11 }}
                                onClick={() => clearRoom(rid)}>
                          Clear
                        </button>
                      </div>
                      {stack.map(a => (
                        <div key={a.id} className="rd-row" style={{ borderBottom: "1px solid var(--c-border)" }}>
                          <div style={{ width: 28, height: 28, borderRadius: 8,
                                        background: `color-mix(in oklch, ${a.color} 22%, var(--c-bg-raised))`,
                                        color: a.color,
                                        display: "grid", placeItems: "center" }}>
                            <Icon name={a.icon} size={14}/>
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="rd-row-title" style={{ fontSize: 13 }}>{a.name}</div>
                          </div>
                          <button className="rd-icon-btn" style={{ width: 28, height: 28, borderRadius: 8 }}
                                  onClick={() => stopOne(rid, a.id)}
                                  title="Stop this animation">
                            <Icon name="x" size={14}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <footer style={{ padding: 16, borderTop: "1px solid var(--c-border)",
                         display: "flex", gap: 10, alignItems: "center" }}>
          <Icon name="clock" size={14} style={{ color: "var(--c-text-3)" }}/>
          <span className="rd-caption">Synced 2s ago</span>
          <div style={{ flex: 1 }}/>
          <button className="rd-btn rd-btn-sm rd-btn-ghost"><Icon name="layers" size={14}/> Presets</button>
        </footer>
      </aside>
    </div>
  );
}

window.ArtboardObsidian = ArtboardObsidian;
