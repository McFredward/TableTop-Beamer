// Artboard B — "Bone" (light mode)
// Calm, paper-like. Floating command bar on top of a big canvas.
// Shows that the same grammar also works in daylight.

const { useState: useStateB } = React;

function ArtboardBone() {
  const [room, setRoom] = useStateB("lb");
  const [animation, setAnimation] = useStateB("Fire");
  const [opacity, setOpacity] = useStateB(0.85);
  const [running, setRunning] = useStateB([
    { id: "1", name: "Intruder Alert", scope: "room", room: "Brood Chamber", roomId: "bc", meta: "70% • 1.0×" },
  ]);

  const currentRoom = ROOMS_MOCK.find(r => r.id === room);
  const activeSet = new Set(running.filter(r => r.roomId).map(r => r.roomId));

  const presets = [
    { k: "Intruder Alert", i: "bell" },
    { k: "Fire",           i: "flame" },
    { k: "Malfunction",    i: "bolt" },
    { k: "Slime",          i: "drop" },
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
    <div className="dir-bone" style={{ width: 1280, height: 832, background: "var(--c-bg)",
                                       color: "var(--c-text)", padding: 24,
                                       display: "grid", gridTemplateRows: "auto 1fr", gap: 18 }}>
      {/* Top bar */}
      <header className="rd-card" style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px" }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "var(--c-text)",
                      color: "var(--c-bg-raised)", display: "grid", placeItems: "center" }}>
          <Icon name="rocket" size={16} strokeWidth={2}/>
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, letterSpacing: "-0.01em" }}>Atmosphere</div>
          <div className="rd-caption">Nemesis · Game 03</div>
        </div>
        <div style={{ width: 1, height: 22, background: "var(--c-border)", marginLeft: 8, marginRight: 4 }}/>
        <nav style={{ display: "flex", gap: 2 }}>
          {[
            { k: "play", i: "play", l: "Play" },
            { k: "rooms", i: "room", l: "Rooms" },
            { k: "anim", i: "sparkles", l: "Animations" },
            { k: "setup", i: "sliders", l: "Setup" },
          ].map((t, i) => (
            <button key={t.k} className="rd-btn rd-btn-ghost rd-btn-sm"
                    aria-pressed={i === 0}
                    style={{ height: 34 }}>
              <Icon name={t.i} size={14}/> {t.l}
            </button>
          ))}
        </nav>
        <div style={{ flex: 1 }}/>
        <div style={{ position: "relative" }}>
          <Icon name="search" size={16} style={{ position: "absolute", left: 10, top: 9, color: "var(--c-text-3)" }}/>
          <input type="text" placeholder="Jump to room or animation"
                 style={{
                   height: 34, width: 240, padding: "0 12px 0 32px",
                   borderRadius: 999, border: "1px solid var(--c-border)",
                   background: "var(--c-surface-2)", font: "inherit", fontSize: 13,
                   color: "var(--c-text)", outline: "none"
                 }}/>
        </div>
        <span className="rd-chip" data-variant="accent">
          <span className="rd-dot rd-dot-pulse"/> Live · {running.length}
        </span>
        <button className="rd-icon-btn"><Icon name="bell"/></button>
        <button className="rd-icon-btn"><Icon name="settings"/></button>
      </header>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 340px", gap: 18, minHeight: 0 }}>
        {/* Left: room list */}
        <aside className="rd-card rd-card-tight" style={{ display: "grid", gridTemplateRows: "auto 1fr", padding: 0 }}>
          <div style={{ padding: "14px 16px 8px", display: "flex", alignItems: "center" }}>
            <div className="rd-eyebrow">Rooms · 7</div>
            <div style={{ flex: 1 }}/>
            <button className="rd-icon-btn" style={{ width: 28, height: 28, borderRadius: 8 }}>
              <Icon name="plus" size={14}/>
            </button>
          </div>
          <div className="rd-scroll" style={{ padding: "0 8px 12px" }}>
            {ROOMS_MOCK.map(r => {
              const sel = r.id === room;
              const active = activeSet.has(r.id);
              return (
                <button key={r.id} onClick={() => setRoom(r.id)}
                        style={{
                          width: "100%", display: "flex", alignItems: "center", gap: 12,
                          padding: "10px 10px", borderRadius: 10, border: 0,
                          background: sel ? "var(--c-accent-bg)" : "transparent",
                          color: sel ? "var(--c-accent)" : "var(--c-text)",
                          cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 500,
                          textAlign: "left",
                          marginTop: 2,
                        }}>
                  <Icon name="room" size={16}/>
                  <span>{r.name}</span>
                  <span style={{ flex: 1 }}/>
                  {active && <span className="rd-dot rd-dot-pulse"/>}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center: canvas */}
        <div className="rd-card" style={{ padding: 16, display: "grid", gridTemplateRows: "auto 1fr auto", gap: 14, minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div>
              <div className="rd-h2">Board</div>
              <div className="rd-caption">Projector · 1920×1080 · aligned</div>
            </div>
            <div style={{ flex: 1 }}/>
            <div className="rd-segmented">
              <button aria-selected={true}><Icon name="grid" size={13}/> Overlay</button>
              <button><Icon name="eye" size={13}/> Preview</button>
              <button><Icon name="target" size={13}/> Align</button>
            </div>
          </div>
          <div style={{ minHeight: 0, display: "grid", placeItems: "center" }}>
            <div style={{ width: "100%", maxHeight: "100%", aspectRatio: "7978 / 5456" }}>
              <RoomStage selected={room} active={activeSet} onSelect={setRoom}/>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="rd-btn rd-btn-sm"><Icon name="frame" size={14}/> Calibrate</button>
            <button className="rd-btn rd-btn-sm"><Icon name="edit" size={14}/> Edit rooms</button>
            <div style={{ flex: 1 }}/>
            <span className="rd-caption">Selected: <span style={{ color: "var(--c-text)", fontWeight: 500 }}>{currentRoom?.name}</span></span>
          </div>
        </div>

        {/* Right: inspector */}
        <aside style={{ display: "grid", gap: 14, gridTemplateRows: "auto auto 1fr", minHeight: 0 }}>
          <div className="rd-card" style={{ padding: 16, display: "grid", gap: 12 }}>
            <div className="rd-eyebrow">Quick start</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {presets.map(p => {
                const sel = animation === p.k;
                return (
                  <button key={p.k} onClick={() => setAnimation(p.k)}
                          style={{
                            aspectRatio: 1,
                            background: sel ? "var(--c-accent-bg)" : "var(--c-surface-2)",
                            color: sel ? "var(--c-accent)" : "var(--c-text-2)",
                            borderRadius: 12, border: 0, cursor: "pointer",
                            display: "grid", placeItems: "center", gap: 4,
                            font: "inherit", fontSize: 10.5, fontWeight: 500,
                          }}>
                    <Icon name={p.i} size={20} strokeWidth={1.5}/>
                    <span style={{ textAlign: "center", lineHeight: 1.15 }}>{p.k}</span>
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="rd-caption" style={{ flex: 1 }}>Opacity</span>
              <span className="rd-num" style={{ fontSize: 12, color: "var(--c-text)" }}>{Math.round(opacity*100)}%</span>
            </div>
            <input type="range" min={0.1} max={1} step={0.05} value={opacity}
                   onChange={e => setOpacity(parseFloat(e.target.value))}
                   className="rd-slider rd-slider-accent"
                   style={{ "--fill": `${(opacity-0.1)/0.9*100}%` }}/>
            <button className="rd-btn rd-btn-primary rd-btn-lg" style={{ width: "100%" }} onClick={start}>
              <Icon name="play" size={15} strokeWidth={2.5} filled/> Start in {currentRoom?.name}
            </button>
          </div>

          <div className="rd-card rd-card-tight" style={{ padding: 0 }}>
            <div style={{ padding: "12px 14px", display: "flex", alignItems: "center" }}>
              <div className="rd-eyebrow">Active · {running.length}</div>
              <div style={{ flex: 1 }}/>
              {running.length > 0 && (
                <button className="rd-btn rd-btn-sm rd-btn-ghost" style={{ height: 26, padding: "0 8px" }}
                        onClick={() => setRunning([])}>Stop all</button>
              )}
            </div>
            {running.length === 0 ? (
              <div style={{ padding: 18, textAlign: "center", color: "var(--c-text-3)", fontSize: 13 }}>
                Nothing running.
              </div>
            ) : (
              running.map(r => (
                <div key={r.id} style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
                                         borderTop: "1px solid var(--c-border)" }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8,
                                background: "var(--c-accent-bg)", color: "var(--c-accent)",
                                display: "grid", placeItems: "center" }}>
                    <Icon name="bell" size={14}/>
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{r.name}</div>
                    <div className="rd-caption">{r.room} · {r.meta}</div>
                  </div>
                  <button className="rd-icon-btn" style={{ width: 28, height: 28, borderRadius: 8 }}
                          onClick={() => setRunning(v => v.filter(x => x.id !== r.id))}>
                    <Icon name="x" size={14}/>
                  </button>
                </div>
              ))
            )}
          </div>

          <div style={{ alignSelf: "end", display: "flex", alignItems: "center", gap: 10, padding: "0 4px" }}>
            <Icon name="shield" size={14} style={{ color: "var(--c-text-3)" }}/>
            <span className="rd-caption">Local · no cloud</span>
            <div style={{ flex: 1 }}/>
            <span className="rd-caption rd-num">v0.9.1</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

window.ArtboardBone = ArtboardBone;
