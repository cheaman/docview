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
  const 제목 = (d.title || '').trim();
  const 프로그램 = /<script\b/i.test(글);
  // 보안메일(암호 칸 + 프로그램 · 급여명세서 등)은 처음부터 «프로그램 켜고 보기» (④)
  if (프로그램 && /<input\b[^>]*type\s*=\s*["']?password/i.test(글)) {
    return { 틀: 문서.HTML켜고(글), 덧: [판, '프로그램 켜고 봄'].join(' · '), 켜고: true };
  }
  옮기기(d.body || d.documentElement, 틀);
  if (프로그램) {                                                   // 그 밖에 프로그램이 든 HTML — 글로 보이고 위 띠에서 고름
    const 띠 = 만들기('div', 'html켜기띠');
    띠.innerHTML = '<span>프로그램이 든 HTML → 글만 보여 줌</span>';
    const b = 만들기('button', null, '원래 모양으로 (프로그램 켬)');
    b.onclick = () => 틀.replaceChildren(문서.HTML켜고(글));
    띠.append(b); 틀.prepend(띠);
  }
  return {
    틀,
    덧: [판, 제목 && 제목.slice(0, 40)].filter(Boolean).join(' · '),
    알림: 마디 > 400000 ? '너무 큰 페이지 → 앞부분만 그림' : 바깥그림 ? `그림 ${바깥그림}개는 파일 밖에 있어 못 그림 → 「[그림]」 으로 표시` : null,
  };
};
문서.htm = 문서.html;

// ④ 프로그램 켜고 보기 (10-06 직원 피드백 ③ 「급여명세서 HTML 은 암호를 넣는 방식 — 문서보기에서도 열리게」)
//   막힌 칸 : iframe sandbox = 프로그램 · 입력만 (같은 출처 아님 → 앱 저장소 · 다리 · 다른 문서에 못 닿음 · 새 창 · 바깥 이동 없음)
//   + 문서 안 CSP = 바깥 주소 모두 막음 (문서는 폰 밖으로 안 나감 · 그림 · 글꼴은 파일 안 data: 만)
//   + 도우미 : alert → 문서 위 띠 (갤럭시 WebView 는 알림창을 버림) · 암호 칸 옆 「확인」 · 안 뜬 그림 단추는 숨김 · 넓은 쪽은 폰 너비로 줄임
//     document.write 로 새로 그려도 도우미를 다시 붙임 (더존 위하고 급여명세서가 이 방식)
function HTML도우미() {
  if (window.__dv) return; window.__dv = 1;
  var 띠 = function (m) {
    var b = document.getElementById('__dv띠');
    if (!b) { b = document.createElement('div'); b.id = '__dv띠'; b.style.cssText = 'position:fixed;left:8px;right:8px;top:8px;z-index:99999;background:#d70015;color:#fff;font:600 15px/1.4 sans-serif;padding:10px 12px;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.3)'; (document.body || document.documentElement).appendChild(b); }
    b.textContent = String(m); b.style.display = 'block'; clearTimeout(b.__t); b.__t = setTimeout(function () { b.style.display = 'none'; }, 3500);
  };
  window.alert = 띠; window.confirm = function (m) { 띠(m); return true; }; window.open = function () { return null; };
  var 맞춤 = function () {
    try { var b = document.body; if (!b) return; b.style.zoom = ''; if (document.querySelector('input[type=password]')) return;   // 암호 넣는 동안은 그대로 (줄이면 칸이 너무 작음)
      var w = Math.max(document.documentElement.scrollWidth, b.scrollWidth); if (w > innerWidth + 4) b.style.zoom = (innerWidth / w).toFixed(3); } catch (e) {}
  };
  var 단추 = function () {
    var ps = document.querySelectorAll('input[type=password]');
    for (var i = 0; i < ps.length; i++) (function (p) {
      if (p.__dv) return; p.__dv = 1; p.style.fontSize = '18px'; p.setAttribute('inputmode', p.maxLength > 0 && p.maxLength <= 8 ? 'numeric' : 'text');
      var b = document.createElement('button'); b.type = 'button'; b.textContent = '확인';
      b.style.cssText = 'margin-left:6px;padding:6px 16px;font:700 16px sans-serif;border:0;border-radius:8px;background:#3f7300;color:#fff;vertical-align:middle';
      b.onclick = function () {
        var a = (p.form && p.form.querySelector('a[href^="javascript:"]')) || document.querySelector('a[href^="javascript:"]');
        var 함수 = a && /^javascript:\s*([\w$]+)\(\)\s*;?\s*$/.exec(a.getAttribute('href'));   // 막힌 칸에선 javascript: 주소 이동이 안 먹음 → 그 함수를 바로
        if (함수 && typeof window[함수[1]] === 'function') { window[함수[1]](); return; }
        if (a) { a.click(); return; }
        try { p.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13, which: 13, bubbles: true })); } catch (e) {}
        try { if (p.form && p.form.requestSubmit) p.form.requestSubmit(); } catch (e) {}
      };
      p.parentNode.insertBefore(b, p.nextSibling);
    })(ps[i]);
  };
  addEventListener('error', function (e) { var t = e.target; if (t && t.tagName === 'IMG') t.style.display = 'none'; }, true);   // 바깥 그림(막힘) — 빈 상자 대신 숨김
  if (!window.__dvm) {                                             // 위 띠 「− ＋」 (postMessage · 한 번만 붙임)
    window.__dvm = 1;
    addEventListener('message', function (e) {
      var d = e.data; if (!d || d.dv !== '크기') return;
      var b = document.body; if (!b) return;
      var z = +(b.style.zoom || 1); z = d.d > 0 ? z * 1.25 : z / 1.25;
      b.style.zoom = Math.max(0.2, Math.min(4, z)).toFixed(3);
    });
  }
  var 붙이기 = function () { 단추(); 맞춤(); };
  document.addEventListener('DOMContentLoaded', 붙이기); addEventListener('load', 붙이기); setTimeout(붙이기, 300);
  var 원래 = window.__dvw || (window.__dvw = document.write);     // 처음 것만 (다시 붙여도 겹으로 안 감쌈)
  document.write = function (s) {                                 // 새로 그리면 도우미를 다시 (전역은 그대로라 __dv 를 풂)
    window.__dv = 0; window.__dvm = 0;                             // document.open 이 창의 듣기 장치를 다 지움 → 다시 붙게
    원래.call(document, String(s) + '<scr' + 'ipt>(' + HTML도우미글 + ')()</scr' + 'ipt>');
    setTimeout(맞춤, 300); setTimeout(맞춤, 1200);
  };
}
const HTML도우미글 = HTML도우미.toString();
문서.HTML켜고 = function (글) {
  const 막음 = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; media-src data:; form-action 'none'; base-uri 'none'">`
    + `<script>var HTML도우미글=${JSON.stringify(HTML도우미글).replace(/</g, '\\u003c')};(${HTML도우미글})()</` + 'script>';
  const 머리 = /<head\b[^>]*>/i.exec(글);
  const 새 = 머리 ? 글.slice(0, 머리.index + 머리[0].length) + 막음 + 글.slice(머리.index + 머리[0].length) : 막음 + 글;
  const 틀 = 만들기('div', 'html켜고');
  const 띠 = 만들기('div', 'html켜기띠');
  띠.append(만들기('span', null, /<input\b[^>]*type\s*=\s*["']?password/i.test(글) ? '🔒 암호(생년월일 등) 넣고 「확인」 · 인터넷 막음' : '🔒 프로그램 켜고 봄 · 인터넷 막음'));   // 위하고 명세서는 «비밀번호» 안내가 바깥 그림이라 막히면 안 보임
  const f = document.createElement('iframe');
  for (const [글자, d, 이름] of [['−', -1, '작게'], ['＋', 1, '크게']]) {
    const b = 만들기('button', '크기단추', 글자); b.setAttribute('aria-label', 이름);
    b.onclick = () => f.contentWindow?.postMessage({ dv: '크기', d }, '*');
    띠.append(b);
  }
  f.setAttribute('sandbox', 'allow-scripts allow-forms');
  f.setAttribute('referrerpolicy', 'no-referrer');
  f.className = 'html칸';
  f.srcdoc = 새;
  틀.append(띠, f);
  return 틀;
};
