// Theme toggle — light/dark switch for the Obsidian direction.
// Persists to localStorage. Emits CSS class change.

function ThemeToggle({ value, onChange }) {
  return (
    <div className="rd-segmented" role="tablist" aria-label="Theme">
      <button aria-selected={value === "light"} onClick={() => onChange("light")} title="Light mode">
        <Icon name="sparkles" size={13} strokeWidth={2}/> Light
      </button>
      <button aria-selected={value === "dark"} onClick={() => onChange("dark")} title="Dark mode">
        <Icon name="ghost" size={13} strokeWidth={2}/> Dark
      </button>
    </div>
  );
}

window.ThemeToggle = ThemeToggle;
