// Artboard — Animation editor (Setup tab) w/ icon picker
// Shows how a user edits a library animation: name, icon, color, defaults.

const { useState: useStateEdit } = React;

function IconPickerGrid({ value, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 6,
                  padding: 8, background: "var(--c-surface)",
                  border: "1px solid var(--c-border)", borderRadius: 14 }}>
      {ICON_PICKER_SET.map(n => {
        const sel = n === value;
        return (
          <button key={n} onClick={() => onChange(n)} title={n}
                  style={{
                    aspectRatio: 1, borderRadius: 10, border: 0,
                    background: sel ? "var(--c-accent-bg)" : "transparent",
                    color: sel ? "var(--c-accent)" : "var(--c-text-2)",
                    display: "grid", placeItems: "center",
                    cursor: "pointer",
                    boxShadow: sel ? "inset 0 0 0 1px var(--c-accent)" : "none",
                    transition: "all 140ms",
                  }}>
            <Icon name={n} size={18}/>
          </button>
        );
      })}
    </div>
  );
}

function ColorSwatches({ value, onChange }) {
  const colors = [
    { k: "accent", v: "var(--c-accent)" },
    { k: "danger", v: "var(--c-danger)" },
    { k: "warn",   v: "var(--c-warn)"   },
    { k: "room",   v: "var(--c-room)"   },
  ];
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {colors.map(c => (
        <button key={c.k} onClick={() => onChange(c.k)}
                style={{
                  width: 32, height: 32, borderRadius: 10, border: 0,
                  background: c.v, cursor: "pointer",
                  outline: value === c.k ? "2px solid var(--c-text)" : "none",
                  outlineOffset: 2,
                }}/>
      ))}
    </div>
  );
}

function AnimationEditor({ theme = "dark" }) {
  const [selId, setSelId] = useStateEdit("fire");
  const [library, setLibrary] = useStateEdit(ANIMATION_LIBRARY);
  const anim = library.find(a => a.id === selId) || library[0];

  function update(patch) {
    setLibrary(lib => lib.map(a => a.id === selId ? { ...a, ...patch } : a));
  }

  return (
    <div className={`dir-obsidian-${theme}`}
         style={{ width: 1280, height: 832, background: "var(--c-bg)", color: "var(--c-text)",
                  display: "grid", gridTemplateColumns: "320px 1fr 380px" }}>

      {/* Library list */}
      <aside style={{ borderRight: "1px solid var(--c-border)", background: "var(--c-bg-raised)",
                      display: "grid", gridTemplateRows: "auto auto 1fr auto", minHeight: 0 }}>
        <div style={{ padding: "20px 20px 10px" }}>
          <div className="rd-eyebrow" style={{ marginBottom: 10 }}>Setup</div>
          <div className="rd-h1" style={{ fontSize: 22 }}>Animations</div>
          <div className="rd-caption" style={{ marginTop: 4 }}>{library.length} configured</div>
        </div>
        <div style={{ padding: "0 16px 10px", display: "flex", gap: 8 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <Icon name="search" size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--c-text-3)" }}/>
            <input placeholder="Search" style={{
              width: "100%", height: 36, padding: "0 10px 0 30px",
              borderRadius: 10, border: "1px solid var(--c-border)",
              background: "var(--c-surface)", color: "var(--c-text)", font: "inherit", fontSize: 13,
              outline: "none",
            }}/>
          </div>
          <button className="rd-icon-btn" style={{ width: 36, height: 36, borderRadius: 10 }} title="Add new">
            <Icon name="plus" size={16}/>
          </button>
        </div>
        <div className="rd-scroll" style={{ padding: "0 8px 12px" }}>
          {library.map(a => {
            const sel = a.id === selId;
            return (
              <button key={a.id} onClick={() => setSelId(a.id)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 10px", borderRadius: 10, border: 0,
                        background: sel ? "var(--c-accent-bg)" : "transparent",
                        cursor: "pointer", fontFamily: "inherit",
                        textAlign: "left", marginTop: 2,
                      }}>
                <div style={{ width: 32, height: 32, borderRadius: 8,
                              background: sel ? "var(--c-accent)" : "var(--c-surface-2)",
                              color: sel ? "var(--c-accent-fg)" : "var(--c-text-2)",
                              display: "grid", placeItems: "center" }}>
                  <Icon name={a.icon} size={16}/>
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: sel ? "var(--c-accent)" : "var(--c-text)" }}>{a.name}</div>
                  <div className="rd-caption">{a.loop ? "Looping" : "One-shot"} · {Math.round(a.opacity*100)}%</div>
                </div>
                {a.loop && <span className="rd-dot" style={{ background: "var(--c-text-3)" }}/>}
              </button>
            );
          })}
        </div>
        <div style={{ padding: 12, borderTop: "1px solid var(--c-border)", display: "flex", gap: 8 }}>
          <button className="rd-btn rd-btn-sm" style={{ flex: 1 }}>
            <Icon name="layers" size={14}/> Import
          </button>
          <button className="rd-btn rd-btn-sm rd-btn-ghost"><Icon name="more" size={14}/></button>
        </div>
      </aside>

      {/* Editor pane */}
      <div style={{ padding: 32, display: "grid", gridTemplateRows: "auto auto 1fr", gap: 20, minHeight: 0 }}>
        <header style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16,
                        background: "var(--c-accent-bg)", color: "var(--c-accent)",
                        display: "grid", placeItems: "center" }}>
            <Icon name={anim.icon} size={26} strokeWidth={1.5}/>
          </div>
          <div style={{ flex: 1 }}>
            <div className="rd-eyebrow">Edit animation</div>
            <div className="rd-h1" style={{ fontSize: 26 }}>{anim.name}</div>
          </div>
          <button className="rd-btn rd-btn-ghost"><Icon name="eye" size={14}/> Preview</button>
          <button className="rd-btn rd-btn-primary"><Icon name="check" size={14}/> Save</button>
        </header>

        {/* Identity */}
        <div className="rd-card" style={{ display: "grid", gap: 16 }}>
          <div className="rd-eyebrow">Identity</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="rd-caption">Name</span>
              <input value={anim.name} onChange={e => update({ name: e.target.value })}
                     style={{ height: 44, padding: "0 14px", borderRadius: 12,
                              border: "1px solid var(--c-border)", background: "var(--c-surface)",
                              color: "var(--c-text)", font: "inherit", fontSize: 14, outline: "none" }}/>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="rd-caption">Color</span>
              <div style={{ height: 44, padding: "0 14px", borderRadius: 12,
                            border: "1px solid var(--c-border)", background: "var(--c-surface)",
                            display: "flex", alignItems: "center" }}>
                <ColorSwatches value={anim.color} onChange={c => update({ color: c })}/>
              </div>
            </label>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span className="rd-caption">Icon</span>
              <span className="rd-caption rd-num">{anim.icon}</span>
            </div>
            <IconPickerGrid value={anim.icon} onChange={i => update({ icon: i })}/>
          </div>
        </div>

        {/* Defaults */}
        <div className="rd-card rd-scroll" style={{ display: "grid", gap: 14, alignContent: "start", minHeight: 0 }}>
          <div className="rd-eyebrow">Default parameters</div>
          {[
            { k: "opacity", l: "Opacity",  min: 0.1, max: 1,   step: 0.05, fmt: v => `${Math.round(v*100)}%` },
            { k: "speed",   l: "Speed",    min: 0.1, max: 2.5, step: 0.05, fmt: v => `${v.toFixed(2)}×` },
            { k: "volume",  l: "Volume",   min: 0,   max: 100, step: 1,    fmt: v => `${v}%` },
          ].map(f => (
            <div key={f.k} style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="rd-body" style={{ fontSize: 13 }}>{f.l}</span>
                <span className="rd-num" style={{ fontSize: 13, color: "var(--c-text)" }}>{f.fmt(anim[f.k])}</span>
              </div>
              <input type="range" min={f.min} max={f.max} step={f.step} value={anim[f.k]}
                     onChange={e => update({ [f.k]: parseFloat(e.target.value) })}
                     className="rd-slider rd-slider-accent"
                     style={{ "--fill": `${((anim[f.k]-f.min)/(f.max-f.min))*100}%` }}/>
            </div>
          ))}
          <div className="rd-divider"/>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Icon name="clock" size={16}/>
            <div style={{ flex: 1 }}>
              <div className="rd-body" style={{ fontSize: 13 }}>Loop</div>
              <div className="rd-caption">Repeats until stopped.</div>
            </div>
            <button className="rd-toggle" role="switch" aria-checked={anim.loop}
                    onClick={() => update({ loop: !anim.loop })}/>
          </div>
        </div>
      </div>

      {/* Preview */}
      <aside style={{ borderLeft: "1px solid var(--c-border)", background: "var(--c-bg-raised)",
                      padding: 24, display: "grid", gridTemplateRows: "auto auto 1fr auto", gap: 16 }}>
        <div className="rd-eyebrow">Live preview</div>
        <div style={{ aspectRatio: "1", borderRadius: 20, background: "var(--c-bg)",
                      border: "1px solid var(--c-border)",
                      display: "grid", placeItems: "center",
                      boxShadow: "inset 0 0 60px rgba(0,0,0,0.25)",
                      position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 20, borderRadius: 14,
                        background: "var(--c-accent-bg)",
                        border: "1px solid var(--c-accent)",
                        display: "grid", placeItems: "center",
                        opacity: anim.opacity }}>
            <div style={{ color: "var(--c-accent)", display: "grid", placeItems: "center", gap: 10 }}>
              <Icon name={anim.icon} size={56} strokeWidth={1.4}/>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{anim.name}</div>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="rd-caption">Preview room</span>
            <span className="rd-body" style={{ fontSize: 13, color: "var(--c-text)" }}>Brood Chamber</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="rd-caption">Assets</span>
            <span className="rd-body" style={{ fontSize: 13, color: "var(--c-text)" }}>2 GIF · 1 WAV</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="rd-caption">Last edited</span>
            <span className="rd-body" style={{ fontSize: 13, color: "var(--c-text)" }}>2 minutes ago</span>
          </div>
        </div>
        <div style={{ alignSelf: "end", display: "grid", gap: 8 }}>
          <button className="rd-btn" style={{ width: "100%" }}>
            <Icon name="play" size={14} filled/> Test on board
          </button>
          <button className="rd-btn rd-btn-ghost" style={{ color: "var(--c-danger)" }}>
            <Icon name="trash" size={14}/> Delete animation
          </button>
        </div>
      </aside>
    </div>
  );
}

window.AnimationEditor = AnimationEditor;
window.IconPickerGrid = IconPickerGrid;
