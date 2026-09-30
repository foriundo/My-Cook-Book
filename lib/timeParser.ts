export function parseTimerSeconds(text: string): number | null {
  const hours = text.match(/(\d+)\s*(?:h|hr|hrs|hour|hours)\b/i);
  const minutes = text.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/i);
  const seconds = text.match(/(\d+)\s*(?:s|sec|secs|second|seconds)\b/i);
  const total = (Number(hours?.[1] ?? 0) * 3600)
    + (Number(minutes?.[1] ?? 0) * 60)
    + Number(seconds?.[1] ?? 0);

  return total > 0 ? total : null;
}