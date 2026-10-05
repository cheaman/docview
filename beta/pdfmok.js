// PDF 목차(책갈피 · Outlines) 읽기 (0.9.8 ⑯ · 목업 1_읽을거리\작은넷_목업.html 「작은 부품 직접」)
// 갤럭시 껍데기(안드로이드 PdfRenderer)는 목차를 못 줌 → PDF 바이트에서 목차만 읽는다 · 아이폰 웹앱은 pdf.js 가 따로 읽음
// 구역 지도 : ① 낱말 읽개(사전 · 배열 · 글 · 이름 · 수 · 가리킴) ② 상호 참조(옛 표 · 압축 흐름 · 객체 묶음) ③ 쪽 차례 ④ 목차 걷기
// 내주는 것 : [{ 글, 쪽(0부터), 깊이 }] · 못 읽으면 [] (화면에서 「목차」 칩이 안 보일 뿐)
'use strict';
const PDF목차 = (() => {
  const 빈칸 = c => c === 32 || c === 10 || c === 13 || c === 9 || c === 12 || c === 0;
  const 끊개 = c => 빈칸(c) || c === 40 || c === 41 || c === 60 || c === 62 || c === 91 || c === 93 || c === 123 || c === 125 || c === 47 || c === 37;
  // ① 낱말 읽개 ─────────────────────────────────
  function 값읽기(b, p) {
    for (;;) { while (p < b.length && 빈칸(b[p])) p++; if (b[p] === 37) { while (p < b.length && b[p] !== 10 && b[p] !== 13) p++; continue; } break; }
    const c = b[p];
    if (c === 60 && b[p + 1] === 60) {                       // << 사전 >>
      p += 2; const d = {};
      for (;;) {
        while (p < b.length && 빈칸(b[p])) p++;
        if (b[p] === 62 && b[p + 1] === 62) return { v: d, p: p + 2 };
        if (p >= b.length) return { v: d, p };
        const k = 값읽기(b, p); const v = 값읽기(b, k.p); d[k.v?.n ?? String(k.v)] = v.v; p = v.p;
      }
    }
    if (c === 60) {                                           // <16진 글>
      let q = p + 1, h = ''; while (q < b.length && b[q] !== 62) { if (!빈칸(b[q])) h += String.fromCharCode(b[q]); q++; }
      if (h.length % 2) h += '0'; const o = new Uint8Array(h.length / 2); for (let i = 0; i < o.length; i++) o[i] = parseInt(h.substr(i * 2, 2), 16);
      return { v: { s: o }, p: q + 1 };
    }
    if (c === 91) {                                           // [ 배열 ]
      p++; const a = [];
      for (;;) { while (p < b.length && 빈칸(b[p])) p++; if (b[p] === 93 || p >= b.length) return { v: a, p: p + 1 }; const x = 값읽기(b, p); a.push(x.v); p = x.p; }
    }
    if (c === 40) {                                           // (글)
      let q = p + 1, 깊 = 1; const o = [];
      while (q < b.length) {
        const x = b[q];
        if (x === 92) { const y = b[q + 1]; const 바꿈 = { 110: 10, 114: 13, 116: 9, 98: 8, 102: 12 }[y];
          if (바꿈 != null) { o.push(바꿈); q += 2; } else if (y >= 48 && y <= 55) { let n = 0, k = 0; q++; while (k < 3 && b[q] >= 48 && b[q] <= 55) { n = n * 8 + b[q] - 48; q++; k++; } o.push(n & 255); }
          else if (y === 13 || y === 10) { q += 2; if (y === 13 && b[q] === 10) q++; } else { o.push(y); q += 2; } continue; }
        if (x === 40) 깊++; if (x === 41 && --깊 === 0) break;
        o.push(x); q++;
      }
      return { v: { s: Uint8Array.from(o) }, p: q + 1 };
    }
    if (c === 47) { let q = p + 1, n = ''; while (q < b.length && !끊개(b[q])) n += String.fromCharCode(b[q++]); return { v: { n: n.replace(/#([0-9a-f]{2})/gi, (m, h) => String.fromCharCode(parseInt(h, 16))) }, p: q }; }
    let q = p, t = ''; while (q < b.length && !끊개(b[q])) t += String.fromCharCode(b[q++]);
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)) {                 // 수 · 「n g R」 가리킴
      const m = /^\s*(\d+)\s+R(?![A-Za-z])/.exec(글(b, q, q + 24));
      if (/^\d+$/.test(t) && m) return { v: { r: +t }, p: q + m[0].length };
      return { v: +t, p: q };
    }
    return { v: t === 'true' ? true : t === 'false' ? false : t === 'null' ? null : t, p: q || p + 1 };
  }
  const 라틴 = new TextDecoder('latin1');
  const 글 = (b, s, e) => 라틴.decode(b.subarray(Math.max(0, s), Math.min(b.length, e)));
  async function 풀기(d) {                                    // FlateDecode (zlib)
    const s = new Blob([d]).stream().pipeThrough(new DecompressionStream('deflate'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  function 예측풀기(d, parm) {                                // PNG 예측 (상호 참조 흐름에 흔함)
    const pr = parm?.Predictor || 1; if (pr < 10) return d;
    const 열 = (parm.Columns || 1) * (parm.Colors || 1) * (parm.BitsPerComponent || 8) / 8, 줄 = 열 + 1, n = Math.floor(d.length / 줄), o = new Uint8Array(n * 열);
    for (let r = 0; r < n; r++) {
      const f = d[r * 줄];
      for (let i = 0; i < 열; i++) {
        const x = d[r * 줄 + 1 + i], a = i ? o[r * 열 + i - 1] : 0, u = r ? o[(r - 1) * 열 + i] : 0, ul = r && i ? o[(r - 1) * 열 + i - 1] : 0;
        let v = x;
        if (f === 1) v = x + a; else if (f === 2) v = x + u; else if (f === 3) v = x + ((a + u) >> 1);
        else if (f === 4) { const pp = a + u - ul, pa = Math.abs(pp - a), pb = Math.abs(pp - u), pc = Math.abs(pp - ul); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? u : ul); }
        o[r * 열 + i] = v & 255;
      }
    }
    return o;
  }
  // ② 상호 참조 ─────────────────────────────────
  async function 읽기(바이트) {
    const b = 바이트 instanceof Uint8Array ? 바이트 : new Uint8Array(바이트);
    const 표 = new Map(), 묶음 = new Map(); let 뒤 = null;
    const 객체at = (off) => {                                  // 「n g obj 값 [stream]」
      const m = /^\s*(\d+)\s+(\d+)\s+obj/.exec(글(b, off, off + 40)); if (!m) return null;
      const x = 값읽기(b, off + m[0].length); let p = x.p;
      while (빈칸(b[p])) p++;
      if (글(b, p, p + 6) === 'stream') { p += 6; if (b[p] === 13) p++; if (b[p] === 10) p++; return { 값: x.v, 흐름at: p }; }
      return { 값: x.v };
    };
    const 흐름 = async (o) => {
      let len = o.값.Length; if (len?.r != null) len = await 풀이(len);
      if (typeof len !== 'number' || o.흐름at + len > b.length) { const e = 글(b, o.흐름at, b.length).indexOf('endstream'); len = e < 0 ? 0 : e; }
      let d = b.subarray(o.흐름at, o.흐름at + len);
      const f = [].concat(o.값.Filter || []).map(x => x.n);
      if (f.includes('FlateDecode')) d = 예측풀기(await 풀기(d), [].concat(o.값.DecodeParms || [])[0]);
      else if (f.length) throw new Error('못 푸는 흐름 ' + f.join());
      return d;
    };
    async function 풀이(v) {                                   // 가리킴 → 값 (다른 것은 그대로)
      if (!v || v.r == null) return v;
      const e = 표.get(v.r); if (!e) return null;
      if (e.off != null) return 객체at(e.off)?.값 ?? null;
      let m = 묶음.get(e.stm);
      if (!m) {
        const o = 객체at(표.get(e.stm)?.off); if (!o) return null;
        const d = await 흐름(o), n = o.값.N, 첫 = o.값.First, 머리 = 글(d, 0, 첫).trim().split(/\s+/).map(Number), 자리 = new Map();
        for (let i = 0; i < n; i++) 자리.set(머리[i * 2], 첫 + 머리[i * 2 + 1]);
        m = { d, 자리 }; 묶음.set(e.stm, m);
      }
      const at = m.자리.get(v.r); return at == null ? null : 값읽기(m.d, at).v;
    }
    const sx = 글(b, b.length - 4096, b.length).lastIndexOf('startxref'); if (sx < 0) return [];
    let off = +/startxref\s+(\d+)/.exec(글(b, b.length - 4096 + sx, b.length))[1]; const 봄 = new Set();
    while (off != null && !봄.has(off) && off < b.length) {
      봄.add(off);
      let 사전;
      if (글(b, off, off + 4) === 'xref') {
        let p = off + 4;
        for (;;) {
          const m = /^\s*(\d+)\s+(\d+)\s*[\r\n]/.exec(글(b, p, p + 40)); if (!m) break;
          p += m[0].length; const 처음 = +m[1], 수 = +m[2];
          for (let i = 0; i < 수; i++) {
            while (빈칸(b[p])) p++;                              // 줄 = 「0000012345 00000 n」 + 줄 끝 두 글자
            const mm = /^(\d{10})\s(\d{5})\s([nf])/.exec(글(b, p, p + 18));
            if (mm && mm[3] === 'n' && !표.has(처음 + i)) 표.set(처음 + i, { off: +mm[1] });
            p += 18;
          }
        }
        const t = 글(b, p, p + 80).indexOf('trailer'); if (t < 0) break;
        사전 = 값읽기(b, p + t + 7).v;
        if (사전.XRefStm) { const o = 객체at(사전.XRefStm); if (o) await 흐름표(o); }
      } else {
        const o = 객체at(off); if (!o) break; 사전 = o.값; await 흐름표(o);
      }
      뒤 ||= 사전; off = 사전.Prev;
    }
    async function 흐름표(o) {
      const d = await 흐름(o), W = o.값.W, 줄 = W[0] + W[1] + W[2], 묶 = o.값.Index || [0, o.값.Size];
      const 수 = (at, n) => { let v = 0; for (let i = 0; i < n; i++) v = v * 256 + d[at + i]; return v; };
      let at = 0;
      for (let k = 0; k < 묶.length; k += 2) for (let i = 0; i < 묶[k + 1]; i++, at += 줄) {
        const 꼴 = W[0] ? 수(at, W[0]) : 1, a = 수(at + W[0], W[1]), c = 수(at + W[0] + W[1], W[2]), num = 묶[k] + i;
        if (표.has(num)) continue;
        if (꼴 === 1) 표.set(num, { off: a }); else if (꼴 === 2) 표.set(num, { stm: a, i: c });
      }
    }
    if (!뒤?.Root) return [];
    // ③ 쪽 차례 ─────────────────────────────────
    const 뿌리 = await 풀이(뒤.Root), 쪽번 = new Map(); let n = 0;
    async function 쪽걷기(ref, 깊이) {
      if (깊이 > 30) return; const v = await 풀이(ref); if (!v) return;
      if (v.Kids) for (const k of v.Kids) await 쪽걷기(k, 깊이 + 1);
      else if (ref?.r != null) 쪽번.set(ref.r, n++);
    }
    await 쪽걷기(뿌리.Pages, 0);
    // ④ 목차 ─────────────────────────────────────
    const 글풀이 = s => { const u = s?.s; if (!u) return String(s ?? ''); if (u[0] === 0xfe && u[1] === 0xff) return new TextDecoder('utf-16be').decode(u.subarray(2)); if (u[0] === 0xef && u[1] === 0xbb && u[2] === 0xbf) return new TextDecoder().decode(u.subarray(3)); return 라틴.decode(u); };
    let 이름표 = null;
    async function 이름찾기(name) {                            // 이름 목적지 — /Dests 사전 · /Names /Dests 이름 나무
      const 열쇠 = typeof name === 'object' ? 글풀이(name) : name;
      const 옛 = await 풀이(뿌리.Dests); if (옛 && 옛[열쇠]) return 풀이(옛[열쇠]);
      if (!이름표) {
        이름표 = new Map();
        const 걷기 = async (ref, 깊) => { const v = await 풀이(ref); if (!v || 깊 > 20) return; if (v.Names) for (let i = 0; i + 1 < v.Names.length; i += 2) 이름표.set(글풀이(v.Names[i]), v.Names[i + 1]); if (v.Kids) for (const k of v.Kids) await 걷기(k, 깊 + 1); };
        const ns = await 풀이(뿌리.Names); if (ns?.Dests) await 걷기(ns.Dests, 0);
      }
      return 풀이(이름표.get(열쇠));
    }
    async function 쪽찾기(dest) {
      dest = await 풀이(dest);
      if (dest && !Array.isArray(dest) && (dest.s || dest.n)) dest = await 이름찾기(dest.n || dest);
      if (dest && !Array.isArray(dest) && dest.D) dest = await 풀이(dest.D);
      if (dest && !Array.isArray(dest) && (dest.s || dest.n)) dest = await 이름찾기(dest.n || dest);
      if (!Array.isArray(dest)) return null;
      const p = dest[0]; return p?.r != null ? 쪽번.get(p.r) ?? null : typeof p === 'number' ? p : null;
    }
    const 목차 = [], 봄2 = new Set();
    async function 목걷기(ref, 깊이) {
      let cur = ref;
      while (cur?.r != null && !봄2.has(cur.r) && 목차.length < 800) {
        봄2.add(cur.r); const it = await 풀이(cur); if (!it) break;
        const 쪽 = await 쪽찾기(it.Dest ?? (it.A ? (await 풀이(it.A))?.D : null)).catch(() => null);
        목차.push({ 글: 글풀이(it.Title).replace(/\s+/g, ' ').trim(), 쪽, 깊이 });
        if (it.First && 깊이 < 6) await 목걷기(it.First, 깊이 + 1);
        cur = it.Next;
      }
    }
    const ol = await 풀이(뿌리.Outlines); if (ol?.First) await 목걷기(ol.First, 0);
    return 목차.filter(x => x.글);
  }
  return { 읽기: b => 읽기(b).catch(() => []) };
})();
