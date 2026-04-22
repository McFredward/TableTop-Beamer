// Mobile — iPhone-sized Play screen (375×812)
// QUICK MODE, multi-stack: tap room = toggle armed anim; Clear-Mode = remove all in room.

const { useState: useMPlay } = React;

function MobilePlay({ theme = "dark" }) {
  const [armed, setArmed] = useMPlay("Intruder Alert");
  const [clearMode, setClearMode] = useMPlay(false);
  const [active, setActive] = useMPlay({
    bc: [
      { id: "a1", name: "Intruder Alert", icon: "bell", color: "#FF5B5B" },
      { id: "a2", name: "Scanning",       icon: "scan", color: "#B794FF" },
    ],
  });

  const armedDef = ANIMATIONS.find(a => a.key === armed) || ANIMATIONS[0];
  const activeSet = new Set(Object.keys(active).filter(k => active[k].length > 0));
  const totalRunning = Object.values(active).reduce((n, arr) => n + arr.length, 0);

  function roomTap(roomId) {
    if (clearMode) {
      setActive(prev => { const n = { ...prev }; delete n[roomId]; return n; });
      return;
    }
    setActive(prev => {
      const next = { ...prev };
      const stack = next[roomId] ? [...next[roomId]] : [];
      const idx = stack.findIndex(a => a.name === armed);
      if (idx >= 0) stack.splice(idx, 1);
      else stack.push({ id: Math.random().toString(36).slice(2),
                        name: armedDef.key, icon: armedDef.icon, color: armedDef.color });
      if (stack.length === 0) delete next[roomId];
      else next[roomId] = stack;
      return next;
    });
  }
  function clearRoom(rid) {
    setActive(prev => { const n = { ...prev }; delete n[rid]; return n; });
  }

  return (
    <div className={`dir-obsidian-${theme}`}
         style={{ width: 375, height: 812, background: "var(--c-bg)", color: "var(--c-text)",
                  display: "grid", gridTemplateRows: "auto auto auto 1fr auto auto", overflow: "hidden" }}>

      {/* Status bar */}
      <div style={{ height: 44, display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "0 22px", fontSize: 14, fontWeight: 600 }}>
        <span className="rd-num">9:41</span>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <Icon name="wifi" size={14} strokeWidth={2}/>
          <div style={{ width: 22, height: 11, borderRadius: 3, border: "1.5px solid var(--c-text)", position: "relative" }}>
            <div style={{ position: "absolute", inset: 1.5, width: "75%", background: "var(--c-text)", borderRadius: 1 }}/>
          </div>
        </div>
      </div>

      {/* Title */}
      <header style={{ padding: "4px 20px 10px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div className="rd-caption">Nemesis · Table A</div>
          <div className="rd-h1" style={{ fontSize: 22 }}>Quick Mode</div>
        </div>
        {totalRunning > 0 && (
          <span className="rd-chip" data-variant="accent" style={{ fontSize: 11 }}>
            <span className="rd-dot rd-dot-pulse"/> {totalRunning}
          </span>
        )}
        <button className="rd-icon-btn" style={{ width: 36, height: 36, borderRadius: 10 }}>
          <Icon name="settings" size={16}/>
        </button>
      </header>

      {/* Mode switch segmented */}
      <div style={{ padding: "0 20px 10px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0,
                      padding: 3, background: "var(--c-surface-2)", borderRadius: 999 }}>
          <button onClick={() => setClearMode(false)}
                  style={{ border: 0, cursor: "pointer", font: "inherit", fontSize: 12, fontWeight: 600,
                           padding: "8px 10px", borderRadius: 999,
                           background: !clearMode ? "var(--c-accent)" : "transparent",
                           color: !clearMode ? "var(--c-accent-fg)" : "var(--c-text-2)",
                           display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icon name="bolt" size={13} strokeWidth={2.4}/> Tap = Toggle
          </button>
          <button onClick={() => setClearMode(true)}
                  style={{ border: 0, cursor: "pointer", font: "inherit", fontSize: 12, fontWeight: 600,
                           padding: "8px 10px", borderRadius: 999,
                           background: clearMode ? "var(--c-danger)" : "transparent",
                           color: clearMode ? "#fff" : "var(--c-text-2)",
                           display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icon name="x" size={13} strokeWidth={2.4}/> Tap = Clear room
          </button>
        </div>
      </div>

      {/* Mini board */}
      <div style={{ padding: "0 16px 8px", display: "grid", alignContent: "stretch" }}>
        <div style={{ position: "relative", borderRadius: 18, overflow: "hidden",
                      border: clearMode
                        ? "1.5px solid color-mix(in oklch, var(--c-danger) 55%, var(--c-border))"
                        : "1.5px solid color-mix(in oklch, var(--c-accent) 45%, var(--c-border))",
                      boxShadow: clearMode
                        ? "0 0 0 4px color-mix(in oklch, var(--c-danger) 12%, transparent)"
                        : "0 0 0 4px color-mix(in oklch, var(--c-accent) 12%, transparent)",
                      background: "var(--c-bg-raised)", aspectRatio: "1000/684" }}>
          <RoomStage selected={null} active={activeSet} onSelect={roomTap}
                     onClear={clearRoom} activeMap={active} clearMode={clearMode}/>
          {!clearMode && (
            <div style={{ position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 6,
                          padding: "6px 10px 6px 8px",
                          background: `color-mix(in oklch, ${armedDef.color} 18%, var(--c-bg-raised))`,
                          border: `1px solid color-mix(in oklch, ${armedDef.color} 50%, transparent)`,
                          borderRadius: 999, color: armedDef.color, fontSize: 11, fontWeight: 600 }}>
              <Icon name={armedDef.icon} size={12} strokeWidth={2.2}/>
              {armedDef.key}
            </div>
          )}
        </div>
      </div>

      {/* Armed strip */}
      <div style={{ padding: "6px 0 10px" }}>
        <div style={{ padding: "0 20px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div className="rd-eyebrow">Library</div>
          {totalRunning > 0 && (
            <button className="rd-btn rd-btn-sm" style={{ color: "var(--c-danger)" }}
                    onClick={() => setActive({})}>
              <Icon name="x" size={13} strokeWidth={2.2}/> Stop all
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, padding: "0 20px", overflowX: "auto", scrollbarWidth: "none" }}>
          {ANIMATIONS.map(a => {
            const sel = armed === a.key;
            return (
              <button key={a.key} onClick={() => setArmed(a.key)}
                      style={{
                        flex: "0 0 72px", height: 84, border: 0, cursor: "pointer",
                        borderRadius: 14,
                        background: sel
                          ? `color-mix(in oklch, ${a.color} 20%, var(--c-bg-raised))`
                          : "var(--c-surface)",
                        color: sel ? a.color : "var(--c-text-2)",
                        outline: sel ? `1.5px solid ${a.color}` : "1px solid transparent",
                        outlineOffset: -1.5,
                        display: "grid", placeItems: "center", gap: 4,
                        font: "inherit", fontSize: 10, fontWeight: 500,
                      }}>
                <Icon name={a.icon} size={22} strokeWidth={1.5}/>
                <span style={{ textAlign: "center", padding: "0 4px",
                               overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>
                  {a.key}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab bar */}
      <nav style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4,
                    padding: "6px 12px 14px",
                    background: "var(--c-bg-raised)", borderTop: "1px solid var(--c-border)" }}>
        {[
          { i: "bolt", l: "Quick", active: true },
          { i: "sparkles", l: "Library" },
          { i: "map", l: "Board" },
          { i: "settings", l: "Settings" },
        ].map(t => (
          <button key={t.l} style={{
            height: 48, border: 0, background: "transparent",
            color: t.active ? "var(--c-accent)" : "var(--c-text-3)",
            display: "grid", placeItems: "center", gap: 2, cursor: "pointer",
            fontFamily: "inherit", fontSize: 10.5, fontWeight: 500,
          }}>
            <Icon name={t.i} size={20} strokeWidth={t.active ? 2 : 1.6}/>
            {t.l}
          </button>
        ))}
      </nav>
    </div>
  );
}

window.MobilePlay = MobilePlay;
