// Shared animation library — used by editor + pickers.
// Each animation has id, name, icon (from Icons set), color hint, defaults.

const ANIMATION_LIBRARY = [
  { id: "intruder",    name: "Intruder Alert", icon: "bell",     color: "danger", opacity: 0.9, speed: 1.0, volume: 70, loop: false },
  { id: "fire",        name: "Fire",           icon: "flame",    color: "warn",   opacity: 0.85, speed: 1.2, volume: 80, loop: true },
  { id: "malfunction", name: "Malfunction",    icon: "bolt",     color: "warn",   opacity: 0.7,  speed: 1.5, volume: 60, loop: false },
  { id: "burst",       name: "Burst",          icon: "sparkles", color: "accent", opacity: 1.0,  speed: 1.0, volume: 90, loop: false },
  { id: "slime",       name: "Slime",          icon: "drop",     color: "room",   opacity: 0.75, speed: 0.6, volume: 50, loop: true },
  { id: "scanning",    name: "Scanning",       icon: "scan",     color: "room",   opacity: 0.6,  speed: 0.8, volume: 40, loop: true },
  { id: "haunt",       name: "Haunt",          icon: "ghost",    color: "accent", opacity: 0.8,  speed: 0.5, volume: 55, loop: true },
  { id: "lockdown",    name: "Lockdown",       icon: "lock",     color: "danger", opacity: 0.95, speed: 1.0, volume: 85, loop: false },
];

// The available icons a user can pick for their animation
const ICON_PICKER_SET = [
  "flame","bolt","sparkles","drop","ghost","scan","bell","shield",
  "lock","rocket","power","target","eye","sound_on","room","layers",
  "search","clock","edit","plus","check","menu","map","wifi",
];

window.ANIMATION_LIBRARY = ANIMATION_LIBRARY;
window.ICON_PICKER_SET = ICON_PICKER_SET;
