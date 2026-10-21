// 글 문서 그리기 — TXT · 워드(DOCX) · 한글(HWPX) → 화면 조각 (3단계 · 2026-10-03)
// 구역 지도 : ① 공통 손잡이 ② TXT (글자판 저절로) ③ 워드 ④ 한글 ⑤ 그리기 실패 때 글자만 뽑기
// 글씨 크기는 em 으로 — 「글씨 크기」 판이 바탕 크기 하나만 바꾸면 모두 따라 커짐
'use strict';

// ① 공통 ───────────────────────────────────────────
const 문서 = {};
const 자식들 = (el, 이름) => [...el.children].filter(c => !이름 || c.localName === 이름);
const 자식 = (el, 이름) => el ? [...el.children].find(c => c.localName === 이름) || null : null;
const 후손 = (el, 이름) => el ? el.getElementsByTagNameNS('*', 이름) : [];
const 값 = (el, 이름) => { if (!el) return null; for (const a of el.attributes) if (a.localName === 이름) return a.value; return null; };
function xml읽기(글) {
  const d = new DOMParser().parseFromString(글, 'application/xml');
  if (d.getElementsByTagName('parsererror').length) throw new Error('XML 이 깨짐');
  return d;
}
function 만들기(태그, 반, 글) { const e = document.createElement(태그); if (반) e.className = 반; if (글 != null) e.textContent = 글; return e; }
const 크기em = (pt, 기본) => Math.min(1.8, Math.max(0.7, pt / 기본)).toFixed(3) + 'em';

// ② TXT ───────────────────────────────────────────
문서.글자판 = function (b) {
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return { 글: new TextDecoder('utf-8').decode(b.subarray(3)), 판: 'UTF-8' };
  if (b[0] === 0xff && b[1] === 0xfe) return { 글: new TextDecoder('utf-16le').decode(b.subarray(2)), 판: 'UTF-16' };
  if (b[0] === 0xfe && b[1] === 0xff) return { 글: new TextDecoder('utf-16be').decode(b.subarray(2)), 판: 'UTF-16' };
  try { return { 글: new TextDecoder('utf-8', { fatal: true }).decode(b), 판: 'UTF-8' }; }
  catch (e) { return { 글: new TextDecoder('euc-kr').decode(b), 판: 'EUC-KR (옛 한글)' }; }
};
문서.txt = async function (buf) {
  const { 글, 판 } = 문서.글자판(new Uint8Array(buf));
  const 틀 = 만들기('div', 'txt', 글);
  return { 틀, 알림: null, 덧: 판 };
};

// ③ 워드 (DOCX) ───────────────────────────────────
문서.docx = async function (buf) {
  const z = await 압축열기(buf);
  const 본문글 = await z.글('word/document.xml');
  if (!본문글) throw new Error('word/document.xml 없음 — 워드 파일이 아님');
  const 본문 = xml읽기(본문글);
  const 연결 = {};
  const rels = await z.글('word/_rels/document.xml.rels');
  if (rels) for (const r of 후손(xml읽기(rels), 'Relationship')) 연결[r.getAttribute('Id')] = r.getAttribute('Target');
  const 제목들 = {}, 모양크기 = {};
  let 기본pt = 11;
  const st = await z.글('word/styles.xml');
  if (st) {
    const sd = xml읽기(st);
    const dsz = 후손(자식(sd.documentElement, 'docDefaults'), 'sz')[0];
    if (dsz) 기본pt = (+값(dsz, 'val') || 22) / 2;
    for (const s of 후손(sd, 'style')) {
      const id = 값(s, 'styleId'), 이름 = 값(자식(s, 'name'), 'val') || '';
      const m = /heading\s*(\d)|제목\s*(\d)|^title$/i.exec(이름) || /^(?:Heading|제목)(\d)$/i.exec(id || '');
      if (m) 제목들[id] = Math.min(6, +(m[1] || m[2] || 1));
      const sz = 후손(자식(s, 'rPr'), 'sz')[0];
      if (sz) 모양크기[id] = (+값(sz, 'val')) / 2;
    }
  }
  let 그림없음 = 0;
  async function 그림(blip) {
    const t = 연결[값(blip, 'embed')];
    if (!t) return null;
    const 이름 = t.startsWith('/') ? t.slice(1) : 'word/' + t.replace(/^\.\//, '');
    const u = await z.그림주소(이름);
    if (!u) 그림없음++;
    return u;
  }
  const 켜짐 = el => el && !['0', 'false', 'none'].includes(String(값(el, 'val')).toLowerCase());

  async function 글덩이(r, 문단pt) {
    const pr = 자식(r, 'rPr');
    const span = 만들기('span');
    if (켜짐(자식(pr, 'b'))) span.style.fontWeight = '700';
    if (켜짐(자식(pr, 'i'))) span.style.fontStyle = 'italic';
    const u = 자식(pr, 'u'); if (u && 값(u, 'val') !== 'none') span.style.textDecoration = 'underline';
    if (자식(pr, 'strike') && 켜짐(자식(pr, 'strike'))) span.style.textDecoration = 'line-through';
    const sz = 자식(pr, 'sz'); const pt = sz ? (+값(sz, 'val')) / 2 : 문단pt;
    if (pt && Math.abs(pt - 기본pt) > 0.4) span.style.fontSize = 크기em(pt, 기본pt);
    const col = 값(자식(pr, 'color'), 'val'); if (col && /^[0-9a-f]{6}$/i.test(col) && col.toLowerCase() !== '000000') span.style.color = '#' + col;
    const 형광 = 값(자식(pr, 'highlight'), 'val'); if (형광 && 형광 !== 'none') span.classList.add('형광');
    for (const c of r.children) {
      const n = c.localName;
      if (n === 't') span.append(c.textContent);
      else if (n === 'tab' || n === 'ptab') span.append(만들기('span', '탭', '\t'));
      else if (n === 'br' || n === 'cr') span.append(값(c, 'type') === 'page' ? 만들기('hr', '쪽나눔') : document.createElement('br'));
      else if (n === 'noBreakHyphen') span.append('-');
      else if (n === 'drawing' || n === 'pict' || n === 'object') {
        const b = 후손(c, 'blip')[0] || 후손(c, 'imagedata')[0];
        if (b) { const s = await 그림(b) || null; s ? span.append(Object.assign(만들기('img', '그림'), { src: s, alt: '' })) : span.append(만들기('span', '빈그림', '[그림]')); }
      }
    }
    return span;
  }
  async function 안쪽(el, 담을곳, 문단pt) {      // 하이퍼링크 · 고친 글 · 필드 안의 글덩이까지
    for (const c of el.children) {
      const n = c.localName;
      if (n === 'r') 담을곳.append(await 글덩이(c, 문단pt));
      else if (['hyperlink', 'ins', 'smartTag', 'fldSimple', 'customXml', 'sdtContent', 'sdt', 'moveTo'].includes(n)) await 안쪽(c, 담을곳, 문단pt);
    }
  }
  const 줄 = { center: 'center', right: 'right', end: 'right' };   // 양쪽 맞춤은 좁은 폰에서 빈칸이 벌어져 왼쪽으로
  async function 문단(p) {
    const pr = 자식(p, 'pPr');
    const 모양 = 값(자식(pr, 'pStyle'), 'val');
    const 수준 = 제목들[모양];
    const el = 만들기(수준 ? 'h' + Math.min(6, 수준 + 1) : 'p');
    const jc = 값(자식(pr, 'jc'), 'val'); if (줄[jc]) el.style.textAlign = 줄[jc];
    if (자식(pr, 'numPr')) el.append(만들기('span', '글머리', '• '));
    const ind = 자식(pr, 'ind'); const 왼 = +(값(ind, 'left') || 값(ind, 'start') || 0);
    if (왼 > 0) el.style.paddingLeft = Math.min(6, 왼 / 567).toFixed(2) + 'em';
    await 안쪽(p, el, 모양크기[모양]);
    if (!el.textContent.trim() && !el.querySelector('img')) el.classList.add('빈줄');
    return el;
  }
  async function 표(tbl) {
    const t = 만들기('table'), 위칸 = [];         // 위칸[열] = 세로로 합쳐 가는 칸
    for (const tr of 자식들(tbl, 'tr')) {
      const 줄el = 만들기('tr'); let 열 = 0;
      for (const tc of 자식들(tr, 'tc')) {
        const pr = 자식(tc, 'tcPr');
        const 넓이 = +(값(자식(pr, 'gridSpan'), 'val') || 1);
        const vm = 자식(pr, 'vMerge'), vmv = 값(vm, 'val');
        if (vm && vmv !== 'restart') {
          if (위칸[열]) 위칸[열].rowSpan += 1;
          열 += 넓이; continue;
        }
        const td = 만들기('td'); if (넓이 > 1) td.colSpan = 넓이;
        for (const c of tc.children) {
          if (c.localName === 'p') td.append(await 문단(c));
          else if (c.localName === 'tbl') td.append(await 표(c));
        }
        위칸[열] = vm ? td : null;
        줄el.append(td); 열 += 넓이;
      }
      t.append(줄el);
    }
    const w = 만들기('div', '표틀'); w.append(t); return w;
  }
  async function 덩이들(부모, 담을곳) {
    for (const c of 부모.children) {
      if (c.localName === 'p') 담을곳.append(await 문단(c));
      else if (c.localName === 'tbl') 담을곳.append(await 표(c));
      else if (c.localName === 'sdt') await 덩이들(자식(c, 'sdtContent') || c, 담을곳);
    }
  }
  const 틀 = 만들기('div', 'docx');
  const body = 후손(본문, 'body')[0];
  if (!body) throw new Error('본문(body) 없음');
  await 덩이들(body, 틀);
  return { 틀, 알림: 그림없음 ? `그림 ${그림없음}개는 못 그림` : null };
};

// ④ 한글 (HWPX) ───────────────────────────────────
문서.hwpx = async function (buf) {
  const z = await 압축열기(buf);
  const 구역이름 = z.이름들.filter(n => /^Contents\/section\d+\.xml$/i.test(n))
    .sort((a, b) => parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10));
  if (!구역이름.length) throw new Error('Contents/section0.xml 없음 — 한글(HWPX) 파일이 아님');
  const 글자모양 = {}, 문단줄 = {};
  const hg = await z.글('Contents/header.xml');
  if (hg) {
    const h = xml읽기(hg);
    for (const c of 후손(h, 'charPr')) {
      const 밑 = 자식(c, 'underline');
      글자모양[c.getAttribute('id')] = {
        pt: (+c.getAttribute('height') || 1000) / 100, 색: c.getAttribute('textColor'),
        굵게: !!자식(c, 'bold'), 기울임: !!자식(c, 'italic'), 밑줄: !!밑 && (밑.getAttribute('type') || 'NONE') !== 'NONE',
      };
    }
    for (const p of 후손(h, 'paraPr')) {
      const a = 후손(p, 'align')[0];
      문단줄[p.getAttribute('id')] = a ? a.getAttribute('horizontal') : null;
    }
  }
  const 그림자리 = {};
  const hpf = await z.글('Contents/content.hpf');
  if (hpf) for (const it of 후손(xml읽기(hpf), 'item')) 그림자리[it.getAttribute('id')] = it.getAttribute('href');
  const 기본pt = 10;
  let 그림없음 = 0;
  const 줄 = { CENTER: 'center', RIGHT: 'right' };   // 양쪽 · 배분 맞춤은 좁은 폰에서 빈칸이 벌어져 왼쪽으로

  async function 그림(pic) {
    const img = 후손(pic, 'img')[0];
    const id = 값(img, 'binaryItemIDRef');
    let 이름 = 그림자리[id];
    if (!이름) 이름 = z.이름들.find(n => n.startsWith('BinData/' + id + '.'));
    const u = 이름 ? await z.그림주소(이름.replace(/^\//, '')) : null;
    if (!u) { 그림없음++; return 만들기('span', '빈그림', '[그림]'); }
    const e = 만들기('img', '그림'); e.src = u; e.alt = ''; return e;
  }
  // 그린 도형 (10-22) — hwpdoc.js 의 도형판 · 행렬곱 을 같이 씀 · 조각 행렬(renderingInfo) = 제 좌표 → 맨 위 묶음 지금 크기(curSz) 좌표
  const 이름표 = { line: '$lin', rect: '$rec', ellipse: '$ell', polygon: '$pol', curve: '$cur', arc: '$arc' };
  const 수 = (e, a) => +(e?.getAttribute(a) || 0);
  function 도형조각(e) {
    const org = 자식(e, 'orgSz'), ri = 자식(e, 'renderingInfo');
    let M = [1, 0, 0, 0, 1, 0];
    if (ri) for (const m of ri.children) M = 행렬곱(M, [1, 2, 3, 4, 5, 6].map(k => 수(m, 'e' + k)));
    const 선모 = 자식(e, 'lineShape'), 선꼴 = 선모?.getAttribute('style') || 'NONE', 선색 = (선모?.getAttribute('color') || '#000000').toLowerCase();
    const 선 = 선모 && 선꼴 !== 'NONE' ? { 색: 선색 === '#000000' ? 'rgb(0,0,0)' : 선색, 굵기: 수(선모, 'width'), 종류: 선꼴 === 'SOLID' ? 1 : /DOT/.test(선꼴) && !/DASH/.test(선꼴) ? 3 : 2 } : null;
    const wb = 자식(자식(e, 'fillBrush'), 'winBrush'), 면 = wb?.getAttribute('faceColor') || 'none';
    const 채움 = 면 !== 'none' && 면.toUpperCase() !== '#FFFFFF' ? 면 : null;
    const 무늬종류 = { HORIZONTAL: 0, VERTICAL: 1, SLASH: 2, BACK_SLASH: 3, CROSS: 4, CROSS_DIAGONAL: 5 }[wb?.getAttribute('hatchStyle')];
    const 무늬 = 무늬종류 != null ? { 색: wb.getAttribute('hatchColor') || '#000000', 종류: 무늬종류 } : null;
    const 시 = 자식(e, 'startPt'), 끝점 = 자식(e, 'endPt');
    let 점 = 자식들(e, 'pt').map(p => [수(p, 'x'), 수(p, 'y')]);
    if (!점.length) { const 마디 = 자식들(e, 'seg'); 점 = 마디.map(g => [수(g, 'x1'), 수(g, 'y1')]); if (마디.length) 점.push([수(마디.at(-1), 'x2'), 수(마디.at(-1), 'y2')]); }
    return { 이름: 이름표[e.localName], w0: 수(org, 'width'), h0: 수(org, 'height'), M, 선, 채움, 무늬,
      끝: 시 && 끝점 ? [수(시, 'x'), 수(시, 'y'), 수(끝점, 'x'), 수(끝점, 'y')] : null, 점: 점.length ? 점 : null, 곡률: 수(e, 'ratio') };
  }
  const 글상자읽기 = async e => { const 상자 = 만들기('div', '글상자'); for (const sl of 후손(e, 'subList')) for (const pp of 자식들(sl, 'p')) await 문단(pp, 상자); return 상자; };
  async function 도형(c) {
    const k = c.localName, sz = 자식(c, 'sz'), 너비 = Math.round(수(sz, 'width') / 75), 높이 = Math.round(수(sz, 'height') / 75);
    const 글자처럼 = 자식(c, 'pos')?.getAttribute('treatAsChar') === '1';
    if (k === 'container') {                         // 묶음 — 그림 · 글상자는 제자리 칸 · 선 · 테두리는 SVG 한 판 (그림 위)
      const cur = 자식(c, 'curSz'), W = 수(cur, 'width') || 수(자식(c, 'orgSz'), 'width'), H = 수(cur, 'height') || 수(자식(c, 'orgSz'), 'height');
      if (!(W > 0 && H > 0)) return null;
      const 잎 = [], 걷기 = e => { for (const ch of e.children) { if (ch.localName === 'container') 걷기(ch); else if (ch.localName === 'pic' || 이름표[ch.localName]) 잎.push(ch); } };
      걷기(c);
      const 틀 = 만들기('div', '묶음그림');
      틀.style.aspectRatio = `${W} / ${H}`; if (너비 > 0 && 너비 < 5000) 틀.style.maxWidth = 너비 + 'px';
      틀.style.setProperty('--묶음글', (13.33 / (W / 75) * 100).toFixed(3) + 'cqw');
      const 그린 = [];
      for (const e of 잎) {
        const 조 = 도형조각(e); if (조.이름) 그린.push(조);
        const 상자 = e.localName === 'pic' ? null : await 글상자읽기(e);
        if (e.localName !== 'pic' && !상자.textContent.trim()) continue;
        const 점 = [[0, 0], [조.w0, 0], [0, 조.h0], [조.w0, 조.h0]].map(([x, y]) => [조.M[0] * x + 조.M[1] * y + 조.M[2], 조.M[3] * x + 조.M[4] * y + 조.M[5]]);
        const x0 = Math.min(...점.map(p => p[0])), x1 = Math.max(...점.map(p => p[0])), y0 = Math.min(...점.map(p => p[1])), y1 = Math.max(...점.map(p => p[1]));
        if (!(x1 > x0 && y1 > y0)) continue;
        const 칸 = 만들기('div', '묶음조각');
        Object.assign(칸.style, { left: (x0 / W * 100).toFixed(3) + '%', top: (y0 / H * 100).toFixed(3) + '%', width: ((x1 - x0) / W * 100).toFixed(3) + '%', height: ((y1 - y0) / H * 100).toFixed(3) + '%' });
        if (e.localName === 'pic') 칸.append(await 그림(e)); else { 칸.classList.add('묶음글'); 칸.append(상자); }
        틀.append(칸);
      }
      const 판 = 그린.length ? 도형판(그린, W, H, '묶음도형') : null; if (판) 틀.append(판);
      return 틀.children.length ? { el: 틀 } : null;
    }
    const 상자 = await 글상자읽기(c), 글있음 = !!상자.textContent.trim();
    const 조 = 이름표[k] ? 도형조각(c) : null;
    if (조 && 글있음) {                               // 글상자 — 선 · 면 색을 상자에
      if (조.선) { 상자.style.border = `${Math.max(1, 조.선.굵기 / 75).toFixed(1)}px ${조.선.종류 > 1 ? 'dashed' : 'solid'} ${조.선.색}`; 상자.classList.add('테두리'); }
      if (조.채움) 상자.style.background = 조.채움;
      if (k === 'ellipse') 상자.style.borderRadius = '50%';
    }
    if (글있음) return { el: 상자 };
    if (!조 || !(조.w0 > 0 && 조.h0 > 0)) return null;
    const 판 = 도형판([{ ...조, M: [1, 0, 0, 0, 1, 0] }], 조.w0, 조.h0, '도형하나'); if (!판) return null;
    const w = Math.max(1, 너비 || Math.round(조.w0 / 75)), h = Math.max(1, 높이 || Math.round(조.h0 / 75));
    판.style.width = w + 'px'; 판.style.aspectRatio = `${w} / ${h}`;
    if (글자처럼) return { el: 판, 인라인: true };
    const 틀 = 만들기('div', '그림틀'); 틀.append(판); return { el: 틀 };
  }
  function 글자(t, span) {               // hp:t 안 — 글 · 줄바꿈 · 탭 이 섞여 있음 (줄바꿈 뒤 글은 꼬리 글)
    for (const n of t.childNodes) {
      if (n.nodeType === 3) span.append(n.nodeValue);
      else if (n.nodeType === 1) {
        const k = n.localName;
        if (k === 'lineBreak') span.append(document.createElement('br'));
        else if (k === 'tab') span.append(만들기('span', '탭', '\t'));
        else if (k === 'fwSpace' || k === 'nbSpace' || k === 'hyphen') span.append(k === 'hyphen' ? '-' : ' ');
        else span.append(n.textContent || '');
      }
    }
  }
  async function 문단(p, 담을곳) {
    let el = null;
    const 만든줄 = [];
    const 새줄 = () => {
      el = 만들기('p'); 만든줄.push(el);
      const j = 줄[문단줄[p.getAttribute('paraPrIDRef')]]; if (j) el.style.textAlign = j;
      담을곳.append(el);
    };
    새줄();
    let 덩이뒤 = false;
    for (const run of 자식들(p, 'run')) {
      const m = 글자모양[run.getAttribute('charPrIDRef')] || {};
      for (const c of run.children) {
        const k = c.localName;
        if (k === 't') {
          if (덩이뒤) { 새줄(); 덩이뒤 = false; }
          const span = 만들기('span');
          if (m.굵게) span.style.fontWeight = '700';
          if (m.기울임) span.style.fontStyle = 'italic';
          if (m.밑줄) span.style.textDecoration = 'underline';
          if (m.pt && Math.abs(m.pt - 기본pt) > 0.4) span.style.fontSize = 크기em(m.pt, 기본pt);
          if (m.색 && /^#[0-9a-f]{6}$/i.test(m.색) && m.색.toLowerCase() !== '#000000') span.style.color = m.색;
          글자(c, span); el.append(span);
        } else if (k === 'tbl') { 담을곳.append(await 표(c)); 덩이뒤 = true; }
        else if (k === 'pic') { el.append(await 그림(c)); }
        else if (['rect', 'ellipse', 'polygon', 'container', 'drawText', 'textart', 'line', 'curve', 'arc'].includes(k)) {
          const r = await 도형(c);                     // 선 · 테두리 · 타원 · 묶음 (10-22 · 전엔 글만)
          if (r?.인라인) el.append(r.el); else if (r) { 담을곳.append(r.el); 덩이뒤 = true; }
        } else if (k === 'equation') el.append(만들기('span', '빈그림', '[수식]'));
      }
    }
    for (const x of 만든줄) if (!x.textContent.trim() && !x.querySelector('img,br')) x.classList.add('빈줄');
  }
  async function 표(tbl) {
    const t = 만들기('table');
    for (const tr of 자식들(tbl, 'tr')) {
      const 줄el = 만들기('tr');
      for (const tc of 자식들(tr, 'tc')) {
        const td = 만들기('td');
        const sp = 자식(tc, 'cellSpan');
        const cs = +(sp?.getAttribute('colSpan') || 1), rs = +(sp?.getAttribute('rowSpan') || 1);
        if (cs > 1) td.colSpan = cs; if (rs > 1) td.rowSpan = rs;
        for (const sl of 자식들(tc, 'subList')) for (const pp of 자식들(sl, 'p')) await 문단(pp, td);
        줄el.append(td);
      }
      t.append(줄el);
    }
    const w = 만들기('div', '표틀'); w.append(t); return w;
  }
  const 틀 = 만들기('div', 'hwpx');
  for (const 이름 of 구역이름) {
    const d = xml읽기(await z.글(이름));
    for (const p of 자식들(d.documentElement, 'p')) await 문단(p, 틀);
  }
  return { 틀, 알림: 그림없음 ? `그림 ${그림없음}개는 못 그림` : null };
};

// ⑤ 그리기 실패 때 글자만 뽑기 ──────────────────────
const 풀어쓰기 = s => s.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (m, k) =>
  ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }[k.toLowerCase()] ??
   String.fromCodePoint(k[1] === 'x' || k[1] === 'X' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10))));
문서.글자만뽑기 = async function (ext, buf) {
  const 날것 = await 글자만뽑기_날것(ext, buf);
  return ext === 'hwpx' || ext === 'docx' ? 풀어쓰기(날것) : 날것;   // TXT 의 「&amp;」 는 원래 글이라 그대로
};
async function 글자만뽑기_날것(ext, buf) {
  if (ext === 'hwpx') {
    const z = await 압축열기(buf);
    const 미리 = await z.글('Preview/PrvText.txt');          // 한글이 저장할 때 넣어 둔 글자 (앞부분만일 수 있음)
    let 모두 = '';
    for (const n of z.이름들.filter(n => /^Contents\/section\d+\.xml$/i.test(n)).sort())
      모두 += (await z.글(n)).replace(/<hp:lineBreak\/>/g, '\n').replace(/<\/hp:p>/g, '\n').replace(/<[^>]+>/g, '') + '\n';
    return 모두.trim() ? 모두 : (미리 || '');
  }
  if (ext === 'docx') {
    const z = await 압축열기(buf);
    const x = await z.글('word/document.xml') || '';
    return x.replace(/<w:tab\/>/g, '\t').replace(/<w:br\/>/g, '\n').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '');
  }
  if (ext === 'hwp') return 문서.hwp미리보기(buf);                         // 배포용 · 암호 문서도 한글이 넣어 둔 미리보기 글자는 있음
  const 글 = 문서.글자판(new Uint8Array(buf)).글;
  if ((ext === 'doc' && /^\s*</.test(글)) || ext === 'html' || ext === 'htm') return 글.replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>|<\/(p|div|tr|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');   // 이름만 .doc 인 HTML
  if (ext === 'doc' && 글.startsWith('{\\rtf')) return 글.replace(/\\pard?/g, '\n').replace(/\{\\\*[^{}]*\}|\\[a-z]+-?\d* ?|[{}]/g, '');   // RTF 대충 걷어냄
  return 글;
}
