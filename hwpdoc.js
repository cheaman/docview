// 옛 한글(HWP 5.0) · 옛 워드(DOC 97~2003) 그리기 (4단계 · 2026-10-03)
// 둘 다 복합 문서(cfb.js) 안에 있다
// 구역 지도 : ① 한글 — 머리 · 압축 · 꼬리표(레코드) 읽기 ② 한글 — 글자 모양 · 문단 모양 ③ 한글 — 문단 · 표 · 글상자 그리기 ③-2 그림 · OLE 꺼내기
//             ④ 한글 — 배포용 · 암호 · 그리기 실패 때 미리보기 글자 ⑤ 워드 — 조각표(piece table)로 글자 뽑기 · 문단 · 표
'use strict';

// ① 한글 — 머리 · 압축 · 꼬리표 ────────────────────
async function 풀기raw(b) {
  // 한글 줄기는 압축 끝 뒤에 군더더기 바이트가 붙어 있다 → 브라우저가 「Junk found after end」 로 통째로 실패 (10-03 실측)
  // 조각을 받아 두고, 군더더기 오류만 넘긴다
  const rd = new Blob([b]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader();
  // → 그런데 오류가 아직 못 받은 조각보다 먼저 와서 뒤가 잘림 (10-05 실측 : 같은 구역 여섯 번 중 셋이 128KB 에서 끊김 → 긴 문서 뒷글 · 그림이 가끔 사라짐)
  //   그래서 오류가 나면 손풀기로 처음부터 다시 (마지막 블록에서 멈추므로 군더더기에 안 걸림)
  const 조각 = []; let n = 0;
  try { for (;;) { const { done, value } = await rd.read(); if (done) break; 조각.push(value); n += value.length; } }
  catch (e) {                                  // 브라우저 풀기는 많이 돌면 「network error」 로 아예 실패하기도 함 (10-05 실측) → 그때도 손풀기
    let 손 = null; try { 손 = 손풀기(b); } catch (e2) { /* 압축이 아님 */ }
    if (손 && 손.length >= n && 손.length) return 손;
    if (!n) throw e;
  }
  const out = new Uint8Array(n); let p = 0;
  for (const x of 조각) { out.set(x, p); p += x.length; }
  return out;
}
function 손풀기(src) {                       // 자바스크립트 inflate (RFC 1951 · zlib 의 puff 와 같은 길) — 느리지만 끝이 정확함
  let pos = 0, 비트 = 0, 수 = 0, n = 0, out = new Uint8Array(Math.max(4096, src.length * 4));
  const 비트들 = k => { while (수 < k) { if (pos >= src.length) throw new Error('압축 끝이 잘림'); 비트 |= src[pos++] << 수; 수 += 8; } const v = 비트 & ((1 << k) - 1); 비트 >>>= k; 수 -= k; return v; };
  const 늘림 = 더 => { if (n + 더 <= out.length) return; let m = out.length * 2; while (m < n + 더) m *= 2; const o = new Uint8Array(m); o.set(out.subarray(0, n)); out = o; };
  const 표 = 길이들 => {                     // 정규 허프만 — 길이별 개수 · 기호
    const 개수 = new Uint16Array(16), 기호 = new Uint16Array(길이들.length), 자리 = new Uint16Array(16);
    for (const l of 길이들) 개수[l]++; 개수[0] = 0;
    for (let i = 1; i < 16; i++) 자리[i] = 자리[i - 1] + 개수[i - 1];
    for (let i = 0; i < 길이들.length; i++) if (길이들[i]) 기호[자리[길이들[i]]++] = i;
    return { 개수, 기호 };
  };
  const 읽기 = t => { let 부호 = 0, 처음 = 0, 차례 = 0; for (let l = 1; l < 16; l++) { 부호 |= 비트들(1); const c = t.개수[l]; if (부호 - c < 처음) return t.기호[차례 + 부호 - 처음]; 차례 += c; 처음 = (처음 + c) << 1; 부호 <<= 1; } throw new Error('허프만 부호 틀림'); };
  const 길이밑 = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258], 길이덧 = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  const 거리밑 = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577], 거리덧 = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  let 고정 = null;
  try {
    for (let 끝 = 0; !끝;) {
      끝 = 비트들(1); const 꼴 = 비트들(2);
      if (꼴 === 0) {                            // 그대로 담은 블록
        비트 = 0; 수 = 0;
        const 길 = src[pos] | (src[pos + 1] << 8); pos += 4;
        if (pos + 길 > src.length) throw new Error('압축 끝이 잘림');
        늘림(길); out.set(src.subarray(pos, pos + 길), n); n += 길; pos += 길; continue;
      }
      let 글표, 거리표;
      if (꼴 === 1) {
        if (!고정) { const l = new Uint8Array(288); l.fill(8, 0, 144); l.fill(9, 144, 256); l.fill(7, 256, 280); l.fill(8, 280); 고정 = [표(l), 표(new Uint8Array(30).fill(5))]; }
        [글표, 거리표] = 고정;
      } else if (꼴 === 2) {
        const 글수 = 비트들(5) + 257, 거리수 = 비트들(5) + 1, 길수 = 비트들(4) + 4;
        const 차 = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15], 길길 = new Uint8Array(19);
        for (let i = 0; i < 길수; i++) 길길[차[i]] = 비트들(3);
        const 길표 = 표(길길), 길이들 = new Uint8Array(글수 + 거리수);
        for (let i = 0; i < 글수 + 거리수;) {
          const s = 읽기(길표);
          if (s < 16) 길이들[i++] = s;
          else { let 값 = 0, 번 = 0; if (s === 16) { if (!i) throw new Error('길이 반복 틀림'); 값 = 길이들[i - 1]; 번 = 3 + 비트들(2); } else if (s === 17) 번 = 3 + 비트들(3); else 번 = 11 + 비트들(7); while (번--) 길이들[i++] = 값; }
        }
        글표 = 표(길이들.subarray(0, 글수)); 거리표 = 표(길이들.subarray(글수));
      } else throw new Error('블록 꼴 틀림');
      for (;;) {
        const s = 읽기(글표);
        if (s < 256) { 늘림(1); out[n++] = s; continue; }
        if (s === 256) break;
        const k = s - 257, 길 = 길이밑[k] + 비트들(길이덧[k]), d = 읽기(거리표), 거리 = 거리밑[d] + 비트들(거리덧[d]);
        if (거리 > n) throw new Error('거리 틀림');
        늘림(길); for (let i = 0; i < 길; i++) { out[n] = out[n - 거리]; n++; }
      }
    }
  } catch (e) { if (!n) throw e; }                // 잘린 압축이면 푼 데까지
  return out.subarray(0, n);
}
function 꼬리표들(b) {                       // [{태그, 깊이, 몸}] — 머리 4바이트 : 태그 10비트 · 깊이 10비트 · 크기 12비트
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength), out = [];
  let p = 0;
  while (p + 4 <= b.length) {
    const h = v.getUint32(p, true); p += 4;
    let n = h >>> 20;
    if (n === 0xfff) { n = v.getUint32(p, true); p += 4; }
    out.push({ 태그: h & 0x3ff, 깊이: (h >>> 10) & 0x3ff, 몸: b.subarray(p, p + n) });
    p += n;
  }
  return out;
}
const 몸보기 = 몸 => new DataView(몸.buffer, 몸.byteOffset, 몸.byteLength);
const 컨트롤이름 = 몸 => { if (몸.length < 4) return ''; const x = 몸보기(몸).getUint32(0, true); return String.fromCharCode((x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255); };
const 태그 = { 바이너리: 18, 글자모양: 21, 문단모양: 25, 문단머리: 66, 문단글: 67, 문단글자모양: 68, 컨트롤머리: 71, 목록머리: 72, 쪽설정: 73, 개체요소: 76, 표: 77, OLE: 84, 그림: 85 };
// 묶음 개체 자리 (10-07 전무님 「그림들이 쪼개서 각각 자리를 차지」) — 개체요소(76) 의 행렬 : [이동, (크기 · 회전) × n] 을 곱함 · 칸 [a,b,c,d,e,f] = x'=ax+by+c · y'=dx+ey+f
const 행렬곱 = (P, Q) => [P[0] * Q[0] + P[1] * Q[3], P[0] * Q[1] + P[1] * Q[4], P[0] * Q[2] + P[1] * Q[5] + P[2], P[3] * Q[0] + P[4] * Q[3], P[3] * Q[1] + P[4] * Q[4], P[3] * Q[2] + P[4] * Q[5] + P[5]];
function 개체요소읽기(몸, 맨위) {                           // 맨 위 개체는 컨트롤 ID 가 두 번 · 처음 크기 · 행렬 곱 · 이름($pic $rec $con …)
  const q = 맨위 ? 8 : 4, v = 몸보기(몸);
  if (몸.length < q + 44) return null;
  const 이름 = String.fromCharCode(몸[3], 몸[2], 몸[1], 몸[0]);
  const w0 = v.getUint32(q + 12, true), h0 = v.getUint32(q + 16, true), w1 = v.getUint32(q + 20, true), h1 = v.getUint32(q + 24, true), n = v.getUint16(q + 42, true);
  let M = [1, 0, 0, 0, 1, 0];
  for (let j = 0; j < 1 + 2 * n; j++) {
    const o = q + 44 + 48 * j; if (o + 48 > 몸.length) break;
    M = 행렬곱(M, [0, 1, 2, 3, 4, 5].map(k => v.getFloat64(o + 8 * k, true)));
  }
  // 그린 도형 (10-22) — 행렬 뒤 : 선 정보 13바이트 (색 · 굵기 · 성질(0~5비트 선 종류 · 0 없음) · 끝 모양) + 채우기 (종류 1 = 면 색 · 배경색 맨 윗바이트 ff = 없음)
  let 선 = null, 채움 = null, 무늬 = null;
  const 뒤 = q + 44 + 48 * (1 + 2 * n);
  if (그린도형.has(이름) && 몸.length >= 뒤 + 21) {
    const 색 = v.getUint32(뒤, true), 굵기 = v.getInt32(뒤 + 4, true), 종류 = v.getUint32(뒤 + 8, true) & 0x3f;
    if (종류) 선 = { 색: 색깔(색), 굵기, 종류 };
    if (v.getUint32(뒤 + 13, true) & 1) {               // 면 색 · 무늬(빗금 · -1 없음 · 0 ─ 1 │ 2 / 3 \ 4 + 5 ×)
      const 배경 = v.getUint32(뒤 + 17, true), 무늬색 = v.getUint32(뒤 + 21, true), 무늬종류 = 몸.length >= 뒤 + 29 ? v.getInt32(뒤 + 25, true) : -1;
      if (배경 >>> 24 !== 0xff && (배경 & 0xffffff) !== 0xffffff) 채움 = 색깔(배경);   // 흰 면은 바탕과 같음 → 안 칠함 (밤 보기에 흰 상자 안 생기게)
      if (무늬종류 >= 0 && 무늬종류 <= 5) 무늬 = { 색: 색깔(무늬색), 종류: 무늬종류 };
    }
  }
  return { 이름, w0, h0, w1, h1, M, 선, 채움, 무늬 };
}
const 그린도형 = new Set(['$lin', '$rec', '$ell', '$pol', '$cur', '$arc']);
const 색깔 = c => `rgb(${c & 255},${(c >> 8) & 255},${(c >> 16) & 255})`;   // COLORREF (BGR)
// 모양 꼬리표 (78 선 · 79 네모 · 80 타원 · 82 다각형 · 83 곡선) → 제 크기(w0 × h0) 안 SVG 모양 하나
//   c = { 이름 ($lin $rec $ell $pol $cur), w0, h0, 선 { 색, 굵기, 종류 }, 채움, 무늬 { 색, 종류 }, 몸 (옛 한글 꼬리표) 또는 끝 · 점 (HWPX) · 곡률 }
function 도형모양(c, 무늬id) {
  if (!c.선 && !c.채움 && !c.무늬) return null;
  const NS = 'http://www.w3.org/2000/svg', v = c.몸 ? 몸보기(c.몸) : null;
  const 점들 = (o, n) => { if (c.점) return c.점.map(p => p.join(',')).join(' '); const a = []; for (let k = 0; k < n && o + 8 * k + 8 <= c.몸.length; k++) a.push(v.getInt32(o + 8 * k, true) + ',' + v.getInt32(o + 8 * k + 4, true)); return a.join(' '); };
  let e;
  if (c.이름 === '$lin') {
    e = document.createElementNS(NS, 'line');
    const [x1, y1, x2, y2] = c.끝 || (v && c.몸.length >= 16 ? [0, 4, 8, 12].map(o => v.getInt32(o, true)) : [0, 0, c.w0, c.h0]);
    Object.entries({ x1, y1, x2, y2 }).forEach(([k, x]) => e.setAttribute(k, x));
  } else if (c.이름 === '$ell') {
    e = document.createElementNS(NS, 'ellipse');
    e.setAttribute('cx', c.w0 / 2); e.setAttribute('cy', c.h0 / 2); e.setAttribute('rx', c.w0 / 2); e.setAttribute('ry', c.h0 / 2);
  } else if (c.이름 === '$rec') {
    e = document.createElementNS(NS, 'rect');
    e.setAttribute('width', c.w0); e.setAttribute('height', c.h0);
    const 곡률 = c.곡률 ?? c.몸?.[0] ?? 0; if (곡률) e.setAttribute('rx', Math.min(c.w0, c.h0) / 2 * Math.min(곡률, 50) / 50);
  } else if ((c.이름 === '$pol' || c.이름 === '$cur') && (c.점 || (v && c.몸.length >= 4))) {
    const n = c.점 ? c.점.length : v.getInt32(0, true); if (!(n > 1 && n < 10000)) return null;
    e = document.createElementNS(NS, c.채움 || c.무늬 ? 'polygon' : 'polyline');
    e.setAttribute('points', 점들(4, n));
  } else return null;
  e.setAttribute('fill', c.무늬 && 무늬id ? `url(#${무늬id})` : c.채움 || 'none');
  if (c.선) {
    e.setAttribute('stroke', c.선.색 === 'rgb(0,0,0)' ? 'currentColor' : c.선.색);   // 검은 선은 글자색 따라 (밤 보기)
    e.setAttribute('stroke-width', Math.max(1, c.선.굵기 / 75).toFixed(2));
    if (c.선.종류 > 1) e.setAttribute('stroke-dasharray', c.선.종류 === 3 ? '2 2' : '6 3');
  } else e.setAttribute('stroke', 'none');
  e.setAttribute('vector-effect', 'non-scaling-stroke');
  return e;
}
// 도형 여럿을 한 판 SVG 로 — 판 좌표(W × H) 안에 각자 행렬 M 으로 · 판 크기에 맞춰 늘어남
function 도형판(조각들, W, H, 반) {
  const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 반); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('preserveAspectRatio', 'none');
  for (const c of 조각들) {
    let 무늬id = null;
    if (c.무늬) {                                       // 빗금 — 판 좌표(HWPUNIT)로 600 ≈ 8화소 간격 · 면 색이 있으면 밑에 깖
      무늬id = '도형무늬' + (++도형무늬수);
      const pat = document.createElementNS(NS, 'pattern'), 칸 = 600, 줄 = { 0: ['M0 300H600'], 1: ['M300 0V600'], 2: ['M0 0L600 600'], 3: ['M0 600L600 0'], 4: ['M0 300H600', 'M300 0V600'], 5: ['M0 600L600 0', 'M0 0L600 600'] }[c.무늬.종류] || [];
      Object.entries({ id: 무늬id, patternUnits: 'userSpaceOnUse', width: 칸, height: 칸 }).forEach(([k, x]) => pat.setAttribute(k, x));
      if (c.채움) { const 밑 = document.createElementNS(NS, 'rect'); 밑.setAttribute('width', 칸); 밑.setAttribute('height', 칸); 밑.setAttribute('fill', c.채움); pat.append(밑); }
      for (const d of 줄) { const l = document.createElementNS(NS, 'path'); l.setAttribute('d', d); l.setAttribute('stroke', c.무늬.색); l.setAttribute('stroke-width', 40); pat.append(l); }
      svg.append(pat);
    }
    const e = 도형모양(c, 무늬id); if (!e) continue;
    e.setAttribute('transform', `matrix(${c.M[0]} ${c.M[3]} ${c.M[1]} ${c.M[4]} ${c.M[2]} ${c.M[5]})`);
    svg.append(e);
  }
  return svg.querySelector(':scope > :not(pattern)') ? svg : null;
}
let 도형무늬수 = 0;

문서.hwp = async function (buf, 덧) {
  const u8 = new Uint8Array(buf);
  const 앞글 = new TextDecoder('latin1').decode(u8.subarray(0, 32));
  if (앞글.startsWith('HWP Document File V')) throw new Error('한글 97 이전(3.0) 문서 — 못 엶 · 한글에서 HWPX 로 저장해 받기');
  const c = 복합열기(buf);
  const 머리 = c.바이트('FileHeader');
  if (!머리) throw new Error('FileHeader 없음 — 한글(HWP) 파일이 아님');
  const 성질 = 몸보기(머리).getUint32(36, true);
  const 압축 = !!(성질 & 1), 암호 = !!(성질 & 2), 배포용 = !!(성질 & 4);
  if (암호) throw 오류('암호 걸린 한글 문서 → 못 엶', c);
  if (배포용 || !c.있나('BodyText/Section0')) throw 오류('배포용 한글 문서 (복사 · 인쇄 막힘) → 모양은 못 그림', c);
  const 읽기 = async 이름 => { const b = c.바이트(이름); return b && 압축 ? 풀기raw(b) : b; };

  // ② 글자 모양 · 문단 모양 ─────────────────────────
  const 글자모양 = [], 문단모양 = [], 바이너리 = [];
  const 정보 = await 읽기('DocInfo');
  if (정보) for (const r of 꼬리표들(정보)) {
    if (r.태그 === 태그.바이너리 && r.몸.length >= 2) {                // 그림 · OLE 목록 (1번부터) — 0 연결 · 1 넣음(꼴 이름) · 2 OLE 상자
      const v = 몸보기(r.몸), 성 = v.getUint16(0, true), 종류 = 성 & 15;
      const 항목 = { 종류, 압축법: (성 >>> 4) & 3, id: 0, 꼴: 종류 === 2 ? 'OLE' : '' };
      if (종류 !== 0 && r.몸.length >= 4) 항목.id = v.getUint16(2, true);
      if (종류 === 1 && r.몸.length >= 6) { const n = v.getUint16(4, true); 항목.꼴 = new TextDecoder('utf-16le').decode(r.몸.subarray(6, 6 + n * 2)); }
      바이너리.push(항목);
    } else if (r.태그 === 태그.글자모양 && r.몸.length >= 56) {
      const v = 몸보기(r.몸);
      const 크기 = v.getInt32(42, true), 성 = v.getUint32(46, true), 색 = v.getUint32(52, true);
      글자모양.push({ pt: 크기 > 0 && 크기 < 100000 ? 크기 / 100 : 10, 기울임: !!(성 & 1), 굵게: !!(성 & 2), 밑줄: ((성 >>> 2) & 3) === 1,
        색: '#' + [색 & 255, (색 >>> 8) & 255, (색 >>> 16) & 255].map(x => x.toString(16).padStart(2, '0')).join('') });
    } else if (r.태그 === 태그.문단모양 && r.몸.length >= 4) {
      문단모양.push((몸보기(r.몸).getUint32(0, true) >>> 2) & 7);   // 0 양쪽 · 1 왼 · 2 오른 · 3 가운데 · 4 배분 · 5 나눔
    }
  }

  // ③ 문단 · 표 · 글상자 ────────────────────────────
  const 기본pt = 10;
  const 구역들 = c.이름들.filter(n => /^BodyText\/Section\d+$/.test(n)).sort((a, b) => parseInt(a.slice(16), 10) - parseInt(b.slice(16), 10));
  const 틀 = 만들기('div', 'hwp');
  const 할그림 = [];                                   // 그림은 글을 다 편 뒤 한꺼번에 꺼냄 (컨트롤읽기는 기다리지 않음)
  for (const 구역 of 구역들) {
    const rs = 꼬리표들(await 읽기(구역));
    let i = 0;
    // 본문폭 (HWPUNIT) — 쪽 설정 : 너비 · 높이 · 왼 · 오른 여백 · … · 36바이트 성질 1비트 = 가로 쪽 (10-07 · 떠 있는 그림을 나란히 놓을 때 폭 비율)
    let 본문폭 = 0;
    { const 쪽 = rs.find(r => r.태그 === 태그.쪽설정 && r.몸.length >= 40);
      if (쪽) { const v = 몸보기(쪽.몸), 가로쪽 = v.getUint32(36, true) & 1; 본문폭 = (가로쪽 ? v.getUint32(4, true) : v.getUint32(0, true)) - v.getUint32(8, true) - v.getUint32(12, true) - v.getUint32(32, true); } }
    const 문단들 = (담을곳, 깊이, 개수) => {      // 깊이가 같은 문단머리를 개수만큼 (개수 없으면 깊이가 얕아질 때까지)
      let 몇 = 0;
      while (i < rs.length && rs[i].깊이 >= 깊이 && (개수 == null || 몇 < 개수)) {
        if (rs[i].태그 === 태그.문단머리 && rs[i].깊이 === 깊이) { 문단(담을곳, 깊이); 몇++; }
        else i++;
      }
    };
    const 문단 = (담을곳, 깊이) => {
      const 머리몸 = rs[i].몸; i++;
      const 모양번호 = 머리몸.length >= 10 ? 몸보기(머리몸).getUint16(8, true) : 0;
      let 글 = null, 모양표 = [];
      const 컨트롤 = [];
      while (i < rs.length && rs[i].깊이 > 깊이) {
        const r = rs[i];
        if (r.깊이 === 깊이 + 1 && r.태그 === 태그.문단글) { 글 = r.몸; i++; }
        else if (r.깊이 === 깊이 + 1 && r.태그 === 태그.문단글자모양) {
          const v = 몸보기(r.몸); for (let k = 0; k + 8 <= r.몸.length; k += 8) 모양표.push([v.getUint32(k, true), v.getUint32(k + 4, true)]); i++;
        } else if (r.깊이 === 깊이 + 1 && r.태그 === 태그.컨트롤머리) { 컨트롤.push(컨트롤읽기(깊이 + 1)); }
        else i++;
      }
      // 글 펼치기 — 글자 · 줄바꿈 · 탭, 덧붙은 컨트롤(표 · 그림)은 나온 자리에서 덩이로
      let p = 만들기('p'); 담을곳.append(p);
      const 줄 = { 2: 'right', 3: 'center' }[문단모양[모양번호]];   // 양쪽 · 배분은 좁은 폰에서 왼쪽
      if (줄) p.style.textAlign = 줄;
      let 컨트롤자리 = 0;
      if (글) {
        const v = 몸보기(글), n = 글.length / 2;
        let 조각 = '', 조각시작 = 0, 모양k = 0;
        const 지금모양 = pos => { while (모양k + 1 < 모양표.length && 모양표[모양k + 1][0] <= pos) 모양k++; return 글자모양[모양표[모양k]?.[1]] || {}; };
        const 붓기 = (끝pos) => {
          if (!조각) return;
          const m = 지금모양(조각시작), s = 만들기('span'); s.textContent = 조각;
          if (m.굵게) s.style.fontWeight = '700'; if (m.기울임) s.style.fontStyle = 'italic'; if (m.밑줄) s.style.textDecoration = 'underline';
          if (m.pt && Math.abs(m.pt - 기본pt) > 0.4) s.style.fontSize = 크기em(m.pt, 기본pt);
          if (m.색 && m.색 !== '#000000') s.style.color = m.색;
          p.append(s); 조각 = '';
        };
        for (let k = 0; k < n;) {
          const ch = v.getUint16(k * 2, true);
          if (ch >= 32) {
            if (!조각) 조각시작 = k;
            const 다음모양 = 모양k + 1 < 모양표.length && 모양표[모양k + 1][0] === k;
            if (다음모양 && 조각) { 붓기(k); 조각시작 = k; }
            조각 += String.fromCharCode(ch); k++; continue;
          }
          붓기(k);
          if (ch === 10) { p.append(document.createElement('br')); k++; }
          else if (ch === 13) { k++; }
          else if (ch === 9) { p.append(만들기('span', '탭', '\t')); k += 8; }
          else if (ch === 0 || (ch >= 24 && ch <= 31)) { if (ch >= 24) p.append(ch === 24 ? '-' : ' '); k++; }
          else if ([4, 5, 6, 7, 8, 19, 20].includes(ch)) { k += 8; }                  // 글 안 컨트롤 (필드 끝 등)
          else {                                                                   // 덧붙은 컨트롤 (1~3 · 11~12 · 14~18 · 21~23)
            const 덩이 = 컨트롤[컨트롤자리++];
            if (덩이) {
              if (덩이.인라인) p.append(덩이.el);
              else { 담을곳.append(덩이.el); p = 만들기('p'); if (줄) p.style.textAlign = 줄; 담을곳.append(p); }
            }
            k += 8;
          }
        }
        붓기(n);
      }
      while (컨트롤자리 < 컨트롤.length) { const 덩이 = 컨트롤[컨트롤자리++]; if (덩이) 담을곳.append(덩이.el); }
      // 같은 문단에 붙은 떠 있는 그림이 둘 이상이고 폭 합이 본문폭 안 → 한글처럼 한 줄에 나란히 (10-07 회의 문서 「그림들이 쪼개서 각각 자리를 차지」 · 2×2 그래프)
      const 떠들 = 컨트롤.filter(c => c?.el?.dataset?.떠).map(c => c.el);
      const 폭합 = 떠들.reduce((a, e) => a + +e.dataset.폭, 0);
      if (떠들.length > 1 && 폭합 <= 104) {
        const 줄 = 만들기('div', '그림줄'); 떠들[0].before(줄);
        떠들.sort((a, b) => a.dataset.가 - b.dataset.가).forEach(e => { e.style.width = Math.min(100, +e.dataset.폭) + '%'; const im = e.querySelector('img'); if (im) im.style.width = '100%'; 줄.append(e); });
        if (폭합 < 80) 줄.style.justifyContent = 'flex-start';           // 폭이 넉넉히 남으면 왼쪽부터 · 아니면 양 끝 (한글의 두 장 가로 0 · 536 꼴)
      }
      if (!p.textContent.trim() && !p.querySelector('br,img,span.빈그림')) p.classList.add('빈줄');
    };
    const 컨트롤읽기 = 깊이 => {                    // rs[i] 가 컨트롤머리
      const 머리 = rs[i].몸, 이름 = 컨트롤이름(머리); i++;
      if (이름 === 'tbl ') return { el: 표(깊이) };
      if (이름 === 'gso ') {                         // 그리기 개체 — 글상자면 글을, 그림 · OLE 면 그림을 (BinData 에서 · 10-05)
        const 상자 = 만들기('div', '글상자');
        const 그림들 = [];                              // 바이너리 번호 (1부터) — 묶음 개체는 여러 장
        const 조각들 = [];                              // 개체요소 차례 (10-07) — { 이름, 깊이, w0, h0, M(맨 위 묶음 좌표로), 그림, 상자 }
        const 주인 = d => { for (let k = 조각들.length - 1; k >= 0; k--) if (조각들[k].깊이 < d) return 조각들[k]; return null; };
        while (i < rs.length && rs[i].깊이 > 깊이) {
          const r = rs[i];
          if (r.태그 === 태그.개체요소) {
            const 요 = 개체요소읽기(r.몸, r.깊이 === 깊이 + 1);
            if (요) 조각들.push({ ...요, 깊이: r.깊이, M: 조각들.length ? 요.M : [1, 0, 0, 0, 1, 0] });   // 조각 행렬 = 제 좌표 → 맨 위 묶음 «지금 크기» 좌표 (부모 행렬이 이미 들어 있음 · 10-22 HWPX 로 확인 — 전엔 부모를 또 곱하고 처음 크기 판에 놓아 어긋남)
            i++; continue;
          }
          if (r.태그 === 태그.목록머리) {
            const 수 = 몸보기(r.몸).getInt16(0, true), d = r.깊이, 조 = 주인(d);
            if (조 && 조.깊이 > 깊이 + 1) { 조.상자 = 만들기('div', '글상자'); i++; 문단들(조.상자, d, 수); continue; }   // 묶음 안 글상자 — 제 조각에
            i++; 문단들(상자, d, 수); continue;
          }
          if (r.태그 >= 78 && r.태그 <= 83 && r.태그 !== 태그.OLE) { const 조 = 주인(r.깊이); if (조 && !조.몸) 조.몸 = r.몸; i++; continue; }   // 선 · 네모 · 타원 · 호 · 다각형 · 곡선 모양 (10-22)
          let 번호 = null;
          if (r.태그 === 태그.그림) 번호 = r.몸.length >= 73 ? 몸보기(r.몸).getUint16(71, true) : -1;   // 테두리 · 네 점 · 자르기 · 여백 · 밝기 · 명암 · 효과 뒤
          else if (r.태그 === 태그.OLE) 번호 = r.몸.length >= 14 ? 몸보기(r.몸).getUint16(12, true) : -1;
          if (번호 != null) { 그림들.push(번호); const 조 = 주인(r.깊이); if (조) 조.그림 = 번호; }
          i++;
        }
        const 새그림 = 번호 => { const img = 만들기('img', '그림 채우는중'); img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; 할그림.push({ img, 번호 }); return img; };
        // 묶음($con) — 조각을 제자리에 겹쳐 놓음 (10-07) · 묶음 크기 비율의 칸 안에 백분율로 · 글상자 글씨는 묶음 너비 따라 (cqw)
        if (조각들[0]?.이름 === '$con' && 조각들[0].w0 > 0 && 조각들[0].h0 > 0) {
          const W = 조각들[0].w1 || 조각들[0].w0, H = 조각들[0].h1 || 조각들[0].h0, 잎 = 조각들.slice(1).filter(c => c.그림 != null || c.상자?.textContent.trim());
          const 그린 = 조각들.slice(1).filter(c => 그린도형.has(c.이름) && c.그림 == null);
          const 판 = 그린.length ? 도형판(그린, W, H, '묶음도형') : null;   // 선 · 테두리 · 타원 (10-22 · 전엔 글 없는 도형은 안 그림)
          if (잎.length || 판) {
            const mv = 머리.length >= 24 ? 몸보기(머리) : null;
            const 너비px = mv ? Math.round(mv.getUint32(16, true) / 75) : Math.round(W / 75);
            const 틀 = 만들기('div', '묶음그림');
            틀.style.aspectRatio = `${W} / ${H}`; if (너비px > 0 && 너비px < 5000) 틀.style.maxWidth = 너비px + 'px';
            틀.style.setProperty('--묶음글', (13.33 / (W / 75) * 100).toFixed(3) + 'cqw');   // 10pt 를 묶음 원래 너비에 견줘
            for (const c of 잎) {
              const 점 = [[0, 0], [c.w0, 0], [0, c.h0], [c.w0, c.h0]].map(([x, y]) => [c.M[0] * x + c.M[1] * y + c.M[2], c.M[3] * x + c.M[4] * y + c.M[5]]);
              const x0 = Math.min(...점.map(p => p[0])), x1 = Math.max(...점.map(p => p[0])), y0 = Math.min(...점.map(p => p[1])), y1 = Math.max(...점.map(p => p[1]));
              if (!(x1 > x0 && y1 > y0)) continue;
              const 칸 = 만들기('div', '묶음조각');
              Object.assign(칸.style, { left: (x0 / W * 100).toFixed(3) + '%', top: (y0 / H * 100).toFixed(3) + '%', width: ((x1 - x0) / W * 100).toFixed(3) + '%', height: ((y1 - y0) / H * 100).toFixed(3) + '%' });
              if (c.그림 != null) 칸.append(새그림(c.그림));
              if (c.상자?.textContent.trim()) { 칸.classList.add('묶음글'); 칸.append(c.상자); }
              틀.append(칸);
            }
            if (판) 틀.append(판);                          // 선 · 화살표는 그림 위에
            if (상자.textContent.trim()) { const 감 = 만들기('div', '그림틀'); 감.append(틀, 상자); return { el: 감 }; }   // 묶음 캡션
            return { el: 틀 };
          }
        }
        const 글있음 = !!상자.textContent.trim();
        const 하나 = 조각들.length === 1 && 그린도형.has(조각들[0].이름) ? 조각들[0] : null;   // 그린 도형 하나 (10-22)
        if (!그림들.length && 하나 && 글있음) {           // 글상자 — 선 · 면 색을 상자에
          if (하나.선) { 상자.style.border = `${Math.max(1, 하나.선.굵기 / 75).toFixed(1)}px ${하나.선.종류 > 1 ? 'dashed' : 'solid'} ${하나.선.색}`; 상자.classList.add('테두리'); }
          if (하나.채움) 상자.style.background = 하나.채움;
          if (하나.이름 === '$ell') 상자.style.borderRadius = '50%';
        }
        if (!그림들.length && 하나 && !글있음 && 하나.w0 > 0 && 하나.h0 > 0) {
          const 판 = 도형판([{ ...하나, M: [1, 0, 0, 0, 1, 0] }], 하나.w0, 하나.h0, '도형하나'); if (!판) return null;
          const mv = 머리.length >= 24 ? 몸보기(머리) : null;
          const 너비 = mv ? Math.round(mv.getUint32(16, true) / 75) : Math.round(하나.w0 / 75), 높이 = mv ? Math.round(mv.getUint32(20, true) / 75) : Math.round(하나.h0 / 75);
          판.style.width = Math.max(1, 너비) + 'px'; 판.style.aspectRatio = `${Math.max(1, 너비)} / ${Math.max(1, 높이)}`;
          if (mv && (mv.getUint32(4, true) & 1)) return { el: 판, 인라인: true };
          const 틀 = 만들기('div', '그림틀'); 틀.append(판); return { el: 틀 };
        }
        if (!그림들.length) return 글있음 ? { el: 상자 } : null;
        if (그림들.length > 1 || 글있음) {              // 묶음 아닌 여러 장 · 그림 + 캡션 — 차례로 늘어놓음
          const 틀 = 만들기('div', '그림틀');
          for (const 번호 of 그림들) 틀.append(새그림(번호));
          if (글있음) 틀.append(상자);
          return { el: 틀 };
        }
        // 개체 공통 : 성질(0 · 글자처럼 취급 = 1비트) · 세로 · 가로 자리 · 너비 · 높이(HWPUNIT 1/7200 인치 → 화소 ÷75)
        const mv = 머리.length >= 24 ? 몸보기(머리) : null;
        const 글자처럼 = mv ? !!(mv.getUint32(4, true) & 1) : true;
        const 너비 = mv ? Math.round(mv.getUint32(16, true) / 75) : 0, 높이 = mv ? Math.round(mv.getUint32(20, true) / 75) : 0;
        const img = 새그림(그림들[0]);
        if (너비 > 0 && 너비 < 5000) img.style.width = 너비 + 'px';
        if (너비 > 0 && 높이 > 0 && 높이 < 5000) img.style.aspectRatio = `auto ${너비} / ${높이}`;   // 채우기 전에도 자리를 잡아 화면이 안 밀림
        if (글자처럼) return { el: img, 인라인: true };
        const 틀 = 만들기('div', '그림틀'); 틀.append(img);
        if (mv && 본문폭 > 0) { 틀.dataset.떠 = '1'; 틀.dataset.가 = mv.getInt32(12, true); 틀.dataset.폭 = (mv.getUint32(16, true) / 본문폭 * 100).toFixed(2); }   // 같은 문단 떠 있는 그림 나란히 (문단 끝에서)
        return { el: 틀 };
      }
      // 머리말 · 꼬리말 · 각주 · 쪽 번호 · 책갈피 등 — 본문에 안 보임
      while (i < rs.length && rs[i].깊이 > 깊이) i++;
      return null;
    };
    const 표 = 깊이 => {
      let 행 = 0, 열 = 0;
      const 칸들 = [];
      while (i < rs.length && rs[i].깊이 > 깊이) {
        const r = rs[i];
        if (r.태그 === 태그.표 && r.몸.length >= 8) { const v = 몸보기(r.몸); 행 = v.getUint16(4, true); 열 = v.getUint16(6, true); i++; }
        else if (r.태그 === 태그.목록머리) {
          const v = 몸보기(r.몸), 수 = v.getInt16(0, true), d = r.깊이;
          const 칸 = r.몸.length >= 16 ? { 열: v.getUint16(8, true), 행: v.getUint16(10, true), 가로: v.getUint16(12, true) || 1, 세로: v.getUint16(14, true) || 1 } : { 열: 0, 행: 칸들.length, 가로: 1, 세로: 1 };
          const td = 만들기('td'); if (칸.가로 > 1) td.colSpan = 칸.가로; if (칸.세로 > 1) td.rowSpan = 칸.세로;
          i++; 문단들(td, d, 수);
          칸들.push({ ...칸, td });
        } else i++;
      }
      const t = 만들기('table');
      const 줄들 = [];
      for (const k of 칸들) { (줄들[k.행] ||= []).push(k); }
      for (const 줄 of 줄들) { if (!줄) continue; const tr = 만들기('tr'); 줄.sort((a, b) => a.열 - b.열).forEach(k => tr.append(k.td)); t.append(tr); }
      const w = 만들기('div', '표틀'); w.append(t); return w;
    };
    문단들(틀, 0);
  }
  // 떠 있는 그림 뒤 빈 줄 거두기 (10-07) — 한글은 떠 있는 그림 밑 자리를 빈 줄로 잡아 둠 · 여기선 그림이 제 자리를 차지하므로 빈 줄이 큰 틈이 됨
  const 빈문단 = n => n && n.tagName === 'P' && !n.textContent.trim() && !n.querySelector('img,.빈그림');   // 「빈줄」 표시가 없는 빈 문단(컨트롤 뒤 새 p)도
  for (const e of 틀.querySelectorAll('.그림줄, .그림틀[data-떠]')) {
    let n = e.nextElementSibling;
    while (빈문단(n)) { const 다음 = n.nextElementSibling; n.remove(); n = 다음; }
    const 앞 = e.previousElementSibling; if (빈문단(앞)) 앞.remove();
  }
  // 그림 꺼내기 — 글을 먼저 보이고, 화면 앞뒤 2000화소 안에 온 그림만 하나씩 (10-05 실측 : 그림 267장 문서를 통째로 그리면 PC 에서도 1분 넘음)
  //   같은 그림을 여러 번 쓰면 한 번만 · 글만 뽑을 때(전체 찾기)는 안 꺼냄 · 닫은 문서(틀이 빠짐)는 더 안 그림
  if (!덧?.글만 && 할그림.length) {
    const 받은 = new Map();
    let 줄 = Promise.resolve();
    const 넣기 = ({ img, 번호 }) => { 줄 = 줄.then(async () => {
      if (!받은.has(번호)) 받은.set(번호, 한글그림(c, 바이너리[번호 - 1], 압축).catch(() => null));
      const u = await 받은.get(번호);
      img.classList.remove('채우는중');
      if (u) img.src = u; else img.replaceWith(만들기('span', '빈그림', '[그림]'));
    }); };
    const 뿌리 = document.getElementById('flow');
    if (뿌리 && 'IntersectionObserver' in window) {
      const 지킴 = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { 지킴.unobserve(e.target); 넣기(e.target._할); } }, { root: 뿌리, rootMargin: '2000px 0px' });
      for (const x of 할그림) { x.img._할 = x; 지킴.observe(x.img); }
    } else 할그림.forEach(넣기);
  }
  return { 틀, 알림: null };
};

// ③-2 한글 — BinData 그림 · OLE 개체의 미리보기 그림 (10-05)
//   줄기 이름 BinData/BIN<16진 4자리>.<꼴> · 압축법 0 = 문서 따라 · 1 = 압축 · 2 = 안 함
//   OLE 상자 = 크기 4바이트 + 복합 문서 → 그림판 개체는 Ole10Native 에 BMP 통째 · 그 밖은 \x02OlePres000 의 미리보기(WMF · EMF · DIB)
function 그림꼴(b) {
  if (b.length < 8) return null;
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return 'image/gif';
  if (b[0] === 0x42 && b[1] === 0x4d) return 'image/bmp';
  if (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45) return 'image/webp';
  if (typeof 메타그림 !== 'undefined' && 메타그림.맞나(b)) return '메타';
  return null;
}
const 메타최대 = 1200;                                  // 그림 수백 장 문서도 폰 메모리에 들게 (PPT 는 1600)
async function 그림바이트주소(b) {
  const 꼴 = 그림꼴(b);
  if (꼴 === '메타') return 메타그림.주소(b, 메타최대);
  return 꼴 ? URL.createObjectURL(new Blob([b], { type: 꼴 })) : null;
}
function DIB로BMP(d) {                                 // 파일 머리 14바이트를 붙임 — 머리 크기 · 팔레트 · 비트 마스크 뒤가 그림 자리
  const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
  const 머리 = v.getUint32(0, true), 비트 = v.getUint16(머리 === 12 ? 10 : 14, true), 압축 = 머리 >= 20 ? v.getUint32(16, true) : 0;
  let 팔레트 = 0;
  if (머리 === 12) 팔레트 = 비트 <= 8 ? (1 << 비트) * 3 : 0;
  else { const 쓴색 = 머리 >= 36 ? v.getUint32(32, true) : 0; 팔레트 = (쓴색 || (비트 <= 8 ? 1 << 비트 : 0)) * 4; if (머리 === 40 && (압축 === 3 || 압축 === 6)) 팔레트 += 압축 === 3 ? 12 : 16; }
  const out = new Uint8Array(14 + d.length), o = new DataView(out.buffer);
  out[0] = 0x42; out[1] = 0x4d; o.setUint32(2, out.length, true); o.setUint32(10, 14 + 머리 + 팔레트, true);
  out.set(d, 14); return out;
}
async function 한글그림(c, 항목, 문서압축) {
  if (!항목 || 항목.종류 === 0) return null;          // 바깥 파일에 연결된 그림 — 문서 안에 없음
  const 앞 = 'BinData/BIN' + 항목.id.toString(16).toUpperCase().padStart(4, '0') + '.';
  const 이름 = c.이름들.find(n => n.toUpperCase().startsWith(앞.toUpperCase()));
  let b = 이름 && c.바이트(이름);
  if (!b) return null;
  const 맞나 = x => 항목.종류 === 2 ? x.length > 12 && x[4] === 0xd0 && x[5] === 0xcf : !!그림꼴(x);   // OLE 는 크기 4바이트 뒤 복합 문서
  if (항목.압축법 === 1 || (항목.압축법 === 0 && 문서압축)) {
    try { const 풀 = await 풀기raw(b); if (맞나(풀) || !맞나(b)) b = 풀; } catch (e) { /* 압축 안 된 채 들어 있기도 함 */ }
  }
  if (항목.종류 === 1) return 그림바이트주소(b);
  // OLE 상자
  const 속 = 복합열기(b.slice(4).buffer);
  const 원 = 속.바이트('\x01Ole10Native');
  if (원 && 원.length > 6 && 원[4] === 0x42 && 원[5] === 0x4d) return 그림바이트주소(원.subarray(4));   // 그림판 개체 = 크기 4바이트 + BMP
  for (const n of 속.이름들.filter(n => /^\x02OlePres\d{3}$/.test(n)).sort()) {
    const p = 속.바이트(n); if (!p || p.length < 40) continue;
    const v = 몸보기(p);
    if (v.getUint32(0, true) !== 0xffffffff) continue;  // 이름으로 적은 꼴은 건너뜀
    const 꼴 = v.getUint32(4, true);
    let o = 8 + v.getUint32(8, true) + 16 + 8;          // 대상 장치 · 보기 · 줄 · 알림 · 빈칸 · 너비 · 높이
    const 크기 = v.getUint32(o, true); o += 4;
    const d = p.subarray(o, o + 크기); if (d.length < 16) continue;
    if (꼴 === 3 || 꼴 === 14) { if (typeof 메타그림 !== 'undefined') return 메타그림.주소(d, 메타최대); }   // WMF(머리 없음) · EMF
    else if (꼴 === 8) return 그림바이트주소(DIB로BMP(d));
  }
  return null;
}

// ④ 배포용 · 암호 · 실패 — 한글이 넣어 둔 미리보기 글자 (앞부분만일 수 있음)
function 오류(말, c) { const e = new Error(말); e.미리보기 = c; return e; }
문서.hwp미리보기 = function (buf) {
  try {
    const c = 복합열기(buf), b = c.바이트('PrvText');
    return b ? new TextDecoder('utf-16le').decode(b).replace(/<([^<>]*)>/g, '$1\t').replace(/\t\r?\n/g, '\n') : '';
  } catch (e) { return ''; }
};

// ⑤ 옛 워드 (DOC) ─────────────────────────────────
문서.doc = async function (buf) {
  const u8 = new Uint8Array(buf);
  const 앞 = new TextDecoder('latin1').decode(u8.subarray(0, 8));
  if (앞.startsWith('{\\rtf')) throw new Error('RTF 문서 (이름만 .doc) → 글자만');
  if (/^\s*</.test(new TextDecoder('utf-8').decode(u8.subarray(0, 64)))) throw new Error('HTML 문서 (이름만 .doc) → 글자만');
  const c = 복합열기(buf);
  const wd = c.바이트('WordDocument');
  if (!wd) throw new Error('WordDocument 없음 — 워드(DOC) 파일이 아님');
  const v = 몸보기(wd);
  if (v.getUint16(0, true) !== 0xa5ec) throw new Error('워드 97 이전 문서 — 못 엶');
  const 깃발 = v.getUint16(10, true);
  if (깃발 & 0x100) throw new Error('암호 걸린 워드 문서 → 못 엶');
  const 표줄기 = c.바이트(깃발 & 0x200 ? '1Table' : '0Table');
  if (!표줄기) throw new Error('Table 줄기 없음');
  // FIB : 32 바이트 뒤 csw · fibRgW · cslw · fibRgLw · cbRgFcLcb · fibRgFcLcb (fcClx 는 34번째 짝 · 번호 33)
  let o = 32; const csw = v.getUint16(o, true); o += 2 + csw * 2;
  const cslw = v.getUint16(o, true); o += 2 + cslw * 4;
  o += 2;
  const fcClx = v.getUint32(o + 33 * 8, true), lcbClx = v.getUint32(o + 33 * 8 + 4, true);   // fcClx 는 FibRgFcLcb97 의 34번째 짝
  const t = 몸보기(표줄기);
  let p = fcClx; const 끝 = fcClx + lcbClx;
  while (p < 끝 && 표줄기[p] === 1) p += 3 + t.getUint16(p + 1, true);     // Prc 건너뜀
  if (표줄기[p] !== 2) throw new Error('조각표(Pcdt)를 못 찾음');
  const lcb = t.getUint32(p + 1, true), 시작 = p + 5, n = (lcb - 4) / 12;
  let 글 = '';
  const w1252 = new TextDecoder('windows-1252'), u16 = new TextDecoder('utf-16le');
  for (let k = 0; k < n; k++) {
    const cp0 = t.getUint32(시작 + k * 4, true), cp1 = t.getUint32(시작 + (k + 1) * 4, true);
    const pcd = 시작 + (n + 1) * 4 + k * 8;
    const fc = t.getUint32(pcd + 2, true), 좁음 = !!(fc & 0x40000000), 자리 = fc & 0x3fffffff, 길이 = cp1 - cp0;
    글 += 좁음 ? w1252.decode(wd.subarray(자리 / 2, 자리 / 2 + 길이)) : u16.decode(wd.subarray(자리, 자리 + 길이 * 2));
  }
  // 필드 : 0x13 지시문 0x14 결과 0x15 → 결과만
  글 = 글.replace(/\x13[^\x13\x14\x15]*\x14([^\x13\x15]*)\x15/g, '$1').replace(/\x13[^\x13\x15]*\x15/g, '');
  // 표 : 칸 끝 0x07 · 줄 끝은 0x07 두 번 → 「칸 │ 칸」 한 줄로 (옛 워드는 글자 위주로 정함)
  글 = 글.replace(/\x07\x07/g, '').replace(/\x07/g, ' │ ').replace(/ │ /g, '').replace(//g, '\r');
  const 틀 = 만들기('div', 'docx');
  for (const 줄 of 글.split('\r')) {
    const 표줄 = 줄.includes('');
    const 정리 = 줄.replace(//g, '').replace(/[\x01\x08\x1f]/g, '').replace(/[\x0b\x0c]/g, '\n').replace(/\x1e/g, '-');
    const el = 만들기('p', 표줄 ? '표줄' : null, 정리);
    if (!정리.trim()) el.classList.add('빈줄');
    틀.append(el);
  }
  return { 틀, 알림: '옛 워드 — 글자 위주 (표는 칸만 · 그림 · 글꼴 모양 없음)' };
};
