let counter = 0;

export function uid(prefix = ''): string {
  counter = (counter + 1) % 100000;
  const stamp = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}${stamp}${counter.toString(36)}${rand}`;
}
