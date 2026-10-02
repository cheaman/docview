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
