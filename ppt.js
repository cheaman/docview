// PPT 보기 (10-04 · 전무님 정함 : 「가) 슬라이드 모양대로」 기본 + 「나) 글로」 단추 · 옛 PPT 는 글자만)
// 구역 지도
//   ① 읽기 (PPTX) — 압축열기(zip.js) · 발표 → 장 → 틀(layout) → 바탕틀(master) → 테마(색 · 글꼴)
//   ② 색 · 채움 · 선
//   ③ 모양 줄 세우기 — 묶음(grpSp) 풀어 장 좌표로 · 자리표시(ph) 는 틀 · 바탕틀에서 자리를 물려받음
//   ④ 글 — 문단 · 글자 모양 물려받기 (모양 → 틀 → 바탕틀 → 기본) · 줄 나누기 · 글머리
//   ⑤ 도형 길 — 네모 · 둥근 네모 · 동그라미 · 화살표 · 말풍선 · 자유 도형(custGeom) …
//   ⑥ 표 — 칸 합치기 · 표 꾸밈(tableStyles.xml)
//   ⑦ 장 그리기 — 바탕 → 바탕틀 모양 → 틀 모양 → 장 모양 (캔버스 하나)
//   ⑧ PPT길 — app.js 의 PDF 길과 같은 꼴 { 정보, 쪽, 찾기, 놓기 } → PDF 와 같은 화면 (펜 · 돌리기 · 쪽 목록 · 보내기)
//   ⑨ 글로 (나) — 문서.pptx (docs.js 꼴) · 장마다 제목 · 글 · 그림 · 표 · 발표자 메모
//   ⑩ 옛 PPT — 문서.ppt · 복합 문서(cfb.js) 안 「PowerPoint Document」 의 글 조각만
// 못 그리는 것 : 옛 그림 형식(EMF · WMF) · 차트 · 스마트아트 → 회색 칸 · 애니메이션 · 동영상 · 그림자
'use strict';
const 피피티 = (() => {
  const EMU = 12700;                                   // 1pt
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const 파서 = new DOMParser();
  const 엑 = s => 파서.parseFromString(s, 'application/xml');
  const 아이 = (e, n) => { if (e) for (let c = e.firstElementChild; c; c = c.nextElementSibling) if (c.localName === n) return c; return null; };
  const 아이들 = (e, n) => { const a = []; if (e) for (let c = e.firstElementChild; c; c = c.nextElementSibling) if (!n || c.localName === n) a.push(c); return a; };
  const 길 = (e, ...ns) => { for (const n of ns) e = 아이(e, n); return e; };
  const 속 = (e, a) => (e ? e.getAttribute(a) : null);
  const 수 = (e, a, d = 0) => { const v = 속(e, a); return v == null || v === '' ? d : +v; };
  const 아래 = (e, n) => (e ? e.getElementsByTagNameNS('*', n)[0] || null : null);
  const 기본글꼴 = "'Malgun Gothic','맑은 고딕','Apple SD Gothic Neo','Noto Sans KR','Noto Sans CJK KR',sans-serif";

  // ① 읽기 ─────────────────────────────────────────
  const 합치기 = (폴더, 목) => {
    if (목.startsWith('/')) return 목.slice(1);
    const a = 폴더 ? 폴더.split('/') : [];
    for (const s of 목.split('/')) { if (s === '..') a.pop(); else if (s && s !== '.') a.push(s); }
    return a.join('/');
  };
  async function 관계(z, 부분길) {
    const i = 부분길.lastIndexOf('/'), 폴더 = 부분길.slice(0, i);
    const t = await z.글(`${폴더}/_rels/${부분길.slice(i + 1)}.rels`), m = new Map();
    if (!t) return m;
    for (const r of 아이들(엑(t).documentElement, 'Relationship')) {
      const 밖 = 속(r, 'TargetMode') === 'External';
      m.set(속(r, 'Id'), { 종류: (속(r, 'Type') || '').split('/').pop(), 길: 밖 ? null : 합치기(폴더, 속(r, 'Target') || '') });
    }
    return m;
  }
  function 부분(문, p) {
    if (!p) return Promise.resolve(null);
    if (!문.부분들.has(p)) 문.부분들.set(p, (async () => {
      const t = await 문.z.글(p); if (!t) return null;
      return { x: 엑(t).documentElement, r: await 관계(문.z, p), 길: p };
    })());
    return 문.부분들.get(p);
  }
  const 짝길 = (부, 종류) => (부 ? [...부.r.values()].find(r => r.종류 === 종류)?.길 : null);

  async function 읽기(buf) {
    const z = await 압축열기(buf);
    const 문 = { z, 부분들: new Map(), 그림들: new Map() };
    const 발 = await 부분(문, 'ppt/presentation.xml');
    if (!발) throw new Error('PPTX 가 아님 (발표 목차 없음)');
    const sz = 아이(발.x, 'sldSz');
    문.W = 수(sz, 'cx', 9144000); 문.H = 수(sz, 'cy', 6858000);
    문.기본글 = 아이(발.x, 'defaultTextStyle');
    문.장들 = [];
    for (const s of 아이들(아이(발.x, 'sldIdLst'), 'sldId')) {
      const rel = 발.r.get(s.getAttributeNS(R, 'id') || 속(s, 'r:id'));
      if (rel?.길) 문.장들.push({ 길: rel.길 });
    }
    const ts = await 문.z.글('ppt/tableStyles.xml');
    문.표꾸밈 = new Map();
    if (ts) for (const s of 아이들(엑(ts).documentElement, 'tblStyle')) 문.표꾸밈.set(속(s, 'styleId'), s);
    return 문;
  }
  function 장준비(문, n) {
    const 장 = 문.장들[n];
    if (!장) return Promise.reject(new Error('없는 장'));
    return 장.준비 ||= (async () => {
      const s = await 부분(문, 장.길);
      if (!s) throw new Error(`${n + 1}장을 못 읽음`);
      const 틀 = await 부분(문, 짝길(s, 'slideLayout'));
      const 바 = await 부분(문, 짝길(틀, 'slideMaster'));
      const 테 = await 부분(문, 짝길(바, 'theme'));
      const 메 = await 부분(문, 짝길(s, 'notesSlide'));
      return { s, 틀, 바, 테, 메, 색표: 색표만들기(테, 바), 글꼴: 테마글꼴(테) };
    })();
  }

  // ② 색 · 채움 · 선 ───────────────────────────────
  function 색표만들기(테, 바) {
    const 표 = {};
    for (const c of 아이들(아래(테?.x, 'clrScheme'))) {
      const v = 속(아이(c, 'srgbClr'), 'val') || 속(아이(c, 'sysClr'), 'lastClr');
      if (v) 표[c.localName] = v;
    }
    const 짝 = 아이(바?.x, 'clrMap'), 기 = { bg1: 'lt1', tx1: 'dk1', bg2: 'lt2', tx2: 'dk2' };
    return v => 표[(짝 && 속(짝, v)) || 기[v] || v] || null;
  }
  function 테마글꼴(테) {
    const fs = 아래(테?.x, 'fontScheme'), 뽑 = (k, n) => 속(아이(아이(fs, k), n), 'typeface') || '';
    return { mj: { lt: 뽑('majorFont', 'latin'), ea: 뽑('majorFont', 'ea') }, mn: { lt: 뽑('minorFont', 'latin'), ea: 뽑('minorFont', 'ea') } };
  }
  const 이름색 = { black: '000000', white: 'FFFFFF', red: 'FF0000', green: '008000', blue: '0000FF', yellow: 'FFFF00', gray: '808080', grey: '808080', orange: 'FFA500', darkBlue: '00008B', darkRed: '8B0000', lightGray: 'D3D3D3' };
  function hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const M = Math.max(r, g, b), m = Math.min(r, g, b), l = (M + m) / 2;
    if (M === m) return [0, 0, l];
    const d = M - m, s = l > 0.5 ? d / (2 - M - m) : d / (M + m);
    const h = M === r ? (g - b) / d + (g < b ? 6 : 0) : M === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
  }
  function rgb(h, s, l) {
    if (!s) return [l * 255, l * 255, l * 255];
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = t => { t = (t + 1) % 1; return 255 * (t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p); };
    return [f(h + 1 / 3), f(h), f(h - 1 / 3)];
  }
  const 색품 = ['srgbClr', 'schemeClr', 'sysClr', 'prstClr', 'scrgbClr', 'hslClr'];
  // e 안의 색 하나 → [r, g, b, a] · 없으면 null · ph = 「자리 색」(phClr) 을 채울 색
  function 색값(e, 색표, ph) {
    const c = 아이들(e).find(x => 색품.includes(x.localName)); if (!c) return null;
    let hex = null;
    if (c.localName === 'srgbClr') hex = 속(c, 'val');
    else if (c.localName === 'schemeClr') { const v = 속(c, 'val'); if (v === 'phClr') { if (!ph) return null; hex = ph; } else hex = 색표(v); }
    else if (c.localName === 'sysClr') hex = 속(c, 'lastClr') || (속(c, 'val') === 'window' ? 'FFFFFF' : '000000');
    else if (c.localName === 'prstClr') hex = 이름색[속(c, 'val')] || '000000';
    else if (c.localName === 'scrgbClr') hex = [수(c, 'r'), 수(c, 'g'), 수(c, 'b')].map(v => Math.round(255 * Math.pow(v / 100000, 1 / 2.2)).toString(16).padStart(2, '0')).join('');
    if (!hex) hex = '000000';
    if (Array.isArray(hex)) return hex;
    let [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) || 0), a = 1;
    for (const m of 아이들(c)) {
      const v = 수(m, 'val') / 100000;
      switch (m.localName) {
        case 'alpha': a = v; break;
        case 'lumMod': { const [h, s, l] = hsl(r, g, b); [r, g, b] = rgb(h, s, Math.min(1, l * v)); break; }
        case 'lumOff': { const [h, s, l] = hsl(r, g, b); [r, g, b] = rgb(h, s, Math.max(0, Math.min(1, l + v))); break; }
        case 'tint': r = r * v + 255 * (1 - v); g = g * v + 255 * (1 - v); b = b * v + 255 * (1 - v); break;
        case 'shade': r *= v; g *= v; b *= v; break;
        case 'satMod': { const [h, s, l] = hsl(r, g, b); [r, g, b] = rgb(h, Math.min(1, s * v), l); break; }
      }
    }
    return [r, g, b, a];
  }
  const 색글 = c => (c ? `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${c[3] ?? 1})` : null);
  const 색16 = c => (c ? [c[0], c[1], c[2]].map(v => Math.round(v).toString(16).padStart(2, '0')).join('') : null);

  // 채움 → { 색 } · { 번짐: [[자리, 색]], 각, 둥근 } · { 그림: rid } · null(없음) · undefined(정해지지 않음 → 꾸밈으로)
  function 채움(겉, 색표, 꾸밈, 묶음채움) {
    for (const c of 아이들(겉)) {
      if (c.localName === 'noFill') return null;
      if (c.localName === 'solidFill') return { 색: 색값(c, 색표) };
      if (c.localName === 'gradFill') {
        const 멈춤 = 아이들(아이(c, 'gsLst'), 'gs').map(g => [수(g, 'pos') / 100000, 색값(g, 색표)]).filter(x => x[1]).sort((a, b) => a[0] - b[0]);
        if (!멈춤.length) return null;
        return { 번짐: 멈춤, 각: 수(아이(c, 'lin'), 'ang') / 60000, 둥근: !!아이(c, 'path') };
      }
      if (c.localName === 'blipFill') return { 그림: 아래(c, 'blip')?.getAttributeNS(R, 'embed'), 자름: 아이(c, 'srcRect') };
      if (c.localName === 'pattFill') return { 색: 색값(아이(c, 'fgClr'), 색표) };
      if (c.localName === 'grpFill') return 묶음채움 || null;
    }
    const 참 = 아이(꾸밈, 'fillRef');
    if (참 && 수(참, 'idx') > 0) return { 색: 색값(참, 색표) };
    return undefined;
  }
  function 선(겉, 색표, 꾸밈) {
    const ln = 아이(겉, 'ln');
    let 색 = undefined, w = ln && 속(ln, 'w') != null ? 수(ln, 'w') : null;
    if (ln) for (const c of 아이들(ln)) {
      if (c.localName === 'noFill') 색 = null;
      else if (c.localName === 'solidFill') 색 = 색값(c, 색표);
      else if (c.localName === 'gradFill') 색 = 색값(아이(아이(c, 'gsLst'), 'gs'), 색표);
    }
    if (색 === undefined) {
      const 참 = 아이(꾸밈, 'lnRef');
      색 = 참 && 수(참, 'idx') > 0 ? 색값(참, 색표) : null;
      if (w == null && 참) w = 9525 * Math.max(1, 수(참, 'idx'));
    }
    if (!색) return null;
    const 대시 = 속(아이(ln, 'prstDash'), 'val');
    return { 색, w: w ?? 9525, 대시: 대시 && 대시 !== 'solid' ? 대시 : null, 머리: 속(아이(ln, 'headEnd'), 'type'), 꼬리: 속(아이(ln, 'tailEnd'), 'type') };
  }

  // ③ 모양 줄 세우기 ───────────────────────────────
  const 겉이름 = { sp: 'spPr', pic: 'spPr', cxnSp: 'spPr', grpSp: 'grpSpPr' };
  const 안이름 = { sp: 'nvSpPr', pic: 'nvPicPr', cxnSp: 'nvCxnSpPr', grpSp: 'nvGrpSpPr', graphicFrame: 'nvGraphicFramePr' };
  const 자리표 = e => 길(e, 안이름[e.localName], 'nvPr', 'ph');
  // 장 · 틀 · 바탕틀의 모양을 차례로 · 묶음은 풀어 장 좌표(EMU) 로 { 종류, e, x, y, w, h, 돌, 좌우, 상하, 묶음채움 }
  function 모양들(나무, m = { ox: 0, oy: 0, sx: 1, sy: 1, 돌: 0 }, 쌓음 = [], 묶음채움) {
    for (const e of 아이들(나무)) {
      const n = e.localName;
      if (n === 'AlternateContent') { const f = 아이(e, 'Fallback') || 아이(e, 'Choice'); if (f) 모양들(f, m, 쌓음, 묶음채움); continue; }
      if (!안이름[n]) continue;
      const xf = n === 'graphicFrame' ? 아이(e, 'xfrm') : 아이(아이(e, 겉이름[n]), 'xfrm');
      const off = 아이(xf, 'off'), ext = 아이(xf, 'ext');
      const 칸 = xf && off && ext ? { x: m.ox + m.sx * 수(off, 'x'), y: m.oy + m.sy * 수(off, 'y'), w: m.sx * 수(ext, 'cx'), h: m.sy * 수(ext, 'cy') } : null;
      const 돌 = m.돌 + 수(xf, 'rot') / 60000, 좌우 = 속(xf, 'flipH') === '1', 상하 = 속(xf, 'flipV') === '1';
      if (n === 'grpSp') {
        const co = 아이(xf, 'chOff'), ce = 아이(xf, 'chExt');
        const kx = ce && 수(ce, 'cx') ? 수(ext, 'cx') / 수(ce, 'cx') : 1, ky = ce && 수(ce, 'cy') ? 수(ext, 'cy') / 수(ce, 'cy') : 1;
        const m2 = 칸 ? { ox: 칸.x - m.sx * kx * 수(co, 'x'), oy: 칸.y - m.sy * ky * 수(co, 'y'), sx: m.sx * kx, sy: m.sy * ky, 돌 } : m;
        // 묶음의 채움 — 안 모양이 「묶음 채움(grpFill)」 을 쓰면 이것
        const 겉 = 아이(e, 'grpSpPr'), 자기채움 = 아이들(겉).some(c => /^(solid|grad|blip|patt|no)Fill$/.test(c.localName));
        모양들(e, m2, 쌓음, 자기채움 ? { 겉 } : 묶음채움);
        continue;
      }
      쌓음.push({ 종류: n, e, ...(칸 || {}), 칸없음: !칸, 돌, 좌우, 상하, 묶음채움 });
    }
    return 쌓음;
  }
  // 자리표시(ph) 짝 찾기 — idx 가 같으면 그것 · 아니면 종류로 (ctrTitle ≈ title · subTitle · obj ≈ body)
  const 종류틀 = t => (t === 'ctrTitle' ? 'title' : ['subTitle', 'obj', undefined, null, ''].includes(t) ? 'body' : t);
  function 자리짝(부, ph) {
    if (!부 || !ph) return null;
    const 나무 = 길(부.x, 'cSld', 'spTree'), idx = 속(ph, 'idx'), t = 속(ph, 'type');
    let 종류맞음 = null;
    for (const e of 아이들(나무)) {
      const p = 안이름[e.localName] && 자리표(e); if (!p) continue;
      if (idx != null && 속(p, 'idx') === idx && (!t || 종류틀(속(p, 'type')) === 종류틀(t))) return e;
      if (!종류맞음 && 종류틀(속(p, 'type')) === 종류틀(t)) 종류맞음 = e;
    }
    if (종류맞음) return 종류맞음;
    if (idx != null) for (const e of 아이들(나무)) { const p = 안이름[e.localName] && 자리표(e); if (p && 속(p, 'idx') === idx) return e; }
    return null;
  }
  // 모양 하나의 물려받기 사슬 { 칸, 글사슬(lstStyle…), 몸(bodyPr…) }
  function 물림(준, 문, 모, 층) {
    const ph = 자리표(모.e);
    const 틀짝 = ph && 층 === 's' ? 자리짝(준.틀, ph) : null;
    const 바짝 = ph && 층 !== 'm' ? 자리짝(준.바, ph) : null;
    const 짝들 = [틀짝, 바짝].filter(Boolean);
    let 칸 = 모.칸없음 ? null : 모;
    if (!칸) for (const z of 짝들) {
      const xf = 아이(아이(z, 'spPr'), 'xfrm'), off = 아이(xf, 'off'), ext = 아이(xf, 'ext');
      if (off && ext) { 칸 = { x: 수(off, 'x'), y: 수(off, 'y'), w: 수(ext, 'cx'), h: 수(ext, 'cy') }; break; }
    }
    const 글사슬 = [아이(아이(모.e, 'txBody'), 'lstStyle')];
    const 몸 = [아이(아이(모.e, 'txBody'), 'bodyPr')];
    for (const z of 짝들) { 글사슬.push(아이(아이(z, 'txBody'), 'lstStyle')); 몸.push(아이(아이(z, 'txBody'), 'bodyPr')); }
    if (ph) {
      const t = 종류틀(속(ph, 'type')), ts = 아이(준.바?.x, 'txStyles');
      글사슬.push(아이(ts, t === 'title' ? 'titleStyle' : t === 'body' ? 'bodyStyle' : 'otherStyle'));
    }
    글사슬.push(문.기본글);
    return { 칸, 글사슬: 글사슬.filter(Boolean), 몸: 몸.filter(Boolean), 자리: ph ? 종류틀(속(ph, 'type')) : null, 짝: 짝들 };
  }

  // ④ 글 ───────────────────────────────────────────
  const 찾속 = (els, a) => { for (const e of els) { const v = 속(e, a); if (v != null) return v; } return null; };
  const 찾아이 = (els, n) => { for (const e of els) { const c = 아이(e, n); if (c) return c; } return null; };
  const 윙딩 = { l: '●', n: '■', q: '❑', u: '◆', v: '❖', 'Ø': '➢', '§': '■', 'ü': '✓', p: '□', o: '□', 'Ü': '✓', 'è': '➔', 'à': '➔', 'ð': '➔', 'F': '☞', '': '•' };
  const 원문자 = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳';
  function 번호글(꼴, k) {
    const 알 = n => String.fromCharCode(96 + ((n - 1) % 26) + 1), 로마 = n => { const v = [[10, 'x'], [9, 'ix'], [5, 'v'], [4, 'iv'], [1, 'i']]; let s = ''; for (const [a, b] of v) while (n >= a) { s += b; n -= a; } return s; };
    switch (꼴) {
      case 'arabicParenR': return k + ')'; case 'arabicParenBoth': return `(${k})`; case 'arabicPlain': return String(k);
      case 'alphaLcParenR': return 알(k) + ')'; case 'alphaLcPeriod': return 알(k) + '.'; case 'alphaUcPeriod': return 알(k).toUpperCase() + '.'; case 'alphaUcParenR': return 알(k).toUpperCase() + ')';
      case 'romanLcPeriod': return 로마(k) + '.'; case 'romanUcPeriod': return 로마(k).toUpperCase() + '.';
      case 'circleNumDbPlain': case 'circleNumWdBlackPlain': return 원문자[k - 1] || k + '.';
      case 'ea1ChsPeriod': case 'hangulKorPeriod': return '가나다라마바사아자차카타파하'[(k - 1) % 14] + '.';
      default: return k + '.';
    }
  }
  function 글꼴이름(rPr들, 테글, 글) {
    const 한글 = /[ᄀ-ᇿ㄰-㆏가-힯]/.test(글);
    let f = 속(찾아이(rPr들, 한글 ? 'ea' : 'latin'), 'typeface') || 속(찾아이(rPr들, 'latin'), 'typeface') || '+mn-' + (한글 ? 'ea' : 'lt');
    if (f.startsWith('+')) { const [, k, t] = f.match(/^\+(mj|mn)-(lt|ea|cs)/) || [, 'mn', 'lt']; f = 테글?.[k]?.[t === 'cs' ? 'lt' : t] || 테글?.[k]?.lt || ''; }
    return f ? `"${f.replace(/"/g, '')}",${기본글꼴}` : 기본글꼴;
  }
  // 글 상자 하나를 줄로 나눔 — 맥 = { 사슬, 몸, 색표, 배(px/EMU), 기본색, 테글, 굵게?, 넓이(px) }
  function 글짜기(ctx, txBody, 맥) {
    const 몸들 = [아이(txBody, 'bodyPr'), ...맥.몸];
    const fa = 찾아이(몸들, 'normAutofit'), 비율 = fa ? 수(fa, 'fontScale', 100000) / 100000 : 1, 줄줄임 = fa ? 수(fa, 'lnSpcReduction', 0) / 100000 : 0;
    const 감쌈 = 찾속(몸들, 'wrap') !== 'none';
    const 문단들 = [], 번호 = {};
    for (const p of 아이들(txBody, 'p')) {
      const pPr = 아이(p, 'pPr'), lvl = 수(pPr, 'lvl', 0);
      const 단 = [pPr, ...맥.사슬.map(ls => 아이(ls, `lvl${lvl + 1}pPr`))].filter(Boolean);
      const 기rPr = 단.slice(pPr ? 1 : 0).map(x => 아이(x, 'defRPr')).filter(Boolean);
      const 조각 = [];
      const 글모양 = rPr => {
        const rs = [rPr, ...기rPr].filter(Boolean);
        const sz = +(찾속(rs, 'sz') || 1800) * 비율;
        const 색 = 색값(찾아이(rs, 'solidFill'), 맥.색표) || 맥.기본색 || [0, 0, 0, 1];
        const b = (찾속(rs, 'b') ?? (맥.굵게 ? '1' : '0')) === '1', i = 찾속(rs, 'i') === '1', u = (찾속(rs, 'u') || 'none') !== 'none';
        return { rs, px: sz / 100 * EMU * 맥.배, 색, b, i, u, 위: +(찾속(rs, 'baseline') || 0) / 100000, 자간: +(찾속(rs, 'spc') || 0) / 100 * EMU * 맥.배 * 비율 };
      };
      for (const r of 아이들(p)) {
        if (r.localName === 'r' || r.localName === 'fld') { const t = 아이(r, 't')?.textContent || ''; if (t) 조각.push({ t, ...글모양(아이(r, 'rPr')) }); }
        else if (r.localName === 'br') 조각.push({ 줄바꿈: true, ...글모양(아이(r, 'rPr')) });
      }
      const 끝모양 = 글모양(아이(p, 'endParaRPr'));
      // 글머리
      let 머리 = null;
      const 머리꼴 = 단.find(x => 아이들(x).some(c => /^bu(None|Char|AutoNum|Blip)$/.test(c.localName)));
      if (머리꼴 && !아이(머리꼴, 'buNone') && 조각.some(c => c.t)) {
        const ch = 아이(머리꼴, 'buChar'), an = 아이(머리꼴, 'buAutoNum'), bl = 아이(머리꼴, 'buBlip'), 첫 = 조각.find(c => c.t) || 끝모양;
        const 글꼴 = 속(찾아이(단, 'buFont'), 'typeface') || '';
        let 글 = ch ? 속(ch, 'char') || '•' : '';
        if (/wingdings|symbol/i.test(글꼴)) 글 = 윙딩[글] || '•';
        if (an) { const k = `${lvl}`; 번호[k] = (번호[k] || (수(an, 'startAt', 1) - 1)) + 1; 글 = 번호글(속(an, 'type'), 번호[k]); }
        const 크기비 = 찾아이(단, 'buSzPct') ? 수(찾아이(단, 'buSzPct'), 'val') / 100000 : 1;
        머리 = { t: 글 || '•', px: 첫.px * 크기비, 색: 색값(찾아이(단, 'buClr'), 맥.색표) || 첫.색, b: false, i: false, 그림: bl ? 아이(bl, 'blip')?.getAttributeNS(R, 'embed') : null };
      } else if (!머리꼴 || 아이(머리꼴, 'buNone')) { for (const k in 번호) if (+k >= lvl) delete 번호[k]; }
      const 간격 = 찾아이(단, 'lnSpc'), 앞 = 찾아이(단, 'spcBef'), 뒤 = 찾아이(단, 'spcAft');
      const 비율줄 = 간격 && 아이(간격, 'spcPct') ? 수(아이(간격, 'spcPct'), 'val') / 100000 : 1;
      const 점줄 = 간격 && 아이(간격, 'spcPts') ? 수(아이(간격, 'spcPts'), 'val') / 100 * EMU * 맥.배 : 0;
      const 띄움 = (e, 큰) => (!e ? 0 : 아이(e, 'spcPts') ? 수(아이(e, 'spcPts'), 'val') / 100 * EMU * 맥.배 : 아이(e, 'spcPct') ? 수(아이(e, 'spcPct'), 'val') / 100000 * 큰 * 1.2 : 0);
      문단들.push({
        조각, 끝모양, 머리, lvl,
        정렬: 찾속(단, 'algn') || 'l',
        왼: +(찾속(단, 'marL') || 0) * 맥.배, 들임: +(찾속(단, 'indent') || 0) * 맥.배,
        비율줄: Math.max(0.5, 비율줄 - 줄줄임), 점줄, 앞: 띄움(앞, 끝모양.px), 뒤: 띄움(뒤, 끝모양.px),
      });
    }
    // 줄 나누기 — 빈칸에서 끊고 · 한 낱말이 넘치면 글자에서
    const 넓이 = 맥.넓이, 줄들 = [];
    const 글꼴 = c => `${c.i ? 'italic ' : ''}${c.b ? 'bold ' : ''}${Math.max(1, c.px).toFixed(2)}px ${글꼴이름(c.rs || [], 맥.테글, c.t || '가')}`;
    const 재기 = (c, t) => { ctx.font = 글꼴(c); return ctx.measureText(t).width + (c.자간 ? c.자간 * [...t].length : 0); };
    for (const [k, 단] of 문단들.entries()) {
      const 시작줄 = 줄들.length;
      let 줄 = null;
      const 새줄 = 첫 => { 줄 = { 단, 조각: [], 넓: 0, 큰: 0, 첫 }; 줄들.push(줄); };
      새줄(true);
      // 줄 넓이 + 여유 — 폰에 원본 글꼴이 없어 대신 글꼴이 조금 넓음 → 조금 넘치는 것은 줄을 안 바꿈 (10-04 실측 「01」 → 「0 / 1」)
      const 줄넓이 = () => (감쌈 ? 넓이 - (줄.첫 && !단.머리 ? 단.왼 + 단.들임 : 단.왼) + Math.max(2, (줄.큰 || 단.끝모양.px) * 0.4) : Infinity);
      for (const c of 단.조각) {
        줄.큰 = Math.max(줄.큰, c.px);
        if (c.줄바꿈) { 새줄(false); continue; }
        for (const 토막 of c.t.split(/(\s+)/)) {
          if (!토막) continue;
          let w = 재기(c, 토막);
          if (줄.넓 + w > 줄넓이() && 줄.조각.length && !/^\s+$/.test(토막)) 새줄(false);
          if (/^\s+$/.test(토막) && !줄.조각.length && !줄.첫) continue;
          if (w > 줄넓이()) {                               // 긴 낱말 — 글자마다
            let 쌓 = '';
            for (const ch of 토막) {
              const cw = 재기(c, 쌓 + ch);
              if (줄.넓 + cw > 줄넓이() && (쌓 || 줄.조각.length)) { if (쌓) { 줄.조각.push({ ...c, t: 쌓, w: 재기(c, 쌓) }); 줄.넓 += 재기(c, 쌓); } 새줄(false); 쌓 = ch; }
              else 쌓 += ch;
            }
            if (쌓) { w = 재기(c, 쌓); 줄.조각.push({ ...c, t: 쌓, w }); 줄.넓 += w; 줄.큰 = Math.max(줄.큰, c.px); }
            continue;
          }
          줄.조각.push({ ...c, t: 토막, w }); 줄.넓 += w; 줄.큰 = Math.max(줄.큰, c.px);
        }
      }
      for (let i = 시작줄; i < 줄들.length; i++) {
        const z = 줄들[i]; if (!z.큰) z.큰 = 단.끝모양.px;
        z.높 = 단.점줄 || z.큰 * 1.2 * 단.비율줄;
        // 줄 끝 빈칸은 넓이에서 뺌 (가운데 · 오른 맞춤이 어긋나지 않게)
        while (z.조각.length && /^\s+$/.test(z.조각[z.조각.length - 1].t)) z.넓 -= z.조각.pop().w;
      }
      줄들[시작줄].앞 = k ? 단.앞 : 0;
      줄들[줄들.length - 1].뒤 = 단.뒤;
    }
    const 높이 = 줄들.reduce((s, z) => s + z.높 + (z.앞 || 0) + (z.뒤 || 0), 0);
    return { 줄들, 높이, 글꼴 };
  }
  function 글그리기(ctx, txBody, 칸, 맥) {
    if (!txBody || !아이(txBody, 'p')) return;
    const 몸들 = [아이(txBody, 'bodyPr'), ...맥.몸];
    const 안 = k => 찾속(몸들, k);
    const L = (안('lIns') != null ? +안('lIns') : 91440) * 맥.배, T = (안('tIns') != null ? +안('tIns') : 45720) * 맥.배;
    const Rr = (안('rIns') != null ? +안('rIns') : 91440) * 맥.배, B = (안('bIns') != null ? +안('bIns') : 45720) * 맥.배;
    const 세로 = ['vert', 'eaVert', 'wordArtVert', 'mongolianVert'].includes(안('vert')) ? 1 : 안('vert') === 'vert270' ? -1 : 0;
    ctx.save();
    let { x, y, w, h } = 칸;
    if (세로) { ctx.translate(x + w / 2, y + h / 2); ctx.rotate(세로 * Math.PI / 2); [w, h] = [h, w]; x = -w / 2; y = -h / 2; }
    const 짠 = 글짜기(ctx, txBody, { ...맥, 넓이: Math.max(4, w - L - Rr) });
    const 위치 = 안('anchor') || 't';
    let top = y + T;
    if (위치 === 'ctr') top = y + T + (h - T - B - 짠.높이) / 2;
    else if (위치 === 'b') top = y + h - B - 짠.높이;
    ctx.textBaseline = 'alphabetic';
    for (const z of 짠.줄들) {
      top += z.앞 || 0;
      const 단 = z.단, 들 = z.첫 && !단.머리 ? 단.왼 + 단.들임 : 단.왼, 넓 = w - L - Rr - 들;
      let gx = x + L + 들;
      if (단.정렬 === 'ctr') gx += (넓 - z.넓) / 2; else if (단.정렬 === 'r') gx += 넓 - z.넓;
      // 나눠 맞춤(dist) — 글자 사이를 고르게 벌려 줄을 꽉 채움 (표지의 넓게 벌린 기관 이름 같은 것)
      const 글자수 = 단.정렬 === 'dist' ? z.조각.reduce((s, c) => s + [...c.t].length, 0) : 0;
      const 벌림 = 글자수 > 1 && z.넓 < 넓 ? (넓 - z.넓) / (글자수 - 1) : 0;
      const 바닥 = top + z.높 - z.큰 * 0.28 - (z.높 - z.큰 * 1.2) * 0.25;
      if (z.첫 && 단.머리) {
        const m = 단.머리, 그 = m.그림 && 맥.글머리그림?.get(m.그림);
        if (그?.im) { const s = Math.max(2, m.px * 0.8); ctx.drawImage(그.im, x + L + 단.왼 + 단.들임, 바닥 - z.큰 * 0.38 - s / 2, s, s); }
        else { ctx.font = `${m.px.toFixed(2)}px ${기본글꼴}`; ctx.fillStyle = 색글(m.색); ctx.fillText(m.t, x + L + 단.왼 + 단.들임, 바닥); }
      }
      for (const c of z.조각) {
        ctx.font = 짠.글꼴(c); ctx.fillStyle = 색글(c.색);
        const 올림 = c.위 ? -c.위 * z.큰 : 0;
        if (c.위) ctx.font = 짠.글꼴({ ...c, px: c.px * 0.65 });
        if (c.자간 || 벌림) {                          // 글자 사이 띄움(spc) · 나눠 맞춤 — 글자마다
          let gx2 = gx;
          for (const ch of c.t) { ctx.fillText(ch, gx2, 바닥 + 올림); gx2 += ctx.measureText(ch).width + c.자간 + 벌림; }
          if (c.u) ctx.fillRect(gx, 바닥 + c.px * 0.12, gx2 - gx, Math.max(1, c.px / 16));
          gx = gx2; continue;
        }
        ctx.fillText(c.t, gx, 바닥 + 올림);
        if (c.u) { ctx.fillRect(gx, 바닥 + c.px * 0.12, c.w, Math.max(1, c.px / 16)); }
        gx += c.w;
      }
      top += z.높 + (z.뒤 || 0);
    }
    ctx.restore();
  }
  // 글만 뽑기 (찾기 · 글로) — 문단마다 한 줄
  const 문단글 = txBody => 아이들(txBody, 'p').map(p => 아이들(p).map(r => (r.localName === 'br' ? '\n' : 아이(r, 't')?.textContent || '')).join(''));

  // ⑤ 도형 길 ─────────────────────────────────────
  function 조정값(e, 이름, 기본) {
    for (const g of 아이들(길(e, 'spPr', 'prstGeom', 'avLst'), 'gd')) if (속(g, 'name') === 이름) { const m = /val\s+(-?\d+)/.exec(속(g, 'fmla') || ''); if (m) return +m[1]; }
    return 기본;
  }
  function 둥근네모(ctx, x, y, w, h, r1, r2 = r1) {
    r1 = Math.max(0, Math.min(r1, w / 2, h / 2)); r2 = Math.max(0, Math.min(r2, w / 2, h / 2));
    ctx.moveTo(x + r1, y); ctx.lineTo(x + w - r1, y); ctx.arcTo(x + w, y, x + w, y + r1, r1);
    ctx.lineTo(x + w, y + h - r2); ctx.arcTo(x + w, y + h, x + w - r2, y + h, r2);
    ctx.lineTo(x + r2, y + h); ctx.arcTo(x, y + h, x, y + h - r2, r2);
    ctx.lineTo(x, y + r1); ctx.arcTo(x, y, x + r1, y, r1); ctx.closePath();
  }
  const 선꼴 = /^(line|straightConnector1|bentConnector[2-5]|curvedConnector[2-5])$/;
  // 0,0 ~ w,h 안에 길을 그림 · 열린 길(선)이면 true
  function 도형길(ctx, e, w, h, 배) {
    const 꼴 = 속(길(e, 'spPr', 'prstGeom'), 'prst') || (아이(아이(e, 'spPr'), 'custGeom') ? 'cust' : 'rect');
    const 짧 = Math.min(w, h), 조 = (n, d) => 조정값(e, n, d) / 100000;
    ctx.beginPath();
    switch (꼴) {
      case 'cust': return 자유길(ctx, 아이(아이(e, 'spPr'), 'custGeom'), w, h);
      case 'roundRect': case 'flowChartAlternateProcess': 둥근네모(ctx, 0, 0, w, h, 짧 * 조('adj', 16667)); return false;
      case 'round2SameRect': 둥근네모(ctx, 0, 0, w, h, 짧 * 조('adj1', 16667), 짧 * 조('adj2', 0)); return false;
      case 'round1Rect': case 'snip1Rect': case 'snipRoundRect': 둥근네모(ctx, 0, 0, w, h, 짧 * 0.16667, 0); return false;
      case 'flowChartTerminator': 둥근네모(ctx, 0, 0, w, h, h / 2); return false;
      case 'ellipse': case 'flowChartConnector': case 'donut': case 'pie': case 'chord': ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); return false;
      case 'triangle': case 'flowChartExtract': { const a = 조('adj', 50000); ctx.moveTo(w * a, 0); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); return false; }
      case 'rtTriangle': ctx.moveTo(0, 0); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); return false;
      case 'diamond': case 'flowChartDecision': ctx.moveTo(w / 2, 0); ctx.lineTo(w, h / 2); ctx.lineTo(w / 2, h); ctx.lineTo(0, h / 2); ctx.closePath(); return false;
      case 'parallelogram': case 'flowChartInputOutput': { const a = 짧 * 조('adj', 25000); ctx.moveTo(a, 0); ctx.lineTo(w, 0); ctx.lineTo(w - a, h); ctx.lineTo(0, h); ctx.closePath(); return false; }
      case 'trapezoid': { const a = 짧 * 조('adj', 25000); ctx.moveTo(a, 0); ctx.lineTo(w - a, 0); ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); return false; }
      case 'hexagon': { const a = 짧 * 조('adj', 25000); ctx.moveTo(a, 0); ctx.lineTo(w - a, 0); ctx.lineTo(w, h / 2); ctx.lineTo(w - a, h); ctx.lineTo(a, h); ctx.lineTo(0, h / 2); ctx.closePath(); return false; }
      case 'octagon': { const a = 짧 * 조('adj', 29289); ctx.moveTo(a, 0); ctx.lineTo(w - a, 0); ctx.lineTo(w, a); ctx.lineTo(w, h - a); ctx.lineTo(w - a, h); ctx.lineTo(a, h); ctx.lineTo(0, h - a); ctx.lineTo(0, a); ctx.closePath(); return false; }
      case 'homePlate': { const a = 짧 * 조('adj', 50000); ctx.moveTo(0, 0); ctx.lineTo(w - a, 0); ctx.lineTo(w, h / 2); ctx.lineTo(w - a, h); ctx.lineTo(0, h); ctx.closePath(); return false; }
      case 'chevron': { const a = 짧 * 조('adj', 50000); ctx.moveTo(0, 0); ctx.lineTo(w - a, 0); ctx.lineTo(w, h / 2); ctx.lineTo(w - a, h); ctx.lineTo(0, h); ctx.lineTo(a, h / 2); ctx.closePath(); return false; }
      case 'rightArrow': case 'leftArrow': case 'upArrow': case 'downArrow': {
        const 가로 = 꼴 === 'rightArrow' || 꼴 === 'leftArrow', L = 가로 ? w : h, S = 가로 ? h : w;
        const 몸 = S * 조('adj1', 50000), 머 = Math.min(L, 짧 * 조('adj2', 50000));
        const 점 = [[0, (S - 몸) / 2], [L - 머, (S - 몸) / 2], [L - 머, 0], [L, S / 2], [L - 머, S], [L - 머, (S + 몸) / 2], [0, (S + 몸) / 2]];
        const 옮 = ([a, b]) => (꼴 === 'rightArrow' ? [a, b] : 꼴 === 'leftArrow' ? [w - a, b] : 꼴 === 'downArrow' ? [b, a] : [b, h - a]);
        점.map(옮).forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.closePath(); return false;
      }
      case 'leftRightArrow': { const 몸 = h * 조('adj1', 50000), 머 = Math.min(w / 2, 짧 * 조('adj2', 50000)); [[0, h / 2], [머, 0], [머, (h - 몸) / 2], [w - 머, (h - 몸) / 2], [w - 머, 0], [w, h / 2], [w - 머, h], [w - 머, (h + 몸) / 2], [머, (h + 몸) / 2], [머, h]].forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.closePath(); return false; }
      case 'wedgeRoundRectCallout': case 'wedgeRectCallout': case 'wedgeEllipseCallout': {
        const tx = w / 2 + w * 조('adj1', -20833), ty = h / 2 + h * 조('adj2', 62500);
        if (꼴 === 'wedgeEllipseCallout') ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        else 둥근네모(ctx, 0, 0, w, h, 꼴 === 'wedgeRectCallout' ? 0 : 짧 * 0.16667);
        // 꼬리 — 꼬리 끝이 상자 밖일 때만 · PowerPoint 도형 규칙 : 밑동은 변의 2/12~5/12 또는 7/12~10/12 (꼬리 끝 쪽)
        if (tx < 0 || tx > w || ty < 0 || ty > h) {
          const dx = (tx - w / 2) / w, dy = (ty - h / 2) / h;
          if (Math.abs(dy) >= Math.abs(dx)) { const by = dy > 0 ? h : 0, b0 = (tx < w / 2 ? 2 : 7) * w / 12; ctx.moveTo(b0, by); ctx.lineTo(tx, ty); ctx.lineTo(b0 + w * 3 / 12, by); }
          else { const bx = dx > 0 ? w : 0, b0 = (ty < h / 2 ? 2 : 7) * h / 12; ctx.moveTo(bx, b0); ctx.lineTo(tx, ty); ctx.lineTo(bx, b0 + h * 3 / 12); }
        }
        return false;
      }
      case 'plus': case 'mathPlus': { const a = 짧 * 조('adj', 25000); [[a, 0], [w - a, 0], [w - a, a], [w, a], [w, h - a], [w - a, h - a], [w - a, h], [a, h], [a, h - a], [0, h - a], [0, a], [a, a]].forEach(([p, q], i) => (i ? ctx.lineTo(p, q) : ctx.moveTo(p, q))); ctx.closePath(); return false; }
      case 'line': case 'straightConnector1': ctx.moveTo(0, 0); ctx.lineTo(w, h); return true;
      case 'bentConnector2': ctx.moveTo(0, 0); ctx.lineTo(w, 0); ctx.lineTo(w, h); return true;
      case 'bentConnector3': { const a = w * 조('adj1', 50000); ctx.moveTo(0, 0); ctx.lineTo(a, 0); ctx.lineTo(a, h); ctx.lineTo(w, h); return true; }
      case 'bentConnector4': case 'bentConnector5': { const a = w * 조('adj1', 50000), b = h * 조('adj2', 50000); ctx.moveTo(0, 0); ctx.lineTo(a, 0); ctx.lineTo(a, b); ctx.lineTo(w, b); ctx.lineTo(w, h); return true; }
      case 'curvedConnector2': case 'curvedConnector3': case 'curvedConnector4': case 'curvedConnector5': ctx.moveTo(0, 0); ctx.bezierCurveTo(w / 2, 0, w / 2, h, w, h); return true;
      case 'leftBracket': ctx.moveTo(w, 0); ctx.quadraticCurveTo(0, 0, 0, Math.min(h / 2, w)); ctx.lineTo(0, h - Math.min(h / 2, w)); ctx.quadraticCurveTo(0, h, w, h); return true;
      case 'rightBracket': ctx.moveTo(0, 0); ctx.quadraticCurveTo(w, 0, w, Math.min(h / 2, w)); ctx.lineTo(w, h - Math.min(h / 2, w)); ctx.quadraticCurveTo(w, h, 0, h); return true;
      case 'arc': ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, -Math.PI / 2, 0); return true;
      default: ctx.rect(0, 0, w, h); return false;
    }
  }
  function 자유길(ctx, cg, W, H) {
    let 열림 = false;
    for (const p of 아이들(아이(cg, 'pathLst'), 'path')) {
      const pw = 수(p, 'w') || W, ph = 수(p, 'h') || H, kx = W / pw, ky = H / ph;
      const 점 = pt => [수(pt, 'x') * kx, 수(pt, 'y') * ky];
      let cx = 0, cy = 0, 닫음 = false;
      for (const c of 아이들(p)) {
        const pts = 아이들(c, 'pt').map(점);
        switch (c.localName) {
          case 'moveTo': [cx, cy] = pts[0]; ctx.moveTo(cx, cy); break;
          case 'lnTo': [cx, cy] = pts[0]; ctx.lineTo(cx, cy); break;
          case 'cubicBezTo': ctx.bezierCurveTo(...pts[0], ...pts[1], ...pts[2]); [cx, cy] = pts[2]; break;
          case 'quadBezTo': ctx.quadraticCurveTo(...pts[0], ...pts[1]); [cx, cy] = pts[1]; break;
          case 'arcTo': {
            const wr = 수(c, 'wR') * kx, hr = 수(c, 'hR') * ky, st = 수(c, 'stAng') / 60000 * Math.PI / 180, sw = 수(c, 'swAng') / 60000 * Math.PI / 180;
            const ox = cx - wr * Math.cos(st), oy = cy - hr * Math.sin(st);
            ctx.ellipse(ox, oy, Math.abs(wr), Math.abs(hr), 0, st, st + sw, sw < 0);
            cx = ox + wr * Math.cos(st + sw); cy = oy + hr * Math.sin(st + sw); break;
          }
          case 'close': ctx.closePath(); 닫음 = true; break;
        }
      }
      if (!닫음 || 속(p, 'fill') === 'none') 열림 = true;
    }
    return 열림;
  }
  function 화살촉(ctx, x0, y0, x1, y1, 굵) {
    const a = Math.atan2(y1 - y0, x1 - x0), L = Math.max(6, 굵 * 4.5), b = Math.PI / 7;
    ctx.beginPath(); ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - L * Math.cos(a - b), y1 - L * Math.sin(a - b)); ctx.lineTo(x1 - L * Math.cos(a + b), y1 - L * Math.sin(a + b)); ctx.closePath(); ctx.fill();
  }
  function 칠하기(ctx, 칠, w, h, 그림판) {
    if (!칠) return;
    if (칠.색) { ctx.fillStyle = 색글(칠.색); ctx.fill(); return; }
    if (칠.번짐) {
      let g;
      if (칠.둥근) g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 2);
      else {
        const a = 칠.각 * Math.PI / 180, cx = w / 2, cy = h / 2, L = (Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a))) / 2;
        g = ctx.createLinearGradient(cx - L * Math.cos(a), cy - L * Math.sin(a), cx + L * Math.cos(a), cy + L * Math.sin(a));
      }
      for (const [p, c] of 칠.번짐) g.addColorStop(Math.max(0, Math.min(1, p)), 색글(c));
      ctx.fillStyle = g; ctx.fill(); return;
    }
    if (칠.그림 && 그림판) { ctx.save(); ctx.clip(); 그림놓기(ctx, 그림판, 0, 0, w, h, 칠.자름); ctx.restore(); }
  }
  function 그림놓기(ctx, 그, x, y, w, h, 자름) {
    if (!그?.im) { 빈칸(ctx, x, y, w, h, 그?.못 ? `그림 (${그.못})` : '그림'); return; }
    const iw = 그.w, ih = 그.h;
    const l = 수(자름, 'l') / 100000, t = 수(자름, 't') / 100000, r = 수(자름, 'r') / 100000, b = 수(자름, 'b') / 100000;
    try { ctx.drawImage(그.im, iw * l, ih * t, Math.max(1, iw * (1 - l - r)), Math.max(1, ih * (1 - t - b)), x, y, w, h); } catch (e) { 빈칸(ctx, x, y, w, h, '그림'); }
  }
  function 빈칸(ctx, x, y, w, h, 말) {
    ctx.save();
    ctx.fillStyle = 'rgba(160,170,185,0.18)'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(120,130,145,0.6)'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]); ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    const px = Math.max(9, Math.min(22, Math.min(w, h) / 5));
    ctx.fillStyle = 'rgba(80,90,105,0.85)'; ctx.font = `${px}px ${기본글꼴}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(말, x + w / 2, y + h / 2, w - 4);
    ctx.restore();
  }
  async function 그림얻기(문, p) {
    if (!p) return { 못: '없음' };
    if (문.그림들.has(p)) { const v = 문.그림들.get(p); 문.그림들.delete(p); 문.그림들.set(p, v); return v; }
    const 약속 = (async () => {
      const ext = (p.split('.').pop() || '').toLowerCase();
      if (['emf', 'wmf', 'tif', 'tiff', 'wdp', 'jxr'].includes(ext)) return { 못: ext.toUpperCase() };
      const b = await 문.z.바이트(p).catch(() => null); if (!b) return { 못: '없음' };
      const u = URL.createObjectURL(new Blob([b], { type: { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', bmp: 'image/bmp', svg: 'image/svg+xml', webp: 'image/webp' }[ext] || '' }));
      try {
        const im = await new Promise((ok, no) => { const i = new Image(); i.decoding = 'async'; i.onload = () => ok(i); i.onerror = () => no(); i.src = u; });
        let w = im.naturalWidth || 1, h = im.naturalHeight || 1, 그 = im;
        const k = Math.min(1, 2048 / Math.max(w, h));                   // 큰 사진은 줄여 둠 (폰 메모리)
        if (k < 1) { const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); 그 = c; w = c.width; h = c.height; }
        return { im: 그, w, h };
      } catch (e) { return { 못: ext.toUpperCase() }; }
      finally { URL.revokeObjectURL(u); }
    })();
    문.그림들.set(p, 약속);
    while (문.그림들.size > 8) { const [k, v] = 문.그림들.entries().next().value; 문.그림들.delete(k); v.then(x => { if (x?.im?.getContext) x.im.width = x.im.height = 0; }); }
    return 약속;
  }

  // ⑥ 표 ───────────────────────────────────────────
  function 표꾸밈칸(문, 준, tbl, r, c, 줄수, 칸수) {
    const pr = 아이(tbl, 'tblPr'), id = 아이(pr, 'tableStyleId')?.textContent?.trim();
    const 켬 = k => 속(pr, k) === '1';
    let st = id && 문.표꾸밈.get(id);
    const 결과 = { 채움: undefined, 글색: null, 굵게: false, 테: {} };
    if (!st && !id) return 결과;
    const 쓸 = [];
    if (st) {
      const 부 = n => 아이(st, n);
      쓸.push(부('wholeTbl'));
      if (켬('bandRow')) 쓸.push(부(((r - (켬('firstRow') ? 1 : 0)) % 2 === 0) ? 'band1H' : 'band2H'));
      if (켬('bandCol')) 쓸.push(부(((c - (켬('firstCol') ? 1 : 0)) % 2 === 0) ? 'band1V' : 'band2V'));
      if (켬('firstCol') && c === 0) 쓸.push(부('firstCol'));
      if (켬('lastCol') && c === 칸수 - 1) 쓸.push(부('lastCol'));
      if (켬('lastRow') && r === 줄수 - 1) 쓸.push(부('lastRow'));
      if (켬('firstRow') && r === 0) 쓸.push(부('firstRow'));
      for (const p of 쓸.filter(Boolean)) {
        const ts = 아이(p, 'tcStyle'), tx = 아이(p, 'tcTxStyle');
        const f = 아이(ts, 'fill');
        if (f) { const s = 아이(f, 'solidFill'); if (s) 결과.채움 = { 색: 색값(s, 준.색표) }; else if (아이(f, 'noFill')) 결과.채움 = null; }
        const fr = 아이(ts, 'fillRef'); if (fr) 결과.채움 = { 색: 색값(fr, 준.색표) };
        if (tx) { const 색 = 색값(tx, 준.색표) || 색값(아이(tx, 'fontRef'), 준.색표); if (색) 결과.글색 = 색; if (속(tx, 'b') === 'on') 결과.굵게 = true; }
        for (const 변 of 아이들(아이(ts, 'tcBdr'))) { const ln = 아이(변, 'ln'); if (ln) 결과.테[변.localName] = ln; else if (아이(변, 'lnRef')) 결과.테[변.localName] = 아이(변, 'lnRef'); }
      }
      return 결과;
    }
    // 꾸밈 이름만 있고 정의가 없음 (PowerPoint 기본 「보통 스타일 2 - 강조 1」 이 흔함) — 비슷하게
    const ac = 준.색표('accent1') || '4472C4';
    const hex = h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1];
    const 섞 = (k) => { const [a, b, cc] = hex(ac); return [a * k + 255 * (1 - k), b * k + 255 * (1 - k), cc * k + 255 * (1 - k), 1]; };
    if (켬('firstRow') && r === 0) { 결과.채움 = { 색: hex(ac) }; 결과.글색 = [255, 255, 255, 1]; 결과.굵게 = true; }
    else 결과.채움 = { 색: 섞(켬('bandRow') && (r % 2 === 1) ? 0.4 : 0.2) };
    결과.흰테 = true;
    return 결과;
  }
  async function 표그리기(ctx, 문, 준, tbl, 칸, 배, 사슬) {
    const 너비들 = 아이들(아이(tbl, 'tblGrid'), 'gridCol').map(g => 수(g, 'w') * 배);
    const 줄들 = 아이들(tbl, 'tr'), 줄수 = 줄들.length, 칸수 = 너비들.length;
    const 왼들 = 너비들.reduce((a, w) => (a.push(a[a.length - 1] + w), a), [0]);
    const 칸들 = [];
    // 줄 높이 — 글이 넘치면 늘림 (PowerPoint 와 같음)
    const 높이들 = 줄들.map(tr => 수(tr, 'h') * 배);
    줄들.forEach((tr, r) => {
      let c = 0;
      for (const tc of 아이들(tr, 'tc')) {
        const 겹 = 수(tc, 'gridSpan', 1), 내림 = 수(tc, 'rowSpan', 1);
        if (속(tc, 'hMerge') === '1' || 속(tc, 'vMerge') === '1') { c++; continue; }
        const w = 왼들[Math.min(칸수, c + 겹)] - 왼들[c];
        const 꾸 = 표꾸밈칸(문, 준, tbl, r, c, 줄수, 칸수), pr = 아이(tc, 'tcPr');
        const 맥 = { 사슬, 몸: [], 색표: 준.색표, 배, 기본색: 꾸.글색 || 글기본색(준), 테글: 준.글꼴, 굵게: 꾸.굵게 };
        const L = 수(pr, 'marL', 91440) * 배, Rr = 수(pr, 'marR', 91440) * 배, T = 수(pr, 'marT', 45720) * 배, B = 수(pr, 'marB', 45720) * 배;
        const 짠 = 글짜기(ctx, 아이(tc, 'txBody'), { ...맥, 넓이: Math.max(4, w - L - Rr) });
        if (내림 === 1) 높이들[r] = Math.max(높이들[r], 짠.높이 + T + B);
        칸들.push({ tc, pr, r, c, 겹, 내림, w, 꾸, 맥, L, Rr, T, B });
        c++;
      }
    });
    const 위들 = 높이들.reduce((a, h) => (a.push(a[a.length - 1] + h), a), [0]);
    ctx.save(); ctx.translate(칸.x, 칸.y);
    for (const k of 칸들) {
      const x = 왼들[k.c], y = 위들[k.r], h = 위들[Math.min(줄수, k.r + k.내림)] - y;
      let 칠 = 채움(k.pr, 준.색표); if (칠 === undefined) 칠 = k.꾸.채움;
      ctx.beginPath(); ctx.rect(x, y, k.w, h);
      if (칠?.색 || 칠?.번짐) { ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.rect(0, 0, k.w, h); 칠하기(ctx, 칠, k.w, h); ctx.restore(); }
      const 안 = { 앵: 속(k.pr, 'anchor') || 't' };
      const body = 아이(k.tc, 'txBody');
      const 가짜몸 = { getAttribute: n => ({ lIns: String(k.L / 배), rIns: String(k.Rr / 배), tIns: String(k.T / 배), bIns: String(k.B / 배), anchor: 안.앵 }[n] ?? null), firstElementChild: null };
      글그리기(ctx, body, { x, y, w: k.w, h }, { ...k.맥, 몸: [가짜몸] });
      // 테두리
      const 변들 = [['lnT', 'top', x, y, x + k.w, y], ['lnB', 'bottom', x, y + h, x + k.w, y + h], ['lnL', 'left', x, y, x, y + h], ['lnR', 'right', x + k.w, y, x + k.w, y + h]];
      for (const [n, 꾸이름, x0, y0, x1, y1] of 변들) {
        let ln = 아이(k.pr, n), 색 = null, w = 12700;
        if (ln) { if (아이(ln, 'noFill')) continue; 색 = 색값(아이(ln, 'solidFill'), 준.색표); w = 수(ln, 'w', 12700); }
        if (!색) {
          const 안쪽 = (n === 'lnT' && k.r > 0) || (n === 'lnB' && k.r + k.내림 < 줄수) ? 'insideH' : (n === 'lnL' && k.c > 0) || (n === 'lnR' && k.c + k.겹 < 칸수) ? 'insideV' : 꾸이름;
          const t = k.꾸.테[안쪽];
          if (t) { 색 = 색값(아이(t, 'solidFill'), 준.색표) || 색값(t, 준.색표); w = 수(t, 'w', 12700); if (t.localName === 'ln' && 아이(t, 'noFill')) 색 = null; }
          else if (k.꾸.흰테) 색 = [255, 255, 255, 1];
        }
        if (!색) continue;
        ctx.strokeStyle = 색글(색); ctx.lineWidth = Math.max(0.5, w * 배);
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ⑦ 장 그리기 ───────────────────────────────────
  function 글기본색(준) {                              // 글자 색이 어디에도 없으면 테마의 「글 1」(tx1)
    const t = 준.색표('tx1') || 준.색표('dk1') || '000000';
    return [parseInt(t.slice(0, 2), 16), parseInt(t.slice(2, 4), 16), parseInt(t.slice(4, 6), 16), 1];
  }
  async function 모양그리기(ctx, 문, 준, 모, 층, 배, 부) {
    const e = 모.e, n = 모.종류, 물 = 물림(준, 문, 모, 층);
    const 칸 = 물.칸; if (!칸) return;
    const x = 칸.x * 배, y = 칸.y * 배, w = Math.max(0.5, 칸.w * 배), h = Math.max(0.5, 칸.h * 배);
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    if (모.돌) ctx.rotate(모.돌 * Math.PI / 180);
    if (n === 'graphicFrame') {
      const gd = 길(e, 'graphic', 'graphicData'), uri = 속(gd, 'uri') || '';
      if (아이(gd, 'tbl')) await 표그리기(ctx, 문, 준, 아이(gd, 'tbl'), { x: -w / 2, y: -h / 2 }, 배, [문.기본글].filter(Boolean));
      else {
        const blip = 아래(gd, 'blip');
        if (blip) 그림놓기(ctx, await 그림얻기(문, 부.r.get(blip.getAttributeNS(R, 'embed'))?.길), -w / 2, -h / 2, w, h, null);
        else 빈칸(ctx, -w / 2, -h / 2, w, h, /chart/.test(uri) ? '차트' : /diagram/.test(uri) ? '스마트아트' : '개체');
      }
      ctx.restore(); return;
    }
    const 겉 = 아이(e, 'spPr'), 꾸밈 = 아이(e, 'style');
    if (n === 'pic') {
      const bf = 아이(e, 'blipFill'), blip = 아이(bf, 'blip'), 그 = await 그림얻기(문, 부.r.get(blip?.getAttributeNS(R, 'embed'))?.길);
      ctx.save(); ctx.scale(모.좌우 ? -1 : 1, 모.상하 ? -1 : 1);
      const 둥 = 속(길(e, 'spPr', 'prstGeom'), 'prst');
      if (둥 && 둥 !== 'rect') { ctx.translate(-w / 2, -h / 2); 도형길(ctx, e, w, h, 배); ctx.clip(); ctx.translate(w / 2, h / 2); }
      그림놓기(ctx, 그, -w / 2, -h / 2, w, h, 아이(bf, 'srcRect'));
      ctx.restore();
      const 줄 = 선(겉, 준.색표, 꾸밈);
      if (줄) { ctx.strokeStyle = 색글(줄.색); ctx.lineWidth = Math.max(0.5, 줄.w * 배); ctx.strokeRect(-w / 2, -h / 2, w, h); }
      ctx.restore(); return;
    }
    // sp · cxnSp — 길(뒤집기 반영) → 칠 → 선 → 글(뒤집기 안 함)
    ctx.save();
    ctx.scale(모.좌우 ? -1 : 1, 모.상하 ? -1 : 1);
    ctx.translate(-w / 2, -h / 2);
    let 칠 = 채움(겉, 준.색표, 꾸밈, 모.묶음채움 ? 채움(모.묶음채움.겉, 준.색표) : null);
    if (칠 === undefined) { const 짝겉 = 물.짝.map(z => 아이(z, 'spPr')).find(s => 채움(s, 준.색표) !== undefined); 칠 = 짝겉 ? 채움(짝겉, 준.색표) : null; }
    let 줄 = 선(겉, 준.색표, 꾸밈);
    const 열림 = 도형길(ctx, e, w, h, 배);
    let 그림판 = null;
    if (칠?.그림) 그림판 = await 그림얻기(문, 부.r.get(칠.그림)?.길);
    if (!열림) 칠하기(ctx, 칠, w, h, 그림판);
    if (n === 'cxnSp' && !줄) 줄 = { 색: [0, 0, 0, 1], w: 9525 };
    if (줄) {
      ctx.strokeStyle = 색글(줄.색); ctx.lineWidth = Math.max(0.6, 줄.w * 배);
      ctx.setLineDash(줄.대시 ? (줄.대시.includes('dot') || 줄.대시 === 'sysDot' ? [ctx.lineWidth, ctx.lineWidth * 2] : [ctx.lineWidth * 4, ctx.lineWidth * 3]) : []);
      ctx.stroke(); ctx.setLineDash([]);
      if (열림 && 선꼴.test(속(길(e, 'spPr', 'prstGeom'), 'prst') || '')) {
        ctx.fillStyle = 색글(줄.색);
        const 끝 = 속(길(e, 'spPr', 'prstGeom'), 'prst') === 'bentConnector3' ? [[w * 조정값(e, 'adj1', 50000) / 100000, h, w, h], [w * 조정값(e, 'adj1', 50000) / 100000, 0, 0, 0]] : [[0, 0, w, h], [w, h, 0, 0]];
        if (줄.꼬리 && 줄.꼬리 !== 'none') 화살촉(ctx, ...끝[0], 줄.w * 배);
        if (줄.머리 && 줄.머리 !== 'none') 화살촉(ctx, ...끝[1], 줄.w * 배);
      }
    }
    ctx.restore();
    // 글 — 꾸밈의 fontRef 색이 기본 · 그다음 tx1
    const tb = 아이(e, 'txBody');
    if (tb) {
      const fr = 아이(꾸밈, 'fontRef');
      const 기본색 = (fr && 색값(fr, 준.색표)) || 글기본색(준);
      const 글머리그림 = new Map();                      // 그림 글머리(buBlip) — 먼저 받아 둠
      for (const bl of tb.getElementsByTagNameNS('*', 'buBlip')) {
        const rid = 아이(bl, 'blip')?.getAttributeNS(R, 'embed');
        if (rid && !글머리그림.has(rid)) 글머리그림.set(rid, await 그림얻기(문, 부.r.get(rid)?.길));
      }
      글그리기(ctx, tb, { x: -w / 2, y: -h / 2, w, h }, { 사슬: 물.글사슬, 몸: 물.몸, 색표: 준.색표, 배, 기본색, 테글: 준.글꼴, 글머리그림 });
    }
    ctx.restore();
  }
  async function 바탕그리기(ctx, 문, 준, W, H) {
    for (const [부, 층] of [[준.s, 's'], [준.틀, 'l'], [준.바, 'm']]) {
      const bg = 길(부?.x, 'cSld', 'bg'); if (!bg) continue;
      const pr = 아이(bg, 'bgPr'), ref = 아이(bg, 'bgRef');
      let 칠 = pr ? 채움(pr, 준.색표) : ref ? { 색: 색값(ref, 준.색표) } : undefined;
      if (칠 === undefined) continue;
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H);
      const 그 = 칠?.그림 ? await 그림얻기(문, 부.r.get(칠.그림)?.길) : null;
      칠하기(ctx, 칠 || { 색: [255, 255, 255, 1] }, W, H, 그);
      ctx.restore(); void 층;
      return;
    }
  }
  async function 장그리기(문, n, 너비) {
    const 준 = await 장준비(문, n);
    const 배 = 너비 / 문.W, W = Math.round(너비), H = Math.max(1, Math.round(문.H * 배));
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
    await 바탕그리기(ctx, 문, 준, W, H);
    const 장주 = 속(준.s.x, 'showMasterSp') !== '0', 틀주 = 속(준.틀?.x, 'showMasterSp') !== '0';
    const 층들 = [];
    if (장주 && 틀주 && 준.바) 층들.push([준.바, 'm']);
    if (장주 && 준.틀) 층들.push([준.틀, 'l']);
    층들.push([준.s, 's']);
    for (const [부, 층] of 층들) {
      for (const 모 of 모양들(길(부.x, 'cSld', 'spTree'))) {
        if (층 !== 's' && 자리표(모.e)) continue;                // 틀 · 바탕틀의 자리표시는 안내 글이라 안 그림
        try { await 모양그리기(ctx, 문, 준, 모, 층, 배, 부); } catch (e) { console.warn('PPT 모양', n + 1, e); }
      }
    }
    return c;
  }

  // ⑧ PPT길 ───────────────────────────────────────
  let 열린 = null;                                     // { id, 약속 }
  function 덱(id) {
    if (열린?.id === id) return 열린.약속;
    const d = (typeof 목록 !== 'undefined' ? 목록 : []).find(x => x.id === id) || { id, name: '' };
    const 약속 = (async () => {
      const r = await fetch(문서주소(d));
      if (!r.ok) throw Object.assign(new Error('원본 없음'), { 원본없음: true });
      return 읽기(await r.arrayBuffer());
    })();
    열린 = { id, 약속 };
    약속.catch(() => { if (열린?.약속 === 약속) 열린 = null; });
    return 약속;
  }
  let 그리는중 = 0; const 줄 = [];
  const 차례 = f => new Promise((ok, no) => { 줄.push({ f, ok, no }); 다음(); });
  function 다음() { while (그리는중 < 2 && 줄.length) { const { f, ok, no } = 줄.shift(); 그리는중++; f().then(ok, no).finally(() => { 그리는중--; 다음(); }); } }
  const 길판 = {
    async 정보(id) {
      try {
        const 문 = await 덱(id);
        if (!문.장들.length) return { error: '깨짐', detail: '슬라이드가 없음' };
        const pw = Math.round(문.W / EMU), ph = Math.round(문.H / EMU);
        return { pages: 문.장들.length, sizes: 문.장들.map(() => [pw, ph]) };
      } catch (e) {
        if (e?.원본없음) return { error: '원본 없음' };
        if (e?.코드 === '암호필요' || /암호/.test(e?.message)) return { error: '암호' };
        return { error: '깨짐', detail: String(e?.message || e) };
      }
    },
    쪽: (id, n, w) => 차례(async () => {
      const 문 = await 덱(id), c = await 장그리기(문, n, Math.min(2400, Math.max(200, w)));
      const b = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.9));
      c.width = c.height = 0;
      if (!b) throw new Error('장 그림 만들기 실패 (메모리)');
      return URL.createObjectURL(b);
    }),
    놓기: u => { if (typeof u === 'string' && u.startsWith('blob:')) URL.revokeObjectURL(u); },
    // 찾기 — 빈칸 빼고 견줌 · 찾은 글 상자를 칠함 (장 안 0~1)
    async 찾기(id, q) {
      const 문 = await 덱(id), 낱 = q.replace(/\s+/g, '').toLowerCase();
      if (!낱) return { hits: [] };
      const hits = []; let 글있음 = false;
      for (let i = 0; i < 문.장들.length && hits.length < 2000; i++) {
        const 준 = await 장준비(문, i);
        for (const 모 of 모양들(길(준.s.x, 'cSld', 'spTree'))) {
          const 칸 = 물림(준, 문, 모, 's').칸; if (!칸) continue;
          const 상자 = [칸.x / 문.W, 칸.y / 문.H, (칸.x + 칸.w) / 문.W, (칸.y + 칸.h) / 문.H].map(v => Math.round(Math.max(0, Math.min(1, v)) * 1e4) / 1e4);
          const 글들 = 모.종류 === 'graphicFrame' ? [...(아래(모.e, 'tbl')?.getElementsByTagNameNS('*', 'txBody') || [])].flatMap(문단글) : 문단글(아이(모.e, 'txBody'));
          const 글 = 글들.join('').replace(/\s+/g, '').toLowerCase();
          if (글) 글있음 = true;
          for (let at = 글.indexOf(낱); at >= 0 && hits.length < 2000; at = 글.indexOf(낱, at + 낱.length)) hits.push({ p: i, b: [상자] });
        }
      }
      return { hits, text: 글있음, more: hits.length >= 2000 };
    },
  };

  // ⑨ 글로 (나) ───────────────────────────────────
  const 만 = (태그, 반, 글) => { const e = document.createElement(태그); if (반) e.className = 반; if (글 != null) e.textContent = 글; return e; };
  async function 글로(buf) {
    const 문 = await 읽기(buf), 틀 = 만('div', 'ppt글');
    let 그림수 = 0, 못그림 = 0;
    for (let i = 0; i < 문.장들.length; i++) {
      const 준 = await 장준비(문, i);
      틀.append(만('div', 'ppt장머리', `슬라이드 ${i + 1}`));
      const 모들 = 모양들(길(준.s.x, 'cSld', 'spTree')).map(모 => ({ 모, 칸: 물림(준, 문, 모, 's').칸 || { x: 0, y: 0 } }));
      // 읽는 차례 — 제목 먼저 · 그다음 위에서 아래 · 왼쪽에서 오른쪽 (같은 줄은 높이 1/20 안)
      const 줄높 = 문.H / 20;
      모들.sort((a, b) => {
        const ta = /title/i.test(속(자리표(a.모.e), 'type') || '') ? 0 : 1, tb = /title/i.test(속(자리표(b.모.e), 'type') || '') ? 0 : 1;
        if (ta !== tb) return ta - tb;
        const ya = Math.floor(a.칸.y / 줄높), yb = Math.floor(b.칸.y / 줄높);
        return ya !== yb ? ya - yb : a.칸.x - b.칸.x;
      });
      let 제목함 = false;
      for (const { 모 } of 모들) {
        const e = 모.e;
        if (모.종류 === 'pic' || (모.종류 === 'graphicFrame' && 아래(e, 'blip') && !아래(e, 'tbl'))) {
          const blip = 아래(e, 'blip'), p = 준.s.r.get(blip?.getAttributeNS(R, 'embed'))?.길;
          const ext = (p || '').split('.').pop().toLowerCase();
          if (!p || ['emf', 'wmf', 'tif', 'tiff'].includes(ext)) { 못그림++; continue; }
          const b = await 문.z.바이트(p).catch(() => null); if (!b) continue;
          const im = 만('img', '그림'); im.alt = ''; im.loading = 'lazy';
          im.src = URL.createObjectURL(new Blob([b], { type: ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg' }));
          틀.append(im); 그림수++; continue;
        }
        if (모.종류 === 'graphicFrame') {
          const tbl = 아래(e, 'tbl');
          if (tbl) {
            const 표틀 = 만('div', '표틀'), t = 만('table');
            for (const tr of 아이들(tbl, 'tr')) {
              const 줄 = 만('tr');
              for (const tc of 아이들(tr, 'tc')) {
                if (속(tc, 'hMerge') === '1' || 속(tc, 'vMerge') === '1') continue;
                const td = 만('td'); if (수(tc, 'gridSpan', 1) > 1) td.colSpan = 수(tc, 'gridSpan'); if (수(tc, 'rowSpan', 1) > 1) td.rowSpan = 수(tc, 'rowSpan');
                for (const 줄글 of 문단글(아이(tc, 'txBody'))) if (줄글.trim()) td.append(만('p', null, 줄글));
                줄.append(td);
              }
              t.append(줄);
            }
            표틀.append(t); 틀.append(표틀);
          } else 틀.append(만('p', '빈그림', /chart/.test(속(길(e, 'graphic', 'graphicData'), 'uri') || '') ? '[차트]' : '[개체]'));
          continue;
        }
        const tb = 아이(e, 'txBody'); if (!tb) continue;
        const 자리 = 속(자리표(e), 'type') || '';
        const 줄글들 = 문단글(tb).map(s => s.replace(/\s+$/, '')).filter(s => s.trim());
        if (!줄글들.length) continue;
        if (!제목함 && (/title/i.test(자리) || (!자리 && 줄글들.length === 1 && 줄글들[0].length <= 40 && !모들.some(x => /title/i.test(속(자리표(x.모.e), 'type') || ''))))) {
          틀.append(만('h4', null, 줄글들.join(' '))); 제목함 = true; continue;
        }
        const ps = 아이들(tb, 'p');
        for (const p of ps) {
          const 글 = 아이들(p).map(r => (r.localName === 'br' ? '\n' : 아이(r, 't')?.textContent || '')).join('');
          if (!글.trim()) continue;
          // 글머리는 진짜 있을 때만 (문단 · 모양의 lstStyle · 본문 자리표시) — 10-04 글머리 없는 표지 글에도 「·」 가 붙던 것
          const pPr = 아이(p, 'pPr'), lvl = 수(pPr, 'lvl', 0), 단사슬 = [pPr, 아이(아이(tb, 'lstStyle'), `lvl${lvl + 1}pPr`)].filter(Boolean);
          const 머리꼴 = 단사슬.find(x => 아이들(x).some(c => /^bu(None|Char|AutoNum|Blip)$/.test(c.localName)));
          const 머리있음 = 머리꼴 ? !아이(머리꼴, 'buNone') : 자리 === 'body';
          const 줄p = 만('p', null, (머리있음 ? '· ' : '') + 글);
          if (lvl) 줄p.style.paddingLeft = (lvl * 1.2) + 'em';
          틀.append(줄p);
        }
      }
      // 발표자 메모
      if (준.메) {
        const 몸 = 모양들(길(준.메.x, 'cSld', 'spTree')).find(m => 속(자리표(m.e), 'type') === 'body');
        const 글 = 몸 ? 문단글(아이(몸.e, 'txBody')).filter(s => s.trim()).join('\n') : '';
        if (글) 틀.append(만('div', 'ppt메모', '발표자 메모 — ' + 글));
      }
    }
    return { 틀, 덧: `${문.장들.length}장 · 글로`, 알림: 못그림 ? `그림 ${못그림}개는 옛 형식(EMF · WMF)이라 못 보임` : null };
  }

  // ⑩ 옛 PPT ──────────────────────────────────────
  async function 옛글(buf) {
    const c = 복합열기(buf), b = c.바이트('PowerPoint Document');
    if (!b) throw new Error('옛 PPT 가 아님 (PowerPoint Document 없음)');
    if (c.있나('EncryptedSummary')) throw new Error('암호 걸린 PPT');
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const 목록장 = [], 그릇장 = [];
    let 지금장 = null, 머리 = 0;
    const u16 = new TextDecoder('utf-16le'), 라틴 = new TextDecoder('windows-1252');
    function 걷기(o, 끝, 맥) {
      while (o + 8 <= 끝) {
        const vi = v.getUint16(o, true), t = v.getUint16(o + 2, true), n = v.getUint32(o + 4, true), 몸 = o + 8, 다음 = 몸 + n;
        if (다음 > 끝 || n > 끝) break;
        if (t === 0x0FF0) { if ((vi >> 4) === 0) 걷기(몸, 다음, '목록'); }            // SlideListWithText (0 = 장 · 1 = 바탕틀 · 2 = 메모)
        else if (t === 0x03F3 && 맥 === '목록') { 지금장 = { 글: [] }; 목록장.push(지금장); }
        else if (t === 0x03EE) { const 장 = { 글: [] }; 그릇장.push(장); 걷기(몸, 다음, 장); }   // Slide
        else if (t === 0x03F0 || t === 0x03F8 || t === 0x0FF2) { /* 메모 · 바탕틀 · 머리글은 건너뜀 */ }
        else if (t === 0x0F9F) 머리 = v.getUint32(몸, true);                      // TextHeaderAtom (0 제목 · 6 가운데 제목)
        else if (t === 0x0FA0 || t === 0x0FA8) {
          const 글 = (t === 0x0FA0 ? u16 : 라틴).decode(b.subarray(몸, 다음)).replace(/\u000b/g, '\n');
          const 곳 = 맥 === '목록' ? 지금장 : typeof 맥 === 'object' ? 맥 : null;
          if (곳 && 글.trim()) 곳.글.push({ 글, 제목: 머리 === 0 || 머리 === 6 });
        }
        else if ((vi & 0xF) === 0xF) 걷기(몸, 다음, 맥);
        o = 다음;
      }
    }
    걷기(0, b.length, null);
    const 글수 = a => a.reduce((s, x) => s + x.글.length, 0);
    const 장들 = (글수(목록장) >= 글수(그릇장) ? 목록장 : 그릇장).filter(x => x.글.length);
    const 틀 = 만('div', 'ppt글');
    장들.forEach((장, i) => {
      틀.append(만('div', 'ppt장머리', `슬라이드 ${i + 1}`));
      for (const { 글, 제목 } of 장.글) {
        const 줄들 = 글.split('\r').map(s => s.trim()).filter(Boolean);
        if (제목) { 틀.append(만('h4', null, 줄들.join(' '))); continue; }
        for (const s of 줄들) 틀.append(만('p', null, (줄들.length > 1 ? '· ' : '') + s));
      }
    });
    if (!장들.length) throw new Error('글자가 없는 PPT');
    return { 틀, 덧: `${장들.length}장 · 글자만`, 알림: '옛 PPT → 글자만 보여 줌 · 그림 · 표 · 모양은 안 나옴 (PPTX · PDF 로 받으면 모양대로)' };
  }

  return { 길판, 글로, 옛글, 읽기, 장그리기 };
})();
const PPT길 = 피피티.길판;
문서.pptx = buf => 피피티.글로(buf);
문서.ppt = buf => 피피티.옛글(buf);
