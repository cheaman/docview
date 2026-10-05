// WMF · EMF 그림 그리기 (0.9.6 ① · 목업 1_읽을거리\여덟가지_목업.html) — 캐드 · 오피스가 PPT · 워드 · 한글에 붙인 옛 그림 형식
// 브라우저는 못 그리므로 기록(record)을 하나씩 읽어 캔버스에 그린다 · 못 그리는 기록은 건너뜀 (그림 전체를 버리지 않음)
// 구역 지도 : ① 공통(색 · 펜 · 붓 · 글꼴 · 그리기) ② DIB 그림 조각 ③ WMF ④ EMF ⑤ 바깥에 내주는 것
//   길이 단위 : 기록 좌표(논리) → 행렬 M → 캔버스 화소. 모양은 M 아래에서 길(path)만 만들고 칠 · 긋기는 화소 꼴에서 (선 굵기가 안 일그러지게)
//   EMF+ (요즘 오피스가 덧붙이는 꼴)는 안에 같이 든 옛 EMF 기록으로 그림
'use strict';
const 메타그림 = (() => {
  // ① 공통 ─────────────────────────────────────────
  const 색 = v => `rgb(${v & 255},${(v >>> 8) & 255},${(v >>> 16) & 255})`;
  const 글풀이 = new Map();
  const 글자판이름 = cs => ({ 128: 'shift_jis', 134: 'gbk', 136: 'big5', 161: 'windows-1253', 162: 'windows-1254', 177: 'windows-1255', 178: 'windows-1256', 186: 'windows-1257', 204: 'windows-1251', 222: 'windows-874', 238: 'windows-1250' }[cs] || 'euc-kr');
  const 두바이트 = cs => ['euc-kr', 'shift_jis', 'gbk', 'big5'].includes(글자판이름(cs));
  const 글자판 = cs => {                                  // 글꼴 문자 집합 → 글자 풀이 · 한글 129 와 기본값(0 · 1 …)은 CP949 (캐드가 기본값으로 적은 한글이 많음 · 10-05 실측)
    const 이름 = 글자판이름(cs);
    if (!글풀이.has(이름)) { try { 글풀이.set(이름, new TextDecoder(이름)); } catch (e) { 글풀이.set(이름, new TextDecoder('windows-1252')); } }
    return 글풀이.get(이름);
  };
  const 빗금 = new Map();
  function 빗금붓(ctx, 종류, 빛) {                          // 빗금 붓 (HS_*) — 8 화소 무늬
    const k = 종류 + '|' + 빛; if (빗금.has(k)) return 빗금.get(k);
    const c = document.createElement('canvas'); c.width = c.height = 8;
    const x = c.getContext('2d'); x.strokeStyle = 빛; x.lineWidth = 1; x.beginPath();
    if (종류 === 0 || 종류 === 4) { x.moveTo(0, 4.5); x.lineTo(8, 4.5); }
    if (종류 === 1 || 종류 === 4) { x.moveTo(4.5, 0); x.lineTo(4.5, 8); }
    if (종류 === 2 || 종류 === 5) { x.moveTo(0, 0); x.lineTo(8, 8); }
    if (종류 === 3 || 종류 === 5) { x.moveTo(8, 0); x.lineTo(0, 8); }
    x.stroke();
    const p = ctx.createPattern(c, 'repeat'); 빗금.set(k, p); return p;
  }
  function 판(W, H) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const 상 = { M: [1, 0, 0, 1, 0, 0], 펜: { 꼴: 0, 굵: 0, 색: 0 }, 붓: { 꼴: 0, 색: 0xffffff }, 글꼴: { 높: 12, 굵: 400, 기울: 0, 각: 0, 이름: '', cs: 1 },
      글색: 0, 바탕색: 0xffffff, 바탕방식: 2, 채움: 1, 맞춤: 0, rop2: 13, 지금: [0, 0], 길중: false };
    const 점 = (x, y) => [상.M[0] * x + 상.M[2] * y + 상.M[4], 상.M[1] * x + 상.M[3] * y + 상.M[5]];
    const 배 = () => (Math.hypot(상.M[0], 상.M[1]) + Math.hypot(상.M[2], 상.M[3])) / 2;
    const 펜있음 = () => (상.펜.꼴 & 15) !== 5 && 상.rop2 !== 11;
    const 붓있음 = () => 상.붓.꼴 !== 1 && 상.rop2 !== 11;
    function 긋기() {
      if (!펜있음()) return;
      const s = 상.펜.꼴 & 15, w = Math.max(1, 상.펜.굵 * (상.펜.기하 === false ? 1 : 배()));
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.strokeStyle = 색(상.펜.색); ctx.lineWidth = w;
      ctx.lineCap = [ 'round', 'square', 'butt' ][(상.펜.꼴 >> 8) & 3] || 'round'; ctx.lineJoin = [ 'round', 'bevel', 'miter' ][(상.펜.꼴 >> 12) & 3] || 'round';
      const d = Math.max(1, w);
      ctx.setLineDash(s === 1 ? [6 * d, 3 * d] : s === 2 ? [1.2 * d, 2.4 * d] : s === 3 ? [6 * d, 2.4 * d, 1.2 * d, 2.4 * d] : s === 4 ? [6 * d, 2 * d, 1.2 * d, 2 * d, 1.2 * d, 2 * d] : []);
      ctx.stroke(); ctx.restore();
    }
    function 칠하기(규칙) {
      if (!붓있음()) return;
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      const b = 상.붓;
      ctx.fillStyle = b.꼴 === 2 ? 빗금붓(ctx, b.빗금 || 0, 색(b.색)) : b.무늬 || 색(b.색);
      ctx.fill(규칙 || (상.채움 === 2 ? 'nonzero' : 'evenodd')); ctx.restore();
    }
    function 길시작() { if (!상.길중) ctx.beginPath(); }
    function 끝내기(칠, 그) { if (상.길중) return; if (칠) 칠하기(); if (그) 긋기(); }
    function 선들(pts, 닫음) {                               // pts = [x, y, …] 논리 좌표
      ctx.save(); ctx.setTransform(...상.M);
      for (let k = 0; k < pts.length; k += 2) { if (k) ctx.lineTo(pts[k], pts[k + 1]); else ctx.moveTo(pts[0], pts[1]); }
      if (닫음) ctx.closePath();
      ctx.restore();
    }
    const 그리개 = {
      ctx, 상, 점,
      선(pts) { if (pts.length < 4) return; 길시작(); 선들(pts, false); 끝내기(false, true); },
      다각(pts) { if (pts.length < 6) return; 길시작(); 선들(pts, true); 끝내기(true, true); },
      여러다각(묶음) { 길시작(); for (const pts of 묶음) if (pts.length >= 4) 선들(pts, true); 끝내기(true, true); },
      여러선(묶음) { 길시작(); for (const pts of 묶음) if (pts.length >= 4) 선들(pts, false); 끝내기(false, true); },
      곡선(pts, 이어) {                                       // 베지어 — 이어 = 지금 자리에서 시작 (…TO)
        ctx.save(); ctx.setTransform(...상.M); 길시작();
        let k = 0;
        if (이어) ctx.moveTo(...상.지금); else { ctx.moveTo(pts[0], pts[1]); k = 2; }
        for (; k + 5 < pts.length; k += 6) ctx.bezierCurveTo(pts[k], pts[k + 1], pts[k + 2], pts[k + 3], pts[k + 4], pts[k + 5]);
        ctx.restore(); if (pts.length >= 2) 상.지금 = [pts[pts.length - 2], pts[pts.length - 1]];
        끝내기(false, true);
      },
      선이어(pts) { 길시작(); 선들([...상.지금, ...pts], false); 상.지금 = [pts[pts.length - 2], pts[pts.length - 1]]; 끝내기(false, true); },
      옮김(x, y) { 상.지금 = [x, y]; if (상.길중) { ctx.save(); ctx.setTransform(...상.M); ctx.moveTo(x, y); ctx.restore(); } },
      이어긋기(x, y) {
        if (상.길중) { ctx.save(); ctx.setTransform(...상.M); ctx.lineTo(x, y); ctx.restore(); }
        else { ctx.beginPath(); 선들([...상.지금, x, y], false); 긋기(); }
        상.지금 = [x, y];
      },
      네모(l, t, r, b, rx = 0, ry = 0) {
        길시작(); ctx.save(); ctx.setTransform(...상.M);
        const x = Math.min(l, r), y = Math.min(t, b), w = Math.abs(r - l), h = Math.abs(b - t);
        if (rx || ry) { ctx.moveTo(x + rx, y); ctx.lineTo(x + w - rx, y); ctx.ellipse(x + w - rx, y + ry, rx, ry, 0, -Math.PI / 2, 0); ctx.lineTo(x + w, y + h - ry); ctx.ellipse(x + w - rx, y + h - ry, rx, ry, 0, 0, Math.PI / 2); ctx.lineTo(x + rx, y + h); ctx.ellipse(x + rx, y + h - ry, rx, ry, 0, Math.PI / 2, Math.PI); ctx.lineTo(x, y + ry); ctx.ellipse(x + rx, y + ry, rx, ry, 0, Math.PI, Math.PI * 1.5); ctx.closePath(); }
        else ctx.rect(x, y, w, h);
        ctx.restore(); 끝내기(true, true);
      },
      타원(l, t, r, b) { 길시작(); ctx.save(); ctx.setTransform(...상.M); ctx.moveTo(Math.max(l, r), (t + b) / 2); ctx.ellipse((l + r) / 2, (t + b) / 2, Math.abs(r - l) / 2, Math.abs(b - t) / 2, 0, 0, Math.PI * 2); ctx.restore(); 끝내기(true, true); },
      호(종류, l, t, r, b, xs, ys, xe, ye) {                // 종류 : 0 호 · 1 부채꼴 · 2 활꼴 — 시계 반대 (GDI 기본)
        const cx = (l + r) / 2, cy = (t + b) / 2, rx = Math.abs(r - l) / 2 || 1e-9, ry = Math.abs(b - t) / 2 || 1e-9;
        const a0 = Math.atan2((ys - cy) / ry, (xs - cx) / rx), a1 = Math.atan2((ye - cy) / ry, (xe - cx) / rx);
        길시작(); ctx.save(); ctx.setTransform(...상.M);
        if (종류 === 1) ctx.moveTo(cx, cy);
        ctx.ellipse(cx, cy, rx, ry, 0, a0, a1, true);
        if (종류) ctx.closePath();
        ctx.restore(); 끝내기(종류 > 0, true);
      },
      점찍기(x, y, c) { const [px, py] = 점(x, y); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 색(c); const s = Math.min(4, Math.max(1.5, 배() * 0.9)); ctx.fillRect(px - s / 2, py - s / 2, s, s); ctx.restore(); },
      // 글 — 자리(논리) · 글 · 글자마다 앞으로 갈 거리(dx · 논리) · 쓸 때 상자
      글(x, y, 글, dx, 상자) {
        if (!글) return;
        const f = 상.글꼴, s = Math.hypot(상.M[2], 상.M[3]) || 배(), px = Math.max(1, Math.abs(f.높) * s * (f.높 > 0 ? 0.82 : 1));
        if (px < 1.5) return;
        if (상.맞춤 & 1) [x, y] = 상.지금;
        const [ox, oy] = 점(x, y), 각 = -(f.각 || 0) / 1800 * Math.PI + Math.atan2(상.M[1], 상.M[0]);   // 기울기(0.1°) 는 시계 반대
        ctx.save(); ctx.setTransform(1, 0, 0, 1, ox, oy); ctx.rotate(각);
        ctx.font = `${f.기울 ? 'italic ' : ''}${f.굵 >= 600 ? 700 : 400} ${px}px ${f.이름 ? `"${f.이름.replace(/"/g, '')}", ` : ''}"Malgun Gothic", "Apple SD Gothic Neo", Pretendard, sans-serif`;
        const 세로 = 상.맞춤 & 24, 가로 = 상.맞춤 & 6;
        ctx.textBaseline = 세로 === 24 ? 'alphabetic' : 세로 === 8 ? 'bottom' : 'top';
        // 글자 간격(dx)은 «전체 너비» 로만 씀 — 좌표 단위가 굵은 그림은 dx 가 반올림돼 글자가 벌어짐 (10-05 실측 「5 00」) · 글꼴이 달라 넓어지는 것도 맞춤
        const sx = Math.hypot(상.M[0], 상.M[1]) || 배(), 제폭 = ctx.measureText(글).width;
        let 폭 = 제폭, 늘림 = 1;
        if (dx && dx.length) { const 합 = dx.reduce((a, c) => a + c, 0) * sx; if (합 > 0 && 제폭 > 0 && 합 / 제폭 > 0.5 && 합 / 제폭 < 2) { 늘림 = 합 / 제폭; 폭 = 합; } }
        const 시작 = 가로 === 6 ? -폭 / 2 : 가로 === 2 ? -폭 : 0;
        ctx.fillStyle = 색(상.글색);
        ctx.translate(시작, 0); ctx.scale(늘림, 1); ctx.fillText(글, 0, 0);
        ctx.restore();
        if (상.맞춤 & 1) 상.지금 = [x + 폭 / sx, y];
      },
      그림(조각, 놓기, 자르기, rop) {                      // 조각 = 캔버스 · 놓기 = [x, y, w, h] 논리 · 자르기 = [sx, sy, sw, sh]
        if (!조각) return;
        ctx.save(); ctx.setTransform(...상.M);
        let [x, y, w, h] = 놓기; const [sx, sy, sw, sh] = 자르기 || [0, 0, 조각.width, 조각.height];
        ctx.translate(x + (w < 0 ? w : 0), y + (h < 0 ? h : 0));
        if (w < 0) { ctx.translate(-w, 0); ctx.scale(-1, 1); } if (h < 0) { ctx.translate(0, -h); ctx.scale(1, -1); }
        if (rop === 0x008800c6) ctx.globalCompositeOperation = 'multiply';
        else if (rop === 0x00ee0086) ctx.globalCompositeOperation = 'lighten';
        ctx.imageSmoothingEnabled = true;
        try { ctx.drawImage(조각, sx, sy, Math.max(1, sw), Math.max(1, sh), 0, 0, Math.abs(w), Math.abs(h)); } catch (e) {}
        ctx.restore();
      },
      칠네모(l, t, r, b, rop) {                           // 그림 없는 블릿 — 붓 · 흰 · 검
        const 옛 = 상.붓;
        if (rop === 0x00ff0062) 상.붓 = { 꼴: 0, 색: 0xffffff }; else if (rop === 0x00000042) 상.붓 = { 꼴: 0, 색: 0 };
        else if (rop !== 0x00f00021 && rop !== 0x005a0049) return;
        ctx.beginPath(); ctx.save(); ctx.setTransform(...상.M); ctx.rect(Math.min(l, r), Math.min(t, b), Math.abs(r - l), Math.abs(b - t)); ctx.restore();
        칠하기('nonzero'); 상.붓 = 옛;
      },
      길(시작) { if (시작) { 상.길중 = true; ctx.beginPath(); } else 상.길중 = false; },
      닫기() { if (상.길중) ctx.closePath(); },
      길칠(칠, 그) { 상.길중 = false; if (칠) 칠하기(); if (그) 긋기(); ctx.beginPath(); },
    };
    return { 캔버스: c, 그리개 };
  }

  // ② DIB (장치 독립 그림) ─────────────────────────
  function DIB(b, at, 끝, 비트at) {                        // at = BITMAPINFO 시작 · 비트at = 화소 시작(없으면 표 바로 뒤)
    try {
      const v = new DataView(b.buffer, b.byteOffset, b.byteLength), 머리 = v.getUint32(at, true);
      let w, h, bpp, 압축 = 0, 쓴색 = 0, 표at, 색크기 = 4;
      if (머리 === 12) { w = v.getUint16(at + 4, true); h = v.getInt16(at + 6, true); bpp = v.getUint16(at + 10, true); 표at = at + 12; 색크기 = 3; }
      else { w = v.getInt32(at + 4, true); h = v.getInt32(at + 8, true); bpp = v.getUint16(at + 14, true); 압축 = v.getUint32(at + 16, true); 쓴색 = v.getUint32(at + 32, true); 표at = at + 머리; }
      if (w <= 0 || !h || w * Math.abs(h) > 40e6) return null;
      if (압축 !== 0 && 압축 !== 3) return null;                 // RLE · JPEG · PNG 조각은 건너뜀
      const 색수 = bpp <= 8 ? (쓴색 || 1 << bpp) : 0, 표 = [];
      for (let k = 0; k < 색수; k++) { const o = 표at + k * 색크기; 표.push([b[o + 2], b[o + 1], b[o]]); }
      let 가면 = null;
      if (압축 === 3 && 머리 === 40) { 가면 = [v.getUint32(표at, true), v.getUint32(표at + 4, true), v.getUint32(표at + 8, true)]; 표at += 12; }
      const 시작 = 비트at ?? 표at + 색수 * 색크기, 줄 = Math.floor((w * bpp + 31) / 32) * 4, H = Math.abs(h);
      if (시작 + 줄 * (H - 1) > b.length) return null;
      const c = document.createElement('canvas'); c.width = w; c.height = H;
      const x = c.getContext('2d'), im = x.createImageData(w, H), d = im.data;
      const 자리비트 = (m) => { let s = 0; while (m && !(m & 1)) { m >>>= 1; s++; } let n = 0; while (m & 1) { m >>>= 1; n++; } return [s, n]; };
      const 가 = 가면 ? 가면.map(자리비트) : null;
      for (let r = 0; r < H; r++) {
        const 줄at = 시작 + (h > 0 ? H - 1 - r : r) * 줄;
        for (let c2 = 0; c2 < w; c2++) {
          let R, G, B;
          if (bpp === 24) { const o = 줄at + c2 * 3; B = b[o]; G = b[o + 1]; R = b[o + 2]; }
          else if (bpp === 32) { const o = 줄at + c2 * 4; if (가) { const p = v.getUint32(o, true); [R, G, B] = 가.map(([s, n]) => (((p >>> s) & ((1 << n) - 1)) * 255 / ((1 << n) - 1)) | 0); } else { B = b[o]; G = b[o + 1]; R = b[o + 2]; } }
          else if (bpp === 16) { const p = v.getUint16(줄at + c2 * 2, true); const g = 가 || [[10, 5], [5, 5], [0, 5]]; [R, G, B] = g.map(([s, n]) => (((p >>> s) & ((1 << n) - 1)) * 255 / ((1 << n) - 1)) | 0); }
          else { const 비트 = c2 * bpp, 바 = b[줄at + (비트 >> 3)], i = (바 >> (8 - bpp - (비트 & 7))) & ((1 << bpp) - 1); [R, G, B] = 표[i] || [0, 0, 0]; }
          const o = (r * w + c2) * 4; d[o] = R; d[o + 1] = G; d[o + 2] = B; d[o + 3] = 255;
        }
      }
      x.putImageData(im, 0, 0);
      return c;
    } catch (e) { return null; }
  }

  // ③ WMF ────────────────────────────────────────
  function WMF(b, 최대) {
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    let o = 0, 상자 = null, 인치 = 1440;
    if (v.getUint32(0, true) === 0x9ac6cdd7) {                // 놓을 자리 머리 (Placeable)
      상자 = [v.getInt16(6, true), v.getInt16(8, true), v.getInt16(10, true), v.getInt16(12, true)]; 인치 = v.getUint16(14, true) || 1440; o = 22;
    }
    const 머리크기 = v.getUint16(o + 2, true) * 2; o += 머리크기;
    const 처음 = o;
    // 오피스가 만든 WMF 는 ESCAPE(MFCOMMENT 「WMFC」) 기록에 정밀한 원본 EMF 를 나눠 담아 둠 → 다 모이면 그것으로 그림 (윈도우도 그렇게 · 10-05 실측 12장 중 다수)
    { const 조각 = []; let 모두 = 0, 받음 = 0;
      for (let p = 처음; p + 6 <= b.length;) {
        const 크 = v.getUint32(p, true) * 2, 꼴 = v.getUint16(p + 4, true); if (크 < 6 || !꼴) break;
        if (꼴 === 0x0626 && v.getUint16(p + 6, true) === 0x000f && v.getUint32(p + 10, true) === 0x43464d57 && v.getUint32(p + 14, true) === 1) {
          const 지금크기 = v.getUint32(p + 10 + 22, true); 모두 = v.getUint32(p + 10 + 30, true);
          조각.push(b.subarray(p + 10 + 34, p + 10 + 34 + 지금크기)); 받음 += 지금크기;
        }
        p += 크;
      }
      if (조각.length && 모두 && 받음 === 모두) {
        const e = new Uint8Array(모두); let at = 0; for (const c of 조각) { e.set(c, at); at += c.length; }
        try { return EMF(e, 최대); } catch (x) { /* 깨졌으면 WMF 로 */ }
      } }
    // 창 원점 · 크기를 먼저 훑음 (그림 비율)
    let 창 = null, 원점 = [0, 0];
    for (let p = 처음; p + 6 <= b.length;) {
      const 크 = v.getUint32(p, true) * 2, 꼴 = v.getUint16(p + 4, true); if (크 < 6 || !꼴) break;
      if (꼴 === 0x020c && !창) 창 = [v.getInt16(p + 8, true), v.getInt16(p + 6, true)];
      if (꼴 === 0x020b && !창) 원점 = [v.getInt16(p + 8, true), v.getInt16(p + 6, true)];
      p += 크;
    }
    if (!창 && 상자) { 창 = [상자[2] - 상자[0], 상자[3] - 상자[1]]; 원점 = [상자[0], 상자[1]]; }
    if (!창 || !창[0] || !창[1]) 창 = [1000, 1000];
    const 실w = 상자 ? Math.abs(상자[2] - 상자[0]) / 인치 * 96 : Math.abs(창[0]), 실h = 상자 ? Math.abs(상자[3] - 상자[1]) / 인치 * 96 : Math.abs(창[1]);
    const k = 최대 / Math.max(실w, 실h, 1), W = Math.max(1, Math.round(실w * k)), H = Math.max(1, Math.round(실h * k));
    const { 캔버스, 그리개: g } = 판(W, H), 상 = g.상;
    const 맞춤M = () => { 상.M = [W / 창[0], 0, 0, H / 창[1], -원점[0] * W / 창[0], -원점[1] * H / 창[1]]; };
    맞춤M();
    const 물건 = [], 쌓기 = [];
    const 넣기 = x => { let i = 물건.indexOf(null); if (i < 0) i = 물건.length; 물건[i] = x; };
    const i16 = p => v.getInt16(p, true), u16 = p => v.getUint16(p, true), u32 = p => v.getUint32(p, true);
    const 점들 = (p, n) => { const a = []; for (let k2 = 0; k2 < n * 2; k2++) a.push(i16(p + k2 * 2)); return a; };
    for (let p = 처음; p + 6 <= b.length;) {
      const 크 = u32(p) * 2, 꼴 = u16(p + 4), q = p + 6;
      if (크 < 6 || 꼴 === 0) break;
      try {
        switch (꼴) {
          case 0x020b: 원점 = [i16(q + 2), i16(q)]; 맞춤M(); break;                  // SETWINDOWORG
          case 0x020c: 창 = [i16(q + 2), i16(q)]; if (창[0] && 창[1]) 맞춤M(); break;   // SETWINDOWEXT
          case 0x020f: 원점 = [원점[0] + i16(q + 2), 원점[1] + i16(q)]; 맞춤M(); break;   // OFFSETWINDOWORG
          case 0x0102: 상.바탕방식 = u16(q); break;
          case 0x0201: 상.바탕색 = u32(q); break;
          case 0x0209: 상.글색 = u32(q); break;
          case 0x012e: 상.맞춤 = u16(q); break;
          case 0x0104: 상.rop2 = u16(q); break;
          case 0x0106: 상.채움 = u16(q); break;
          case 0x001e: 쌓기.push(JSON.stringify({ ...상, M: 상.M, 원점, 창 })); break;  // SAVEDC
          case 0x0127: { let n = i16(q); if (n >= 0) break; let s = null; while (n++ < 0 && 쌓기.length) s = 쌓기.pop(); if (s) { const o2 = JSON.parse(s); 원점 = o2.원점; 창 = o2.창; delete o2.원점; delete o2.창; Object.assign(상, o2); } break; }
          case 0x02fa: 넣기({ 펜: { 꼴: u16(q), 굵: i16(q + 2), 색: u32(q + 6) } }); break;          // CREATEPENINDIRECT
          case 0x02fc: 넣기({ 붓: { 꼴: u16(q), 색: u32(q + 2), 빗금: u16(q + 6) } }); break;        // CREATEBRUSHINDIRECT
          case 0x02fb: {                                                                              // CREATEFONTINDIRECT
            let 이름 = ''; for (let k2 = q + 18; k2 < q + 18 + 32 && k2 < p + 크 && b[k2]; k2++) 이름 += String.fromCharCode(b[k2]);
            const cs = b[q + 14];
            try { 이름 = 글자판(cs).decode(b.subarray(q + 18, q + 18 + 이름.length)); } catch (e) {}
            넣기({ 글꼴: { 높: i16(q), 각: i16(q + 4), 굵: i16(q + 8), 기울: b[q + 10], cs, 이름 } }); break;
          }
          case 0x00f7: case 0x06ff: case 0x0142: case 0x01f9: 넣기({ 그밖: 1, 붓: 꼴 === 0x0142 ? { 꼴: 0, 색: 0x808080, 무늬: (() => { const c2 = DIB(b, q + 4, p + 크); return c2 ? g.ctx.createPattern(c2, 'repeat') : null; })() } : undefined }); break;
          case 0x012d: { const x = 물건[u16(q)]; if (x?.펜) 상.펜 = x.펜; if (x?.붓) 상.붓 = x.붓; if (x?.글꼴) 상.글꼴 = x.글꼴; break; }   // SELECTOBJECT
          case 0x01f0: 물건[u16(q)] = null; break;                                                   // DELETEOBJECT
          case 0x0214: g.옮김(i16(q + 2), i16(q)); break;                                             // MOVETO
          case 0x0213: g.이어긋기(i16(q + 2), i16(q)); break;                                         // LINETO
          case 0x0325: g.선(점들(q + 2, i16(q))); break;                                              // POLYLINE
          case 0x0324: g.다각(점들(q + 2, i16(q))); break;                                            // POLYGON
          case 0x0538: { const n = u16(q), 묶음 = []; let at = q + 2 + n * 2; for (let k2 = 0; k2 < n; k2++) { const m = u16(q + 2 + k2 * 2); 묶음.push(점들(at, m)); at += m * 4; } g.여러다각(묶음); break; }
          case 0x041b: g.네모(i16(q + 6), i16(q + 4), i16(q + 2), i16(q)); break;                     // RECTANGLE
          case 0x061c: g.네모(i16(q + 10), i16(q + 8), i16(q + 6), i16(q + 4), i16(q + 2) / 2, i16(q) / 2); break;   // ROUNDRECT
          case 0x0418: g.타원(i16(q + 6), i16(q + 4), i16(q + 2), i16(q)); break;                     // ELLIPSE
          case 0x0817: case 0x081a: case 0x0830:                                                     // ARC · PIE · CHORD
            g.호(꼴 === 0x0817 ? 0 : 꼴 === 0x081a ? 1 : 2, i16(q + 14), i16(q + 12), i16(q + 10), i16(q + 8), i16(q + 6), i16(q + 4), i16(q + 2), i16(q)); break;
          case 0x041f: g.점찍기(i16(q + 6), i16(q + 4), u32(q)); break;                              // SETPIXEL
          case 0x0521: { const n = i16(q), 끝 = q + 2 + ((n + 1) & ~1); g.글(i16(끝 + 2), i16(끝), 글자판(상.글꼴.cs).decode(b.subarray(q + 2, q + 2 + n))); break; }   // TEXTOUT
          case 0x0a32: {                                                                              // EXTTEXTOUT
            const y = i16(q), x = i16(q + 2), n = i16(q + 4), 옵 = u16(q + 6); let at = q + 8;
            const 상자2 = 옵 & 6 ? [i16(at), i16(at + 2), i16(at + 4), i16(at + 6)] : null; if (옵 & 6) at += 8;
            const 바 = b.subarray(at, at + n), 글 = 글자판(상.글꼴.cs).decode(바); at += (n + 1) & ~1;
            let dx = null;
            if (at + n * 2 <= p + 크) {                       // 바이트마다 거리 → 글자마다 (두 바이트 글자는 합침)
              const 바dx = []; for (let k2 = 0; k2 < n; k2++) 바dx.push(i16(at + k2 * 2));
              dx = []; let bi = 0; for (const ch of 글) { const 넓 = ch.charCodeAt(0) > 0x7f && 두바이트(상.글꼴.cs) ? 2 : 1; let s = 0; for (let j = 0; j < 넓; j++) s += 바dx[bi++] || 0; dx.push(s); }
            }
            g.글(x, y, 글, dx, 상자2); break;
          }
          case 0x0940: case 0x0b41: case 0x0f43: {                                                    // DIBBITBLT · DIBSTRETCHBLT · STRETCHDIB
            const rop = u32(q), 그림있음 = 크 / 2 !== (꼴 >> 8) + 3;
            if (꼴 === 0x0940) {
              if (!그림있음) { const h = i16(q + 8), w = i16(q + 10), y = i16(q + 12), x = i16(q + 14); g.칠네모(x, y, x + w, y + h, rop); break; }
              const sy = i16(q + 4), sx = i16(q + 6), h = i16(q + 8), w = i16(q + 10), y = i16(q + 12), x = i16(q + 14);
              g.그림(DIB(b, q + 16, p + 크), [x, y, w, h], [sx, sy, w, h], rop); break;
            }
            const 덧 = 꼴 === 0x0f43 ? 2 : 0;
            const sh = i16(q + 4 + 덧), sw = i16(q + 6 + 덧), sy = i16(q + 8 + 덧), sx = i16(q + 10 + 덧), dh = i16(q + 12 + 덧), dw = i16(q + 14 + 덧), dy = i16(q + 16 + 덧), dx2 = i16(q + 18 + 덧);
            if (!그림있음) { g.칠네모(dx2, dy, dx2 + dw, dy + dh, rop); break; }
            const 조각 = DIB(b, q + 20 + 덧, p + 크);
            g.그림(조각, [dx2, dy, dw, dh], 조각 ? [sx, 조각.height - sy - sh < 0 ? 0 : sy, sw, sh] : null, rop); break;
          }
        }
      } catch (e) { /* 이 기록만 건너뜀 */ }
      p += 크;
    }
    return 캔버스;
  }

  // ④ EMF ────────────────────────────────────────
  function EMF(b, 최대) {
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const i32 = p => v.getInt32(p, true), u32 = p => v.getUint32(p, true), i16 = p => v.getInt16(p, true), f32 = p => v.getFloat32(p, true);
    if (u32(0) !== 1 || u32(40) !== 0x464d4520) throw new Error('EMF 아님');
    const 경계 = [i32(8), i32(12), i32(16), i32(20)], 틀 = [i32(24), i32(28), i32(32), i32(36)];
    const 장치 = [i32(72), i32(76)], 미리 = [i32(80), i32(84)];
    const 화mm = [장치[0] / (미리[0] || 1), 장치[1] / (미리[1] || 1)];
    let 바깥 = [틀[0] / 100 * 화mm[0], 틀[1] / 100 * 화mm[1], 틀[2] / 100 * 화mm[0], 틀[3] / 100 * 화mm[1]];   // 틀(0.01mm)을 장치 화소로
    if (!(바깥[2] > 바깥[0] && 바깥[3] > 바깥[1])) 바깥 = [경계[0], 경계[1], 경계[2] + 1, 경계[3] + 1];
    const 실w = (틀[2] - 틀[0]) / 2540 * 96 || (바깥[2] - 바깥[0]), 실h = (틀[3] - 틀[1]) / 2540 * 96 || (바깥[3] - 바깥[1]);
    const k = 최대 / Math.max(실w, 실h, 1), W = Math.max(1, Math.round(실w * k)), H = Math.max(1, Math.round(실h * k));
    const { 캔버스, 그리개: g } = 판(W, H), 상 = g.상;
    const 밖배 = [W / (바깥[2] - 바깥[0]), H / (바깥[3] - 바깥[1])];
    let 방식 = 1, 창원 = [0, 0], 창크 = [1, 1], 뷰원 = [0, 0], 뷰크 = [1, 1], 세계 = [1, 0, 0, 1, 0, 0];
    const 곱 = (a, c) => [a[0] * c[0] + a[1] * c[2], a[0] * c[1] + a[1] * c[3], a[2] * c[0] + a[3] * c[2], a[2] * c[1] + a[3] * c[3], a[4] * c[0] + a[5] * c[2] + c[4], a[4] * c[1] + a[5] * c[3] + c[5]];
    const 맞춤M = () => {
      let 쪽;                                                   // 쪽(세계 뒤) → 장치
      if (방식 === 7 || 방식 === 8) { let sx = 뷰크[0] / (창크[0] || 1), sy = 뷰크[1] / (창크[1] || 1); if (방식 === 8) { const m = Math.min(Math.abs(sx), Math.abs(sy)); sx = Math.sign(sx) * m; sy = Math.sign(sy) * m; } 쪽 = [sx, 0, 0, sy, 뷰원[0] - 창원[0] * sx, 뷰원[1] - 창원[1] * sy]; }
      else if (방식 === 1) 쪽 = [1, 0, 0, 1, 뷰원[0] - 창원[0], 뷰원[1] - 창원[1]];
      else { const mm = { 2: 0.1, 3: 0.01, 4: 0.254, 5: 0.0254, 6: 25.4 / 1440 }[방식] || 1; 쪽 = [mm * 화mm[0], 0, 0, -mm * 화mm[1], 뷰원[0] - 창원[0] * mm * 화mm[0], 뷰원[1] + 창원[1] * mm * 화mm[1]]; }
      const 밖 = [밖배[0], 0, 0, 밖배[1], -바깥[0] * 밖배[0], -바깥[1] * 밖배[1]];
      상.M = 곱(곱(세계, 쪽), 밖);
    };
    맞춤M();
    const 물건 = [], 쌓기 = [];
    const 기본 = i => ({ 0: { 붓: { 꼴: 0, 색: 0xffffff } }, 1: { 붓: { 꼴: 0, 색: 0xc0c0c0 } }, 2: { 붓: { 꼴: 0, 색: 0x808080 } }, 3: { 붓: { 꼴: 0, 색: 0x404040 } }, 4: { 붓: { 꼴: 0, 색: 0 } }, 5: { 붓: { 꼴: 1, 색: 0 } },
      6: { 펜: { 꼴: 0, 굵: 0, 색: 0xffffff, 기하: false } }, 7: { 펜: { 꼴: 0, 굵: 0, 색: 0, 기하: false } }, 8: { 펜: { 꼴: 5, 굵: 0, 색: 0 } } }[i & 0xff] || null);
    const 점32 = (p, n) => { const a = []; for (let k2 = 0; k2 < n * 2; k2++) a.push(i32(p + k2 * 4)); return a; };
    const 점16 = (p, n) => { const a = []; for (let k2 = 0; k2 < n * 2; k2++) a.push(i16(p + k2 * 2)); return a; };
    for (let p = 0; p + 8 <= b.length;) {
      const 꼴 = u32(p), 크 = u32(p + 4), q = p + 8;
      if (크 < 8 || p + 크 > b.length) break;
      try {
        switch (꼴) {
          case 14: p = b.length; continue;                                    // EOF
          case 9: 창크 = [i32(q), i32(q + 4)]; 맞춤M(); break;
          case 10: 창원 = [i32(q), i32(q + 4)]; 맞춤M(); break;
          case 11: 뷰크 = [i32(q), i32(q + 4)]; 맞춤M(); break;
          case 12: 뷰원 = [i32(q), i32(q + 4)]; 맞춤M(); break;
          case 17: 방식 = u32(q); 맞춤M(); break;
          case 18: 상.바탕방식 = u32(q); break;
          case 19: 상.채움 = u32(q); break;
          case 20: 상.rop2 = u32(q); break;
          case 22: 상.맞춤 = u32(q); break;
          case 24: 상.글색 = u32(q); break;
          case 25: 상.바탕색 = u32(q); break;
          case 27: g.옮김(i32(q), i32(q + 4)); break;
          case 33: 쌓기.push(JSON.stringify({ 상: { ...상, 펜: 상.펜, 붓: { ...상.붓, 무늬: undefined } }, 방식, 창원, 창크, 뷰원, 뷰크, 세계 })); break;
          case 34: { let n = i32(q), s = null; if (n >= 0) break; while (n++ < 0 && 쌓기.length) s = 쌓기.pop(); if (s) { const o = JSON.parse(s); ({ 방식, 창원, 창크, 뷰원, 뷰크, 세계 } = o); Object.assign(상, o.상, { 길중: false }); 맞춤M(); } break; }
          case 35: 세계 = [f32(q), f32(q + 4), f32(q + 8), f32(q + 12), f32(q + 16), f32(q + 20)]; 맞춤M(); break;
          case 36: { const x = [f32(q), f32(q + 4), f32(q + 8), f32(q + 12), f32(q + 16), f32(q + 20)], m = u32(q + 24); 세계 = m === 1 ? [1, 0, 0, 1, 0, 0] : m === 2 ? 곱(x, 세계) : m === 3 ? 곱(세계, x) : x; 맞춤M(); break; }
          case 37: { const i = u32(q), x = i & 0x80000000 ? 기본(i) : 물건[i]; if (x?.펜) 상.펜 = x.펜; if (x?.붓) 상.붓 = x.붓; if (x?.글꼴) 상.글꼴 = x.글꼴; break; }
          case 38: 물건[u32(q)] = { 펜: { 꼴: u32(q + 4), 굵: i32(q + 8), 색: u32(q + 16), 기하: true } }; break;                       // CREATEPEN
          case 95: { const 꼴2 = u32(q + 20); 물건[u32(q)] = { 펜: { 꼴: 꼴2, 굵: u32(q + 24), 색: u32(q + 32), 기하: !!(꼴2 & 0x10000) } }; break; }   // EXTCREATEPEN
          case 39: 물건[u32(q)] = { 붓: { 꼴: u32(q + 4), 색: u32(q + 8), 빗금: u32(q + 12) } }; break;                                   // CREATEBRUSHINDIRECT
          case 93: case 94: { const c2 = DIB(b, p + u32(q + 8), p + 크, p + u32(q + 16)); 물건[u32(q)] = { 붓: { 꼴: 0, 색: 0x808080, 무늬: c2 ? g.ctx.createPattern(c2, 'repeat') : null } }; break; }   // 무늬 붓
          case 82: {                                                                                                                     // EXTCREATEFONTINDIRECTW
            let 이름 = ''; for (let k2 = 0; k2 < 32; k2++) { const c2 = v.getUint16(q + 4 + 28 + k2 * 2, true); if (!c2) break; 이름 += String.fromCharCode(c2); }
            물건[u32(q)] = { 글꼴: { 높: i32(q + 4), 각: i32(q + 12), 굵: i32(q + 20), 기울: b[q + 24], cs: b[q + 27], 이름 } }; break;
          }
          case 40: 물건[u32(q)] = null; break;
          case 48: case 49: case 98: case 70: case 30: case 26: case 29: case 67: case 75: break;   // 팔레트 · 주석(EMF+) · 잘라내기는 건너뜀
          case 42: g.타원(i32(q), i32(q + 4), i32(q + 8), i32(q + 12)); break;
          case 43: g.네모(i32(q), i32(q + 4), i32(q + 8), i32(q + 12)); break;
          case 44: g.네모(i32(q), i32(q + 4), i32(q + 8), i32(q + 12), i32(q + 16) / 2, i32(q + 20) / 2); break;
          case 45: case 46: case 47: g.호(꼴 === 45 ? 0 : 꼴 === 47 ? 1 : 2, i32(q), i32(q + 4), i32(q + 8), i32(q + 12), i32(q + 16), i32(q + 20), i32(q + 24), i32(q + 28)); break;
          case 54: g.이어긋기(i32(q), i32(q + 4)); break;
          case 2: g.곡선(점32(q + 20, u32(q + 16)), false); break;
          case 3: g.다각(점32(q + 20, u32(q + 16))); break;
          case 4: g.선(점32(q + 20, u32(q + 16))); break;
          case 5: g.곡선(점32(q + 20, u32(q + 16)), true); break;
          case 6: g.선이어(점32(q + 20, u32(q + 16))); break;
          case 85: g.곡선(점16(q + 20, u32(q + 16)), false); break;
          case 86: g.다각(점16(q + 20, u32(q + 16))); break;
          case 87: g.선(점16(q + 20, u32(q + 16))); break;
          case 88: g.곡선(점16(q + 20, u32(q + 16)), true); break;
          case 89: g.선이어(점16(q + 20, u32(q + 16))); break;
          case 7: case 8: case 90: case 91: {                                                 // POLYPOLYLINE(16) · POLYPOLYGON(16)
            const n = u32(q + 16), 짧 = 꼴 >= 90, 묶음 = []; let at = q + 24 + n * 4;
            for (let k2 = 0; k2 < n; k2++) { const m = u32(q + 24 + k2 * 4); 묶음.push(짧 ? 점16(at, m) : 점32(at, m)); at += m * (짧 ? 4 : 8); }
            (꼴 === 8 || 꼴 === 91) ? g.여러다각(묶음) : g.여러선(묶음); break;
          }
          case 59: g.길(true); break;                         // BEGINPATH
          case 60: break;                                     // ENDPATH — 길은 그대로 두고 칠 · 긋기를 기다림
          case 61: g.닫기(); break;
          case 62: g.길칠(true, false); break;
          case 63: g.길칠(true, true); break;
          case 64: g.길칠(false, true); break;
          case 76: case 77: case 81: {                        // BITBLT · STRETCHBLT · STRETCHDIBITS
            if (꼴 === 81) {
              const xd = i32(q + 16), yd = i32(q + 20), xs = i32(q + 24), ys = i32(q + 28), cxs = i32(q + 32), cys = i32(q + 36);
              const offBmi = u32(q + 40), offBits = u32(q + 48), rop = u32(q + 60), cxd = i32(q + 64), cyd = i32(q + 68);
              const 조각 = DIB(b, p + offBmi, p + 크, p + offBits);
              if (조각) g.그림(조각, [xd, yd, cxd, cyd], [xs, 조각.height - ys - cys, cxs, cys], rop);
            } else {
              const xd = i32(q + 16), yd = i32(q + 20), cxd = i32(q + 24), cyd = i32(q + 28), rop = u32(q + 32);
              const offBmi = u32(q + 72), cbBmi = u32(q + 76), offBits = u32(q + 80);
              if (!cbBmi) { g.칠네모(xd, yd, xd + cxd, yd + cyd, rop); break; }
              const 조각 = DIB(b, p + offBmi, p + 크, p + offBits), cxs = 꼴 === 77 ? i32(q + 88) : cxd, cys = 꼴 === 77 ? i32(q + 92) : cyd;
              if (조각) g.그림(조각, [xd, yd, cxd, cyd], [i32(q + 36), i32(q + 40), cxs, cys], rop);
            }
            break;
          }
          case 83: case 84: {                                 // EXTTEXTOUTA · W
            const t = q + 28, x = i32(t), y = i32(t + 4), n = u32(t + 8), offStr = u32(t + 12), 옵 = u32(t + 16), offDx = u32(t + 36);
            let 글 = '';
            if (꼴 === 84) { for (let k2 = 0; k2 < n; k2++) 글 += String.fromCharCode(v.getUint16(p + offStr + k2 * 2, true)); }
            else 글 = 글자판(상.글꼴.cs).decode(b.subarray(p + offStr, p + offStr + n));
            let dx = null;
            if (offDx && p + offDx + n * 4 <= p + 크) { dx = []; for (let k2 = 0; k2 < n; k2++) dx.push(i32(p + offDx + k2 * (옵 & 0x2000 ? 8 : 4))); if (꼴 === 83) dx = null; }
            g.글(x, y, 글, dx); break;
          }
        }
      } catch (e) { /* 이 기록만 건너뜀 */ }
      p += 크;
    }
    return 캔버스;
  }

  // ⑤ 바깥에 ─────────────────────────────────────
  const 맞나 = b => b && b.length > 40 && ((b[0] === 0xd7 && b[1] === 0xcd && b[2] === 0xc6 && b[3] === 0x9a) || (b[0] === 1 && b[1] === 0 && b[40] === 0x20 && b[41] === 0x45 && b[42] === 0x4d && b[43] === 0x46) || ((b[0] === 1 || b[0] === 2) && b[1] === 0 && b[2] === 9 && b[3] === 0));
  function 캔버스(바이트, 최대 = 1600) {
    const b = 바이트 instanceof Uint8Array ? 바이트 : new Uint8Array(바이트);
    if (b[0] === 1 && b[1] === 0 && b[40] === 0x20 && b[41] === 0x45) return EMF(b, 최대);
    return WMF(b, 최대);
  }
  async function 주소(바이트, 최대) {                         // PNG blob 주소 (워드 · 한글 · PPT 글로)
    const c = 캔버스(바이트, 최대);
    const b = await new Promise(ok => c.toBlob(ok, 'image/png'));
    c.width = c.height = 0;
    return b ? URL.createObjectURL(b) : null;
  }
  return { 맞나, 캔버스, 주소 };
})();
