// 펜 · 형광펜 색과 곧게 펴기 (v0.7.1 · 2026-10-03 전무님 「형광펜 따로 · 색 다양하게 · 곧게 · 글자 또렷이」)
// 화면(app.js) · 도면(dxf.js) · 사본(share.js) 이 같이 쓴다 — 색을 고치면 여기 한 곳만
// 획의 c 는 한 글자 열쇠 (저장된 옛 획 r · b · y 도 그대로 읽힘 · y 는 v0.6 부터 형광)
'use strict';
const 펜색표 = {
  k: ['검정', '#1b1f24'], r: ['빨강', '#e5383b'], b: ['파랑', '#2b6bff'], n: ['초록', '#16a34a'],
  o: ['주황', '#f76707'], v: ['보라', '#8e44ad'], w: ['갈색', '#8b5a2b'],
  y: ['노랑', '#ffe14d'], g: ['연두', '#a6f05a'], s: ['하늘', '#7fd3ff'], p: ['분홍', '#ff9ad5'],
  h: ['주황', '#ffb35c'], l: ['보라', '#c9a7ff'],
};
const 펜들 = ['k', 'r', 'b', 'n', 'o', 'v', 'w'], 형광들 = ['y', 'g', 's', 'p', 'h', 'l'];
const 형광인가 = c => 형광들.includes(c);
const 색값 = (c, 어둠) => (c === 'k' && 어둠 ? '#f2f2f2' : (펜색표[c] || 펜색표.r)[1]);   // 검은 바탕 도면에서 검정은 흰색으로
const 획굵기 = c => (형광인가(c) ? 16 : 3);                                             // 화면 화소 (그을 때 기준)

// 곧게 펴기 — 화면 점 [x, y, …] 이 거의 한 줄이면 두 끝점만 · 거의 가로(세로)면 딱 가로(세로)로
//   흔들림 허용 : 8 화소 또는 길이의 6% · 기울기 6° 안쪽이면 가로 · 세로로 맞춤 · 24 화소보다 짧으면 그대로
function 곧게(점) {
  const n = 점.length; if (n < 6) return null;
  const x0 = 점[0], y0 = 점[1], x1 = 점[n - 2], y1 = 점[n - 1], L = Math.hypot(x1 - x0, y1 - y0);
  if (L < 24) return null;
  let 최 = 0;
  for (let k = 2; k < n - 2; k += 2) 최 = Math.max(최, Math.abs((x1 - x0) * (y0 - 점[k + 1]) - (x0 - 점[k]) * (y1 - y0)) / L);
  if (최 > Math.max(8, L * 0.06)) return null;
  const 사인 = Math.abs(y1 - y0) / L, 끝 = Math.sin(6 * Math.PI / 180);
  if (사인 < 끝) { const ym = (y0 + y1) / 2; return [x0, ym, x1, ym]; }
  if (Math.abs(x1 - x0) / L < 끝) { const xm = (x0 + x1) / 2; return [xm, y0, xm, y1]; }
  return [x0, y0, x1, y1];
}

// 도형 (0.9.4 · 목업 여덟가지_목업.html ⑬) — 두 점으로 반듯한 화살표(a) · 네모(r) · 동그라미(o) 를 «점 목록» 으로
//   그리기 · 지우개 · 되돌리기 · 사본은 펜 획과 똑같이 다룸 (획에 f = 꼴 · a = 두 점을 같이 적어 두어 나중에 옮기기 · 크기 바꾸기)
//   좌표는 가로 · 세로 길이가 같은 단위 (쪽은 쪽 너비 · 높이를 곱한 값 · 도면은 도면 좌표) · 굵 = 선 굵기 같은 단위
function 도형점(f, x0, y0, x1, y1, 굵) {
  if (f === 'r') return [x0, y0, x1, y0, x1, y1, x0, y1, x0, y0];
  if (f === 'o') {
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.abs(x1 - x0) / 2, ry = Math.abs(y1 - y0) / 2, a = [];
    for (let k = 0; k <= 48; k++) { const t = k / 48 * 2 * Math.PI; a.push(cx + rx * Math.cos(t), cy + ry * Math.sin(t)); }
    return a;
  }
  // 화살표 — 꼬리 → 끝 → 한쪽 날개 → 끝 → 다른 날개 (머리 = 굵기의 7배 · 길이의 40% 까지 · 날개 26°)
  const L = Math.hypot(x1 - x0, y1 - y0) || 1, h = Math.min(L * 0.4, 굵 * 7), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
  const c = Math.cos(Math.PI / 7), s = Math.sin(Math.PI / 7);
  return [x0, y0, x1, y1, x1 - h * (ux * c - uy * s), y1 - h * (uy * c + ux * s), x1, y1, x1 - h * (ux * c + uy * s), y1 - h * (uy * c - ux * s)];
}
// 점 (x, y) 에서 획 선(토막)까지 가장 가까운 거리 — 같은 길이 단위 [x0, y0, x1, y1, …]
function 선거리(p, x, y) {
  if (p.length === 2) return Math.hypot(p[0] - x, p[1] - y);
  let 최 = Infinity;
  for (let k = 2; k < p.length; k += 2) {
    const ax = p[k - 2], ay = p[k - 1], dx = p[k] - ax, dy = p[k + 1] - ay, L = dx * dx + dy * dy;
    const t = L ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L)) : 0;
    최 = Math.min(최, Math.hypot(ax + t * dx - x, ay + t * dy - y));
  }
  return 최;
}
// 글 획(t)의 상자 [x0, y0, x1, y1] — 좌표는 «아래로 갈수록 커지는» 꼴 (도면은 y 를 뒤집어 넣음) · r = 쓸 때의 돌림 (그 방향에서 늘 똑바로)
//   글 너비는 글자 수로 어림 (한글 1 · 영문 · 숫자 0.6 글자 크기)
function 글상자(X, Y, fs, 글, r) {
  const tw = Math.max(1, [...String(글)].reduce((s, ch) => s + (ch.charCodeAt(0) > 255 ? 1 : 0.6), 0)) * fs, th = fs * 1.25;
  return r === 1 ? [X, Y - tw, X + th, Y] : r === 2 ? [X - tw, Y - th, X, Y] : r === 3 ? [X - th, Y, X, Y + tw] : [X, Y, X + tw, Y + th];
}
