// Mobile — Animation Editor (Setup) — the icon picker experience on phone.
// Scrollable single-column form with sheet-style primary actions.

const { useState: useMEdit } = React;

function MobileEditor({ theme = "dark" }) {
  const [anim, setAnim] = useMEdit({
    ...ANIMATION_LIBRARY.find(a => a.id === "malfunction"),
  });

  function update(patch) { setAnim(a => ({ ...a, ...patch })); }

  return (
    <div className={`dir-obsidian-${theme}`}
         style={{ width: 375, height: 812, background: "var(--c-bg)", color: "var(--c-text)",
                  display: "grid", gridTemplateRows: "auto auto 1fr auto", overflow: "hidden" }}>

      {/* Status area */}
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

      {/* Nav bar */}
      <header style={{ padding: "8px 16px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <button className="rd-btn rd-btn-sm rd-btn-ghost" style={{ height: 36, padding: "0 8px", color: "var(--c-accent)" }}>
          <Icon name="chev_right" size={16} style={{ transform: "rotate(180deg)" }}/> Library
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div className="rd-caption">Edit</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Animation</div>
        </div>
        <button className="rd-btn rd-btn-sm" style={{ height: 36, padding: "0 12px",
                background: "var(--c-accent)", color: "var(--c-accent-fg)", border: 0, fontWeight: 600 }}>
          Save
        </button>
      </header>

      {/* Scroll body */}
      <div className="rd-scroll" style={{ padding: "0 16px 16px", display: "grid", gap: 14, alignContent: "start",
                                          overflowY: "auto" }}>

        {/* Hero icon tile */}
        <div style={{ padding: 20, borderRadius: 18,
                      background: "var(--c-accent-bg)", color: "var(--c-accent)",
                      display: "grid", placeItems: "center", gap: 10 }}>
          <Icon name={anim.icon} size={56} strokeWidth={1.5}/>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{anim.name}</div>
        </div>

        {/* Name */}
        <div style={{ background: "var(--c-bg-raised)", border: "1px solid var(--c-border)",
                      borderRadius: 14, padding: "10px 14px" }}>
          <div className="rd-caption" style={{ marginBottom: 4 }}>NAME</div>
          <input value={anim.name} onChange={e => update({ name: e.target.value })}
                 style={{ width: "100%", border: 0, background: "transparent",
                          color: "var(--c-text)", font: "inherit", fontSize: 15, fontWeight: 500, outline: "none" }}/>
        </div>

        {/* Icon picker */}
        <div style={{ background: "var(--c-bg-raised)", border: "1px solid var(--c-border)",
                      borderRadius: 14, padding: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div className="rd-caption">ICON</div>
            <div className="rd-caption rd-num" style={{ color: "var(--c-text)" }}>{anim.icon}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
            {ICON_PICKER_SET.map(n => {
              const sel = n === anim.icon;
              return (
                <button key={n} onClick={() => update({ icon: n })}
                        style={{
                          aspectRatio: 1, border: 0, borderRadius: 10,
                          background: sel ? "var(--c-accent-bg)" : "var(--c-surface)",
                          color: sel ? "var(--c-accent)" : "var(--c-text-2)",
                          display: "grid", placeItems: "center",
                          boxShadow: sel ? "inset 0 0 0 1px var(--c-accent)" : "none",
                          cursor: "pointer",
                        }}>
                  <Icon name={n} size={18}/>
                </button>
              );
            })}
          </div>
        </div>

        {/* Parameters rows */}
        <div style={{ background: "var(--c-bg-raised)", border: "1px solid var(--c-border)",
                      borderRadius: 14, display: "grid", gap: 0, overflow: "hidden" }}>
          {[
            { k: "opacity", l: "Opacity", min: 0.1, max: 1,   step: 0.05, fmt: v => `${Math.round(v*100)}%` },
            { k: "speed",   l: "Speed",   min: 0.1, max: 2.5, step: 0.05, fmt: v => `${v.toFixed(2)}×` },
            { k: "volume",  l: "Volume",  min: 0,   max: 100, step: 1,    fmt: v => `${v}%` },
          ].map((f, idx, arr) => (
            <div key={f.k} style={{
              padding: "12px 14px",
              borderBottom: idx < arr.length - 1 ? "1px solid var(--c-border)" : 0,
              display: "grid", gap: 8,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14 }}>{f.l}</span>
                <span className="rd-num" style={{ fontSize: 14, color: "var(--c-text)" }}>{f.fmt(anim[f.k])}</span>
              </div>
              <input type="range" min={f.min} max={f.max} step={f.step} value={anim[f.k]}
                     onChange={e => update({ [f.k]: parseFloat(e.target.value) })}
                     className="rd-slider rd-slider-accent"
                     style={{ "--fill": `${((anim[f.k]-f.min)/(f.max-f.min))*100}%` }}/>
            </div>
          ))}
          <div style={{ padding: "14px", borderTop: "1px solid var(--c-border)",
                        display: "flex", alignItems: "center", gap: 12 }}>
            <Icon name="clock" size={16}/>
            <span style={{ fontSize: 14, flex: 1 }}>Loop</span>
            <button className="rd-toggle" role="switch" aria-checked={anim.loop}
                    onClick={() => update({ loop: !anim.loop })}/>
          </div>
        </div>

        <button className="rd-btn rd-btn-ghost" style={{ width: "100%", color: "var(--c-danger)" }}>
          <Icon name="trash" size={14}/> Delete animation
        </button>
      </div>

      {/* Preview / test bar */}
      <div style={{ padding: "12px 16px 16px", background: "var(--c-bg-raised)",
                    borderTop: "1px solid var(--c-border)" }}>
        <button className="rd-btn rd-btn-lg" style={{ width: "100%", height: 50, borderRadius: 14 }}>
          <Icon name="eye" size={16}/> Test on board
        </button>
      </div>
    </div>
  );
}

window.MobileEditor = MobileEditor;
