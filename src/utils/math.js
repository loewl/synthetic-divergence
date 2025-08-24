export const TAU = Math.PI * 2;

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (a = 1, b = 0) => Math.random() * (a - b) + b;
export const choice = a => a[(Math.random() * a.length) | 0];
export const dist2 = (ax, ay, bx, by) => {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
};
export const wrap = (v, max) => (v < 0 ? v + max : (v >= max ? v - max : v));
export const hueDiff = (h1, h2) => {
  let d = Math.abs(h1 - h2) % 360;
  return d > 180 ? 360 - d : d;
};
