// Artboard C — "Inkwell"
// Bottom-dock remote. Minimal chrome. Room grid replaces sidebar.
// The "Apple Remote" take — one glanceable surface for at-the-table use.

const { useState: useStateC } = React;

function ArtboardInkwell() {
  const [room, setRoom] = useStateC("md");
  const [animation, setAnimation] = useStateC("Malfunction");
  const [opacity, setOpacity] = useStateC(0.8);
  const [running, setRunning] = useStateC([
    { id: "1", name: "Scanning", scope: "ambient", meta: "Looping" },
    { id: "2", name: "Fire", scope: "room", room: "Engine Room", roomId: "eg", meta: "85%" },
  ]);

  const currentRoom = ROOMS_MOCK.find(r => r.id === room);
  const activeSet = new Set(running.filter(r => r.roomId).map(r => r.roomId));

  const dial = [
    { k: "Intruder Alert", i: "bell" },
    { k: "Fire",           i: "flame" },
    { k: "Malfunction",    i: "bolt" },
    { k: "Burst",          i: "sparkles" },
    { k: "Scanning",       i: "scan" },
    { k: "Slime",          i: "drop" },
    { k: "Pulse",          i: "bolt" },
    { k: "Haunt",          i: "ghost" },
  ];

  function start() {
    setRunning(r => [{
      id: Math.random().toString(36).slice(2),
      name: animation, scope: "room",
      room: currentRoom.name, roomId: room,
      meta: `${Math.round(opacity*100)}%`
    }, ...r]);
  }

  return (
    <div className="dir-inkwell" style={{ width: 1280, height: 832, background: "var(--c-bg)",
                                          color: "var(--c-text)", position: "relative", overflow: "hidden" }}>
      {/* Ambient glow */}
      <div style={{ position: "absolute", inset: 0,
                    background: "radial-gradient(60% 50% at 50% 35%, var(--c-accent-bg), transparent 70%)",
                    pointerEvents: "none" }}/>

      {/* Minimal top bar */}
      <header style={{ position: "absolute", top: 24, left: 24, right: 24,
                       display: "flex", alignItems: "center", gap: 14, zIndex: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8,
                        background: "var(--c-accent)", color: "#1a0b3c",
                        display: "grid", placeItems: "center" }}>
            <Icon name="rocket" size={14} strokeWidth={2.5}/>
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>Atmosphere</div>
        </div>
        <div style={{ flex: 1 }}/>
        <span className="rd-chip" data-variant="accent">
          <span className="rd-dot rd-dot-pulse"/> {running.length} active
        </span>
        <button className="rd-icon-btn"><Icon name="eye"/></button>
        <button className="rd-icon-btn"><Icon name="settings"/></button>
      </header>

      {/* Stage (floats center) */}
      <div style={{ position: "absolute", top: 88, left: 24, right: 24, bottom: 300,
                    display: "grid", placeItems: "center", zIndex: 1 }}>
        <div style={{ width: "min(100%, 900px)", aspectRatio: "7978 / 5456" }}>
          <RoomStage selected={room} active={activeSet} onSelect={setRoom}/>
        </div>
      </div>

      {/* Floating dock */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 24, display: "grid", placeItems: "center", zIndex: 3 }}>
        <div style={{ width: "min(92%, 1120px)",
                      background: "color-mix(in srgb, var(--c-bg-raised) 88%, transparent)",
                      backdropFilter: "blur(24px) saturate(1.4)",
                      WebkitBackdropFilter: "blur(24px) saturate(1.4)",
                      border: "1px solid var(--c-border)",
                      borderRadius: 28,
                      padding: 20,
                      boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
                      display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 24, alignItems: "center" }}>
          {/* Selected room card */}
          <div style={{ display: "flex", alignItems: "center", gap: 14,
                        padding: "10px 14px 10px 10px",
                        background: "var(--c-surface)",
                        border: "1px solid var(--c-border)",
                        borderRadius: 18, minWidth: 220 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12,
                          background: "var(--c-room-bg)", color: "var(--c-room)",
                          display: "grid", placeItems: "center" }}>
              <Icon name="room" size={20}/>
            </div>
            <div style={{ lineHeight: 1.2, minWidth: 0 }}>
              <div className="rd-caption" style={{ marginBottom: 2 }}>Room</div>
              <div className="rd-h2" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {currentRoom?.name}
              </div>
            </div>
          </div>

          {/* Animation dial */}
          <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "2px 2px" }}>
            {dial.map(d => {
              const sel = animation === d.k;
              return (
                <button key={d.k} onClick={() => setAnimation(d.k)}
                        style={{
                          flex: "0 0 auto",
                          width: 88, height: 88, borderRadius: 18, border: 0,
                          background: sel ? "var(--c-accent-bg)" : "var(--c-surface)",
                          color: sel ? "var(--c-accent)" : "var(--c-text-2)",
                          boxShadow: sel ? "0 0 0 1px var(--c-accent)" : "0 0 0 1px var(--c-border)",
                          display: "grid", placeItems: "center", gap: 6,
                          cursor: "pointer",
                          font: "inherit", fontSize: 11, fontWeight: 500,
                          transition: "all var(--rd-t-quick)",
                        }}>
                  <Icon name={d.i} size={24} strokeWidth={1.5}/>
                  <span>{d.k}</span>
                </button>
              );
            })}
          </div>

          {/* Primary action column */}
          <div style={{ display: "grid", gap: 10, alignItems: "center", minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="eye" size={14} style={{ color: "var(--c-text-3)" }}/>
              <input type="range" min={0.1} max={1} step={0.05} value={opacity}
                     onChange={e => setOpacity(parseFloat(e.target.value))}
                     className="rd-slider rd-slider-accent"
                     style={{ "--fill": `${(opacity-0.1)/0.9*100}%`, flex: 1 }}/>
              <span className="rd-num rd-caption" style={{ color: "var(--c-text)", minWidth: 38, textAlign: "right" }}>
                {Math.round(opacity*100)}%
              </span>
            </div>
            <button className="rd-btn rd-btn-primary rd-btn-lg" onClick={start}>
              <Icon name="play" size={16} strokeWidth={2.5} filled/> Start
            </button>
          </div>
        </div>
      </div>

      {/* Tiny active-list on left (absolute) */}
      <div style={{ position: "absolute", top: 88, left: 24, width: 220, zIndex: 2 }}>
        <div className="rd-eyebrow" style={{ marginBottom: 8 }}>Active</div>
        <div style={{ display: "grid", gap: 6 }}>
          {running.map(r => (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px",
              background: "var(--c-surface)",
              border: "1px solid var(--c-border)",
              borderRadius: 12
            }}>
              <span className="rd-dot rd-dot-pulse"/>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.name}
                </div>
                <div className="rd-caption" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.room || "Ambient"}
                </div>
              </div>
              <button className="rd-icon-btn" style={{ width: 26, height: 26, borderRadius: 7, background: "transparent", border: 0 }}
                      onClick={() => setRunning(v => v.filter(x => x.id !== r.id))}>
                <Icon name="x" size={14}/>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.ArtboardInkwell = ArtboardInkwell;
