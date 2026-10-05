// HTML · HTM 보기 (v0.6 · 2026-10-03 전무님 「html도 추가」)
// 보기만 한다 — 프로그램(script) · 바깥 주소(그림 · 글꼴 · 링크) · 입력 칸은 버리고 글 · 표 · 목록 · 굵기 · 색만 옮겨 그림
//   그래서 찾기 · 글씨 판 · 글자만 이 다른 글 문서와 똑같이 돈다. 앱은 인터넷 권한이 없어 바깥 그림은 어차피 못 받음
// 구역 지도 : ① 글자판 (meta charset · 없으면 UTF-8 → 안 되면 EUC-KR) ② 옮겨 그릴 꼴 고르기 ③ 그리기
'use strict';

// ① 글자판 — <meta charset> 가 EUC-KR 계열이면 그대로, 아니면 TXT 와 같은 방법
문서.html글 = function (buf) {
  const b = new Uint8Array(buf);
  const 머리 = new TextDecoder('latin1').decode(b.subarray(0, 4096));
  const m = /<meta[^>]+charset\s*=\s*["']?\s*([\w-]+)/i.exec(머리);
  const 판 = (m?.[1] || '').toLowerCase();
  if (/euc-?kr|ks_c_5601|cp949|x-windows-949|ksc5601/.test(판)) return { 글: new TextDecoder('euc-kr').decode(b), 판: 'EUC-KR' };
  return 문서.글자판(b);
};

// ② 옮겨 그릴 꼴 — 이 밖의 꼴은 껍데기만 벗기고 안의 글은 살림 · 아래 「버림」 은 안의 글까지 버림
const HTML버림 = new Set(['script', 'style', 'noscript', 'template', 'iframe', 'frame', 'frameset', 'object', 'embed', 'applet', 'canvas', 'svg', 'math',
  'audio', 'video', 'source', 'track', 'map', 'link', 'meta', 'base', 'head', 'title', 'select', 'option', 'button', 'input', 'textarea', 'form', 'dialog']);
const HTML살림 = {
  p: 'p', div: 'div', section: 'div', article: 'div', main: 'div', header: 'div', footer: 'div', nav: 'div', aside: 'div', center: 'div', figure: 'div', figcaption: 'div', address: 'div',
  h1: 'h2', h2: 'h3', h3: 'h4', h4: 'h5', h5: 'h6', h6: 'h6',
  table: 'table', thead: 'thead', tbody: 'tbody', tfoot: 'tfoot', tr: 'tr', td: 'td', th: 'td', caption: 'caption',
  ul: 'ul', ol: 'ol', li: 'li', dl: 'dl', dt: 'dt', dd: 'dd',
  b: 'b', strong: 'b', i: 'i', em: 'i', u: 'u', ins: 'u', s: 's', strike: 's', del: 's', sup: 'sup', sub: 'sub', small: 'small', mark: 'span', font: 'span', span: 'span', a: 'span', label: 'span', abbr: 'span', cite: 'i', q: 'span',
  br: 'br', hr: 'hr', pre: 'pre', code: 'code', blockquote: 'blockquote', img: 'img', fieldset: 'div', legend: 'b',
};
const HTML모양 = ['color', 'background-color', 'font-weight', 'font-style', 'text-decoration', 'text-align'];   // 크기 · 자리 · 글꼴은 안 옮김 (좁은 폰에서 넘치지 않게)

// ③ 그리기
문서.html = async function (buf) {
  const { 글, 판 } = 문서.html글(buf);
  const d = new DOMParser().parseFromString(글, 'text/html');      // DOMParser 는 프로그램을 돌리지 않음
  const 틀 = 만들기('div', 'html문서');
  let 그림 = 0, 바깥그림 = 0, 마디 = 0;
  const 옮기기 = (원, 담을곳) => {
    for (const n of 원.childNodes) {
      if (++마디 > 400000) return;                                 // 아주 큰 페이지 — 폰 메모리 보호
      if (n.nodeType === 3) { 담을곳.append(n.nodeValue); continue; }
      if (n.nodeType !== 1) continue;
      const 이름 = n.localName;
      if (HTML버림.has(이름)) continue;
      const 새이름 = HTML살림[이름];
      if (!새이름) { 옮기기(n, 담을곳); continue; }               // 모르는 꼴 — 껍데기만 벗김
      if (새이름 === 'img') {
        그림++;
        const src = n.getAttribute('src') || '';
        if (/^data:image\/(png|jpe?g|gif|webp|bmp);/i.test(src)) {
          const im = 만들기('img', '그림'); im.src = src; im.alt = n.getAttribute('alt') || ''; 담을곳.append(im);
        } else {
          바깥그림++;
          담을곳.append(만들기('span', '빈그림', `[그림${n.getAttribute('alt') ? ' · ' + n.getAttribute('alt').slice(0, 40) : ''}]`));
        }
        continue;
      }
      const e = document.createElement(새이름);
      if (새이름 === 'td') { for (const k of ['colspan', 'rowspan']) { const v = parseInt(n.getAttribute(k), 10); if (v > 1 && v < 1000) e.setAttribute(k, v); } if (이름 === 'th') e.style.fontWeight = '700'; }
      if (이름 === 'a' && n.getAttribute('href')) e.className = 'html링크';
      if (이름 === 'ol' && n.getAttribute('start')) e.setAttribute('start', n.getAttribute('start'));
      const 정렬 = n.getAttribute('align');
      if (정렬 && /^(left|right|center|justify)$/i.test(정렬)) e.style.textAlign = 정렬.toLowerCase() === 'justify' ? 'left' : 정렬.toLowerCase();
      if (이름 === 'font' && n.getAttribute('color')) e.style.color = n.getAttribute('color');
      if (이름 === 'center') e.style.textAlign = 'center';
      const 붙은 = n.getAttribute('style');
      if (붙은) {
        const 시험 = document.createElement('span'); 시험.style.cssText = 붙은;
        for (const k of HTML모양) {
          let v = 시험.style.getPropertyValue(k);
          if (!v || /url\(|expression/i.test(v)) continue;
          if (k === 'text-align' && v === 'justify') v = 'left';      // 좁은 폰에서 빈칸이 벌어짐 (워드 · 한글과 같게)
          e.style.setProperty(k, v);
        }
      }
      if (새이름 === 'table') { const 감쌈 = 만들기('div', '표틀'); 감쌈.append(e); 담을곳.append(감쌈); }
      else 담을곳.append(e);
      if (새이름 !== 'br' && 새이름 !== 'hr') 옮기기(n, e);
    }
  };
  옮기기(d.body || d.documentElement, 틀);
  const 제목 = (d.title || '').trim();
  return {
    틀,
    덧: [판, 제목 && 제목.slice(0, 40)].filter(Boolean).join(' · '),
    알림: 마디 > 400000 ? '너무 큰 페이지 → 앞부분만 그림' : 바깥그림 ? `그림 ${바깥그림}개는 파일 밖에 있어 못 그림 → 「[그림]」 으로 표시` : null,
  };
};
문서.htm = 문서.html;
