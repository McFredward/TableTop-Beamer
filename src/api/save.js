export function classifyHttpStatus(status) {
  if (!Number.isFinite(Number(status))) {
    return "n/a";
  }
  return `${Math.floor(Number(status) / 100)}xx`;
}
