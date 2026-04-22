// Artboard D — Foundations spec card
// Shows the shared grammar behind the 3 directions.
// Colors · Type · Icons · Components.

function ArtboardFoundations() {
  const iconList = [
    "play", "pause", "stop", "power", "settings", "grid", "list", "x", "check",
    "plus", "minus", "flame", "sparkles", "bolt", "bell", "shield",
    "sound_on", "sound_off", "eye", "eye_off", "target", "frame", "map", "room",
    "layers", "clock", "search", "trash", "drop", "ghost", "scan", "rocket",
    "sliders", "lock", "wifi", "edit", "resize", "arrows", "menu", "more",
    "info", "chev_down", "chev_right", "chevron_up", "picker",
  ];

  const swatchesDark = [
    ["#0b0d10", "bg"], ["#14171c", "bg raised"], ["#f2f4f7", "text"], ["#a0a6b0", "text 2"],
    ["#32D3A3", "accent"], ["#FF5B5B", "danger"], ["#7DD3FC", "room"], ["#F5B544", "warn"],
  ];
  const swatchesLight = [
    ["#F6F4EF", "bg"], ["#FFFFFF", "raised"], ["#1A1D22", "text"], ["#6B7079", "text 2"],
    ["#1E7F63", "accent"], ["#C0392B", "danger"], ["#2563EB", "room"], ["#B07A16", "warn"],
  ];
  const swatchesInk = [
    ["#07070A", "bg"], ["#101017", "raised"], ["#F5F2FF", "text"], ["#A9A3BF", "text 2"],
    ["#B794FF", "accent"], ["#FF6B8A", "danger"], ["#9FE3FF", "room"], ["#FFC278", "warn"],
  ];

  const Swatch = ({ c, l }) => (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ width: "100%", aspectRatio: 1, borderRadius: 10, background: c,
                    border: "1px solid var(--c-border)" }}/>
      <div className="rd-caption" style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
        <span>{l}</span>
        <span className="rd-num" style={{ color: "var(--c-text-3)", fontSize: 10 }}>{c}</span>
      </div>
    </div>
  );

  return (
    <div className="dir-obsidian" style={{ width: 1280, minHeight: 832, background: "var(--c-bg)",
                                            color: "var(--c-text)", padding: 32,
                                            display: "grid", gap: 24 }}>
      {/* Header */}
      <header>
        <div className="rd-eyebrow" style={{ color: "var(--c-accent)", marginBottom: 6 }}>FOUNDATIONS</div>
        <h1 className="rd-h1" style={{ fontSize: 36, marginBottom: 8 }}>Calm, precise, tactile.</h1>
        <p className="rd-body" style={{ color: "var(--c-text-2)", maxWidth: 640 }}>
          A refined visual language for TableTop Beamer — inspired by Apple's clarity and quiet confidence.
          One accent color. Pure geometry. Icons do the talking.
        </p>
      </header>

      {/* Palette triptych */}
      <section>
        <div className="rd-eyebrow" style={{ marginBottom: 14 }}>PALETTE — THREE DIRECTIONS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
          {[
            { name: "Obsidian", desc: "Dark charcoal. Single mint accent.", data: swatchesDark, accent: "#32D3A3", bg: "#0b0d10" },
            { name: "Bone",     desc: "Warm paper. Forest green accent.",   data: swatchesLight, accent: "#1E7F63", bg: "#F6F4EF" },
            { name: "Inkwell",  desc: "Deep night. Violet accent.",          data: swatchesInk, accent: "#B794FF", bg: "#07070A" },
          ].map(p => (
            <div key={p.name} style={{ padding: 16, borderRadius: 18, border: "1px solid var(--c-border)",
                                        background: p.bg, color: p.bg.startsWith("#F") ? "#1A1D22" : "#f2f4f7" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 999, background: p.accent }}/>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
              </div>
              <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 14 }}>{p.desc}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {p.data.map(([c, l]) => (
                  <div key={c} style={{ display: "grid", gap: 4 }}>
                    <div style={{ aspectRatio: 1, borderRadius: 8, background: c,
                                  border: "1px solid rgba(127,127,127,0.2)" }}/>
                    <div style={{ fontSize: 10, opacity: 0.65 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Type + Icon grid */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div className="rd-card">
          <div className="rd-eyebrow" style={{ marginBottom: 16 }}>TYPOGRAPHY — INTER / INTER TIGHT</div>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div style={{ fontFamily: "var(--rd-font-display)", fontWeight: 700, fontSize: 36,
                            letterSpacing: "-0.022em", color: "var(--c-text)" }}>
                Display 36
              </div>
              <div className="rd-caption">Inter Tight · -2.2% tracking · Headlines</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--rd-font-display)", fontWeight: 600, fontSize: 17,
                            letterSpacing: "-0.014em", color: "var(--c-text)" }}>
                Title 17 — Section header
              </div>
              <div className="rd-caption">Inter Tight · -1.4% · Card + panel titles</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--rd-font-body)", fontSize: 14, color: "var(--c-text)" }}>
                Body 14 — Clean, quiet, humane copy for interface labels and content.
              </div>
              <div className="rd-caption">Inter · Default body + controls</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--rd-font-body)", fontSize: 12, color: "var(--c-text-2)" }}>
                Caption 12 — Meta and hints
              </div>
              <div className="rd-caption">Inter · Secondary text</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--rd-font-body)", fontWeight: 600, fontSize: 11,
                            textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--c-text-3)" }}>
                EYEBROW 11 · 8% TRACKING
              </div>
              <div className="rd-caption">Inter · Groups and labels</div>
            </div>
          </div>
        </div>

        <div className="rd-card">
          <div className="rd-eyebrow" style={{ marginBottom: 16 }}>ICONOGRAPHY — 24×24 · 1.75 STROKE · ROUNDED</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 10 }}>
            {iconList.map(n => (
              <div key={n} style={{
                aspectRatio: 1, borderRadius: 10,
                background: "var(--c-surface)",
                border: "1px solid var(--c-border)",
                display: "grid", placeItems: "center",
                color: "var(--c-text-2)"
              }} title={n}>
                <Icon name={n} size={18}/>
              </div>
            ))}
          </div>
          <p className="rd-caption" style={{ marginTop: 12 }}>
            Custom Lucide-aligned set. No emoji. One visual weight. Icons replace labels everywhere
            they carry meaning on their own.
          </p>
        </div>
      </section>

      {/* Component row */}
      <section className="rd-card">
        <div className="rd-eyebrow" style={{ marginBottom: 16 }}>COMPONENTS — PILL BUTTONS · SEGMENTED · TOGGLE · ICON BUTTON</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          <button className="rd-btn rd-btn-primary rd-btn-lg">
            <Icon name="play" size={16} strokeWidth={2.5} filled/> Start
          </button>
          <button className="rd-btn rd-btn-lg">
            <Icon name="pause" size={16}/> Pause
          </button>
          <button className="rd-btn">
            <Icon name="settings" size={15}/> Settings
          </button>
          <button className="rd-btn rd-btn-ghost">
            <Icon name="info" size={14}/> Help
          </button>
          <button className="rd-btn rd-btn-danger">
            <Icon name="trash" size={14}/> Clear all
          </button>
          <div className="rd-segmented">
            <button aria-selected={true}>Play</button>
            <button>Setup</button>
            <button>Output</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 14px", background: "var(--c-surface)",
                        border: "1px solid var(--c-border)", borderRadius: 14 }}>
            <Icon name="sound_on" size={16}/>
            <span className="rd-body" style={{ fontSize: 13 }}>Sound</span>
            <div className="rd-toggle" role="switch" aria-checked="true" tabIndex={0}/>
          </div>
          <button className="rd-icon-btn"><Icon name="bell"/></button>
          <button className="rd-icon-btn is-on"><Icon name="target"/></button>
          <span className="rd-chip" data-variant="accent">
            <span className="rd-dot rd-dot-pulse"/> Live
          </span>
          <span className="rd-chip" data-variant="room">Brood Chamber</span>
          <span className="rd-chip" data-variant="danger">Error</span>
        </div>
      </section>

      {/* Principles */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
        {[
          { i: "target",   t: "Glanceable", d: "Operator checks the panel with dice in hand — icons read first." },
          { i: "layers",   t: "Layered",    d: "One accent color. One surface material. Depth from blur and shadow." },
          { i: "sparkles", t: "Alive",      d: "Subtle pulse, spring scale, 140–220ms ease. Never distracts from play." },
          { i: "shield",   t: "Local",      d: "Nothing leaves the room. No accounts, no cloud, no telemetry." },
        ].map(p => (
          <div key={p.t} className="rd-card rd-card-tight">
            <div style={{ width: 32, height: 32, borderRadius: 8,
                          background: "var(--c-accent-bg)", color: "var(--c-accent)",
                          display: "grid", placeItems: "center", marginBottom: 10 }}>
              <Icon name={p.i} size={16}/>
            </div>
            <div className="rd-h2" style={{ fontSize: 14, marginBottom: 4 }}>{p.t}</div>
            <div className="rd-caption" style={{ lineHeight: 1.45 }}>{p.d}</div>
          </div>
        ))}
      </section>
    </div>
  );
}

window.ArtboardFoundations = ArtboardFoundations;
