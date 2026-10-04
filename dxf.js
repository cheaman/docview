// DXF 도면 보기 (④ · 2026-10-03)
// 구역 지도 : ① 글자판 · 짝(그룹 코드) 읽기 ② 머리 · 레이어 · 블록 · 개체 모으기 ③ 개체 → 그릴 목록 (블록 펼치기 · OCS 뒤집힘)
//             ④ 색 (ACI 256) ⑤ 글자 다듬기 (%%c · \U+ · MTEXT 서식) ⑥ 범위 (튀는 점 빼고) ⑦ 캔버스 그리기 · 손가락 · 레이어
// 인터넷 · 부품 없음 — 캔버스에 직접 그린다
'use strict';

const 도면 = {};

// ① 글자판 · 짝 ───────────────────────────────────
도면.읽기 = function (buf) {
  const u8 = new Uint8Array(buf);
  const 앞 = new TextDecoder('latin1').decode(u8.subarray(0, Math.min(u8.length, 300000)));
  if (앞.startsWith('AutoCAD Binary DXF')) throw new Error('이진(binary) DXF → 못 엶 · 글자(ASCII) DXF 로 저장해 받기');
  if (앞.startsWith('AC10')) throw new Error('DWG 파일 (이름만 .dxf) → 못 엶 · PDF · DXF 로 받기');
  const 판 = /\$ACADVER\s*\r?\n\s*1\s*\r?\n\s*(AC\d+)/.exec(앞)?.[1] || '';
  const 쪽 = /\$DWGCODEPAGE\s*\r?\n\s*3\s*\r?\n\s*([^\r\n]+)/.exec(앞)?.[1].trim() || '';
  const 판수 = parseInt(판.slice(2), 10) || 0;
  let 글자판 = 'utf-8';
  if (판수 && 판수 < 1021) 글자판 = /949/.test(쪽) ? 'euc-kr' : /932/.test(쪽) ? 'shift_jis' : /936/.test(쪽) ? 'gbk' : /950/.test(쪽) ? 'big5' : 'windows-1252';
  let 글 = new TextDecoder(글자판).decode(u8);
  if (글자판 === 'utf-8' && 글.includes('�')) 글 = new TextDecoder(/949/.test(쪽) || !쪽 ? 'euc-kr' : 'windows-1252').decode(u8);
  const 줄 = 글.split(/\r?\n/);
  return { 줄, 판, 쪽, 글자판 };
};

// ② 머리 · 레이어 · 블록 · 개체 ───────────────────
도면.모으기 = function ({ 줄 }) {
  let i = 0;
  const 짝 = () => { const c = parseInt(줄[i], 10); const v = 줄[i + 1] ?? ''; i += 2; return [c, v]; };
  const 머리 = {}, 레이어 = new Map(), 블록 = new Map(), 개체 = [];
  function 개체하나(종류) {                     // 다음 0 이 나올 때까지 [코드, 값] 모음
    const g = [];
    while (i < 줄.length) { const c = parseInt(줄[i], 10); if (c === 0) break; g.push([c, (줄[i + 1] ?? '').trim()]); i += 2; }
    return { 종류, g };
  }
  function 개체들(끝말, 담을곳) {
    while (i < 줄.length) {
      const [c, v0] = 짝(); const v = v0.trim();
      if (c !== 0) continue;
      if (v === 끝말 || v === 'ENDSEC' || v === 'EOF') return v;
      const e = 개체하나(v);
      if (v === 'POLYLINE') {                     // VERTEX … SEQEND 를 붙임
        e.꼭짓점 = [];
        while (i < 줄.length) {
          const [c2, w0] = 짝(); const w = w0.trim();
          if (c2 !== 0) continue;
          if (w === 'VERTEX') e.꼭짓점.push(개체하나('VERTEX'));
          else { if (w !== 'SEQEND') i -= 2; else 개체하나('SEQEND'); break; }
        }
      } else if (v === 'INSERT') {                // ATTRIB … SEQEND
        const 따름 = e.g.find(x => x[0] === 66);
        if (따름 && 따름[1] === '1') {
          e.속성 = [];
          while (i < 줄.length) {
            const [c2, w0] = 짝(); const w = w0.trim();
            if (c2 !== 0) continue;
            if (w === 'ATTRIB') e.속성.push(개체하나('ATTRIB'));
            else { if (w !== 'SEQEND') i -= 2; else 개체하나('SEQEND'); break; }
          }
        }
      }
      담을곳.push(e);
    }
    return 'EOF';
  }
  while (i < 줄.length) {
    const [c, v0] = 짝(); const v = v0.trim();
    if (c !== 0 || v !== 'SECTION') continue;
    const [, 이름0] = 짝(); const 이름 = 이름0.trim();
    if (이름 === 'HEADER') {
      let 변수 = null;
      while (i < 줄.length) {
        const [c2, w0] = 짝(); const w = w0.trim();
        if (c2 === 0 && w === 'ENDSEC') break;
        if (c2 === 9) { 변수 = w; 머리[변수] = {}; }
        else if (변수) 머리[변수][c2] = w;
      }
    } else if (이름 === 'TABLES') {
      while (i < 줄.length) {
        const [c2, w0] = 짝(); const w = w0.trim();
        if (c2 === 0 && w === 'ENDSEC') break;
        if (c2 === 0 && w === 'LAYER') {
          const e = 개체하나('LAYER');
          const 값 = k => e.g.find(x => x[0] === k)?.[1];
          const 이름 = 값(2); if (이름 == null) continue;
          const 색 = parseInt(값(62) ?? '7', 10), 깃 = parseInt(값(70) ?? '0', 10), 참색 = 값(420);
          레이어.set(이름, { 이름, 색: Math.abs(색) || 7, 참색: 참색 != null ? +참색 : null, 켜짐: 색 >= 0 && !(깃 & 1), 수: 0 });
        }
      }
    } else if (이름 === 'BLOCKS') {
      while (i < 줄.length) {
        const [c2, w0] = 짝(); const w = w0.trim();
        if (c2 === 0 && w === 'ENDSEC') break;
        if (c2 === 0 && w === 'BLOCK') {
          const b = 개체하나('BLOCK');
          const 값 = k => b.g.find(x => x[0] === k)?.[1];
          const 담 = [];
          개체들('ENDBLK', 담);
          개체하나('ENDBLK');
          블록.set(값(2), { 이름: 값(2), x: +(값(10) || 0), y: +(값(20) || 0), 개체: 담 });
        }
      }
    } else if (이름 === 'ENTITIES') {
      개체들('ENDSEC', 개체);
    }
  }
  return { 머리, 레이어, 블록, 개체 };
};

// ③ 개체 → 그릴 목록 ──────────────────────────────
// 변환 m = [a, b, c, d, e, f] : x' = a·x + c·y + e , y' = b·x + d·y + f
const 변곱 = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
const 변옮김 = (x, y) => [1, 0, 0, 1, x, y], 변돌림 = r => [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0], 변늘림 = (sx, sy) => [sx, 0, 0, sy, 0, 0];
const 변점 = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

도면.목록 = function (모음, 앞) {
  const { 레이어, 블록, 개체 } = 모음;
  const 목록 = [];                               // {k:'L', p:Float64Array, 닫힘, 색, 층} · {k:'T', x, y, h, r, 글, 가로, 세로, 색, 층} · {k:'F', p, 색, 층, 옅음}
  let 모자람 = 0;
  const 한도 = 3000000;                          // 점 수 한도 (폰 메모리 · 약 48MB)
  // 원 · 타원 쪼갬 — 도면 크기에 견줘 작은 것은 덜 쪼갬 (43MB 도면이 96토막 타원 2만 8천 개로 한도에 걸림 · 10-03)
  const 머 = 모음.머리 || {}, 최소 = 머.$EXTMIN || {}, 최대 = 머.$EXTMAX || {};
  const 대각 = Math.hypot((+최대[10] || 0) - (+최소[10] || 0), (+최대[20] || 0) - (+최소[20] || 0));
  const 기준 = 대각 > 0 && 대각 < 1e12 ? 대각 : 0;
  const 토막 = r => 기준 ? Math.max(12, Math.min(96, Math.ceil(96 * Math.sqrt(Math.min(1, Math.abs(r) / (기준 * 0.02)))))) : 64;
  let 점수 = 0;
  const 층얻기 = 이름 => { if (!레이어.has(이름)) 레이어.set(이름, { 이름, 색: 7, 참색: null, 켜짐: true, 수: 0 }); return 레이어.get(이름); };

  function 펼치기(목, m, 부모층, 부모색, 깊이) {
    for (const e of 목) 하나(e, m, 부모층, 부모색, 깊이);
  }
  function 하나(e, m, 부모층, 부모색, 깊이) {
    if (점수 > 한도) { 모자람++; return; }
    const g = e.g; const 값 = (k, d) => { const x = g.find(t => t[0] === k); return x ? x[1] : d; }; const 수 = (k, d = 0) => { const x = g.find(t => t[0] === k); return x ? +x[1] : d; };
    if (값(67) === '1') return;                  // 종이 공간
    let 층이름 = 값(8, '0'); if (층이름 === '0' && 부모층) 층이름 = 부모층;
    const 층 = 층얻기(층이름); 층.수++;
    let 색 = { aci: parseInt(값(62, '256'), 10), 참: g.find(t => t[0] === 420) ? +값(420) : null };
    if (색.참 == null && 색.aci === 0) 색 = 부모색 || { aci: 7, 참: null };      // 블록 따라
    if (색.참 == null && 색.aci === 256) 색 = { 층: true };                       // 레이어 따라
    // OCS 뒤집힘 (밀어내기 z 가 음수 → x 를 뒤집음)
    const ez = 수(230, 1);
    const ocs = ez < 0 ? 변곱(m, 변늘림(-1, 1)) : m;
    const 선 = (pts, 닫힘, 쓸m = ocs) => {
      const p = new Float64Array(pts.length);
      for (let k = 0; k < pts.length; k += 2) { const q = 변점(쓸m, pts[k], pts[k + 1]); p[k] = q[0]; p[k + 1] = q[1]; }
      점수 += pts.length / 2;
      목록.push({ k: 'L', p, 닫힘, 색, 층: 층이름 });
    };
    const 호점 = (cx, cy, r, a0, a1, 쪼갬) => {   // 각도는 라디안 · a0→a1 반시계
      while (a1 <= a0) a1 += Math.PI * 2;
      const n = Math.max(4, Math.min(256, Math.ceil((a1 - a0) / (Math.PI * 2) * (쪼갬 || 96))));
      const pts = [];
      for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
      return pts;
    };
    const 부풀림 = (pts, 볼록) => {               // 폴리선 점 + bulge → 호를 쪼갠 점
      const out = [];
      for (let k = 0; k < pts.length / 2; k++) {
        const x0 = pts[2 * k], y0 = pts[2 * k + 1];
        out.push(x0, y0);
        const b = 볼록[k] || 0;
        if (!b || k === pts.length / 2 - 1 && !볼록.닫힘) continue;
        const j = (k + 1) % (pts.length / 2), x1 = pts[2 * j], y1 = pts[2 * j + 1];
        const 사잇각 = 4 * Math.atan(b), d = Math.hypot(x1 - x0, y1 - y0);
        if (!d) continue;
        const r = d / (2 * Math.sin(사잇각 / 2));
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, h = r * Math.cos(사잇각 / 2);
        const nx = -(y1 - y0) / d, ny = (x1 - x0) / d;
        const cx = mx + nx * h, cy = my + ny * h;
        const a0 = Math.atan2(y0 - cy, x0 - cx);
        const n = Math.max(2, Math.min(64, Math.ceil(Math.abs(사잇각) / (Math.PI / 24))));
        for (let s = 1; s < n; s++) { const a = a0 + 사잇각 * s / n; out.push(cx + Math.abs(r) * Math.cos(a), cy + Math.abs(r) * Math.sin(a)); }
      }
      return out;
    };
    switch (e.종류) {
      case 'LINE': 선([수(10), 수(20), 수(11), 수(21)], false, m); break;
      case 'LWPOLYLINE': {
        const pts = [], 볼록 = []; let 마지막 = -1;
        for (const [c, v] of g) {
          if (c === 10) { pts.push(+v, 0); 마지막 = pts.length / 2 - 1; 볼록[마지막] = 0; }
          else if (c === 20 && 마지막 >= 0) pts[2 * 마지막 + 1] = +v;
          else if (c === 42 && 마지막 >= 0) 볼록[마지막] = +v;
        }
        볼록.닫힘 = !!(수(70) & 1);
        if (pts.length >= 4) 선(부풀림(pts, 볼록), 볼록.닫힘);
        break;
      }
      case 'POLYLINE': {
        const 깃 = 수(70);
        if (깃 & (16 | 64)) break;               // 3D 그물 · 다면 그물은 생략
        const pts = [], 볼록 = [];
        for (const v of e.꼭짓점 || []) {
          const vg = v.g, f = k => +(vg.find(t => t[0] === k)?.[1] || 0);
          if (f(70) & 16) continue;               // 스플라인 뼈대 점
          pts.push(f(10), f(20)); 볼록.push(f(42));
        }
        볼록.닫힘 = !!(깃 & 1);
        if (pts.length >= 4) 선(부풀림(pts, 볼록), 볼록.닫힘, (깃 & 8) ? m : ocs);
        break;
      }
      case 'CIRCLE': 선(호점(수(10), 수(20), 수(40), 0, Math.PI * 2, 토막(수(40))), true); break;
      case 'ARC': 선(호점(수(10), 수(20), 수(40), 수(50) * Math.PI / 180, 수(51) * Math.PI / 180, 토막(수(40))), false); break;
      case 'ELLIPSE': {
        const cx = 수(10), cy = 수(20), ax = 수(11), ay = 수(21), 비 = 수(40, 1);
        let t0 = 수(41, 0), t1 = 수(42, Math.PI * 2);
        while (t1 <= t0) t1 += Math.PI * 2;
        const 부호 = ez < 0 ? -1 : 1, bx = -ay * 비 * 부호, by = ax * 비 * 부호;
        const n = Math.max(8, Math.ceil((t1 - t0) / (Math.PI * 2) * 토막(Math.hypot(ax, ay)))), pts = [];
        for (let k = 0; k <= n; k++) { const t = t0 + (t1 - t0) * k / n; pts.push(cx + ax * Math.cos(t) + bx * Math.sin(t), cy + ay * Math.cos(t) + by * Math.sin(t)); }
        선(pts, false, m);
        break;
      }
      case 'SPLINE': {                           // 맞춤점이 있으면 그것, 없으면 조정점을 이은 선 (가깝게)
        const 맞춤 = [], 조정 = [];
        for (let k = 0; k < g.length; k++) {
          if (g[k][0] === 11) 맞춤.push(+g[k][1], +(g[k + 1]?.[0] === 21 ? g[k + 1][1] : 0));
          if (g[k][0] === 10) 조정.push(+g[k][1], +(g[k + 1]?.[0] === 20 ? g[k + 1][1] : 0));
        }
        const pts = 맞춤.length >= 4 ? 맞춤 : 조정;
        if (pts.length >= 4) 선(pts, !!(수(70) & 1), m);
        break;
      }
      case 'POINT': 선([수(10) - 0.0001, 수(20), 수(10) + 0.0001, 수(20)], false, m); break;
      case 'SOLID': case 'TRACE': case '3DFACE': {
        const p = [수(10), 수(20), 수(11), 수(21), 수(13, 수(12)), 수(23, 수(22)), 수(12), 수(22)];
        const q = []; for (let k = 0; k < 8; k += 2) { const t = 변점(e.종류 === '3DFACE' ? m : ocs, p[k], p[k + 1]); q.push(t[0], t[1]); }
        if (e.종류 === '3DFACE') 목록.push({ k: 'L', p: Float64Array.from(q), 닫힘: true, 색, 층: 층이름 });
        else 목록.push({ k: 'F', p: Float64Array.from(q), 색, 층: 층이름, 옅음: 1 });
        점수 += 4;
        break;
      }
      case 'HATCH': {                             // 칠은 옅게 · 무늬는 생략 · 경계는 선 · 호 · 폴리선만
        const 칠 = 수(70) & 1;
        const 고리들 = [];
        let k = g.findIndex(t => t[0] === 91);
        if (k < 0) break;
        const 고리수 = +g[k][1]; k++;
        for (let r = 0; r < 고리수 && k < g.length; r++) {
          while (k < g.length && g[k][0] !== 92) k++;
          const 종류 = +g[k][1]; k++;
          const pts = [];
          if (종류 & 2) {                         // 폴리선 고리
            const 볼록있음 = +(g.find((t, j) => j >= k && t[0] === 72)?.[1] || 0);
            while (k < g.length && g[k][0] !== 93) k++;
            const n = +g[k][1]; k++; const 볼록 = [];
            for (let s = 0; s < n && k < g.length; s++) {
              while (k < g.length && g[k][0] !== 10) k++;
              pts.push(+g[k][1], +g[k + 1][1]); k += 2;
              if (볼록있음 && g[k]?.[0] === 42) { 볼록.push(+g[k][1]); k++; } else 볼록.push(0);
            }
            볼록.닫힘 = true;
            고리들.push(부풀림(pts, 볼록));
          } else {
            while (k < g.length && g[k][0] !== 93) k++;
            const n = +g[k][1]; k++;
            for (let s = 0; s < n && k < g.length; s++) {
              while (k < g.length && g[k][0] !== 72) k++;
              const 모 = +g[k][1]; k++;
              const 다음 = 코 => { while (k < g.length && g[k][0] !== 코) k++; const v = +g[k]?.[1]; k++; return v; };
              if (모 === 1) { pts.push(다음(10), 다음(20), 다음(11), 다음(21)); }
              else if (모 === 2) {                 // 호 — 73=1 반시계 · 0 이면 시계 (각도도 시계 기준)
                const cx = 다음(10), cy = 다음(20), r = 다음(40), a0 = 다음(50) * Math.PI / 180, a1 = 다음(51) * Math.PI / 180, 반시계 = 다음(73);
                if (반시계) pts.push(...호점(cx, cy, r, a0, a1, 48));
                else { const a = 호점(cx, cy, r, -a1, -a0, 48), 뒤 = []; for (let s3 = a.length - 2; s3 >= 0; s3 -= 2) 뒤.push(a[s3], a[s3 + 1]); pts.push(...뒤); }
              }
              else if (모 === 3) { const cx = 다음(10), cy = 다음(20), ax = 다음(11), ay = 다음(21), 비 = 다음(40), t0 = 다음(50) * Math.PI / 180, t1 = 다음(51) * Math.PI / 180; for (let s2 = 0; s2 <= 24; s2++) { const t = t0 + (t1 - t0) * s2 / 24; pts.push(cx + ax * Math.cos(t) - ay * 비 * Math.sin(t), cy + ay * Math.cos(t) + ax * 비 * Math.sin(t)); } }
              else { while (k < g.length && g[k][0] !== 72 && g[k][0] !== 92 && g[k][0] !== 97) k++; }
            }
            고리들.push(pts);
          }
        }
        for (const pts of 고리들) {
          if (pts.length < 6) continue;
          const q = new Float64Array(pts.length);
          for (let s = 0; s < pts.length; s += 2) { const t = 변점(ocs, pts[s], pts[s + 1]); q[s] = t[0]; q[s + 1] = t[1]; }
          목록.push({ k: 'F', p: q, 색, 층: 층이름, 옅음: 칠 ? 0.55 : 0.12 });
          점수 += pts.length / 2;
        }
        break;
      }
      case 'TEXT': case 'ATTRIB': case 'MTEXT': {
        if (e.종류 === 'ATTRIB' && (수(70) & 1)) break;   // 숨은 속성
        let 글 = '';
        if (e.종류 === 'MTEXT') { for (const [c, v] of g) if (c === 3) 글 += v; 글 += 값(1, ''); 글 = 도면.MTEXT다듬기(글); }
        else 글 = 도면.글다듬기(값(1, ''));
        if (!글.trim()) break;
        let x = 수(10), y = 수(20), r = 수(50) * Math.PI / 180, h = 수(40, 1), 가로 = 'left', 세로 = 'alphabetic';
        if (e.종류 !== 'MTEXT') {
          const ha = 수(72), va = 수(e.종류 === 'ATTRIB' ? 74 : 73);
          if ((ha || va) && g.some(t => t[0] === 11)) { x = 수(11); y = 수(21); }
          가로 = ['left', 'center', 'right', 'left', 'center', 'left'][ha] || 'left';
          if (ha === 4) 세로 = 'middle'; else 세로 = ['alphabetic', 'bottom', 'middle', 'top'][va] || 'alphabetic';
        } else {
          const 붙임 = 수(71, 1);
          가로 = ['left', 'center', 'right'][(붙임 - 1) % 3];
          세로 = ['top', 'middle', 'bottom'][Math.floor((붙임 - 1) / 3)];
          if (g.some(t => t[0] === 11)) r = Math.atan2(수(21), 수(11));
        }
        const 쓸 = e.종류 === 'MTEXT' ? m : ocs;
        const q = 변점(쓸, x, y);
        const 축 = [쓸[0] * Math.cos(r) + 쓸[2] * Math.sin(r), 쓸[1] * Math.cos(r) + 쓸[3] * Math.sin(r)];
        const 배 = Math.sqrt(Math.abs(쓸[0] * 쓸[3] - 쓸[1] * 쓸[2]));
        목록.push({ k: 'T', x: q[0], y: q[1], h: h * 배, r: Math.atan2(축[1], 축[0]), 글, 가로, 세로, 색, 층: 층이름 });
        break;
      }
      case 'INSERT': case 'DIMENSION': {
        if (깊이 > 12) break;
        const b = 블록.get(값(2)); if (!b) break;
        let 바꿈;
        if (e.종류 === 'DIMENSION') 바꿈 = m;                               // 치수 블록은 이미 제 자리
        else {
          const sx = 수(41, 1), sy = 수(42, 1), r = 수(50) * Math.PI / 180;
          const 열 = Math.max(1, 수(70, 1)), 행 = Math.max(1, 수(71, 1)), 열간 = 수(44), 행간 = 수(45);
          for (let a = 0; a < 행; a++) for (let c = 0; c < 열; c++) {
            const 바 = 변곱(변곱(변곱(변곱(ocs, 변옮김(수(10), 수(20))), 변돌림(r)), 변옮김(c * 열간, a * 행간)), 변곱(변늘림(sx, sy), 변옮김(-b.x, -b.y)));
            펼치기(b.개체, 바, 층이름, 색.층 ? { aci: 층얻기(층이름).색, 참: 층얻기(층이름).참색 } : 색, 깊이 + 1);
          }
          for (const at of e.속성 || []) 하나(at, m, 부모층, 부모색, 깊이 + 1);
          break;
        }
        펼치기(b.개체, 바꿈, 층이름, 색.층 ? { aci: 층얻기(층이름).색, 참: 층얻기(층이름).참색 } : 색, 깊이 + 1);
        break;
      }
      case 'LEADER': {
        const pts = []; for (let k = 0; k < g.length; k++) if (g[k][0] === 10) pts.push(+g[k][1], +(g[k + 1]?.[1] || 0));
        if (pts.length >= 4) 선(pts, false, m);
        break;
      }
      default: break;                             // VIEWPORT · IMAGE · 3DSOLID · REGION 등은 생략
    }
  }
  펼치기(개체, [1, 0, 0, 1, 0, 0], null, null, 0);
  return { 목록, 모자람 };
};

// ④ 색 (ACI) ──────────────────────────────────────
도면.ACI = (() => {
  const t = [[0, 0, 0], [255, 0, 0], [255, 255, 0], [0, 255, 0], [0, 255, 255], [0, 0, 255], [255, 0, 255], [255, 255, 255], [128, 128, 128], [192, 192, 192]];
  const 밝기 = [255, 204, 153, 127, 76];
  for (let n = 10; n < 250; n++) {
    const h = Math.floor((n - 10) / 10) * 15, v = 밝기[Math.floor((n % 10) / 2)], 옅음 = n % 2 === 1;
    const c = (h % 360) / 60, x = 1 - Math.abs(c % 2 - 1);
    let [r, g, b] = c < 1 ? [1, x, 0] : c < 2 ? [x, 1, 0] : c < 3 ? [0, 1, x] : c < 4 ? [0, x, 1] : c < 5 ? [x, 0, 1] : [1, 0, x];
    if (옅음) { r = 0.5 + r / 2; g = 0.5 + g / 2; b = 0.5 + b / 2; }
    t[n] = [Math.round(r * v), Math.round(g * v), Math.round(b * v)];
  }
  [51, 91, 132, 173, 214, 255].forEach((v, k) => (t[250 + k] = [v, v, v]));
  return t;
})();
도면.색글 = function (색, 층, 바탕어둠) {
  let aci, 참;
  if (색.층) { aci = 층?.색 ?? 7; 참 = 층?.참색 ?? null; } else { aci = 색.aci; 참 = 색.참; }
  if (참 != null) return `rgb(${(참 >> 16) & 255},${(참 >> 8) & 255},${참 & 255})`;
  if (aci === 7 || aci == null || aci < 1 || aci > 255) return 바탕어둠 ? '#ffffff' : '#000000';
  const c = 도면.ACI[aci]; return `rgb(${c[0]},${c[1]},${c[2]})`;
};

// ⑤ 글자 다듬기 ───────────────────────────────────
도면.글다듬기 = s => s
  .replace(/\\U\+([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/%%[cC]/g, 'Ø').replace(/%%[dD]/g, '°').replace(/%%[pP]/g, '±').replace(/%%[uUoO]/g, '').replace(/%%%/g, '%')
  .replace(/%%(\d{3})/g, (m, d) => String.fromCharCode(+d));
도면.MTEXT다듬기 = s => 도면.글다듬기(s)
  .replace(/\\P/g, '\n').replace(/\\~/g, ' ')
  .replace(/\\S([^;^#/]*)[\^#/]([^;]*);/g, '$1/$2')
  .replace(/\\[fFcCHhTtQqWwApa][^;\\{}]*;/g, '')
  .replace(/\\[LlOoKkNX]/g, '')
  .replace(/\\\\/g, '\\').replace(/\\\{/g, '{').replace(/\\\}/g, '}')
  .replace(/[{}]/g, '');

// ⑥ 범위 — 멀리 튄 점 하나 때문에 도면이 점이 되지 않게 (가운데 99%)
도면.범위 = function (목록) {
  const xs = [], ys = [];
  const 걸음 = Math.max(1, Math.floor(목록.length / 20000));
  for (let k = 0; k < 목록.length; k += 걸음) {
    const e = 목록[k];
    if (e.k === 'T') { xs.push(e.x); ys.push(e.y); continue; }
    xs.push(e.p[0]); ys.push(e.p[1]); xs.push(e.p[e.p.length - 2]); ys.push(e.p[e.p.length - 1]);
  }
  if (!xs.length) return { x0: 0, y0: 0, x1: 100, y1: 100 };
  xs.sort((a, b) => a - b); ys.sort((a, b) => a - b);
  const q = (a, f) => a[Math.min(a.length - 1, Math.max(0, Math.round(f * (a.length - 1))))];
  let x0 = q(xs, 0.005), x1 = q(xs, 0.995), y0 = q(ys, 0.005), y1 = q(ys, 0.995);
  // 가운데 99% 만 보면 가장자리 판이 잘림 (10-03 큰 도면) → 그 폭의 절반 안쪽에 있는 점까지는 넣음 · 더 먼 점만 튄 점
  const 넓 = (a, lo, hi) => { const m = (hi - lo) * 0.5; let 작 = lo, 큼 = hi; for (const v of a) { if (v >= lo - m && v < 작) 작 = v; if (v <= hi + m && v > 큼) 큼 = v; } return [작, 큼]; };
  [x0, x1] = 넓(xs, x0, x1); [y0, y1] = 넓(ys, y0, y1);
  if (x1 - x0 < 1e-9) { x0 -= 1; x1 += 1; } if (y1 - y0 < 1e-9) { y0 -= 1; y1 += 1; }
  return { x0, y0, x1, y1 };
};
// 개체마다 상자 (화면 밖은 안 그림)
도면.상자달기 = function (목록) {
  for (const e of 목록) {
    if (e.k === 'T') { const r = e.h * Math.max(1, e.글.length); e.b = [e.x - r, e.y - r, e.x + r, e.y + r]; continue; }
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let k = 0; k < e.p.length; k += 2) { const x = e.p[k], y = e.p[k + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    e.b = [x0, y0, x1, y1];
  }
};

// ⑦ 캔버스 그리기 · 손가락 · 레이어 ───────────────
도면.보기 = function (캔버스, 자료) {
  const { 목록, 레이어 } = 자료;
  const ctx = 캔버스.getContext('2d');
  let 어둠 = true, 배 = 1, tx = 0, ty = 0, 판너비 = 1, 판높이 = 1, 그릴틀 = 0;
  // 돌림 (v0.6) — 0~3 · 90° 단위 시계 방향. tx · ty · 배 는 «안 돌린 보기 판» 에서의 값이고
  //   보기 판(뷰w × 뷰h) → 화면은 가운데를 축으로 돌림. 손가락 좌표는 화면 → 보기 판으로 되돌려 씀
  let 돌 = (자료.돌림 || 0) & 3;
  const 뷰w = () => (돌 & 1 ? 판높이 : 판너비), 뷰h = () => (돌 & 1 ? 판너비 : 판높이);
  const 화면to뷰 = (sx, sy) => {                     // 캔버스 안 화면 점 → 보기 판 점
    const dx = sx - 판너비 / 2, dy = sy - 판높이 / 2;
    const [u, v] = 돌 === 0 ? [dx, dy] : 돌 === 1 ? [dy, -dx] : 돌 === 2 ? [-dx, -dy] : [-dy, dx];
    return [u + 뷰w() / 2, v + 뷰h() / 2];
  };
  const 밀림to뷰 = (dx, dy) => (돌 === 0 ? [dx, dy] : 돌 === 1 ? [dy, -dx] : 돌 === 2 ? [-dx, -dy] : [-dy, dx]);
  const 판돌림 = c => { c.translate(판너비 / 2, 판높이 / 2); c.rotate(돌 * Math.PI / 2); c.translate(-뷰w() / 2, -뷰h() / 2); };
  // 펜 표시 (v0.6) — 도면 좌표로 저장 · 그리기 맨 끝에 덧그림. 획 = { c: 색, w: 굵기(도면 단위), p: [x, y, …] }
  const 펜 = { 켬: false, 색: 'r', 지우개: false };
  const 획들 = () => 자료.표시?.() || [];
  // 치수 재기 (v0.7) — 톡 찍을 때마다 점 하나 · 가까운 꺾인 점(끝점)에 붙음 · 저장 안 함
  const 재기 = { 켬: false, 점: [], 붙음: [] };
  let 내보낼배율 = 0;                                // 사본 그림을 뜰 때만 화면보다 촘촘히
  // 큰 도면 — 손가락이 움직이는 동안은 방금 그린 그림(사진)을 옮기고 키우기만, 멈추면 다시 그림 (지도 앱 방식)
  const 큰도면 = 목록.length > 20000;
  const 사진판 = document.createElement('canvas'); let 사진 = null, 멈춤시계 = 0;
  const 범 = 도면.범위(목록);
  const 맞춤 = () => {
    const w = 뷰w(), h = 뷰h(), bw = 범.x1 - 범.x0, bh = 범.y1 - 범.y0;
    배 = Math.min(w / bw, h / bh) * 0.92;
    tx = w / 2 - (범.x0 + bw / 2) * 배; ty = h / 2 + (범.y0 + bh / 2) * 배;
    다시();
  };
  const 크기맞춤 = () => {
    const r = 캔버스.getBoundingClientRect(), d = devicePixelRatio || 1;
    판너비 = Math.max(1, r.width); 판높이 = Math.max(1, r.height);
    캔버스.width = Math.round(판너비 * d); 캔버스.height = Math.round(판높이 * d);
  };
  function 그리기() {
    그릴틀 = 0;
    const d = 내보낼배율 || devicePixelRatio || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 어둠 ? '#111418' : '#ffffff'; ctx.fillRect(0, 0, 캔버스.width, 캔버스.height);
    ctx.setTransform(d, 0, 0, d, 0, 0); 판돌림(ctx);
    ctx.lineWidth = 1 / 1; ctx.lineJoin = 'round';
    const 세x0 = -tx / 배, 세x1 = (뷰w() - tx) / 배, 세y1 = ty / 배, 세y0 = (ty - 뷰h()) / 배;
    let 지금색 = '';
    const 색캐시 = new Map();
    const 색 = e => { const 층 = 레이어.get(e.층); const key = e.색.층 ? 'L' + e.층 : (e.색.참 ?? 'A' + e.색.aci); let c = 색캐시.get(key); if (!c) { c = 도면.색글(e.색, 층, 어둠); 색캐시.set(key, c); } return c; };
    for (const e of 목록) {
      if (!레이어.get(e.층)?.켜짐) continue;
      const b = e.b; if (b[2] < 세x0 || b[0] > 세x1 || b[3] < 세y0 || b[1] > 세y1) continue;
      const c = 색(e);
      if (e.k === 'L') {
        if ((b[2] - b[0]) * 배 < 0.4 && (b[3] - b[1]) * 배 < 0.4) continue;   // 점보다 작은 것
        if (c !== 지금색) { ctx.strokeStyle = c; 지금색 = c; }
        ctx.beginPath();
        const p = e.p;
        ctx.moveTo(p[0] * 배 + tx, ty - p[1] * 배);
        for (let k = 2; k < p.length; k += 2) ctx.lineTo(p[k] * 배 + tx, ty - p[k + 1] * 배);
        if (e.닫힘) ctx.closePath();
        ctx.stroke();
      } else if (e.k === 'F') {
        ctx.globalAlpha = e.옅음; ctx.fillStyle = c;
        ctx.beginPath(); const p = e.p;
        ctx.moveTo(p[0] * 배 + tx, ty - p[1] * 배);
        for (let k = 2; k < p.length; k += 2) ctx.lineTo(p[k] * 배 + tx, ty - p[k + 1] * 배);
        ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
      } else {
        const 높이 = e.h * 배;
        if (높이 < 2.2) continue;
        ctx.save();
        ctx.translate(e.x * 배 + tx, ty - e.y * 배); ctx.rotate(-e.r);
        ctx.fillStyle = c; ctx.font = `${(높이 * 1.3).toFixed(1)}px system-ui, sans-serif`;
        ctx.textAlign = e.가로; ctx.textBaseline = e.세로;
        const 줄들 = e.글.split('\n');
        const 사이 = 높이 * 1.65, 시작 = e.세로 === 'middle' ? -(줄들.length - 1) * 사이 / 2 : e.세로 === 'bottom' || e.세로 === 'alphabetic' ? -(줄들.length - 1) * 사이 : 0;
        줄들.forEach((s, k) => ctx.fillText(s, 0, 시작 + k * 사이));
        ctx.restore();
      }
    }
    for (const 획 of 획들()) if (형광인가(획.c)) 획그리기(획);      // 형광 먼저 · 펜은 그 위
    for (const 획 of 획들()) if (!형광인가(획.c)) 획그리기(획);
    if (긋기?.획 && (형광인가(긋기.획.c) || 긋기.도형)) 획그리기(긋기.획);   // 긋고 있는 형광 (반투명이라 토막으로 덧그리면 구슬처럼 짙어짐) · 그리는 중인 도형
    재기그리기();
    사진찍기();
    자료.그린뒤?.();
  }
  function 획그리기(획, 부터 = 0) {                  // 부터 > 0 이면 긋는 중 새로 더한 토막만
    const p = 획.p; if (!p.length) return;
    ctx.save();
    const d = 내보낼배율 || devicePixelRatio || 1;
    ctx.setTransform(d, 0, 0, d, 0, 0); 판돌림(ctx);
    if (도장인가(획)) { const a = 획.a; 도장캔버스(ctx, 획, a[0] * 배 + tx, ty - a[1] * 배, a[2] * 배 + tx, ty - a[3] * 배, 어둠); return ctx.restore(); }   // 도장 · 서명 (0.9.6)
    if (획.t != null) {                              // 글 (0.9.4) — 쓸 때의 방향으로 늘 똑바로 · 바탕색 테두리
      const fs = 획.w * 배; if (fs < 2) return ctx.restore();
      ctx.translate(p[0] * 배 + tx, ty - p[1] * 배); ctx.rotate(-(획.r || 0) * Math.PI / 2);
      ctx.font = `700 ${fs.toFixed(1)}px Pretendard, system-ui, sans-serif`; ctx.textBaseline = 'top'; ctx.lineJoin = 'round';
      ctx.lineWidth = fs * 0.14; ctx.strokeStyle = 어둠 ? '#111418' : '#ffffff'; ctx.strokeText(획.t, 0, 0);
      ctx.fillStyle = 색값(획.c, 어둠); ctx.fillText(획.t, 0, 0);
      return ctx.restore();
    }
    if (형광인가(획.c)) {                            // 형광 — 흰 바탕은 곱하기(글 · 선이 또렷) · 검은 바탕은 반투명
      ctx.globalCompositeOperation = 어둠 ? 'source-over' : 'multiply'; ctx.globalAlpha = 어둠 ? 0.4 : 0.85;
    }
    ctx.strokeStyle = 색값(획.c, 어둠); ctx.lineWidth = Math.max(1, 획.w * 배); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    const s = Math.max(0, 부터 - 2);
    ctx.moveTo(p[s] * 배 + tx, ty - p[s + 1] * 배);
    if (p.length === 2) ctx.lineTo(p[0] * 배 + tx + 0.01, ty - p[1] * 배);
    for (let k = s + 2; k < p.length; k += 2) ctx.lineTo(p[k] * 배 + tx, ty - p[k + 1] * 배);
    ctx.stroke(); ctx.restore();
  }
  // 재기 그리기 — 선 · 넓이 · 점은 도면과 같이 돌고, 길이 글은 늘 똑바로(화면 기준)
  const 수글 = v => { const a = Math.abs(v); return v.toLocaleString('ko-KR', { maximumFractionDigits: a >= 1000 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3 }); };
  function 재기그리기() {
    const p = 재기.점; if (!p.length) return;
    const d = 내보낼배율 || devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(d, 0, 0, d, 0, 0); 판돌림(ctx);
    const M = ctx.getTransform();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const 점들 = [];
    for (let k = 0; k < p.length; k += 2) { const q = M.transformPoint({ x: p[k] * 배 + tx, y: ty - p[k + 1] * 배 }); 점들.push([q.x, q.y]); }
    const 색 = '#00b7ff';
    if (점들.length >= 3) {
      ctx.beginPath(); 점들.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.fillStyle = 'rgba(0,183,255,0.13)'; ctx.fill();
      ctx.setLineDash([6 * d, 5 * d]); ctx.strokeStyle = 색; ctx.lineWidth = 1.5 * d;
      ctx.beginPath(); ctx.moveTo(...점들[점들.length - 1]); ctx.lineTo(...점들[0]); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.strokeStyle = 색; ctx.lineWidth = 2.2 * d; ctx.lineCap = 'round';
    ctx.beginPath(); 점들.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
    점들.forEach(([x, y], k) => {
      const r = 4.5 * d;
      ctx.beginPath(); ctx.rect(x - r, y - r, 2 * r, 2 * r);
      if (재기.붙음[k]) { ctx.fillStyle = 색; ctx.fill(); } else { ctx.lineWidth = 1.6 * d; ctx.strokeStyle = 색; ctx.stroke(); }
    });
    ctx.font = `600 ${12.5 * d}px system-ui, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = 3.5 * d;
    for (let k = 1; k < 점들.length; k++) {
      const 길 = Math.hypot(p[2 * k] - p[2 * k - 2], p[2 * k + 1] - p[2 * k - 1]);
      const [x0, y0] = 점들[k - 1], [x1, y1] = 점들[k];
      if (Math.hypot(x1 - x0, y1 - y0) < 30 * d) continue;      // 너무 짧으면 글을 안 씀 (겹침)
      const 글 = 수글(길);
      ctx.strokeStyle = 어둠 ? '#111418' : '#ffffff'; ctx.strokeText(글, (x0 + x1) / 2, (y0 + y1) / 2 - 9 * d);
      ctx.fillStyle = 어둠 ? '#9fe3ff' : '#005b80'; ctx.fillText(글, (x0 + x1) / 2, (y0 + y1) / 2 - 9 * d);
    }
    ctx.restore();
  }
  function 재기알림() {
    const p = 재기.점, n = p.length / 2; let 합 = 0, 마지막 = 0, a = 0;
    for (let k = 2; k < p.length; k += 2) { 마지막 = Math.hypot(p[k] - p[k - 2], p[k + 1] - p[k - 1]); 합 += 마지막; }
    if (n >= 3) for (let k = 0; k < n; k++) { const j = (k + 1) % n; a += p[2 * k] * p[2 * j + 1] - p[2 * j] * p[2 * k + 1]; }
    자료.재기바뀜?.({ 점수: n, 마지막, 합, 면적: Math.abs(a) / 2 });
  }
  function 붙이기(x, y) {                          // 손가락 둘레 16 화소 안의 가장 가까운 꺾인 점(끝점 · 모서리)
    const r = 16 / 배; let 최 = r * r, 점 = null;
    for (const e of 목록) {
      if (e.k === 'T' || !레이어.get(e.층)?.켜짐) continue;
      const b = e.b; if (x < b[0] - r || x > b[2] + r || y < b[1] - r || y > b[3] + r) continue;
      const q = e.p;
      for (let k = 0; k < q.length; k += 2) { const dx = q[k] - x, dy = q[k + 1] - y, d2 = dx * dx + dy * dy; if (d2 < 최) { 최 = d2; 점 = [q[k], q[k + 1]]; } }
    }
    return 점;
  }
  function 사진찍기() {
    if (!큰도면) return;
    사진판.width = 캔버스.width; 사진판.height = 캔버스.height;
    사진판.getContext('2d').drawImage(캔버스, 0, 0);
    사진 = { 배, tx, ty, 돌 };
  }
  function 빠른그리기() {
    그릴틀 = 0;
    if (!사진 || 사진.돌 !== 돌) return 그리기();
    const d = devicePixelRatio || 1, k = 배 / 사진.배;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = 어둠 ? '#111418' : '#ffffff'; ctx.fillRect(0, 0, 캔버스.width, 캔버스.height);
    ctx.setTransform(d, 0, 0, d, 0, 0); 판돌림(ctx);                          // 보기 판에서 옮기고 키운 뒤
    ctx.transform(k, 0, 0, k, tx - 사진.tx * k, ty - 사진.ty * k);
    ctx.translate(뷰w() / 2, 뷰h() / 2); ctx.rotate(-돌 * Math.PI / 2); ctx.translate(-판너비 / 2, -판높이 / 2);   // 사진(화면 그대로)을 보기 판으로 되돌려 붙임
    ctx.drawImage(사진판, 0, 0, 판너비, 판높이);
    자료.그린뒤?.();
  }
  function 다시() { if (!그릴틀) 그릴틀 = requestAnimationFrame(그리기); }
  function 움직임() {                              // 손가락 · 바퀴로 움직일 때
    if (!큰도면) return 다시();
    if (!그릴틀) 그릴틀 = requestAnimationFrame(빠른그리기);
    clearTimeout(멈춤시계); 멈춤시계 = setTimeout(() => { cancelAnimationFrame(그릴틀); 그릴틀 = 0; 다시(); }, 160);
  }

  // 손가락 — 한 손가락 밀기 · 두 손가락 키우기 · 두 손가락 비틀어 돌리기 · 두 번 톡 · PC 바퀴
  //   펜을 켜면 한 손가락 = 긋기 (지우개면 지우기) · 두 손가락은 그대로 키우기 · 밀기
  const 손 = new Map(); let 앞집기 = null, 톡시각 = 0, 긋기 = null, 비틀기 = null, 재기톡 = null;
  캔버스.style.touchAction = 'none';
  const 도면점 = (cx, cy) => {                     // 화면 점(clientX · Y) → 도면 좌표
    const r = 캔버스.getBoundingClientRect(), [u, v] = 화면to뷰(cx - r.left, cy - r.top);
    return [(u - tx) / 배, (ty - v) / 배];
  };
  const 각 = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
  캔버스.addEventListener('pointerdown', e => {
    캔버스.setPointerCapture(e.pointerId); 손.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (손.size === 1 && 펜.켬 && !펜.메모 && !['t', 's', 'g'].includes(펜.도형)) {
      const [x, y] = 도면점(e.clientX, e.clientY);
      if (펜.지우개) { 긋기 = { 지우개: true }; 지우기(x, y); }
      else if (펜.도형) 긋기 = { 도형: true, 획: { c: 펜.색, w: 획굵기(펜.색) / 배, f: 펜.도형, a: [x, y, x, y], p: [x, y] }, t: Date.now(), 화면: [e.clientX, e.clientY] };   // 도형 (0.9.4) — 끌어서 반듯하게
      else { 긋기 = { 획: { c: 펜.색, w: 획굵기(펜.색) / 배, p: [x, y] }, t: Date.now(), 화면: [e.clientX, e.clientY] }; 형광인가(펜.색) ? 다시() : 획그리기(긋기.획); }
      톡시각 = 0; 앞집기 = null; return;
    }
    if (손.size === 2 && 긋기) {                   // 두 번째 손가락 → 막 그은 짧은 획은 버리고 키우기로
      if (긋기.획 && ((!긋기.도형 && 긋기.획.p.length < 12) || Date.now() - 긋기.t < 250)) 다시(); else if (긋기.획) 긋기끝();
      긋기 = null;
    }
    const 톡모드 = 재기.켬 || (펜.켬 && (펜.메모 || ['t', 's', 'g'].includes(펜.도형)));   // 재기 · 메모 · 글 — 톡 = 점 / 메모 · 글 자리 · 끌면 밀기
    재기톡 = 톡모드 && 손.size === 1 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now() } : null;
    if (톡모드) { 앞집기 = null; 비틀기 = null; return; }        // 재기 중에는 두 번 톡 키우기 없음 (톡 = 점 찍기)
    if (손.size === 1 && !펜.켬) { const t = Date.now(); if (t - 톡시각 < 300) { 키우기(2, e.clientX, e.clientY); 톡시각 = 0; } else 톡시각 = t; }
    앞집기 = null; 비틀기 = null;
  });
  캔버스.addEventListener('pointermove', e => {
    if (!손.has(e.pointerId)) return;
    const 앞 = 손.get(e.pointerId); 손.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (손.size === 1 && 긋기) {
      const [x, y] = 도면점(e.clientX, e.clientY);
      if (긋기.지우개) return 지우기(x, y);
      if (긋기.도형) { const 획 = 긋기.획; 획.a[2] = x; 획.a[3] = y; 획.p = 도형점(획.f, ...획.a, 획.w); 긋기.끝화면 = [e.clientX, e.clientY]; return 다시(); }
      const p = 긋기.획.p, n = p.length;
      if (Math.hypot((x - p[n - 2]) * 배, (y - p[n - 1]) * 배) < 1.5) return;   // 1.5 화소 안쪽은 건너뜀
      p.push(x, y); 긋기.화면.push(e.clientX, e.clientY);
      if (형광인가(긋기.획.c)) { if (사진) { 빠른그리기(); 획그리기(긋기.획); } else 다시(); }    // 형광은 획 전체를 다시
      else 획그리기(긋기.획, n);
      return;
    }
    if (재기톡 && Math.hypot(e.clientX - 재기톡.x, e.clientY - 재기톡.y) > 8) 재기톡 = null;   // 움직이면 밀기
    if (손.size === 1) { const [dx, dy] = 밀림to뷰(e.clientX - 앞.x, e.clientY - 앞.y); tx += dx; ty += dy; 움직임(); }
    else if (손.size === 2) {
      const [a, b] = [...손.values()];
      const 거리 = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
      if (!비틀기) 비틀기 = { a0: 각(a, b), 돈: 0, 켬: false, cx, cy };
      let 돈 = 각(a, b) - 비틀기.a0; while (돈 > Math.PI) 돈 -= 2 * Math.PI; while (돈 < -Math.PI) 돈 += 2 * Math.PI;
      비틀기.돈 = 돈;
      if (!비틀기.켬 && Math.abs(돈) > 18 * Math.PI / 180) {   // 18° 넘게 비틀면 돌리기 손짓 (키우기 · 밀기는 멈춤)
        비틀기.켬 = true; const r = 캔버스.getBoundingClientRect();
        캔버스.style.transformOrigin = `${cx - r.left}px ${cy - r.top}px`;
      }
      if (비틀기.켬) { 캔버스.style.transform = `rotate(${돈}rad)`; 앞집기 = null; return; }
      if (앞집기) {
        키우기(거리 / 앞집기.거리, cx, cy, true);
        const [dx, dy] = 밀림to뷰(cx - 앞집기.cx, cy - 앞집기.cy); tx += dx; ty += dy; 움직임();
      }
      앞집기 = { 거리, cx, cy };
    }
  });
  const 뗌 = e => {
    손.delete(e.pointerId); 앞집기 = null;
    if (재기톡 && 재기톡.id === e.pointerId && 손.size === 0 && e.type === 'pointerup' && Date.now() - 재기톡.t < 600) {
      const [x, y] = 도면점(e.clientX, e.clientY);
      if (재기.켬) {
        const 붙 = 붙이기(x, y);
        재기.점.push(...(붙 || [x, y])); 재기.붙음.push(!!붙);
        재기알림(); 다시();
      } else if (펜.켬 && 펜.메모) 자료.메모톡?.(x, y);
      else if (펜.켬 && 펜.도형 === 't') 자료.글톡?.(x, y, 배);
      else if (펜.켬 && (펜.도형 === 's' || 펜.도형 === 'g')) 자료.도장톡?.(x, y, 배);
    }
    재기톡 = null;
    if (긋기 && 손.size === 0) { if (긋기.획) 긋기끝(); 긋기 = null; }
    if (비틀기 && 손.size < 2) {
      const 돈 = 비틀기.돈 * 180 / Math.PI, 켬 = 비틀기.켬; 비틀기 = null;
      캔버스.style.transform = '';
      if (켬 && Math.abs(돈) >= 30) 자료.돌림요청?.(Math.sign(돈) * Math.max(1, Math.round(Math.abs(돈) / 90)));   // 30° 넘으면 가장 가까운 90° (적어도 한 번)
    }
  };
  캔버스.addEventListener('pointerup', 뗌); 캔버스.addEventListener('pointercancel', 뗌);
  function 긋기끝() {
    if (긋기.도형) {                                  // 도형 — 12 화소보다 짧으면 버림
      const 획 = 긋기.획, 끝 = 긋기.끝화면, 짧음 = !끝 || Math.hypot(끝[0] - 긋기.화면[0], 끝[1] - 긋기.화면[1]) < 12; 긋기 = null;
      if (!짧음) { 획.p = 획.p.map(v => +v.toPrecision(9)); 획.a = 획.a.map(v => +v.toPrecision(9)); 자료.표시바뀜?.({ 더함: 획 }); }
      return 다시();
    }
    const 획 = 긋기.획, 곧은 = 형광인가(획.c) && 곧게(긋기.화면);
    if (곧은) 획.p = [...도면점(곧은[0], 곧은[1]), ...도면점(곧은[2], 곧은[3])];   // 형광을 거의 곧게 그었으면 반듯한 줄로
    획.p = 획.p.map(v => +v.toPrecision(9)); 긋기 = null; 자료.표시바뀜?.({ 더함: 획 }); 다시();
  }
  function 지우기(x, y) {                            // 손가락 둘레 14 화소 안에 닿은 획을 통째로 뺌 (0.9.4 — 꺾인 점만이 아니라 선 토막 · 글은 글 상자)
    const 둘레 = 14 / 배;
    for (const 획 of [...획들()]) {
      let 닿음;
      if (도장인가(획)) { const a = 획.a; 닿음 = x > Math.min(a[0], a[2]) - 둘레 && x < Math.max(a[0], a[2]) + 둘레 && y > Math.min(a[1], a[3]) - 둘레 && y < Math.max(a[1], a[3]) + 둘레; }
      else if (획.t != null) { const [x0, y0, x1, y1] = 글상자(획.p[0], -획.p[1], 획.w, 획.t, 획.r || 0); 닿음 = x > x0 - 둘레 && x < x1 + 둘레 && -y > y0 - 둘레 && -y < y1 + 둘레; }
      else 닿음 = 선거리(획.p, x, y) < 둘레 + 획.w / 2;
      if (닿음) { 자료.표시바뀜?.({ 뺌: 획 }); 다시(); }
    }
  }
  캔버스.addEventListener('wheel', e => { e.preventDefault(); 키우기(e.deltaY < 0 ? 1.25 : 0.8, e.clientX, e.clientY); }, { passive: false });
  function 키우기(f, cx, cy, 조용히) {
    const r = 캔버스.getBoundingClientRect(), [x, y] = 화면to뷰(cx - r.left, cy - r.top);
    const 새 = Math.min(배 * 1e4, Math.max(배 * 1e-4, 배 * f)); f = 새 / 배;
    tx = x - (x - tx) * f; ty = y - (y - ty) * f; 배 = 새;
    if (!조용히) 움직임();
  }
  // 크기가 바뀌면 가운데를 지킴 — ResizeObserver 가 늦거나 쉬는 때(펜 판이 막 나타남 · 시험 창)를 위해 돌리기 · 손가락 시작 때도 직접 살핌
  function 크기살핌() {
    const r = 캔버스.getBoundingClientRect();
    if (판너비 > 1 && Math.abs(r.width - 판너비) < 0.5 && Math.abs(r.height - 판높이) < 0.5) return;
    const 앞w = 뷰w(), 앞h = 뷰h(); 크기맞춤(); if (앞w <= 1) 맞춤(); else { tx += (뷰w() - 앞w) / 2; ty += (뷰h() - 앞h) / 2; 다시(); }
  }
  const 지켜봄 = new ResizeObserver(크기살핌);
  캔버스.addEventListener('pointerdown', 크기살핌, true);
  지켜봄.observe(캔버스);
  크기맞춤(); 맞춤();
  return {
    맞춤, 다시,
    바탕바꾸기() { 어둠 = !어둠; 다시(); return 어둠; },
    돌리기(새돌) {                                  // 화면 가운데에 보이던 곳을 그대로 가운데에
      크기살핌();
      const [cx, cy] = [뷰w() / 2, 뷰h() / 2], wx = (cx - tx) / 배, wy = (ty - cy) / 배;
      돌 = 새돌 & 3; 사진 = null;
      tx = 뷰w() / 2 - wx * 배; ty = 뷰h() / 2 + wy * 배;
      다시();
    },
    펜(설정) { Object.assign(펜, 설정); if (!펜.켬) 긋기 = null; },
    재기켬(켬) { 재기.켬 = 켬; if (!켬) { 재기.점 = []; 재기.붙음 = []; } 재기알림(); 다시(); },
    재기빼기() { 재기.점.length = Math.max(0, 재기.점.length - 2); 재기.붙음.pop(); 재기알림(); 다시(); },
    재기새로() { 재기.점 = []; 재기.붙음 = []; 재기알림(); 다시(); },
    재기상태: () => ({ 점: [...재기.점], 붙음: [...재기.붙음] }),
    도면점,
    점화면(x, y) {                                   // 도면 좌표 → 화면 점 (시험 · 확인용)
      const r = 캔버스.getBoundingClientRect(), u = x * 배 + tx - 뷰w() / 2, v = ty - y * 배 - 뷰h() / 2;
      const [dx, dy] = 돌 === 0 ? [u, v] : 돌 === 1 ? [-v, u] : 돌 === 2 ? [-u, -v] : [v, -u];
      return [r.left + 판너비 / 2 + dx, r.top + 판높이 / 2 + dy];
    },
    // 사본 그림 (보내기) — 흰 바탕 · 펜 · 재기 포함. 전체면 도면 전체를 긴 변 3000 화소로, 아니면 지금 화면 그대로
    내보내기(전체) {
      크기살핌();
      const 옛 = { 배, tx, ty, 어둠 };
      어둠 = false; cancelAnimationFrame(그릴틀); 그릴틀 = 0;
      const k = 전체 ? 3000 / Math.max(판너비, 판높이) : (devicePixelRatio || 1);
      if (전체) {
        const w = 뷰w(), h = 뷰h(), bw = 범.x1 - 범.x0, bh = 범.y1 - 범.y0;
        배 = Math.min(w / bw, h / bh) * 0.94;
        tx = w / 2 - (범.x0 + bw / 2) * 배; ty = h / 2 + (범.y0 + bh / 2) * 배;
      }
      내보낼배율 = k;
      캔버스.width = Math.round(판너비 * k); 캔버스.height = Math.round(판높이 * k);
      try { 그리기(); } finally { 내보낼배율 = 0; }
      const c = document.createElement('canvas'); c.width = 캔버스.width; c.height = 캔버스.height;
      c.getContext('2d').drawImage(캔버스, 0, 0);
      { const 배0 = 배, tx0 = tx, ty0 = ty, 돌0 = 돌, w0 = 판너비, h0 = 판높이, vw = 뷰w(), vh = 뷰h();
        c.배율 = k;
        c.점 = (x, y) => {
          const u = x * 배0 + tx0 - vw / 2, v = ty0 - y * 배0 - vh / 2;
          const [dx, dy] = 돌0 === 0 ? [u, v] : 돌0 === 1 ? [-v, u] : 돌0 === 2 ? [-u, -v] : [v, -u];
          return [(w0 / 2 + dx) * k, (h0 / 2 + dy) * k];
        }; }
      ({ 배, tx, ty, 어둠 } = 옛); 사진 = null;
      크기맞춤(); 다시();
      return c;
    },
    끝() { 지켜봄.disconnect(); cancelAnimationFrame(그릴틀); clearTimeout(멈춤시계); 사진판.width = 사진판.height = 0; 캔버스.style.transform = ''; },
  };
};
