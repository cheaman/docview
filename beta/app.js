// 문서 보기 — 화면 동작 (2단계 · 2026-10-03)
// 구역 지도
//   ① 다리 — 폰은 window.Android, PC 크롬은 가짜(시험 목록)
//   ② 최근 목록 그리기 · ⋯ 판
//   ③ 열기 — 형식마다 가름 (지금은 PDF 만 · 나머지는 상황 표대로 알림)
//   ④ PDF — 쪽 틀 먼저 · 보이는 쪽만 그림 · 먼 쪽은 비움 · 쪽 번호 · 쪽 이동
//   ⑤ 두 손가락 키우기 · 두 번 톡 키우기
//   ⑥ 뒤로 가기 · 시작
//   ⑦ 화면 크기 (폴드 펴고 접기) — 보던 자리 지키기
'use strict';

// ① 다리 ───────────────────────────────────────────
const 폰 = !!window.Android;
const 웹 = !폰 && !!window.웹다리;                     // 아이폰 웹앱 (5_웹앱 · web.js) — 다리 · PDF 를 브라우저 안에서
// PDF 길 — 갤럭시는 껍데기(안드로이드 PdfRenderer)에 주소로 묻고, 웹앱은 pdf.js (web.js 의 웹PDF)
//   쪽(id, n, w) 은 그림 주소를 돌려줌 (웹은 blob 주소 → 다 쓰면 놓기)
const PDF길 = window.웹PDF || {
  정보: id => fetch(`/pdf/${encodeURIComponent(id)}/info`).then(r => r.json()),
  쪽: async (id, n, w) => `/pdf/${encodeURIComponent(id)}/p/${n}?w=${w}`,
  찾기: (id, q) => fetch(`/pdf/${encodeURIComponent(id)}/find?q=${encodeURIComponent(q)}`).then(r => r.json()),
  놓기: () => {},
  ...(window.Android ? { 글: id => fetch(`/pdf/${encodeURIComponent(id)}/text`).then(r => r.json()) } : {}),   // 쪽마다 글 (0.9.6 · 안드로이드 15 이상)
};
const 그림놓기 = img => { if (img?.src?.startsWith('blob:')) URL.revokeObjectURL(img.src); };
const 그림주소놓기 = u => { if (typeof u === 'string' && u.startsWith('blob:')) URL.revokeObjectURL(u); };
const 흐름비우기 = () => { const 안 = $('#flowin'); 안.querySelectorAll('img').forEach(i => 그림주소놓기(i.src)); 안.innerHTML = ''; };   // 글 문서 그림(워드 · 한글 수백 장)을 놓아 줌 (0.9.9)
// 쪽으로 보는 문서의 길 — PDF 는 PDF길 · PPT(슬라이드 모양대로)는 ppt.js 의 PPT길 (10-04)
const 쪽길 = () => 지금?.쪽길 || PDF길;
const 단위 = () => (지금?.쪽길 === PPT길 ? '장' : '쪽');
function PC시험목록() {          // PC 크롬 시험 : _시험문서\목록.json 이 있으면 그 파일들로 (앱에는 안 들어감)
  try {
    const x = new XMLHttpRequest(); x.open('GET', '_시험문서/목록.json', false); x.send();
    if (x.status === 200) return x.responseText;
  } catch (e) {}
  return null;
}
// PC 시험 — 쪽지 · 돌림 · 펜 표시는 이 브라우저의 localStorage 에 (폰은 껍데기가 앱 안 파일에)
const PC덧 = (() => { try { return JSON.parse(localStorage.getItem('PC덧') || '{}'); } catch (e) { return {}; } })();
const PC덧저장 = () => { try { localStorage.setItem('PC덧', JSON.stringify(PC덧)); } catch (e) {} };
const 다리 = window.Android || window.웹다리 || {
  recent: () => {
    const a = JSON.parse(PC시험목록() || JSON.stringify([
      { id: '1', name: '과업지시서.pdf', ext: 'pdf', from: '카톡', when: Date.now() - 3600e3, size: 2412000 },
      { id: '2', name: '회의록.hwpx', ext: 'hwpx', from: '카톡', when: Date.now() - 7200e3, size: 81000 },
      { id: '3', name: '검토의견 회신.docx', ext: 'docx', from: '메일', when: Date.now() - 3 * 864e5, size: 51000 },
      { id: '4', name: '옛 문서.doc', ext: 'doc', from: '메일', when: Date.now() - 20 * 864e5, size: 120000 },
    ]));
    for (const d of a) Object.assign(d, PC덧['i' + d.id] || {});
    return JSON.stringify(a);
  },
  setInfo: (id, k, v) => { const o = (PC덧['i' + id] ||= {}); if (v && !(k === '돌림' && v === '0')) o[k] = v; else delete o[k]; PC덧저장(); },
  loadMarks: id => PC덧['m' + id] || '',
  loadText: id => PC글.get(id) || '', saveText: (id, j) => { j ? PC글.set(id, j) : PC글.delete(id); return true; },   // 문서 속 글 (0.9.6) — PC 는 이 창 안에만
  saveMarks: (id, j) => { if (j) PC덧['m' + id] = j; else delete PC덧['m' + id]; PC덧저장(); return true; },
  remove: id => { delete PC덧['i' + id]; delete PC덧['m' + id]; PC덧저장(); },
  takePending: () => '', pickFile: () => 알림판('PC 시험 화면 → 파일 고르기는 폰에서'),
  // 보내기 — PC 는 만든 사본을 window.마지막보냄 에 두고 알림만 (시험에서 크기 · 첫 바이트를 잼)
  shareBegin: n => { window.마지막보냄 = { 이름: n, 조각: [] }; return true; },
  shareChunk: b => { window.마지막보냄.조각.push(b); return true; },
  shareEnd: m => { const o = window.마지막보냄; o.꼴 = m; o.바이트 = Uint8Array.from(atob(o.조각.join('')), c => c.charCodeAt(0)); o.조각 = null; 알림판(`PC 시험 → 보낼 파일 「${o.이름}」 ${크기(o.바이트.length)} 만듦`); return true; },
  shareOriginal: id => { window.마지막보냄 = { 원본: id }; 알림판('PC 시험 → 원본 그대로 보내기'); return true; },
  // ZIP 안 파일 꺼내기 (10-04) — PC 는 이 창 안에만 (blob 주소) · 폰 저장은 window.마지막저장 에 두고 알림만
  addBytes: async (n, from, b) => {
    const id = 'x' + Date.now() + Math.random().toString(36).slice(2, 5), ext = (n.match(/\.([^.]+)$/)?.[1] || '').toLowerCase();
    PC꺼낸것.unshift({ id, name: n, ext, from, when: Date.now(), size: b.length, 주소: URL.createObjectURL(new Blob([b])) });
    return id;
  },
  saveBytes: (폴더, n, b) => { (window.마지막저장 ||= []).push({ 폴더, 이름: n, 크기: b.length }); return true; },
  copyImage: 약속 => 약속.then(b => { window.마지막복사 = b; }),          // 복사 (10-04) — PC 는 window.마지막복사 에 그림만
};
const PC꺼낸것 = [], PC글 = new Map();
if (!window.Android && !window.웹다리) { const 옛 = 다리.recent; 다리.recent = () => JSON.stringify([...PC꺼낸것.map(d => ({ ...d, ...(PC덧['i' + d.id] || {}) })), ...JSON.parse(옛())]); }
const $ = s => document.querySelector(s);
const 글 = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ② 최근 목록 ──────────────────────────────────────
//   10-04 (목업 1_읽을거리\복사_목업.html 승인) : 형식 칩 · 과업 묶음 칩 (「형식 | 묶음」) · 고르기(한꺼번에 지우기 · 묶음에 넣기) · 이름 비슷한 것 묶음 권함
//   묶음 = 이름표만 (recent 줄의 「묶음」 칸 · 줄바꿈으로 여럿 · 껍데기 setInfo) — 파일 · 원본은 그대로
let 목록 = [];
const 형식표 = [['PDF', ['pdf']], ['한글', ['hwp', 'hwpx']], ['워드', ['doc', 'docx']], ['엑셀', ['xls', 'xlsx']], ['PPT', ['ppt', 'pptx']], ['그림', null], ['ZIP', null], ['도면', ['dxf', 'dwg']], ['영상', null], ['글', ['txt', 'html', 'htm']]];
function 형식이름(ext) {
  ext = (ext || '').toLowerCase();
  for (const [이름, 들] of 형식표) {
    if (들 ? 들.includes(ext) : 이름 === '그림' ? 그림형식.includes(ext) : 이름 === 'ZIP' ? 압축형식.includes(ext) : 영상형식.includes(ext)) return 이름;
  }
  return '그 밖';
}
const 묶음들 = d => String(d.묶음 || '').split('\n').map(s => s.trim()).filter(Boolean);
const 보기설정 = Object.assign({ 방식: '형식', 형식: '모두', 묶음: '모두' }, (() => { try { return JSON.parse(localStorage.getItem('목록보기') || '{}'); } catch (e) { return {}; } })());
const 보기저장 = () => { try { localStorage.setItem('목록보기', JSON.stringify(보기설정)); } catch (e) {} };
let 고름 = null;                                       // 고르기 중이면 Set(id) · 아니면 null
function 통과(d) {
  if (보기설정.방식 === '형식') return 보기설정.형식 === '모두' || 형식이름(d.ext) === 보기설정.형식;
  return 보기설정.묶음 === '모두' || 묶음들(d).includes(보기설정.묶음);
}
function 칩줄그리기() {
  const 형식 = 보기설정.방식 === '형식', 셈 = new Map();
  for (const d of 목록) for (const k of 형식 ? [형식이름(d.ext)] : 묶음들(d)) 셈.set(k, (셈.get(k) || 0) + 1);
  const 열쇠 = 형식 ? '형식' : '묶음';
  if (보기설정[열쇠] !== '모두' && !셈.has(보기설정[열쇠])) { 보기설정[열쇠] = '모두'; 보기저장(); }   // 지운 뒤 빈 칩은 「모두」 로
  const 차례 = 형식 ? [...형식표.map(x => x[0]), '그 밖'].filter(k => 셈.has(k)) : [...셈.keys()].sort((a, b) => a.localeCompare(b, 'ko'));
  const 칩 = (k, n) => `<button class="칩${k === 보기설정[열쇠] ? ' on' : ''}" data-k="${글(k)}">${글(k)}${n != null ? ` <i>${n}</i>` : ''}</button>`;
  $('#kinds').innerHTML = `<div class="나눔"><button data-m="형식" class="${형식 ? 'on' : ''}">형식</button><button data-m="묶음" class="${형식 ? '' : 'on'}">묶음</button></div>`
    + 칩('모두', 목록.length) + 차례.map(k => 칩(k, 셈.get(k))).join('')
    + (형식 ? '' : '<button class="칩" data-k="＋" aria-label="새 묶음">＋ 묶음</button>');
  $('#kinds').hidden = 목록.length === 0 || 찾는중;
}
// 묶음 권함 — 파일 이름에 같은 낱말이 든 것 셋 이상 (흔한 말 · 숫자 뺌) · 「됐음」 한 낱말은 다시 안 물음 · 인터넷 · AI 없음
const 흔한말 = new Set(['보고서', '최종', '수정', '수정본', '사본', '자료', '파일', '문서', '첨부', '회신', '최신', '검토', '의견', '결과', '목록', '시험', '사진', '카톡', '복사본', 'copy', 'final', 'scan', 'img', 'image', 'screenshot', 'kakaotalk', 'photo', 'document']);
function 묶음권함() {
  if (보기설정.방식 !== '묶음' || 고름) return '';
  let 닫음 = []; try { 닫음 = JSON.parse(localStorage.getItem('묶음권함닫음') || '[]'); } catch (e) {}
  const 셈 = new Map();
  for (const d of 목록) {
    const 낱 = new Set(String(d.name || '').replace(/\.[^.]+$/, '').split(/[\s_\-.,()[\]·+~]+/).filter(s => s.length >= 2 && !/^[\d]+$/.test(s) && !흔한말.has(s.toLowerCase())));
    for (const w of 낱) { if (!셈.has(w)) 셈.set(w, []); 셈.get(w).push(d); }
  }
  let 좋은 = null;
  for (const [w, 들] of 셈) {
    if (들.length < 3 || 닫음.includes(w) || 들.every(d => 묶음들(d).includes(w))) continue;
    if (!좋은 || 들.length > 좋은[1].length || (들.length === 좋은[1].length && w.length > 좋은[0].length)) 좋은 = [w, 들];
  }
  if (!좋은) return '';
  return `<div class="권함"><b>권함</b> · 이름에 「${글(좋은[0])}」 든 파일 ${좋은[1].length}개 → 묶음으로?
    <div class="권함단추"><button class="칩 on" data-권함="만들기" data-w="${글(좋은[0])}">「${글(좋은[0])}」 묶음 만들기</button><button class="칩" data-권함="됐음" data-w="${글(좋은[0])}">됐음</button></div></div>`;
}
function 목록그리기() {
  try { 목록 = JSON.parse(다리.recent() || '[]'); } catch (e) { 목록 = []; }
  if (고름) for (const id of [...고름]) if (!목록.some(d => d.id === id)) 고름.delete(id);
  if (찾는중) { $('#empty').hidden = true; $('#list').hidden = false; 칩줄그리기(); 찾기그리기(); return 고르기판갱신(); }
  $('#empty').hidden = 목록.length > 0;
  $('#list').hidden = 목록.length === 0;
  칩줄그리기();
  const 보일것 = 목록.filter(통과);
  const 오늘0 = new Date(); 오늘0.setHours(0, 0, 0, 0);
  const 묶음 = { [즐겨이름]: [], '오늘': [], '이번 주': [], '그 전': [] };      // ⭐ 즐겨찾기는 때 묶음보다 위 (10-05)
  for (const d of 보일것) {
    const k = d.즐겨 ? 즐겨이름 : d.when >= 오늘0.getTime() ? '오늘' : d.when >= 오늘0.getTime() - 6 * 864e5 ? '이번 주' : '그 전';
    묶음[k].push(d);
  }
  let h = 묶음권함();
  for (const [k, arr] of Object.entries(묶음)) {
    if (!arr.length) continue;
    const 다 = 고름 && arr.every(d => 고름.has(d.id));
    h += `<div class="sec${k === 즐겨이름 ? ' 즐겨머리' : ''}"><span>${k}</span>${고름 ? `<button class="모두칸${다 ? ' on' : ''}" data-sec="${k}">${다 ? '모두 ✓' : '모두'}</button>` : ''}</div><div class="묶음${k === 즐겨이름 ? ' 즐겨칸' : ''}">`;   // DSM (10-04) — 때 묶음마다 카드 하나 + 가는 줄
    for (const d of arr) {
      const ext = (d.ext || '').toLowerCase(), 표 = 묶음들(d);
      h += `<div class="item" data-id="${글(d.id)}" role="button">
        ${고름 ? `<span class="고름칸${고름.has(d.id) ? ' on' : ''}" aria-hidden="true">✓</span>` : ''}
        <span class="badge b-${딱지(ext)}">${글((ext || '?').toUpperCase().slice(0, 4))}</span>
        <div class="t"><div class="n">${글(d.name)}</div><div class="s">${글(d.from || '')} · ${때(d.when)}${자리글(d)}${d.size > 0 ? ' · ' + 크기(d.size) : ''}${표.length ? ' · 🏷 ' + 글(표.join(', ')) : ''}</div>${자리막대(d)}${d.메모 ? `<div class="memo">📝 ${글(d.메모.split('\n')[0].slice(0, 60))}</div>` : ''}</div>
        ${고름 ? '' : `<button class="more" data-more="${글(d.id)}" aria-label="더 보기"><svg class="ico"><use href="#i-more"/></svg></button>`}
      </div>`;
    }
    h += '</div>';
  }
  if (목록.length && !보일것.length) h += '<div class="빈칸글">이 칩에 든 문서 없음</div>';
  $('#list').innerHTML = h;
  고르기판갱신();
}
// 목록 줄의 «보던 자리» · 책갈피 수 · 막대 (10-05) — 끝까지 본 문서 · 맨 앞은 막대 없음
const 즐겨이름 = '⭐ 즐겨찾기';
function 자리글(d) {
  const o = 자리읽기(d), 책 = String(d.책갈피 || ''), 책수 = 책 ? (책.startsWith('f') ? 1 : 책.split(',').length) : 0;
  let s = '';
  if (o?.n) s += ` · <span class="자리">${(o.c ?? o.p) + 1} / ${o.n}${['ppt', 'pptx'].includes(String(d.ext).toLowerCase()) ? '장' : '쪽'}</span>`;
  else if (o?.f > 0.01) s += ` · <span class="자리">${Math.round(o.f * 100)}%</span>`;
  if (책수) s += ` · 🔖${책수 > 1 ? ' ' + 책수 : ''}`;
  return s;
}
function 자리막대(d) {
  const o = 자리읽기(d), 비 = o?.n ? ((o.c ?? o.p) + 1) / o.n : o?.f;
  return 비 > 0.005 && 비 < 0.98 ? `<div class="자리막대"><i style="width:${(비 * 100).toFixed(1)}%"></i></div>` : '';
}
// 고르기 (10-04) — 한꺼번에 지우기 · 묶음에 넣기 · 뒤로 = 끝 · ⭐ 즐겨찾기 (10-05)
function 고르기시작(id) {
  if (고름) { if (id) 고름.add(id); return 목록그리기(); }
  고름 = new Set(id ? [id] : []);
  history.pushState({ v: '고르기' }, '');
  목록그리기();
}
function 고르기끝() {
  if (!고름) return;
  if (history.state?.v === '고르기') return history.back();          // popstate 가 마저 닫음
  고름 = null; 목록그리기();
}
function 고르기판갱신() {
  const 켬 = !!고름;
  $('#homebar').hidden = 켬 || 찾는중; $('#selbar').hidden = !켬; $('#pick').hidden = 켬 || 찾는중; $('#selfoot').hidden = !켬; $('#gbar').hidden = !찾는중;
  if (!켬) return;
  const n = 고름.size, 보일것 = 목록.filter(통과);
  $('#selcnt').textContent = `${n}개 고름`;
  $('#selall').textContent = 보일것.length && 보일것.every(d => 고름.has(d.id)) ? '다 풀기' : '다 고르기';
  $('#seldel').textContent = n ? `${n}개 지우기` : '지우기';
  $('#seldel').disabled = !n; $('#selgroup').disabled = !n; $('#selfav').disabled = !n;
  const 사진만 = n > 0 && [...고름].every(id => 그림형식.includes(String(목록.find(d => d.id === id)?.ext || '').toLowerCase()));   // ④ 그림만 골랐을 때 「PDF 로」 (0.9.6)
  $('#selpdf').hidden = !사진만;
  const 견줄 = n === 2 && [...고름].every(id => ['pdf', 'pptx'].includes(String(목록.find(d => d.id === id)?.ext || '').toLowerCase()));   // ⑪ PDF · PPT 둘 (0.9.6)
  $('#selcmp').hidden = !견줄;
  $('#selfav').textContent = n && [...고름].every(id => 목록.find(d => d.id === id)?.즐겨) ? '⭐ 빼기' : (사진만 || 견줄 ? '⭐' : '⭐ 즐겨찾기');
}
function 묶음붙이기(ids, 이름) {
  for (const id of ids) {
    const d = 목록.find(x => x.id === id); if (!d) continue;
    const 표 = 묶음들(d); if (표.includes(이름)) continue;
    다리.setInfo(id, '묶음', [...표, 이름].join('\n'));
  }
}
function 묶음넣기판() {
  const ids = [...고름], 있는 = new Map();
  for (const d of 목록) for (const g of 묶음들(d)) 있는.set(g, (있는.get(g) || 0) + 1);
  판열기(`<h3>${ids.length}개를 어느 묶음에?</h3>
    ${[...있는.keys()].sort((a, b) => a.localeCompare(b, 'ko')).map(g => `<button class="act" data-g="${글(g)}">${글(g)} <span class="흐림">· ${있는.get(g)}</span></button>`).join('')}
    <div class="row"><input id="newgroup" type="text" maxlength="40" placeholder="새 묶음 이름 (예 : ○○교 점검)" enterkeyhint="done"></div>
    <div class="row 끝줄"><span style="flex:1"></span><button class="btn plain" onclick="판닫기()">닫기</button><button class="btn" id="groupok">넣기</button></div>
    <div class="판설명">묶음은 이름표만 — 파일은 그대로 · 한 파일이 여러 묶음에도 · 묶음 풀기는 칩을 길게</div>`);
  const 넣기 = 이름 => {
    이름 = String(이름 || '').replace(/\s+/g, ' ').trim(); if (!이름) return $('#newgroup').focus();
    묶음붙이기(ids, 이름); 판닫기();
    보기설정.방식 = '묶음'; 보기설정.묶음 = 이름; 보기저장();
    고르기끝(); 목록그리기(); 칩(`「${이름}」 에 ${ids.length}개 넣음`);
  };
  $('#sheet').onclick = e => { const b = e.target.closest('[data-g]'); if (b) 넣기(b.dataset.g); };
  $('#groupok').onclick = () => 넣기($('#newgroup').value);
  $('#newgroup').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); 넣기($('#newgroup').value); } };
}
function 지우기판() {
  const ids = [...고름], n = ids.length;
  판열기(`<h3>${n}개를 지울까요?</h3>
    <div class="판설명">· 앱 안 사본 · 펜 표시 · 쪽지 · 메모가 지워짐<br>· 카톡 · 내 파일의 원본은 그대로 · 되돌릴 수 없음</div>
    <div class="row 끝줄"><span style="flex:1"></span><button class="btn plain" onclick="판닫기()">닫기</button><button class="btn 지움" id="delok">${n}개 지우기</button></div>`);
  $('#delok').onclick = () => { for (const id of ids) 다리.remove(id); 판닫기(); 고르기끝(); 목록그리기(); 칩(`${n}개 지움`); };
}
function 묶음관리판(이름) {
  const 들 = 목록.filter(d => 묶음들(d).includes(이름));
  판열기(`<h3>묶음 · ${글(이름)} <span class="흐림">${들.length}</span></h3>
    <div class="row"><input id="rename" type="text" maxlength="40"></div>
    <div class="row 끝줄"><button class="btn plain warn" id="ungroup">묶음 풀기 (이름표만 지움)</button><span style="flex:1"></span><button class="btn" id="renameok">이름 바꾸기</button></div>`);
  $('#rename').value = 이름;
  const 바꿈 = 새 => {
    for (const d of 들) { const 표 = 묶음들(d).filter(g => g !== 이름); if (새 && !표.includes(새)) 표.push(새); 다리.setInfo(d.id, '묶음', 표.join('\n')); }
    보기설정.묶음 = 새 || '모두'; 보기저장(); 판닫기(); 목록그리기();
  };
  $('#ungroup').onclick = () => 바꿈('');
  $('#renameok').onclick = () => { const 새 = $('#rename').value.replace(/\s+/g, ' ').trim(); if (새 && 새 !== 이름) 바꿈(새); else 판닫기(); };
}
// ④ 사진 여러 장 → PDF 한 권 (0.9.6 · 목업 1_읽을거리\여덟가지_목업.html ④) — 고른 차례대로 · 끌어서 차례 바꿈 · A4 에 맞춤 / 그림 크기
//   펜 · 형광 · 도형 · 글 · 위치 메모 · 돌림을 입혀서 (원래 그림은 그대로) → 목록에 새 PDF 로 넣고 열어 보내기 판
async function 그림받기(d) {                               // 문서 그림 → Image (아이폰 웹은 보관함 blob · 갤럭시 HEIC 는 껍데기가 JPEG 로)
  const ext = String(d.ext || '').toLowerCase();
  let 주소 = 폰 && ['heic', 'heif'].includes(ext) ? `/img/${encodeURIComponent(d.id)}` : 문서주소(d), 놓을 = null;
  if (웹) { const r = await fetch(주소); if (!r.ok) throw new Error('원본 없음 · ' + d.name); 주소 = 놓을 = URL.createObjectURL(await r.blob()); }
  try { return await 보내기.그림받기(주소); } catch (e) { throw new Error('그림을 못 읽음 · ' + d.name); } finally { if (놓을) setTimeout(() => URL.revokeObjectURL(놓을), 600000); }
}
function 사진PDF판() {
  const 들 = [...고름].map(id => 목록.find(d => d.id === id)).filter(Boolean);
  if (!들.length) return;
  const 오늘 = new Date(), 날 = String(오늘.getMonth() + 1).padStart(2, '0') + String(오늘.getDate()).padStart(2, '0');
  const 밑 = String(들[0].name || '사진').replace(/\.[^.]+$/, '');
  let 용지 = 'A4';
  판열기(`<h3>PDF 한 권으로 <span class="흐림">· ${들.length}장</span></h3>
    <div class="pdf썸들" id="pdfthumbs"></div>
    <div class="판설명">끌어서 차례 바꿈 · 펜 · 메모 · 돌림도 입혀서 · 원래 그림은 그대로</div>
    <div class="opt"><span class="lab">용지</span><div class="seg" id="pdfpaper"><button data-v="A4" class="on">A4 에 맞춤</button><button data-v="원래">그림 크기 그대로</button></div></div>
    <div class="row"><input id="pdfname" type="text" maxlength="60" enterkeyhint="done"></div>
    <div class="row 끝줄"><span style="flex:1"></span><button class="btn plain" onclick="판닫기()">닫기</button><button class="btn" id="pdfok">만들기</button></div>`);
  $('#pdfname').value = `${밑}${들.length > 1 ? ` 외 ${들.length - 1}장` : ''} · ${날}`;
  const 주소들 = new Map();
  const 그리기 = () => {
    $('#pdfthumbs').innerHTML = 들.map((d, k) => `<div class="pdf썸" data-id="${글(d.id)}"><b>${k + 1}</b></div>`).join('');
    for (const el of $('#pdfthumbs').children) {
      const d = 들.find(x => x.id === el.dataset.id), 있음 = 주소들.get(d.id);
      if (있음) { el.prepend(Object.assign(new Image(), { src: 있음, alt: '' })); continue; }
      그림받기(d).then(im => { 주소들.set(d.id, im.src); if (el.isConnected) el.prepend(Object.assign(new Image(), { src: im.src, alt: '' })); }, () => {});
    }
  };
  그리기();
  // 끌어서 차례 바꾸기 — 손가락 아래 칸과 자리를 맞바꿈
  let 끄는 = null;
  $('#pdfthumbs').onpointerdown = e => { const el = e.target.closest('.pdf썸'); if (!el) return; 끄는 = el.dataset.id; el.classList.add('끄는중'); };
  $('#pdfthumbs').onpointermove = e => {
    if (!끄는) return;
    const 아래 = document.elementFromPoint(e.clientX, e.clientY)?.closest('.pdf썸'); if (!아래 || 아래.dataset.id === 끄는) return;
    const a = 들.findIndex(d => d.id === 끄는), b = 들.findIndex(d => d.id === 아래.dataset.id);
    const [옮김] = 들.splice(a, 1); 들.splice(b, 0, 옮김); 그리기();
    $('#pdfthumbs').querySelector(`.pdf썸[data-id="${CSS.escape(끄는)}"]`)?.classList.add('끄는중');
  };
  const 놓음 = () => { 끄는 = null; $('#pdfthumbs')?.querySelectorAll('.끄는중').forEach(x => x.classList.remove('끄는중')); };
  $('#pdfthumbs').onpointerup = 놓음; $('#pdfthumbs').onpointercancel = 놓음; $('#pdfthumbs').onpointerleave = 놓음;
  $('#pdfpaper').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; 용지 = b.dataset.v; $('#pdfpaper').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
  $('#pdfok').onclick = () => { const 이름 = ($('#pdfname').value.replace(/[\\/:*?"<>|]+/g, ' ').trim() || 밑) + '.pdf'; 판닫기(); 사진PDF만들기([...들], 용지, 이름); };
}
async function 사진PDF만들기(들, 용지, 이름) {
  if (보내는중) return;
  보내는중 = true;
  const 진행 = 말 => { const c = $('#chip'); c.textContent = 말; c.hidden = false; clearTimeout(칩시계); };
  try {
    const 쪽들 = [], 뺌 = [];
    for (const [i, d] of 들.entries()) {
      진행(`PDF 만드는 중 ${i + 1} / ${들.length}`);
      await new Promise(r => setTimeout(r, 20));
      let im; try { im = await 그림받기(d); } catch (e) { 뺌.push(d.name); continue; }   // 못 읽는 그림은 빼고 알림
      const w0 = im.naturalWidth, h0 = im.naturalHeight, k = Math.min(1, 2400 / Math.max(w0, h0));
      const 작 = document.createElement('canvas'); 작.width = Math.max(1, Math.round(w0 * k)); 작.height = Math.max(1, Math.round(h0 * k));
      작.getContext('2d').drawImage(im, 0, 0, 작.width, 작.height);
      const 표 = 표시읽기(d.id), 돌 = (Number(d.돌림) || 0) & 3;
      let c = 보내기.쪽캔버스(작, 돌, 표.쪽['0'], null); 작.width = 작.height = 0;
      보내기.메모그리기(c, (표.메모 || []).filter(m => m.k === '0'), { 돌, 번호표: { n: 0, 목록: [] } });
      let pw, ph;
      if (용지 === 'A4') {                                    // A4 (가로 사진은 가로 A4) · 가장자리 4% · 150 dpi 남짓
        const 가로 = c.width > c.height; pw = 가로 ? 842 : 595; ph = 가로 ? 595 : 842;
        const 판 = document.createElement('canvas'); 판.width = Math.round(pw * 2.5); 판.height = Math.round(ph * 2.5);
        const x = 판.getContext('2d'), 여 = 판.width * 0.04, 배 = Math.min((판.width - 2 * 여) / c.width, (판.height - 2 * 여) / c.height);
        x.fillStyle = '#ffffff'; x.fillRect(0, 0, 판.width, 판.height);
        x.drawImage(c, (판.width - c.width * 배) / 2, (판.height - c.height * 배) / 2, c.width * 배, c.height * 배);
        c.width = c.height = 0; c = 판;
      } else { pw = c.width * 0.75; ph = c.height * 0.75; }      // 그림 크기 그대로 (96 dpi)
      쪽들.push({ jpg: await 보내기.바이트(c, 'image/jpeg', 0.88), w: c.width, h: c.height, pw, ph });
      c.width = c.height = 0;
    }
    if (!쪽들.length) throw new Error('읽을 수 있는 그림이 없음');
    진행('목록에 넣는 중…');
    const id = await 새문서넣기(이름, '사진 묶음', 보내기.PDF(쪽들));
    if (!id) throw new Error('파일을 못 만듦 · 폰 저장 공간 확인');
    $('#chip').hidden = true;
    고름 = null; if (history.state?.v === '고르기') history.replaceState({ v: 'viewer' }, '');   // 고르기 한 칸을 보기 칸으로 → 뒤로 = 목록
    열기(String(id), false);
    for (let i = 0; i < 100 && !(지금?.id === String(id) && 지금.자리됨); i++) await new Promise(r => setTimeout(r, 100));
    if (지금?.id === String(id)) { $('#resume').hidden = true; 보내기판(); }
    if (뺌.length) 알림(`<b>못 읽은 그림 ${뺌.length}장은 뺌</b><div class="sm">${글(뺌.join(' · '))}</div>`);
  } catch (e) {
    $('#chip').hidden = true;
    알림판(`PDF 만들기 실패 → ${e.message || e}`);
  } finally { 보내는중 = false; }
}
async function 새문서넣기(이름, 어디서, b) {                // 최근 목록에 새 문서로 (zipview.js 넣기와 같은 길)
  if (다리.addBytes) return 다리.addBytes(이름, 어디서, b);
  if (!다리.addBegin) throw new Error('앱이 옛 판 → 새 판 설치');
  if (!다리.addBegin(이름, 어디서)) throw new Error('파일을 못 만듦');
  for (let i = 0; i < b.length; i += 393216) {
    const 덩 = b.subarray(i, i + 393216); let s = '';
    for (let k = 0; k < 덩.length; k += 8192) s += String.fromCharCode.apply(null, 덩.subarray(k, k + 8192));
    if (!다리.addChunk(btoa(s))) throw new Error('쓰기 실패 (폰 저장 공간?)');
    await new Promise(r => setTimeout(r));
  }
  return 다리.addEnd();
}
// ⑪ 두 판 견주기 (0.9.6 · 목업 1_읽을거리\여덟가지_목업.html ⑪ 「겹쳐서 빨강 + 앞 · 뒤 칩」)
//   ① 두 문서 쪽을 작게(가로 240) 떠서 회색 값으로 · ② 비슷한 쪽끼리 짝 (쪽이 밀려도 · 편집 거리) · ③ 짝마다 4 화소 칸으로 견줘 달라진 칸 → 네모로 묶음
//   ④ 보기 : 겹침 = 같은 것 검정 · 앞에만 있는 것 빨강 · 뒤에만 있는 것 파랑 + 달라진 곳 빨강 네모 · 앞 판 · 뒤 판 · ⌃⌄ 달라진 쪽만
//   먼저 받은 문서가 앞 판 (⇄ 로 바꿈) · 원본은 안 고침 · 인터넷 · AI 없음
const 견 = { 앞: null, 뒤: null, 짝: [], 지금: 0, 방식: '겹침', 번호: 0 };
const 길고르기 = d => (String(d.ext).toLowerCase() === 'pptx' ? PPT길 : PDF길);
async function 쪽그림(d, n, w) { const u = await 길고르기(d).쪽(d.id, n, w); try { return await 보내기.그림받기(u); } finally { setTimeout(() => 그림주소놓기(u), 2000); } }
function 회색(im, W) {                                       // 가로 W 로 줄인 회색 값 (Uint8) · 높이는 비율대로
  const H = Math.max(1, Math.round(W * (im.naturalHeight || im.height) / (im.naturalWidth || im.width)));
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(im, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data, g = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) g[i] = (d[i * 4] * 3 + d[i * 4 + 1] * 6 + d[i * 4 + 2]) / 10;
  c.width = c.height = 0;
  return { g, W, H };
}
function 쪽거리(a, b) {                                       // 0(같음) ~ 1 — 위쪽 겹치는 높이만 · 8 화소 칸 평균끼리
  const H = Math.min(a.H, b.H), 칸 = 8; let 합 = 0, n = 0;
  for (let y = 0; y + 칸 <= H; y += 칸) for (let x = 0; x + 칸 <= a.W; x += 칸) {
    let sa = 0, sb = 0; for (let yy = 0; yy < 칸; yy++) for (let xx = 0; xx < 칸; xx++) { const i = (y + yy) * a.W + x + xx; sa += a.g[i]; sb += b.g[i]; }
    합 += Math.abs(sa - sb) / (칸 * 칸 * 255); n++;
  }
  return (n ? 합 / n : 1) * 4 + Math.abs(a.H - b.H) / Math.max(a.H, b.H);
}
function 짝짓기(A, B) {                                       // 편집 거리 — 짝 = 쪽거리 · 빼기 · 넣기 = 0.35
  const n = A.length, m = B.length, 틈 = 0.35, D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1)), 길 = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
  for (let i = 1; i <= n; i++) { D[i][0] = i * 틈; 길[i][0] = 1; } for (let j = 1; j <= m; j++) { D[0][j] = j * 틈; 길[0][j] = 2; }
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    const 짝 = D[i - 1][j - 1] + Math.min(1, 쪽거리(A[i - 1], B[j - 1])), 빼 = D[i - 1][j] + 틈, 넣 = D[i][j - 1] + 틈;
    if (짝 <= 빼 && 짝 <= 넣) { D[i][j] = 짝; 길[i][j] = 0; } else if (빼 <= 넣) { D[i][j] = 빼; 길[i][j] = 1; } else { D[i][j] = 넣; 길[i][j] = 2; }
  }
  const 짝 = []; let i = n, j = m;
  while (i > 0 || j > 0) { const k = 길[i][j]; if (i > 0 && j > 0 && k === 0) { 짝.push({ a: i - 1, b: j - 1 }); i--; j--; } else if (i > 0 && (j === 0 || k === 1)) { 짝.push({ a: i - 1, b: null }); i--; } else { 짝.push({ a: null, b: j - 1 }); j--; } }
  return 짝.reverse();
}
function 다른칸(a, b) {                                        // 4 화소 칸 평균이 14 넘게 다르면 「다름」 → 이웃끼리 묶어 네모 [x0, y0, x1, y1] (0~1)
  const 칸 = 4, cw = Math.floor(a.W / 칸), ch = Math.floor(Math.max(a.H, b.H) / 칸), 표 = new Uint8Array(cw * ch);
  for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
    let sa = 0, sb = 0;
    for (let yy = 0; yy < 칸; yy++) for (let xx = 0; xx < 칸; xx++) { const y = cy * 칸 + yy, x = cx * 칸 + xx; sa += y < a.H ? a.g[y * a.W + x] : 255; sb += y < b.H ? b.g[y * b.W + x] : 255; }
    if (Math.abs(sa - sb) / (칸 * 칸) > 14) 표[cy * cw + cx] = 1;
  }
  const 봄 = new Uint8Array(cw * ch), 네모 = [];
  for (let s0 = 0; s0 < 표.length; s0++) {
    if (!표[s0] || 봄[s0]) continue;
    let x0 = cw, y0 = ch, x1 = 0, y1 = 0, 수 = 0; const 줄 = [s0]; 봄[s0] = 1;
    while (줄.length) {
      const s = 줄.pop(), x = s % cw, y = (s / cw) | 0; 수++;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X < 0 || Y < 0 || X >= cw || Y >= ch) continue; const t = Y * cw + X; if (표[t] && !봄[t]) { 봄[t] = 1; 줄.push(t); } }
    }
    if (수 >= 2) 네모.push([(x0 - 0.5) / cw, (y0 - 0.5) * 칸 / a.H, (x1 + 1.5) / cw, (y1 + 1.5) * 칸 / a.H]);
  }
  return 네모;
}
async function 견주기열기(앞, 뒤) {
  if (!$('#viewer').hidden) 목록으로();                       // 보기 화면 위에 겹쳐 뜨지 않게
  고름 = null; if (history.state?.v === '고르기') history.replaceState({ v: '견주기' }, ''); else if (history.state?.v !== '견주기') history.pushState({ v: '견주기' }, '');
  Object.assign(견, { 앞, 뒤, 짝: [], 지금: 0, 방식: '겹침', 번호: 견.번호 + 1 });
  const 번호 = 견.번호;
  $('#home').hidden = true; $('#cmpview').hidden = false; $('#cmpbox').classList.remove('크게'); $('#cmpzoom').textContent = '크게';
  $('#cmpmode').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === '겹침'));
  $('#cmpname').textContent = `${앞.name} ⇄ ${뒤.name}`; $('#cmpsub').textContent = '견줄 준비 중…';
  const cv = $('#cmpcv'); cv.width = cv.height = 0;
  const 알림 = 말 => { $('#cmpnote').hidden = !말; $('#cmpnote').textContent = 말 || ''; };
  try {
    const [ia, ib] = [await 길고르기(앞).정보(앞.id), await 길고르기(뒤).정보(뒤.id)];
    if (ia.error || ib.error) throw new Error(ia.error || ib.error);
    const 모두 = ia.pages + ib.pages; let 됨 = 0;
    const 뜨기 = async (d, n) => { const g = 회색(await 쪽그림(d, n, 480), 240); 됨++; if (번호 === 견.번호) 알림(`견줄 준비 ${됨} / ${모두}쪽`); return g; };
    const A = [], B = [];
    for (let i = 0; i < ia.pages; i++) { if (번호 !== 견.번호) return; A.push(await 뜨기(앞, i)); }
    for (let j = 0; j < ib.pages; j++) { if (번호 !== 견.번호) return; B.push(await 뜨기(뒤, j)); }
    견.짝 = 짝짓기(A, B).map(z => ({ ...z, 네모: z.a != null && z.b != null ? 다른칸(A[z.a], B[z.b]) : null }));
    for (const z of 견.짝) z.바뀜 = z.a == null || z.b == null || z.네모.length > 0;
    알림(''); 견.지금 = Math.max(0, 견.짝.findIndex(z => z.바뀜)); 견그리기();
  } catch (e) { if (번호 === 견.번호) { 알림(''); $('#cmpsub').textContent = '견주기 실패 · ' + (e.message || e); } }
}
async function 견그리기() {
  const z = 견.짝[견.지금]; if (!z) return;
  const 번호 = 견.번호, 바뀐 = 견.짝.filter(x => x.바뀜).length, 단 = String(견.앞.ext).toLowerCase() === 'pptx' ? '장' : '쪽';
  const 상태 = z.a == null ? `뒤 판에 새로 생긴 ${단}` : z.b == null ? `뒤 판에서 빠진 ${단}` : z.네모.length ? `달라진 곳 ${z.네모.length}` : '같음';
  $('#cmpsub').textContent = `${상태} · 달라진 ${단} ${바뀐} / ${견.짝.length}`;
  $('#cmppage').textContent = z.a != null && z.b != null && z.a !== z.b ? `${z.a + 1} ↔ ${z.b + 1}${단}` : `${(z.b ?? z.a) + 1}${단}`;
  const W = Math.min(2000, Math.round($('#cmpbox').clientWidth * (devicePixelRatio || 1) * ($('#cmpbox').classList.contains('크게') ? 2 : 1)));
  const 방식 = z.a == null ? '뒤' : z.b == null ? '앞' : 견.방식;
  const [ia, ib] = await Promise.all([방식 !== '뒤' && z.a != null ? 쪽그림(견.앞, z.a, W) : null, 방식 !== '앞' && z.b != null ? 쪽그림(견.뒤, z.b, W) : null]);
  if (번호 !== 견.번호 || 견.짝[견.지금] !== z) return;
  const 높 = im => Math.round(W * (im.naturalHeight || im.height) / (im.naturalWidth || im.width));
  const H = Math.max(ia ? 높(ia) : 0, ib ? 높(ib) : 0), cv = $('#cmpcv'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d', { willReadFrequently: true });
  x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  if (방식 === '겹침') {
    const 판 = im => { const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d', { willReadFrequently: true }); g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.drawImage(im, 0, 0, W, 높(im)); const d = g.getImageData(0, 0, W, H).data; c.width = c.height = 0; return d; };
    const a = 판(ia), b = 판(ib), out = x.createImageData(W, H), o = out.data;
    for (let i = 0; i < o.length; i += 4) {
      const la = (a[i] * 3 + a[i + 1] * 6 + a[i + 2]) / 10, lb = (b[i] * 3 + b[i + 1] * 6 + b[i + 2]) / 10, 앞먹 = la < 170, 뒤먹 = lb < 170;
      if (앞먹 && 뒤먹) { o[i] = o[i + 1] = o[i + 2] = Math.min(la, lb) * 0.6; }
      else if (앞먹 && Math.abs(la - lb) > 40) { o[i] = 225; o[i + 1] = 40; o[i + 2] = 45; }       // 앞에만 = 빨강 (빠진 것)
      else if (뒤먹 && Math.abs(la - lb) > 40) { o[i] = 30; o[i + 1] = 100; o[i + 2] = 235; }      // 뒤에만 = 파랑 (새로 생긴 것)
      else { const v = 255 - (255 - Math.min(la, lb)) * 0.35; o[i] = o[i + 1] = o[i + 2] = v; }
      o[i + 3] = 255;
    }
    x.putImageData(out, 0, 0);
  } else { const im = 방식 === '앞' ? ia : ib; x.drawImage(im, 0, 0, W, 높(im)); }
  if (z.네모?.length) {
    x.strokeStyle = '#d6262b'; x.lineWidth = Math.max(2, W / 400); x.fillStyle = 'rgba(214,38,43,0.08)';
    for (const [x0, y0, x1, y1] of z.네모) { const r = [x0 * W, y0 * H, (x1 - x0) * W, (y1 - y0) * H]; x.fillRect(...r); x.strokeRect(...r); }
  }
}
function 견옮기기(걸음, 바뀐것만) {
  const n = 견.짝.length; if (!n) return;
  let i = 견.지금;
  for (let k = 0; k < n; k++) { i += 걸음; if (i < 0 || i >= n) return 칩(바뀐것만 ? '더 달라진 곳 없음' : '끝'); if (!바뀐것만 || 견.짝[i].바뀜) break; }
  견.지금 = i; $('#cmpbox').scrollTop = 0; 견그리기();
}
function 견닫기() { 견.번호++; $('#cmpview').hidden = true; $('#home').hidden = false; $('#cmpcv').width = 0; 목록그리기(); }
$('#cmpback').addEventListener('click', () => (history.state?.v === '견주기' ? history.back() : 견닫기()));
$('#cmpprev').addEventListener('click', () => 견옮기기(-1, true));
$('#cmpnext').addEventListener('click', () => 견옮기기(1, true));
$('#cmpleft').addEventListener('click', () => 견옮기기(-1, false));
$('#cmpright').addEventListener('click', () => 견옮기기(1, false));
$('#cmpmode').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; 견.방식 = b.dataset.v; $('#cmpmode').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); 견그리기(); });
$('#cmpzoom').addEventListener('click', () => { const 큼 = $('#cmpbox').classList.toggle('크게'); $('#cmpzoom').textContent = 큼 ? '작게' : '크게'; 견그리기(); });
$('#cmpswap').addEventListener('click', () => { if (견.앞 && 견.뒤) { history.replaceState({ v: '견주기' }, ''); 견주기열기(견.뒤, 견.앞); } });

// 목록 딱지 색 — 첫 화면 · ZIP 안 목록(zipview.js) 같이 씀
function 딱지(ext) {
  return ['pdf', 'hwp', 'hwpx', 'doc', 'docx', 'txt'].includes(ext) ? ext : ['html', 'htm'].includes(ext) ? 'html' : ['xls', 'xlsx'].includes(ext) ? 'xls' : 그림형식.includes(ext) ? 'img' : ['dxf', 'dwg'].includes(ext) ? 'cad' : ['ppt', 'pptx'].includes(ext) ? 'ppt' : 압축형식.includes(ext) ? 'zip' : 'etc';
}
function 때(ms) {
  const d = new Date(ms), 오늘 = new Date();
  const hm = `${d.getHours() < 12 ? '오전' : '오후'} ${(d.getHours() % 12) || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
  return d.toDateString() === 오늘.toDateString() ? hm : `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
function 크기(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(b / 1024)) + 'KB'; }

let 길게됨 = false;
$('#list').addEventListener('click', e => {
  if (길게됨) { 길게됨 = false; return; }                          // 길게 눌러 고르기를 시작한 그 손가락
  const 찾은 = e.target.closest('.찾은줄[data-id]');
  if (찾은) return 찾아열기(찾은.dataset.id, $('#gq').value.trim(), 찾은.dataset.p === '' ? null : Number(찾은.dataset.p), Number(찾은.dataset.k));
  const 권 = e.target.closest('[data-권함]');
  if (권) {
    const w = 권.dataset.w;
    if (권.dataset.권함 === '만들기') { 묶음붙이기(목록.filter(d => String(d.name || '').includes(w)).map(d => d.id), w); 보기설정.묶음 = w; 보기저장(); 목록그리기(); 칩(`「${w}」 묶음 만듦`); }
    else { try { const a = JSON.parse(localStorage.getItem('묶음권함닫음') || '[]'); a.push(w); localStorage.setItem('묶음권함닫음', JSON.stringify(a)); } catch (x) {} 목록그리기(); }
    return;
  }
  if (고름) {
    const 모 = e.target.closest('[data-sec]');
    const it = e.target.closest('.item');
    if (모) {
      const 칸 = 모.parentElement.nextElementSibling, ids = [...칸.querySelectorAll('.item')].map(x => x.dataset.id), 다 = ids.every(id => 고름.has(id));
      ids.forEach(id => (다 ? 고름.delete(id) : 고름.add(id)));
    } else if (it) 고름.has(it.dataset.id) ? 고름.delete(it.dataset.id) : 고름.add(it.dataset.id);
    return 목록그리기();
  }
  const m = e.target.closest('[data-more]');
  if (m) { e.stopPropagation(); 더보기판(m.dataset.more); return; }
  const it = e.target.closest('.item');
  if (it) 열기(it.dataset.id, true);
});
// 길게 누르기 — 목록 줄 : 고르기 시작 · 묶음 칩 : 묶음 이름 바꾸기 · 풀기
function 길게(틀, 고름표, 할일) {
  let 시계 = 0, 처음 = null;
  틀.addEventListener('pointerdown', e => {
    const t = e.target.closest(고름표); if (!t) return;
    처음 = [e.clientX, e.clientY];
    const 손 = { x: e.clientX, y: e.clientY, 마우스: e.pointerType === 'mouse' };
    시계 = setTimeout(() => { 시계 = 0; 길게됨 = true; 할일(t, 손); setTimeout(() => (길게됨 = false), 800); }, 550);
  });
  const 그만 = e => { if (시계 && (!처음 || e.type !== 'pointermove' || Math.hypot(e.clientX - 처음[0], e.clientY - 처음[1]) > 10)) { clearTimeout(시계); 시계 = 0; } };
  for (const k of ['pointerup', 'pointercancel', 'pointermove', 'pointerleave']) 틀.addEventListener(k, 그만);
  틀.addEventListener('contextmenu', e => { if (e.target.closest(고름표)) e.preventDefault(); });
}
길게($('#list'), '.item', (it, 손) => { if (찾는중) return; navigator.vibrate?.(15); 고르기시작(it.dataset.id); 문지름시작(it.dataset.id, true, 손); });

// 문질러 고르기 (10-05 · 전무님 「아이폰 · 갤럭시처럼 문질러서 선택」)
//   고르기 중 줄 왼쪽 동그라미에 손가락을 대고 위아래로 끌기 · 또는 길게 눌러 고르기를 시작한 손가락을 떼지 않고 끌기
//   → 처음 줄부터 손가락 아래 줄까지 모두 같은 상태(처음 동그라미가 비었으면 고름 · 차 있었으면 풂) · 되돌아가면 원래대로
//   목록 위 · 아래 끝에 가면 저절로 밀림 · 끄는 동안 목록은 안 밀림 (손가락이 닿은 그 요소에 touchmove 막기를 붙임 —
//   길게 누르면 목록을 새로 그려 그 요소가 문서에서 빠져도 그 요소로 계속 옴)
let 문지름 = null, 밀기틀 = 0;
function 문지름시작(id, 목표, 손) {
  문지름 = { id, 끝id: id, 목표, 스냅: new Set(고름), 켬: false, 처음: [손.x, 손.y], 마지막: [손.x, 손.y], 마우스: !!손.마우스 };
}
function 문지름적용() {
  const 줄들 = [...$('#list').querySelectorAll('.item')], ids = 줄들.map(x => x.dataset.id);
  const a = ids.indexOf(문지름.id), b = ids.indexOf(문지름.끝id); if (a < 0 || b < 0) return;
  const lo = Math.min(a, b), hi = Math.max(a, b);
  줄들.forEach((it, k) => {
    const id = ids[k], 켬 = k >= lo && k <= hi ? 문지름.목표 : 문지름.스냅.has(id);
    켬 ? 고름.add(id) : 고름.delete(id);
    it.querySelector('.고름칸')?.classList.toggle('on', 켬);
  });
  고르기판갱신();
}
function 문지름따라() {                                  // 손가락이 아래 단추 줄 · 머리 위에 있어도 목록 안쪽 높이로 당겨 잼 (저절로 밀릴 때)
  const r = $('#list').getBoundingClientRect(), y = Math.min(Math.max(문지름.마지막[1], r.top + 4), Math.min(r.bottom, innerHeight) - 100);
  const it = document.elementFromPoint(r.left + r.width / 2, y)?.closest('#list .item');
  if (it) 문지름.끝id = it.dataset.id;
  문지름적용();
}
function 문지름움직임(x, y) {
  if (!문지름 || !고름) return;
  문지름.마지막 = [x, y];
  if (!문지름.켬) {
    if (Math.hypot(x - 문지름.처음[0], y - 문지름.처음[1]) < 6) return;
    문지름.켬 = true; navigator.vibrate?.(8);
    const 밀기 = () => {                              // 위 · 아래 끝 가까이면 저절로 밀기
      if (!문지름) return;
      const L = $('#list'), r = L.getBoundingClientRect(), y = 문지름.마지막[1], 아래 = Math.min(r.bottom, innerHeight) - 130;
      const v = y < r.top + 50 ? -Math.min(18, (r.top + 50 - y) / 3 + 3) : y > 아래 ? Math.min(18, (y - 아래) / 3 + 3) : 0;
      if (v) { L.scrollTop += v; 문지름따라(); }
      밀기틀 = requestAnimationFrame(밀기);
    };
    밀기틀 = requestAnimationFrame(밀기);
  }
  문지름따라();
}
function 문지름끝() {
  if (!문지름) return;
  const 켬 = 문지름.켬; 문지름 = null; cancelAnimationFrame(밀기틀);
  if (켬) { 길게됨 = true; setTimeout(() => (길게됨 = false), 400); 목록그리기(); }   // 손을 뗀 자리의 click 은 버림 · 「모두」 칸도 다시
}
$('#list').addEventListener('pointerdown', e => {
  if (!고름 || 문지름) return;
  const 칸 = e.target.closest('.고름칸'); if (!칸) return;
  const id = 칸.closest('.item').dataset.id;
  문지름시작(id, !고름.has(id), { x: e.clientX, y: e.clientY, 마우스: e.pointerType === 'mouse' });
});
$('#list').addEventListener('touchstart', e => {
  const t = e.target;
  const 막기 = ev => { if (!문지름) return; ev.preventDefault(); const p = ev.touches[0]; if (p) 문지름움직임(p.clientX, p.clientY); };
  const 끝 = () => { t.removeEventListener('touchmove', 막기); t.removeEventListener('touchend', 끝); t.removeEventListener('touchcancel', 끝); 문지름끝(); };
  t.addEventListener('touchmove', 막기, { passive: false });
  t.addEventListener('touchend', 끝); t.addEventListener('touchcancel', 끝);
}, { passive: true });
window.addEventListener('pointermove', e => { if (문지름?.마우스 && e.pointerType === 'mouse') 문지름움직임(e.clientX, e.clientY); });
window.addEventListener('pointerup', e => { if (문지름?.마우스 && e.pointerType === 'mouse') 문지름끝(); });
길게($('#kinds'), '.칩[data-k]', c => { const k = c.dataset.k; if (보기설정.방식 === '묶음' && k !== '모두' && k !== '＋') 묶음관리판(k); });
$('#kinds').addEventListener('click', e => {
  if (길게됨) { 길게됨 = false; return; }
  const m = e.target.closest('[data-m]');
  if (m) { 보기설정.방식 = m.dataset.m; 보기저장(); return 목록그리기(); }
  const c = e.target.closest('[data-k]'); if (!c) return;
  if (c.dataset.k === '＋') { 고르기시작(); return 칩('묶음에 넣을 파일을 고른 뒤 아래 「묶음에 넣기」'); }
  보기설정[보기설정.방식 === '형식' ? '형식' : '묶음'] = c.dataset.k; 보기저장(); 목록그리기();
});
$('#selbtn').addEventListener('click', () => 고르기시작());
$('#seldone').addEventListener('click', 고르기끝);
$('#selall').addEventListener('click', () => {
  const 보일것 = 목록.filter(통과), 다 = 보일것.every(d => 고름.has(d.id));
  보일것.forEach(d => (다 ? 고름.delete(d.id) : 고름.add(d.id))); 목록그리기();
});
$('#seldel').addEventListener('click', () => 고름?.size && 지우기판());
$('#selgroup').addEventListener('click', () => 고름?.size && 묶음넣기판());
$('#selpdf').addEventListener('click', () => 고름?.size && 사진PDF판());
$('#selcmp').addEventListener('click', () => { if (고름?.size !== 2) return; const 둘 = [...고름].map(id => 목록.find(d => d.id === id)).sort((a, b) => a.when - b.when); 견주기열기(둘[0], 둘[1]); });
$('#selfav').addEventListener('click', () => {
  if (!고름?.size) return;
  const ids = [...고름], 뺌 = ids.every(id => 목록.find(d => d.id === id)?.즐겨);
  for (const id of ids) 다리.setInfo(id, '즐겨', 뺌 ? '' : '1');
  고르기끝(); 목록그리기(); 칩(뺌 ? `⭐ ${ids.length}개 뺌` : `⭐ ${ids.length}개 즐겨찾기 → 목록 맨 위`);
});
$('#pick').addEventListener('click', () => 다리.pickFile());

function 판열기(html) { $('#sheet').onclick = null; $('#sheet').innerHTML = '<div class="grab"></div>' + html; $('#sheet').hidden = false; $('#dim').hidden = false; }
function 판닫기() { $('#sheet').hidden = true; $('#dim').hidden = true; }
$('#dim').addEventListener('click', 판닫기);
function 알림판(말) { 판열기(`<h3>${글(말)}</h3><button class="btn plain" onclick="판닫기()">닫기</button>`); }

function 더보기판(id) {
  const d = 목록.find(x => x.id === id); if (!d) return;
  판열기(`<h3>${글(d.name)}</h3>
    <button class="act" id="favt">${d.즐겨 ? '⭐ 즐겨찾기에서 빼기' : '⭐ 즐겨찾기에 넣기 (목록 맨 위)'}</button>
    <button class="act" id="memoedit">📝 쪽지 ${d.메모 ? '고치기' : '쓰기'}</button>
    <button class="act warn" id="rm">목록에서 빼기 (폰 안의 사본 · 쪽지 · 펜 표시도 지움)</button>
    <button class="act" onclick="판닫기()">닫기</button>`);
  $('#rm').onclick = () => { 다리.remove(id); 판닫기(); 목록그리기(); };
  $('#memoedit').onclick = () => 쪽지판(d);
  $('#favt').onclick = () => { 다리.setInfo(id, '즐겨', d.즐겨 ? '' : '1'); 판닫기(); 목록그리기(); };
}

// ②-1b 전체 찾기 (0.9.6 · 목업 1_읽을거리\여덟가지_목업.html ③ · 「처음 열 때 글 뽑아 둠」)
//   첫 화면 머리 ⌕ → 찾기 칸 · 「이름에서」 「문서 속에서」(앞뒤 글 · 쪽) · 누르면 그 문서 그 쪽 + 문서 안 찾기 칸
//   문서 속 글은 껍데기 saveText / loadText (갤럭시 files/text · 웹 보관함 · PC 는 창 안) — { v, 쪽: [쪽마다 글] } · { v, 글 } · { v, 없음: 까닭 }
//   찾기를 열면 아직 안 뽑은 문서를 뒤에서 하나씩 · 문서를 열어도 그 문서를 뽑아 둠 · 인터넷 · AI 없음
const 글뽑는형식 = ['txt', 'docx', 'hwpx', 'hwp', 'doc', 'xlsx', 'xls', 'html', 'htm', 'ppt'];
const 글캐시 = new Map(), 뽑는중 = new Set();
let 찾는중 = false, 준비 = null, 찾을쪽 = null, 찾을차례 = null, 찾기그림시계 = 0;
const 글되는가 = d => { const e = String(d.ext || '').toLowerCase(); return e === 'pdf' || e === 'pptx' || 글뽑는형식.includes(e); };
function 틀글(el) {                                       // 그린 문서 틀 → 글 (덩이 끝은 줄바꿈 · 표 칸은 탭)
  let s = '';
  const 걷기 = n => {
    if (n.nodeType === 3) { s += n.nodeValue; return; }
    if (n.nodeType !== 1) return;
    const t = n.localName; if (t === 'script' || t === 'style') return;
    if (t === 'br') { s += '\n'; return; }
    for (const c of n.childNodes) 걷기(c);
    if (/^(p|div|li|tr|h\d|table|section|article|pre|blockquote)$/.test(t)) s += '\n'; else if (t === 'td' || t === 'th') s += '\t';
  };
  걷기(el);
  return s.replace(/[ \t]*\n\s*\n+/g, '\n\n');
}
async function 글뽑기(d) {
  const ext = String(d.ext || '').toLowerCase();
  if (ext === 'pdf' || ext === 'pptx') {
    const 길 = ext === 'pdf' ? PDF길 : PPT길;
    if (!길.글) return { v: 1, 없음: '판' };
    const o = await 길.글(d.id);
    return o.error ? { v: 1, 없음: o.error } : { v: 1, 쪽: o.pages };
  }
  if (!글뽑는형식.includes(ext)) return null;
  const r = await fetch(문서주소(d)); if (!r.ok) return { v: 1, 없음: '원본 없음' };
  const buf = await r.arrayBuffer();
  let 글 = '';
  try { const 결과 = await 문서[ext](buf, { 글만: true }); 글 = 틀글(결과.틀); 결과.틀.querySelectorAll('img[src^="blob:"]').forEach(i => URL.revokeObjectURL(i.src)); }
  catch (e) { try { 글 = await 문서.글자만뽑기(ext, buf); } catch (e2) {} }
  return { v: ext === 'hwp' ? 2 : 1, 글: 글.slice(0, 2e6) };
}
async function 글읽기(d) {
  if (글캐시.has(d.id)) return 글캐시.get(d.id);
  let o = null; try { const j = await 다리.loadText?.(d.id); if (j) o = JSON.parse(j); } catch (e) {}
  if (o && String(d.ext || '').toLowerCase() === 'hwp' && !(o.v >= 2)) o = null;   // 0.9.8 까지 뽑은 옛 한글 글은 뒤가 잘렸을 수 있음 → 다시 뽑음 (0.9.9)
  if (o) 글캐시.set(d.id, o);
  return o;
}
async function 글적어두기(d, 기다림 = 1500) {              // 문서를 열면 그 문서 글을 뽑아 둠 (이미 있으면 그대로)
  if (!다리.saveText || !글되는가(d) || 뽑는중.has(d.id) || await 글읽기(d)) return;
  뽑는중.add(d.id);
  try {
    if (기다림) await new Promise(r => setTimeout(r, 기다림));
    const o = await 글뽑기(d);
    if (o) { 글캐시.set(d.id, o); await 다리.saveText(d.id, JSON.stringify(o)); }
  } catch (e) { 글캐시.set(d.id, { v: 1, 없음: '깨짐' }); }
  finally { 뽑는중.delete(d.id); }
}
async function 찾기준비() {                                  // 아직 안 뽑은 문서를 뒤에서 하나씩
  if (준비) return;
  준비 = { 됨: 0, 모두: 0 };
  for (const d of 목록.filter(글되는가)) await 글읽기(d);
  const 남은 = 목록.filter(d => 글되는가(d) && !글캐시.has(d.id));
  준비.모두 = 남은.length;
  for (const d of 남은) {
    if (!찾는중) break;
    await 글적어두기(d, 0); 준비.됨++;
    if (찾는중) 찾기그리기();
  }
  준비 = null;
  if (찾는중) 찾기그리기();
}
function 찾기열기() {
  if (찾는중) return;
  찾는중 = true; history.pushState({ v: '찾기' }, '');
  $('#gq').value = ''; 목록그리기();
  setTimeout(() => $('#gq').focus(), 60);
  찾기준비();
}
function 찾기닫기전체() { 찾는중 = false; 목록그리기(); }
function 찾기식(q) {                                       // 낱말 사이 빈칸 · 줄바꿈은 있든 없든 (PDF 는 글자마다 끊기는 일이 많음)
  const 자 = [...q.replace(/\s+/g, '')].map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(자.join('\\s*'), 'gi');
}
function 문서속찾기(o, re) {
  const 조각 = [], 쪽들 = o.쪽 || [o.글 || '']; let 수 = 0;
  쪽들.forEach((t, p) => {
    re.lastIndex = 0; let m;
    while ((m = re.exec(t)) && 수 < 999) {
      if (조각.length < 3) 조각.push({ p: o.쪽 ? p : null, k: 수, 비: m.index / Math.max(1, t.length), 앞: t.slice(Math.max(0, m.index - 24), m.index), 낱: m[0], 뒤: t.slice(m.index + m[0].length, m.index + m[0].length + 34) });
      수++; if (!m[0].length) re.lastIndex++;
    }
  });
  return { 수, 조각 };
}
function 찾기그리기() {
  const q = $('#gq').value.trim(), L = $('#list');
  const 준비글 = 준비?.모두 ? `<div class="찾기준비">문서 속 글 준비 중 ${준비.됨} / ${준비.모두} …</div>` : '';
  if (!q) { L.innerHTML = `<div class="빈칸글">파일 이름 · 문서 속 글을 찾음<br><span class="흐림">PDF · 한글 · 워드 · 엑셀 · PPT · TXT</span></div>${준비글}`; return; }
  const 한줄 = s => 글(String(s).replace(/\s+/g, ' '));
  const 이름표시 = n => { const i = n.toLowerCase().indexOf(q.toLowerCase()); return i < 0 ? 글(n) : 글(n.slice(0, i)) + '<mark>' + 글(n.slice(i, i + q.length)) + '</mark>' + 글(n.slice(i + q.length)); };
  const 낮 = q.toLowerCase().replace(/\s+/g, '');
  const 이름들 = 목록.filter(d => String(d.name || '').toLowerCase().replace(/\s+/g, '').includes(낮));
  const re = 찾기식(q), 속 = [];
  for (const d of 목록) { const o = 글캐시.get(d.id); if (!o || o.없음) continue; const r = 문서속찾기(o, re); if (r.수) 속.push({ d, ...r }); }
  const 줄머리 = d => { const ext = String(d.ext || '').toLowerCase(); return `<span class="badge b-${딱지(ext)}">${글((ext || '?').toUpperCase().slice(0, 4))}</span>`; };
  let h = '';
  if (이름들.length) h += `<div class="sec"><span>이름에서</span><span class="흐림">${이름들.length}</span></div><div class="묶음">` + 이름들.map(d => `<div class="item" data-id="${글(d.id)}" role="button">${줄머리(d)}<div class="t"><div class="n">${이름표시(d.name || '')}</div><div class="s">${글(d.from || '')} · ${때(d.when)}</div></div></div>`).join('') + '</div>';
  if (속.length) {
    const 곳 = 속.reduce((a, x) => a + x.수, 0);
    h += `<div class="sec"><span>문서 속에서</span><span class="흐림">${곳 >= 999 ? '999+' : 곳}곳 · ${속.length}문서</span></div><div class="묶음">`;
    for (const { d, 수, 조각 } of 속.sort((a, b) => b.수 - a.수)) {
      const 단 = ['ppt', 'pptx'].includes(String(d.ext).toLowerCase()) ? '장' : '쪽';
      h += `<div class="item" data-id="${글(d.id)}" role="button">${줄머리(d)}<div class="t"><div class="n">${글(d.name || '')}</div>`
        + 조각.map(c => `<div class="찾은줄" data-id="${글(d.id)}" data-p="${c.p ?? ''}" data-k="${c.k}">…${한줄(c.앞)}<mark>${한줄(c.낱)}</mark>${한줄(c.뒤)}…<span class="쪽번">${c.p != null ? `${c.p + 1}${단}` : `${Math.round(c.비 * 100)}%`}</span></div>`).join('')
        + (수 > 조각.length ? `<div class="찾은덧">외 ${수 - 조각.length}곳 → 열어서 ⌃⌄</div>` : '') + '</div></div>';
    }
    h += '</div>';
  }
  if (!h) h = `<div class="빈칸글">「${글(q)}」 없음</div>`;
  const 못 = 목록.filter(d => !글되는가(d) || 글캐시.get(d.id)?.없음).length;
  L.innerHTML = h + 준비글 + (못 ? `<div class="찾기준비">글을 못 찾는 문서 ${못}개 (그림 · 도면 · ZIP · 스캔 PDF${폰 ? ' · 안드로이드 15 아래 PDF' : ''}) → 이름으로만</div>` : '');
}
async function 찾아열기(id, q, p, k) {                       // 찾은 줄 → 그 문서 · 그 쪽 · 문서 안 찾기 칸 (그 곳부터)
  열기(id, true);
  for (let i = 0; i < 150 && !(지금?.id === id && 지금.자리됨); i++) await new Promise(r => setTimeout(r, 100));
  if (지금?.id !== id || !지금.자리됨) return;
  $('#resume').hidden = true;
  if (p != null && 지금.쪽수) { 쪽으로(p); 찾을쪽 = p; } else 찾을차례 = k;
  $('#vbar').hidden = true; $('#findbar').hidden = false; $('#fq').value = q;
  찾기하기();
}
$('#gfind').addEventListener('click', 찾기열기);
$('#gclose').addEventListener('click', () => (history.state?.v === '찾기' ? history.back() : 찾기닫기전체()));
$('#gq').addEventListener('input', () => { clearTimeout(찾기그림시계); 찾기그림시계 = setTimeout(찾기그리기, 200); });
$('#gq').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('#gq').blur(); 찾기그리기(); } });

// ②-2 문서 쪽지 (v0.6) — 문서마다 글 메모 하나 · 원본은 안 고침 · 껍데기 recent.json 줄의 「메모」 칸
function 쪽지판(d) {
  판열기(`<h3>📝 쪽지 · ${글(d.name)}</h3>
    <textarea id="memoin" rows="5" maxlength="20000" placeholder="이 문서에 남길 메모 → 다음에 열면 맨 위에 보임"></textarea>
    <div class="row 끝줄">${d.메모 ? '<button class="btn plain warn" id="memodel">쪽지 지우기</button>' : ''}<span style="flex:1"></span><button class="btn plain" onclick="판닫기()">닫기</button><button class="btn" id="memosave">저장</button></div>`);
  const 칸 = $('#memoin'); 칸.value = d.메모 || '';
  const 저장 = 새 => {
    새 = 새.replace(/\s+$/, '');
    다리.setInfo(d.id, '메모', 새);
    d.메모 = 새 || undefined;
    if (지금?.id === d.id) { 지금.d.메모 = d.메모; 쪽지보이기(); }
    판닫기(); 목록그리기();
  };
  $('#memosave').onclick = () => 저장(칸.value);
  if ($('#memodel')) $('#memodel').onclick = () => 저장('');
  setTimeout(() => { 칸.focus(); 칸.setSelectionRange(칸.value.length, 칸.value.length); }, 60);
}
function 쪽지보이기(접음) {
  const m = 지금?.d?.메모 || '';
  $('#memo').classList.toggle('있음', !!m);
  $('#memobox').hidden = !m || 접음;
  $('#memotext').textContent = m;
}
$('#memo').addEventListener('click', () => { if (지금) 쪽지판(지금.d); });
$('#memotext').addEventListener('click', () => { if (지금) 쪽지판(지금.d); });
$('#memofold').addEventListener('click', () => 쪽지보이기(true));

// ③ 열기 ──────────────────────────────────────────
let 지금 = null;           // { id, ext, 쪽들, 쪽수 }
// 덧 (10-04 · ZIP) : 깊이 — ZIP 에서 꺼내 연 문서는 1 (ZIP 속 ZIP 은 2 …) · 압축에서 — 뒤로 가면 돌아갈 ZIP { id, 폴더, 깊이 } · 폴더 — ZIP 을 다시 열 때 그 폴더로
function 열기(id, 쌓기, 덧 = {}) {
  자리적기();                                         // 보던 문서의 자리 (ZIP 에서 다른 문서로 · PPT 보는 방식 바꿈)
  if (골) 골닫기(false);                              // 골라 복사 틀이 떠 있었으면 (0.9.10)
  고름 = null;                                       // 고르기 중에 새 파일을 받으면 고르기는 끝
  목록그리기();
  const d = 목록.find(x => x.id === id);
  if (!d) { 알림판('목록에 없음 → 다시 받아 열기'); return; }
  if (영상형식.includes((d.ext || '').toLowerCase())) {          // 10-04 · 녹화 영상 → 36번 영상 화면 (장면판 → 클로드)
    location.href = `video/index.html?doc=${encodeURIComponent(d.id)}&name=${encodeURIComponent(d.name || '')}`; return;
  }
  if (쌓기 && history.state?.v !== 'viewer') history.pushState({ v: 'viewer' }, '');
  $('#home').hidden = true; $('#viewer').hidden = false;
  $('#vname').textContent = d.name;
  $('#vsub').textContent = (d.ext || '').toUpperCase();
  $('#note').hidden = true; $('#pages').querySelectorAll('img').forEach(그림놓기); $('#pages').innerHTML = ''; $('#tools').hidden = true;
  찾기닫기(); 흐름비우기(); $('#flow').hidden = true; $('#reader').hidden = false;
  $('#cadbox').hidden = true; 도면판?.끝(); 도면판 = null; $('#zipbox').hidden = true;
  표시마저쓰기(); 펜끄기(); 재기끄기(); 쪽목록닫기(); 되돌릴것 = [];
  $('#bmk').hidden = true; $('#resume').hidden = true;
  $('#cadbox').style.background = '';
  확대 = 1; $('#pages').style.width = '100%'; 미끄럼멈춤();
  지금 = { id, ext: (d.ext || '').toLowerCase(), d, 돌림: (Number(d.돌림) || 0) & 3, 표시: 표시읽기(id), 깊이: 덧.깊이 || 0, 압축에서: 덧.압축에서 };
  손모드(); 쪽지보이기(); 밤적용(); 화면켜둠(true);
  if (지금.표시.메모?.length) setTimeout(() => 지금?.id === id && 칩(`📝 메모 ${지금.표시.메모.length}개`), 700);
  if (지금.ext === 'pdf') return pdf열기(d);
  if (지금.ext === 'pptx' && !PPT글로) { 지금.쪽길 = PPT길; return pdf열기(d); }
  if (['txt', 'docx', 'hwpx', 'hwp', 'doc', 'xlsx', 'xls', 'html', 'htm', 'pptx', 'ppt'].includes(지금.ext)) return 글문서열기(d);
  if (그림형식.includes(지금.ext)) return 그림열기(d);
  if (지금.ext === 'dxf') return 도면열기(d);
  if (지금.ext === 'zip') return 압축보기.열기(d, 덧.폴더);
  if (지금.ext === 'dwg') return 알림('<b>DWG → 못 엶</b><div class="sm">오토데스크 비공개 형식 · 보낸 분께 PDF 나 DXF 로 받기</div>');
  if (압축형식.includes(지금.ext)) return 알림(`<b>${글(지금.ext.toUpperCase())} 압축 → 못 엶 (ZIP 만 됨)</b><div class="sm">알집(ALZ · EGG) · 7Z · RAR 은 보낸 분께 ZIP 으로 받기</div>`);
  알림(`<b>아직 못 여는 형식 · ${글((지금.ext || '?').toUpperCase())}</b><div class="sm">되는 것 → PDF · 한글 · 워드 · TXT · 엑셀 · PPT · HTML · 그림 · DXF · ZIP</div>`);
}
const 압축형식 = ['zip', 'alz', 'egg', '7z', 'rar'];
// ③-3 그림 — 브라우저가 그리는 것은 원본 그대로, HEIC 등은 껍데기가 JPEG 로 바꿔 줌 (/img/) · 확대 · 밀기는 PDF 와 같음
const 그림형식 = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'heif'];
const 영상형식 = ['mp4', 'mov', 'm4v', 'webm', '3gp', 'mkv'];
function 그림열기(d) {
  const 바꿈 = ['heic', 'heif'].includes(지금.ext);
  const 주소 = 폰 && 바꿈 ? `/img/${encodeURIComponent(d.id)}` : 문서주소(d);   // 아이폰 사파리는 HEIC 를 바로 그림
  const 틀 = $('#pages');
  틀.innerHTML = '<div class="pg 그림쪽" data-n="0"><span class="no">여는 중…</span></div>';
  const pg = 틀.firstChild, img = new Image();
  img.alt = ''; img.decoding = 'async';
  img.onload = () => {
    if (지금?.id !== d.id) return;
    const w = img.naturalWidth, h = img.naturalHeight;
    pg.dataset.pw = w; pg.dataset.ph = h;
    pg.querySelector('.no')?.remove();
    pg.insertAdjacentHTML('beforeend', `<div class="속"><svg class="hl" viewBox="0 0 ${w} ${h}"></svg><svg class="mk" viewBox="0 0 ${w} ${h}"></svg></div>`);
    pg.firstChild.prepend(img);
    쪽모양(pg); 쪽표시그리기(pg);
    지금.그림 = true;
    $('#vsub').textContent = `그림 · ${w}×${h}`;
    도구보이기(['rot', 'pen', 'measure']);
  };
  img.onerror = () => {
    if (지금?.id !== d.id) return;
    pg.remove();
    알림(바꿈 && !폰 && !웹 ? '<b>HEIC 는 폰에서만 열림</b><div class="sm">PC 시험 화면</div>' : '<b>그림을 못 그림 · 파일이 깨졌을 수 있음</b>');
  };
  if (웹) fetch(주소).then(r => (r.ok ? r.blob() : Promise.reject())).then(b => (img.src = URL.createObjectURL(b)), () => img.onerror());   // 아이폰 웹앱 — 보관함에서 꺼내 blob 으로 (목록으로 갈 때 놓음)
  else img.src = 주소;
  $('#vsub').textContent = '그림';
}
// ③-4 도면 (DXF) — 읽기 · 모으기 · 목록은 dxf.js · 화면은 캔버스 하나
let 도면판 = null;
async function 도면열기(d) {
  $('#reader').hidden = true; $('#flow').hidden = true; $('#cadbox').hidden = false;
  $('#vsub').textContent = 'DXF · 여는 중…';
  let buf;
  try { const r = await fetch(문서주소(d)); if (!r.ok) throw new Error(r.status === 404 ? '원본 없음' : 'HTTP ' + r.status); buf = await r.arrayBuffer(); }
  catch (e) { $('#cadbox').hidden = true; return 알림(`<b>열 수 없음</b><div class="sm">${글(e.message)}</div>`); }
  if (지금?.id !== d.id) return;
  await new Promise(r => setTimeout(r, 30));            // 「여는 중」 이 먼저 보이게
  try {
    const t0 = performance.now();
    const 읽음 = 도면.읽기(buf), 모음 = 도면.모으기(읽음), { 목록, 모자람 } = 도면.목록(모음);
    도면.상자달기(목록);
    if (지금?.id !== d.id) return;
    if (!목록.length) { $('#cadbox').hidden = true; return 알림('<b>그릴 것이 없는 도면</b><div class="sm">모델 공간이 비었거나 3D 개체만 있음</div>'); }
    도면판?.끝();
    도면판 = 도면.보기($('#cad'), {
      목록, 레이어: 모음.레이어, 돌림: 지금.돌림,
      표시: () => 지금?.표시.쪽.d || [], 표시바뀜: 일 => 표시바꿈('d', 일), 돌림요청: 돌리기,
      재기바뀜: 재기글,
      메모톡: (x, y) => 새메모('d', x, y), 그린뒤: () => 도면메모배치(), 글톡: 도면글톡, 도장톡: 도면도장톡,
    });
    도면메모그리기();
    지금.단위 = { 1: 'in', 2: 'ft', 4: 'mm', 5: 'cm', 6: 'm' }[parseInt(모음.머리?.$INSUNITS?.[70], 10)] || '';
    지금.도면 = { 레이어: 모음.레이어 };
    const 판 = { AC1009: 'R12', AC1012: 'R13', AC1014: 'R14', AC1015: '2000', AC1018: '2004', AC1021: '2007', AC1024: '2010', AC1027: '2013', AC1032: '2018' }[읽음.판] || 읽음.판;
    $('#vsub').textContent = `DXF ${판} · 개체 ${목록.length.toLocaleString()} · 레이어 ${모음.레이어.size}`;
    if (모자람) 알림(`<b>너무 큰 도면 → 일부만 그림</b><div class="sm">${모자람.toLocaleString()} 개체 생략 · 폰 메모리 보호</div>`);
    console.log('도면', Math.round(performance.now() - t0) + 'ms', 목록.length);
    도구보이기(['fit', 'layers', 'rot', 'pen', 'measure']);
  } catch (e) {
    $('#cadbox').hidden = true;
    알림(`<b>도면을 못 그림</b><div class="sm">${글(e.message)}</div>`);
  }
}
$('#fit').addEventListener('click', () => 도면판?.맞춤());
$('#layers').addEventListener('click', () => {
  const 층들 = [...(지금?.도면?.레이어?.values() || [])].filter(l => l.수 > 0).sort((a, b) => a.이름.localeCompare(b.이름, 'ko'));
  const 칩 = l => 도면.색글({ aci: l.색, 참: l.참색 }, null, true);
  판열기(`<div class="opt"><span class="lab">바탕</span><div class="seg" id="바탕고름"><button data-v="1" class="${$('#cadbox').style.background.includes('255') ? '' : 'on'}">검정</button><button data-v="0" class="${$('#cadbox').style.background.includes('255') ? 'on' : ''}">흰색</button></div></div>
    <h3>레이어 ${층들.length}</h3>
    <div class="층단추"><button class="btn plain" id="층모두">모두 켜기</button><button class="btn plain" id="층없음">모두 끄기</button></div>
    <div class="층목록">${층들.map((l, k) => `<label class="층줄"><input type="checkbox" data-k="${k}" ${l.켜짐 ? 'checked' : ''}><span class="칩" style="background:${칩(l)}"></span>${글(l.이름)}<span class="수">${l.수.toLocaleString()}</span></label>`).join('')}</div>`);
  const 다시 = () => 도면판?.다시();
  $('#sheet').querySelectorAll('input[data-k]').forEach(i => i.addEventListener('change', () => { 층들[+i.dataset.k].켜짐 = i.checked; 다시(); }));
  $('#층모두').onclick = () => { 층들.forEach(l => (l.켜짐 = true)); $('#sheet').querySelectorAll('input[data-k]').forEach(i => (i.checked = true)); 다시(); };
  $('#바탕고름').onclick = e => {                // v0.7 — 도구 줄이 넘쳐 「바탕」 단추를 여기로 옮김
    const b = e.target.closest('button'); if (!b || b.classList.contains('on') || !도면판) return;
    const 어둠 = 도면판.바탕바꾸기();
    $('#cadbox').style.background = 어둠 ? '#111418' : '#ffffff';
    $('#바탕고름').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  };
  $('#층없음').onclick = () => { 층들.forEach(l => (l.켜짐 = false)); $('#sheet').querySelectorAll('input[data-k]').forEach(i => (i.checked = false)); 다시(); };
});

function 문서주소(d) { if (d.주소) return d.주소; return 폰 ? `/doc/${encodeURIComponent(d.id)}` : 웹 ? `doc/${encodeURIComponent(d.id)}` : `_시험문서/${encodeURIComponent(d.name)}`; }   // 웹은 일꾼(sw.js)이 보관함에서 내줌
function 도구보이기(목록) {
  if (목록.length) 목록 = [...목록, ...(목록.includes('pen') ? ['copy'] : []), 'share'];   // 연 문서는 모두 「보내기」 (v0.7) · 펜이 되는 문서는 「복사」 도 (10-04)
  for (const b of document.querySelectorAll('#tools .tool')) b.hidden = !목록.includes(b.id);   // 단추를 더해도 빠짐없이 (10-03 도면 단추가 엑셀에 보이던 것)
  $('#tools').hidden = 목록.length === 0;
}

// ③-2 글 문서 (TXT · 워드 · 한글) ─────────────────
async function 글문서열기(d) {
  $('#reader').hidden = true; $('#flow').hidden = false; $('#flow').scrollTop = 0;
  const 안 = $('#flowin');
  안.innerHTML = '<p style="color:var(--sub)">여는 중…</p>';
  글설정입히기();
  let buf;
  try {
    const r = await fetch(문서주소(d));
    if (!r.ok) throw new Error(r.status === 404 ? '원본 없음' : 'HTTP ' + r.status);
    buf = await r.arrayBuffer();
  } catch (e) {
    안.innerHTML = '';
    return 알림(String(e.message).includes('원본 없음')
      ? '<b>원본 없음</b><div class="sm">목록의 ⋯ → 목록에서 빼기 → 다시 받아 열기</div>'
      : `<b>열 수 없음</b><div class="sm">${글(e.message)}</div>`);
  }
  if (지금?.id !== d.id) return;
  지금.buf = buf; 지금.글자만 = false;
  const 종류 = { txt: 'TXT', docx: '워드', hwpx: '한글', hwp: '한글 (HWP)', doc: '옛 워드 (DOC)', xlsx: '엑셀', xls: '엑셀 (XLS)', html: 'HTML', htm: 'HTML', pptx: 'PPT', ppt: '옛 PPT' }[지금.ext];
  try {
    const 결과 = await 문서[지금.ext](buf);
    if (지금?.id !== d.id) return;
    안.innerHTML = ''; 안.append(결과.틀);
    $('#vsub').textContent = 종류 + (결과.덧 ? ' · ' + 결과.덧 : '');
    if (결과.알림) 알림(`<b>${글(결과.알림)}</b>`);
    if (!안.textContent.trim() && !안.querySelector('img')) 알림('<b>글자가 없는 문서</b><div class="sm">그림만 든 문서일 수 있음</div>');
    도구보이기(['txt', 'xlsx', 'xls', 'ppt'].includes(지금.ext) ? ['find', 'size'] : 지금.ext === 'pptx' ? ['find', 'size', 'pptmode'] : ['find', 'size', 'plain']);
    if (지금.ext === 'pptx') 피피티모드글();
    자리되살리기(); 책갈피단추(); 글적어두기(d);
  } catch (e) {                                         // 모양을 못 그리면 글자만이라도
    let 글자 = '';
    try { 글자 = await 문서.글자만뽑기(지금.ext, buf); } catch (e2) {}
    if (지금?.id !== d.id) return;
    안.innerHTML = '';
    if (글자.trim()) {
      안.append(Object.assign(document.createElement('div'), { className: '글자만', textContent: 글자 }));
      지금.글자만 = true;
      알림(`<b>모양은 못 그림 → 글자만 보여 줌</b><div class="sm">${글(e.message)}</div>`);
      도구보이기(['find', 'size']);
      자리되살리기(); 책갈피단추();
    } else {
      알림(`<b>열 수 없음 · 파일이 깨졌을 수 있음</b><div class="sm">${글(e.message)}</div>`);
    }
  }
}

// 글자만 ↔ 모양대로
$('#plain').addEventListener('click', async () => {
  if (!지금?.buf) return;
  찾기닫기();
  const 안 = $('#flowin');
  if (!지금.글자만) {
    const 글자 = 안.innerText;
    흐름비우기();
    안.append(Object.assign(document.createElement('div'), { className: '글자만', textContent: 글자 }));
    지금.글자만 = true;
  } else {
    const 결과 = await 문서[지금.ext](지금.buf);
    흐름비우기(); 안.append(결과.틀);
    지금.글자만 = false;
  }
  $('#plain').classList.toggle('on', 지금.글자만);
  $('#plainlab').textContent = 지금.글자만 ? '모양대로' : '글자만';
  $('#flow').scrollTop = 0;
});

// 글씨 판 — 크기 · 줄 간격 · 글꼴 · 바탕 (폰에 기억) · 옛 판의 「흰색」 은 「기본」 으로
const 글설정 = Object.assign({ 크기: 17, 줄: 1.7, 바탕: '기본', 글꼴: '고딕' }, (() => { try { return JSON.parse(localStorage.getItem('글설정') || '{}'); } catch (e) { return {}; } })());
function 글설정입히기() {
  if (글설정.바탕 === '흰색') 글설정.바탕 = '기본';
  const 안 = $('#flowin');
  안.style.fontSize = 글설정.크기 + 'px';
  안.style.lineHeight = 글설정.줄;
  안.classList.toggle('바탕-종이', 글설정.바탕 === '종이');
  안.classList.toggle('글꼴-명조', 글설정.글꼴 === '명조');
  안.classList.toggle('바탕-어둡게', 글설정.바탕 === '어둡게' || 밤지금);   // 밤 보기 (0.9.8)
  try { localStorage.setItem('글설정', JSON.stringify(글설정)); } catch (e) {}
}
$('#size').addEventListener('click', () => {
  const 고름 = (이름, 목록, 지금값) => `<div class="seg" data-k="${이름}">${목록.map(([v, t]) => `<button data-v="${v}" class="${String(v) === String(지금값) ? 'on' : ''}">${t}</button>`).join('')}</div>`;
  판열기(`<div class="opt"><span class="lab">글씨</span><div class="step"><button data-d="-1">가−</button><span class="v" id="szv">${글설정.크기}</span><button data-d="1">가+</button></div></div>
    <div class="opt"><span class="lab">줄 간격</span>${고름('줄', [[1.4, '좁게'], [1.7, '보통'], [2.0, '넓게']], 글설정.줄)}</div>
    <div class="opt"><span class="lab">글꼴</span>${고름('글꼴', [['고딕', '고딕'], ['명조', '명조']], 글설정.글꼴)}</div>
    <div class="opt"><span class="lab">바탕</span>${고름('바탕', [['기본', '기본'], ['종이', '종이'], ['어둡게', '어둡게']], 글설정.바탕)}</div>`);
  $('#sheet').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.d) { 글설정.크기 = Math.min(28, Math.max(13, 글설정.크기 + Number(b.dataset.d))); $('#szv').textContent = 글설정.크기; }
    const seg = b.closest('.seg');
    if (seg) { 글설정[seg.dataset.k] = seg.dataset.k === '줄' ? Number(b.dataset.v) : b.dataset.v; seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }
    글설정입히기();
  };
});

// 찾기 — 낱말을 모두 칠하고 ∧ ∨ 로 옮겨 다님
let 찾은것 = [], 찾은자리 = -1, 찾기시계 = 0;
let 찾기번호 = 0;
function 칠한것지우기() {
  for (const m of $('#flowin').querySelectorAll('mark')) m.replaceWith(...m.childNodes);
  $('#flowin').normalize();
  for (const e of $('#pages').querySelectorAll('.찾은칸')) e.remove();
  찾은것 = []; 찾은자리 = -1; 찾기번호++;
}
function 찾기닫기() {
  if ($('#findbar').hidden) return;
  칠한것지우기(); $('#findbar').hidden = true; $('#vbar').hidden = false; $('#fq').value = '';
}
function 찾기하기() {
  칠한것지우기();
  const q = $('#fq').value.trim();
  if (!q) { $('#fcnt').textContent = ''; return; }
  if (지금?.쪽수) return pdf찾기(q);
  const 안 = $('#flowin'), 소문자 = q.toLowerCase();
  const 걸음 = document.createTreeWalker(안, NodeFilter.SHOW_TEXT);
  const 글마디 = []; while (걸음.nextNode()) 글마디.push(걸음.currentNode);
  for (const n of 글마디) {
    const s = n.nodeValue.toLowerCase(); let i = s.indexOf(소문자); if (i < 0) continue;
    let 남은 = n;
    let 앞 = 0;
    while (i >= 0 && 찾은것.length < 2000) {
      const 뒤 = 남은.splitText(i - 앞);
      남은 = 뒤.splitText(q.length);
      const m = document.createElement('mark'); 뒤.replaceWith(m); m.append(뒤);
      찾은것.push(m);
      앞 = i + q.length; i = s.indexOf(소문자, 앞);
    }
  }
  if (!찾은것.length) { $('#fcnt').textContent = '없음'; 찾을차례 = null; return; }
  찾아가기(찾을차례 != null ? Math.min(찾을차례, 찾은것.length - 1) : 0); 찾을차례 = null;   // 전체 찾기에서 고른 곳부터 (0.9.6)
}
function 찾아가기(k) {
  if (!찾은것.length) return;
  const 칸들 = m => (Array.isArray(m) ? m : [m]);
  if (찾은자리 >= 0) 칸들(찾은것[찾은자리]).forEach(e => e.classList.remove('cur'));
  찾은자리 = (k + 찾은것.length) % 찾은것.length;
  const m = 칸들(찾은것[찾은자리]); m.forEach(e => e.classList.add('cur'));
  if (Array.isArray(찾은것[찾은자리])) {          // PDF — 그 상자를 화면 가운데로 (쪽은 지켜보기가 그려 줌)
    const r = $('#reader'), b = m[0].getBoundingClientRect(), rb = r.getBoundingClientRect();
    r.scrollTop += b.top + b.height / 2 - (rb.top + rb.height / 2);
    r.scrollLeft += b.left + b.width / 2 - (rb.left + rb.width / 2);
  } else m[0].scrollIntoView({ block: 'center' });
  $('#fcnt').textContent = `${찾은자리 + 1} / ${찾은것.length}${찾은것.더 || 찾은것.length >= 2000 ? '+' : ''}`;
}
async function pdf찾기(q) {
  const 번호 = 찾기번호;
  $('#fcnt').textContent = '찾는 중…';
  let o;
  try { o = await 쪽길().찾기(지금.id, q); }
  catch (e) { o = { error: '깨짐', detail: (폰 || 웹 ? '' : 'PC 시험 화면 · ') + String(e.message || e) }; }
  if (번호 !== 찾기번호 || !지금?.쪽수) return;                      // 그사이 낱말을 바꿨거나 문서를 닫음
  if (o.error === '판') { $('#fcnt').textContent = ''; return 알림(`<b>PDF 안 글 찾기 → 안드로이드 15 이상에서만</b><div class="sm">이 폰 ${글(o.detail || '')}</div>`); }
  if (o.error) { $('#fcnt').textContent = '못 찾음'; return 알림(`<b>PDF 찾기 실패</b><div class="sm">${글(o.detail || o.error)}</div>`); }
  if (!o.hits.length) {
    $('#fcnt').textContent = o.text ? '없음' : '글자 없음';
    if (!o.text) 알림('<b>글자가 없는 PDF (스캔한 그림) → 찾기 안 됨</b>');
    return;
  }
  for (const h of o.hits) {
    const 속 = $('#pages').children[h.p]?.querySelector('.속'); if (!속) continue;
    찾은것.push(Object.assign(h.b.map(([l, t, r, b]) => {
      const e = document.createElement('div'); e.className = '찾은칸';
      Object.assign(e.style, { left: l * 100 + '%', top: t * 100 + '%', width: (r - l) * 100 + '%', height: (b - t) * 100 + '%' });
      속.insertBefore(e, 속.querySelector('svg.mk')); return e;
    }), { 쪽: h.p }));
  }
  찾은것.더 = o.more;
  찾아가기(찾을쪽 != null ? Math.max(0, 찾은것.findIndex(m => m.쪽 >= 찾을쪽)) : 0); 찾을쪽 = null;   // 전체 찾기에서 고른 쪽부터 (0.9.6)
}
$('#find').addEventListener('click', () => {
  $('#vbar').hidden = true; $('#findbar').hidden = false; $('#fcnt').textContent = '';
  setTimeout(() => $('#fq').focus(), 30);
});
$('#fclose').addEventListener('click', 찾기닫기);
$('#fq').addEventListener('input', () => { clearTimeout(찾기시계); 찾기시계 = setTimeout(찾기하기, 지금?.쪽수 ? 700 : 250); });   // PDF 는 쪽을 다 훑어서 조금 더 기다림
$('#fq').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); 찾은것.length ? 찾아가기(찾은자리 + 1) : 찾기하기(); } });
$('#fnext').addEventListener('click', () => 찾아가기(찾은자리 + 1));
$('#fprev').addEventListener('click', () => 찾아가기(찾은자리 - 1));
function 알림(html) { $('#note').innerHTML = `<div>${html}</div>`; $('#note').hidden = false; }

// ④ PDF ───────────────────────────────────────────
let 지켜보기 = null;
async function pdf열기(d) {
  let 정보;
  try {
    정보 = await 쪽길().정보(d.id);
  } catch (e) {
    정보 = { error: '깨짐', detail: (폰 || 웹 ? '' : 'PC 시험 화면 · ') + String(e.message || e) };
  }
  if (지금?.id !== d.id) return;
  if (정보.error === '암호') return 알림('<b>암호 걸린 PDF → 아직 못 엶</b>');
  if (정보.error === '원본 없음') return 알림('<b>원본 없음</b><div class="sm">목록의 ⋯ → 목록에서 빼기 → 다시 받아 열기</div>');
  if (정보.error) return 알림(`<b>열 수 없음 · 파일이 깨졌을 수 있음</b><div class="sm">${글(정보.detail || 정보.error)}</div>`);
  지금.쪽수 = 정보.pages;
  const ppt = 지금.쪽길 === PPT길;
  $('#vsub').textContent = ppt ? `PPT · 슬라이드 ${정보.pages}장` : `PDF · ${정보.pages}쪽`;
  도구보이기([...(정보.pages < 2 ? [] : ['goto']), 'find', 'rot', 'pen', ...(ppt ? ['pptmode'] : ['measure'])]);
  if (ppt) 피피티모드글();
  const 틀 = $('#pages');
  틀.innerHTML = 정보.sizes.map(([w, h], i) =>
    `<div class="pg" data-n="${i}" data-pw="${w}" data-ph="${h}"><span class="no">${i + 1}</span><div class="속"><svg class="hl" viewBox="0 0 ${w} ${h}"></svg><svg class="mk" viewBox="0 0 ${w} ${h}"></svg></div></div>`).join('');
  틀.querySelectorAll('.pg').forEach(p => { 쪽모양(p); 쪽표시그리기(p); });
  if (지켜보기) 지켜보기.disconnect();
  지켜보기 = new IntersectionObserver(es => {
    for (const e of es) e.isIntersecting ? 쪽그리기(e.target) : 쪽비우기(e.target);
  }, { root: $('#reader'), rootMargin: '1500px 0px' });
  틀.querySelectorAll('.pg').forEach(p => 지켜보기.observe(p));
  $('#reader').scrollTop = 0;
  자리되살리기(); 책갈피단추(); 글적어두기(d);
  지금.목차 = []; setTimeout(() => { const 그 = 지금; if (그?.id === d.id) 목차얻기(d).then(m => { if (그 === 지금) 지금.목차 = m || []; }); }, 800);   // ⑯ (0.9.8)
}
// 그릴 너비 — 옆으로 돌렸으면 쪽 틀의 «높이» 가 원래 쪽의 너비
function 쪽너비(p) {
  const k = 지금.돌림 & 1 ? p.dataset.pw / p.dataset.ph : 1;
  return Math.min(2400, Math.round($('#reader').clientWidth * 확대 * (devicePixelRatio || 1) * k));
}
function 쪽그리기(p, 다시) {
  const w = 쪽너비(p);
  let img = p.querySelector('img');
  if (img && !다시 && Number(img.dataset.w) >= w * 0.8) return;
  if (!img) { img = new Image(); img.alt = ''; img.decoding = 'async'; p.querySelector('.속').prepend(img); }
  img.dataset.w = w;
  const 못그림 = () => { 그림놓기(img); img.remove(); p.querySelector('.no').textContent = `${Number(p.dataset.n) + 1}쪽 · 못 그림`; };
  img.onerror = 못그림;
  const id = 지금.id;
  쪽길().쪽(id, Number(p.dataset.n), w).then(주소 => {
    if (!img.isConnected || 지금?.id !== id || Number(img.dataset.w) !== w) return 그림주소놓기(주소);   // 그사이 비웠거나 다시 그림
    그림놓기(img); img.src = 주소;
  }, 못그림);
}
function 쪽비우기(p) { const img = p.querySelector('img'); if (img) { 그림놓기(img); img.remove(); } }

let 칩시계 = 0;
function 칩(말) { const c = $('#chip'); c.textContent = 말; c.hidden = false; clearTimeout(칩시계); 칩시계 = setTimeout(() => (c.hidden = true), 1200); }
$('#reader').addEventListener('scroll', () => {
  if (!지금?.쪽수) return;
  const r = $('#reader'), 가운데 = r.scrollTop + r.clientHeight / 2;
  let n = 1;
  for (const p of $('#pages').children) { if (p.offsetTop <= 가운데) n = Number(p.dataset.n) + 1; else break; }
  칩(`${n} / ${지금.쪽수}${단위()}`);
  if (!$('#bmk').hidden) $('#bmk').classList.toggle('on', 책갈피쪽들().includes(n - 1));
}, { passive: true });

// ④-2 돌리기 (v0.6) — 그림 · PDF 는 쪽 틀(.pg)의 비율을 뒤집고 안쪽 틀(.속 = 그림 + 펜 표시)을 가운데에서 돌림 · 도면은 dxf.js
//   돌린 방향은 문서마다 기억 (껍데기 recent.json 줄의 「돌림」 0~3)
function 쪽모양(p) {
  const w = +p.dataset.pw, h = +p.dataset.ph, 돌 = 지금?.돌림 || 0, 속 = p.querySelector('.속');
  if (!w || !h) return;
  p.style.aspectRatio = 돌 & 1 ? `${h}/${w}` : `${w}/${h}`;
  if (!속) return;
  속.style.width = 돌 & 1 ? (100 * w / h) + '%' : '100%';
  속.style.height = 돌 & 1 ? (100 * h / w) + '%' : '100%';
  속.style.transform = `translate(-50%,-50%) rotate(${돌 * 90}deg)`;
  쪽메모그리기(p);                                    // 위치 메모는 돌지 않는 층 — 돌린 방향에 맞춰 자리만 다시
}
function 돌리기(걸음 = 1) {
  if (!지금 || !(지금.쪽수 || 지금.그림 || 도면판)) return;
  지금.돌림 = (((지금.돌림 + 걸음) % 4) + 4) % 4;
  다리.setInfo(지금.id, '돌림', String(지금.돌림));
  칩(지금.돌림 ? `↻ ${지금.돌림 * 90}°` : '↻ 처음 방향');
  if (도면판) return 도면판.돌리기(지금.돌림);
  const r = $('#reader');
  let 쪽 = null;
  for (const pg of $('#pages').children) if (pg.offsetTop + pg.offsetHeight > r.scrollTop) { 쪽 = pg; break; }
  const 비율 = 쪽 ? Math.max(0, (r.scrollTop - 쪽.offsetTop) / 쪽.offsetHeight) : 0;
  $('#pages').querySelectorAll('.pg').forEach(쪽모양);
  if (쪽) r.scrollTop = 쪽.offsetTop + 비율 * 쪽.offsetHeight;
  선명하게();
}
$('#rot').addEventListener('click', () => 돌리기(1));

// ④-2b PPT 보는 방식 (10-04 · 전무님 「둘 다 · 단추로 바꿈」) — 기본 「슬라이드 모양대로」(쪽 화면) · 「글로」(글 문서 화면)
let PPT글로 = false;
function 피피티모드글() { $('#pptmodelab').textContent = PPT글로 ? '모양대로' : '글로'; }
$('#pptmode').addEventListener('click', () => {
  if (!지금 || 지금.ext !== 'pptx') return;
  PPT글로 = !PPT글로;
  열기(지금.id, false, { 깊이: 지금.깊이, 압축에서: 지금.압축에서 });
  칩(PPT글로 ? '글로 이어 보기' : '슬라이드 모양대로');
});

// ④-3 펜 표시 (v0.6) — 원본은 안 고치고 앱 안 files/marks/<id>.json 에
//   좌표는 문서 좌표 : PDF · 그림은 쪽(안 돌린 원래 쪽) 안 0~1 비율 · 도면은 도면 좌표 → 키우기 · 돌리기 · 폴드에도 제자리
//   표시 = { v: 1, 쪽: { "<쪽 번호>": [획…], d: [획…](도면) } } · 획 = { c: 색 열쇠(pen.js), w: 굵기(쪽 너비 비율 · 도면 단위), p: [x, y, …] }
//   형광(v0.7.1)은 따로 svg(.hl) 에 그려 곱하기로 섞음 → 겹쳐 칠해도 안 진해지고 아래 글자가 또렷 · 펜(.mk)은 그 위
const 펜 = Object.assign({ 켬: false, 색: 'r', 펜색: 'r', 형광색: 'y', 지우개: false },
  (() => { try { const o = JSON.parse(localStorage.getItem('펜설정') || '{}'); return 펜색표[o.펜색] && 펜색표[o.형광색] ? { 펜색: o.펜색, 형광색: o.형광색, 색: 형광인가(o.색) ? o.형광색 : o.펜색 } : {}; } catch (e) { return {}; } })());
const 펜설정저장 = () => { try { localStorage.setItem('펜설정', JSON.stringify({ 색: 펜.색, 펜색: 펜.펜색, 형광색: 펜.형광색 })); } catch (e) {} };
let 되돌릴것 = [], 표시시계 = 0, 표시쓰기 = null, 긋기 = null;
function 표시읽기(id) {
  try { const o = JSON.parse(다리.loadMarks?.(id) || '{}'); if (o && o.쪽) return o; } catch (e) {}
  return { v: 1, 쪽: {} };
}
function 표시저장() {
  const id = 지금.id, 표시 = 지금.표시;
  clearTimeout(표시시계);
  표시쓰기 = () => { 표시시계 = 0; 표시쓰기 = null; 다리.saveMarks?.(id, Object.keys(표시.쪽).length || 표시.메모?.length ? JSON.stringify(표시) : ''); };
  표시시계 = setTimeout(표시쓰기, 400);
}
function 표시마저쓰기() { clearTimeout(표시시계); 표시쓰기?.(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) { 표시마저쓰기(); 자리적기(); } });
function 표시바꿈(열쇠, 일) {
  const 쪽 = 지금.표시.쪽, arr = (쪽[열쇠] ||= []);
  if (일.더함) arr.push(일.더함);
  if (일.뺌) { const i = arr.indexOf(일.뺌); if (i < 0) return; arr.splice(i, 1); 일 = { 뺌: 일.뺌, 자리: i }; }
  if (!arr.length) delete 쪽[열쇠];
  되돌릴것.push({ ...일, 열쇠 }); if (되돌릴것.length > 200) 되돌릴것.shift();
  표시저장(); 표시다시(열쇠); 펜판갱신();
}
function 되돌리기() {
  const 일 = 되돌릴것.pop(); if (!일) return;
  const 쪽 = 지금.표시.쪽, arr = (쪽[일.열쇠] ||= []);
  if (일.더함) { const i = arr.lastIndexOf(일.더함); if (i >= 0) arr.splice(i, 1); }
  else if (일.뺌) arr.splice(Math.min(일.자리, arr.length), 0, 일.뺌);
  else if (일.고침) Object.assign(일.고침, 일.옛);          // 도형 옮김 · 크기 · 글 고침 · 색 (0.9.4)
  if (!arr.length) delete 쪽[일.열쇠];
  표시저장(); 표시다시(일.열쇠); 펜판갱신();
}
function 표시다시(열쇠) {
  if (도면판) return 도면판.다시();
  const p = $('#pages').querySelector(`.pg[data-n="${열쇠}"]`); if (p) 쪽표시그리기(p);
}
const 수 = v => +v.toFixed(2);
function 획경로(획, W, H) {
  const p = 획.p; let s = `M${수(p[0] * W)} ${수(p[1] * H)}`;
  if (p.length === 2) s += 'l0.01 0';                       // 톡 찍은 점
  for (let k = 2; k < p.length; k += 2) s += `L${수(p[k] * W)} ${수(p[k + 1] * H)}`;
  return s;
}
function 획모양(획, W) {
  return `fill="none" stroke="${색값(획.c)}" stroke-width="${수(획.w * W)}" stroke-linecap="round" stroke-linejoin="round"`;
}
function 쪽표시그리기(p) {
  const svg = p.querySelector('svg.mk'), hl = p.querySelector('svg.hl'); if (!svg || !지금) return;
  const W = +p.dataset.pw, H = +p.dataset.ph, 획들 = 지금.표시.쪽[p.dataset.n] || [];
  const 그림 = 획 => (도장인가(획) ? 도장그림(획, W, H) : 획.t != null ? 글그림(획, W, H) : `<path d="${획경로(획, W, H)}" ${획모양(획, W)}/>`);
  svg.innerHTML = 획들.filter(획 => !형광인가(획.c)).map(그림).join('') + 손잡이그림(p, 획들, W, H);
  if (hl) hl.innerHTML = 획들.filter(획 => 형광인가(획.c)).map(그림).join('');
}
// 화면 점 → 그 쪽의 원래(안 돌린) 0~1 좌표 · 원래 쪽 너비가 화면에서 몇 화소인지
function 쪽좌표(p, x, y) {
  const b = p.getBoundingClientRect(), u = (x - b.left) / b.width, v = (y - b.top) / b.height, 돌 = 지금.돌림;
  const [a, c] = 돌 === 0 ? [u, v] : 돌 === 1 ? [v, 1 - u] : 돌 === 2 ? [1 - u, 1 - v] : [1 - v, u];
  return { x: a, y: c, 화소: 돌 & 1 ? b.height : b.width };
}
const 네자리 = v => Math.round(v * 1e4) / 1e4;
function 긋기시작(x, y) {
  const p = document.elementFromPoint(x, y)?.closest('#pages .pg');
  if (!p || !p.querySelector('svg.mk')) { 긋기 = { 없음: true }; return; }
  if (펜.지우개) { 긋기 = { 지우개: true }; 쪽지우기(x, y); return; }
  if (펜.도형) return 도형시작(p, x, y);
  const q = 쪽좌표(p, x, y);
  const 획 = { c: 펜.색, w: +(획굵기(펜.색) / q.화소).toPrecision(4), p: [네자리(q.x), 네자리(q.y)] };
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.querySelector(형광인가(펜.색) ? 'svg.hl' : 'svg.mk').append(path);
  긋기 = { p, 획, path, t: Date.now(), 화소: q.화소, 화면: [x, y] };
  긋기그림();
}
function 긋기그림() {
  const { p, 획, path } = 긋기, W = +p.dataset.pw, H = +p.dataset.ph;
  path.setAttribute('d', 획경로(획, W, H));
  if (!path.getAttribute('stroke')) for (const [, k, v] of 획모양(획, W).matchAll(/([\w-]+)="([^"]*)"/g)) path.setAttribute(k, v);
}
function 긋기이음(x, y) {
  if (!긋기 || 긋기.없음) return;
  if (긋기.지우개) return 쪽지우기(x, y);
  if (긋기.도형새 || 긋기.고침 || 긋기.글새 || 긋기.도장새) return 도형이음(x, y);
  const q = 쪽좌표(긋기.p, x, y), a = 긋기.획.p, n = a.length;
  if (Math.hypot(q.x - a[n - 2], q.y - a[n - 1]) * 긋기.화소 < 1.5) return;
  a.push(네자리(q.x), 네자리(q.y)); 긋기.화면.push(x, y); 긋기그림();
}
function 긋기끝(버림) {
  const g = 긋기; 긋기 = null;
  if (g?.고침 || g?.글새 || g?.도장새) return 도형끝(g, 버림);
  if (!g?.획) return;
  if (버림) { g.path.remove(); return; }
  if (g.도형새) {                                     // 도형 — 12 화소보다 짧으면 버림 · 그린 것은 골라 둠 (끝 동그라미)
    g.path.remove();
    if (!g.끝화면 || Math.hypot(g.끝화면[0] - g.화면[0], g.끝화면[1] - g.화면[1]) < 12) return g.후보 ? 선택바꿈(g.후보, g.p.dataset.n) : undefined;   // 톡 — 도형 선 위면 그 도형을 고름
    선택바꿈(g.획, g.p.dataset.n); return 표시바꿈(g.p.dataset.n, { 더함: g.획 });
  }
  const 곧은 = 형광인가(g.획.c) && 곧게(g.화면);              // 형광을 거의 곧게 그었으면 반듯한 줄로 (화면 기준 가로 · 세로)
  if (곧은) { const a = 쪽좌표(g.p, 곧은[0], 곧은[1]), b = 쪽좌표(g.p, 곧은[2], 곧은[3]); g.획.p = [a.x, a.y, b.x, b.y].map(네자리); }
  g.path.remove(); 표시바꿈(g.p.dataset.n, { 더함: g.획 });
}
function 쪽지우기(x, y) {                                  // 손가락 둘레 14 화소 안에 닿은 획을 통째로 뺌 (0.9.4 — 선 토막까지 · 글은 글 상자)
  const p = document.elementFromPoint(x, y)?.closest('#pages .pg'); if (!p) return;
  const q = 쪽좌표(p, x, y), W = +p.dataset.pw, H = +p.dataset.ph;
  for (const 획 of [...(지금.표시.쪽[p.dataset.n] || [])]) if (획닿음(획, q.x * W, q.y * H, W, H, 14 * W / q.화소)) 표시바꿈(p.dataset.n, { 뺌: 획 });
}
function 획닿음(획, X, Y, W, H, 둘레) {                  // X · Y · 둘레는 쪽 단위 (0~1 에 쪽 너비 · 높이를 곱한 값)
  if (도장인가(획)) { const a = 획.a; return X > Math.min(a[0], a[2]) * W - 둘레 && X < Math.max(a[0], a[2]) * W + 둘레 && Y > Math.min(a[1], a[3]) * H - 둘레 && Y < Math.max(a[1], a[3]) * H + 둘레; }   // 도장 · 서명 — 상자 안 (0.9.6)
  if (획.t != null) { const [x0, y0, x1, y1] = 글상자(획.p[0] * W, 획.p[1] * H, 획.w * W, 획.t, 획.r || 0); return X > x0 - 둘레 && X < x1 + 둘레 && Y > y0 - 둘레 && Y < y1 + 둘레; }
  const s = []; for (let k = 0; k < 획.p.length; k += 2) s.push(획.p[k] * W, 획.p[k + 1] * H);
  return 선거리(s, X, Y) < 둘레 + 획.w * W / 2;
}

// ④-3b 도형 (0.9.4 · 목업 1_읽을거리\여덟가지_목업.html ⑬) — 펜 판 「도형」 → 화살표 · 네모 · 동그라미 · 글 · 색은 펜 색
//   도형 획 = 펜 획 + f(꼴) · a(두 점 0~1) — 점 목록(p)은 pen.js 도형점 이 만듦 → 그리기 · 지우개 · 사본은 펜과 같음
//   그린 도형은 톡 → 끝 동그라미(손잡이) · 동그라미를 끌면 크기 · 선을 끌면 옮김 · 글은 끌면 옮김 · 「글」 로 톡하면 고치기
//   글 획 = { c, w: 글자 크기(쪽 너비 비율), p: [왼쪽 위 x, y], t: 글, r: 쓸 때의 돌림 } — 그 방향에서 늘 똑바로
let 도형선택 = null, 선택쪽 = null, 마지막도형 = 'a';
function 선택바꿈(획, 쪽) {
  const 옛 = 선택쪽; 도형선택 = 획 || null; 선택쪽 = 획 ? 쪽 : null;
  if (옛 != null && 옛 !== 선택쪽) 표시다시(옛);
  if (선택쪽 != null) 표시다시(선택쪽);
}
function 손잡이그림(pg, 획들, W, H) {
  if (!펜.켬 || !펜.도형 || !도형선택?.a || !획들.includes(도형선택)) return '';
  const b = pg.getBoundingClientRect(), 화 = (지금.돌림 & 1 ? b.height : b.width) || 1, r = 9 * W / 화, a = 도형선택.a;
  return [0, 1].map(e => `<circle cx="${수(a[2 * e] * W)}" cy="${수(a[2 * e + 1] * H)}" r="${수(r)}" fill="#fff" stroke="#e8743b" stroke-width="${수(r * 0.3)}"/>`).join('');
}
function 글그림(획, W, H) {
  const X = 수(획.p[0] * W), Y = 수(획.p[1] * H), fs = 획.w * W;
  return `<text x="${X}" y="${Y}" font-size="${수(fs)}" font-weight="700" font-family="Pretendard, system-ui, sans-serif" dominant-baseline="hanging" fill="${색값(획.c)}" stroke="#fff" stroke-width="${수(fs * 0.14)}" stroke-linejoin="round" paint-order="stroke" transform="rotate(${-(획.r || 0) * 90} ${X} ${Y})">${글(획.t)}</text>`;
}
function 도형다시(획, W, H) { const a = 획.a; 획.p = 도형점(도장인가(획) ? 'r' : 획.f, a[0] * W, a[1] * H, a[2] * W, a[3] * H, 획.w * W).map((v, k) => 네자리(k & 1 ? v / H : v / W)); }
function 도형잡기(pg, x, y) {
  // 고른 도형 : 끝 동그라미 → 그 끝 (크기) · 선 → 통째로 (옮김) / 「글」 : 쓴 글 → 옮김 · 톡하면 고치기
  // 안 고른 도형 선 → 후보 (톡이면 고르기만 · 끌면 새 도형 — 옆에서 그리다 남의 도형을 끄는 실수 막기)
  const q = 쪽좌표(pg, x, y), W = +pg.dataset.pw, H = +pg.dataset.ph, 단 = W / q.화소, X = q.x * W, Y = q.y * H, 획들 = 지금.표시.쪽[pg.dataset.n] || [];
  if (도형선택?.a && 획들.includes(도형선택)) {
    const a = 도형선택.a; for (const e of [0, 1]) if (Math.hypot(a[2 * e] * W - X, a[2 * e + 1] * H - Y) < 24 * 단) return { 획: 도형선택, 끝: e };
    if (획닿음(도형선택, X, Y, W, H, 12 * 단)) return { 획: 도형선택, 끝: null };
  }
  for (let i = 획들.length - 1; i >= 0; i--) {
    const 획 = 획들[i];
    if (펜.도형 === 't' ? 획.t != null : !!획.a) if (획닿음(획, X, Y, W, H, 12 * 단)) return 펜.도형 === 't' ? { 획, 끝: null } : { 후보: 획 };
  }
  return null;
}
function 도형시작(p, x, y) {
  const q = 쪽좌표(p, x, y), 잡음 = 도형잡기(p, x, y);
  if (잡음?.획) {
    const 획 = 잡음.획;
    if (획.a) 선택바꿈(획, p.dataset.n);
    긋기 = { 고침: 획, 끝: 잡음.끝, p, q0: q, 옛: { p: [...획.p], ...(획.a ? { a: [...획.a] } : {}) }, 화면: [x, y], 움직임: false };
    return;
  }
  if (도장모드()) {                                   // 도장 · 서명 — 찍은 것 위면 고르고 바로 끌어 옮길 수 있게 · 빈 곳 톡 = 찍기
    if (잡음?.후보) { const 획 = 잡음.후보; 선택바꿈(획, p.dataset.n); 긋기 = { 고침: 획, 끝: null, p, q0: q, 옛: { p: [...획.p], a: [...획.a] }, 화면: [x, y], 움직임: false }; return; }
    선택바꿈(null); 긋기 = { 도장새: true, p, q0: q, 화면: [x, y], 움직임: false }; return;
  }
  선택바꿈(null);
  if (펜.도형 === 't') { 긋기 = { 글새: true, p, q0: q, 화면: [x, y], 움직임: false }; return; }
  const 점 = [네자리(q.x), 네자리(q.y)];
  const 획 = { c: 펜.색, w: +(획굵기(펜.색) / q.화소).toPrecision(4), f: 펜.도형, a: [...점, ...점], p: [...점] };
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  p.querySelector('svg.mk').append(path);
  긋기 = { 도형새: true, p, 획, path, 화면: [x, y], t: Date.now(), 후보: 잡음?.후보 };
}
function 도형이음(x, y) {
  const g = 긋기, W = +g.p.dataset.pw, H = +g.p.dataset.ph, q = 쪽좌표(g.p, x, y);
  if (Math.hypot(x - g.화면[0], y - g.화면[1]) > 8) g.움직임 = true;
  if (g.글새 || g.도장새) return;
  if (g.도형새) { const 획 = g.획; 획.a[2] = 네자리(q.x); 획.a[3] = 네자리(q.y); 도형다시(획, W, H); g.끝화면 = [x, y]; return 긋기그림(); }
  if (!g.움직임) return;
  const 획 = g.고침, dx = q.x - g.q0.x, dy = q.y - g.q0.y;
  if (획.a) {
    if (g.끝 != null) { 획.a = [...획.a]; 획.a[2 * g.끝] = 네자리(q.x); 획.a[2 * g.끝 + 1] = 네자리(q.y); }
    else 획.a = g.옛.a.map((v, k) => 네자리(v + (k & 1 ? dy : dx)));
    도형다시(획, W, H);
  } else 획.p = g.옛.p.map((v, k) => 네자리(v + (k & 1 ? dy : dx)));
  쪽표시그리기(g.p);
}
function 도형끝(g, 버림) {
  if (g.도장새) { if (!버림 && !g.움직임) 도장놓기(g.p, g.q0); return; }
  if (g.글새) { if (!버림 && !g.움직임) 글판(g.p.dataset.n, [네자리(g.q0.x), 네자리(g.q0.y)], null, g.q0.화소); return; }
  const 획 = g.고침;
  if (버림 || !g.움직임) {
    Object.assign(획, g.옛);
    if (!버림 && 획.t != null && 펜.도형 === 't') 글판(g.p.dataset.n, null, 획, g.q0.화소);   // 「글」 로 쓴 글을 톡 → 고치기
    return 쪽표시그리기(g.p);
  }
  표시바꿈(g.p.dataset.n, { 고침: 획, 옛: g.옛 });
}
// 글 넣기 · 고치기 판 — 단위 = 쪽은 쪽 너비의 화면 화소 · 도면은 배 (글자 크기 화소 ÷ 단위 = 저장하는 크기)
const 글크기 = { 작게: 14, 보통: 20, 크게: 28 };
let 글크기고름 = '보통';
function 글판(열쇠, 자리, 옛획, 단위) {
  const 가까운 = v => Object.keys(글크기).reduce((a, k) => (Math.abs(글크기[k] - v) < Math.abs(글크기[a] - v) ? k : a), '보통');
  let 고른 = 옛획 ? 가까운(옛획.w * 단위) : 글크기고름, 바꿈 = false;
  판열기(`<h3>${옛획 ? '글 고치기' : '글 넣기'} <span class="흐림">· 문서 위에 바로</span></h3>
    <div class="row"><input id="txtin" type="text" maxlength="80" placeholder="예 : D25 → D29 로" enterkeyhint="done" autocomplete="off"></div>
    <div class="opt"><span class="lab">크기</span><div class="seg" id="txtsz">${Object.keys(글크기).map(k => `<button data-v="${k}" class="${k === 고른 ? 'on' : ''}">${k}</button>`).join('')}</div></div>
    <div class="row 끝줄">${옛획 ? '<button class="btn plain warn" id="txtdel">지우기</button>' : ''}<span style="flex:1"></span><button class="btn plain" onclick="판닫기()">닫기</button><button class="btn" id="txtok">${옛획 ? '고치기' : '넣기'}</button></div>`);
  const 칸 = $('#txtin'); 칸.value = 옛획?.t || '';
  $('#txtsz').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; 고른 = 글크기고름 = b.dataset.v; 바꿈 = true; $('#txtsz').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
  const 굵 = () => +(글크기[고른] / 단위).toPrecision(4);
  const 빼기 = () => { 판닫기(); 표시바꿈(열쇠, { 뺌: 옛획 }); };
  const 넣기 = () => {
    const t = 칸.value.replace(/\s+/g, ' ').trim();
    if (!t) return 옛획 ? 빼기() : 칸.focus();
    판닫기();
    if (옛획) { const 옛 = { t: 옛획.t, w: 옛획.w }; Object.assign(옛획, { t, ...(바꿈 ? { w: 굵() } : {}) }); 표시바꿈(열쇠, { 고침: 옛획, 옛 }); }
    else 표시바꿈(열쇠, { 더함: { c: 펜.색, w: 굵(), p: 자리, t, r: 지금.돌림 } });
  };
  $('#txtok').onclick = 넣기;
  if ($('#txtdel')) $('#txtdel').onclick = 빼기;
  칸.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); 넣기(); } };
  setTimeout(() => { 칸.focus(); 칸.setSelectionRange(칸.value.length, 칸.value.length); }, 60);
}
// ④-3c 도장 · 서명 (0.9.6 ⑫) — 펜 판 「도장」 → 위 줄에서 고르고 톡 · 이름 · 서명은 이 폰에만 (localStorage 「도장설정」 · 「도장서명」)
const 도장모드 = () => 펜.도형 === 's' || 펜.도형 === 'g';
function 도장설정() { try { return Object.assign({ 이름: '', 글들: ['검토필', '확인'] }, JSON.parse(localStorage.getItem('도장설정') || '{}')); } catch (e) { return { 이름: '', 글들: ['검토필', '확인'] }; } }
function 도장설정저장(o) { try { localStorage.setItem('도장설정', JSON.stringify(o)); } catch (e) {} }
function 서명읽기() { try { return JSON.parse(localStorage.getItem('도장서명') || 'null'); } catch (e) { return null; } }
const 오늘글 = () => { const d = new Date(); return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}`; };
function 도장획() {
  if (펜.도형 === 'g') return { c: 'k', f: 'g', 획: 서명읽기()?.획 || [] };
  return { c: 'r', f: 's', s: 펜.도장글 || '검토필', 날: 오늘글(), 이름: 도장설정().이름 || '' };
}
const 도장크기 = () => (펜.도형 === 'g' ? [150, 60] : [120, 78]);      // 화면 화소 (가로 · 세로)
function 도장놓기(pg, q) {
  const W = +pg.dataset.pw, H = +pg.dataset.ph, [bw, bh] = 도장크기(), 돌 = 지금.돌림, [uw, uh] = 돌 & 1 ? [bh, bw] : [bw, bh];
  const nx = uw / q.화소 / 2, ny = uh * W / (q.화소 * H) / 2;
  const 획 = 도장획(); 획.a = [q.x - nx, q.y - ny, q.x + nx, q.y + ny].map(네자리); 획.r = 돌; 획.w = +(3 / q.화소).toPrecision(4);
  도형다시(획, W, H);
  선택바꿈(획, pg.dataset.n); 표시바꿈(pg.dataset.n, { 더함: 획 });
}
function 도면도장톡(x, y, 배) {
  const [bw, bh] = 도장크기(), 돌 = 지금.돌림, [uw, uh] = (돌 & 1 ? [bh, bw] : [bw, bh]).map(v => v / 배 / 2);
  const 획 = 도장획(); 획.a = [x - uw, y - uh, x + uw, y + uh].map(v => +v.toPrecision(9)); 획.r = 돌; 획.w = 3 / 배;
  획.p = 도형점('r', ...획.a, 획.w).map(v => +v.toPrecision(9));
  표시바꿈('d', { 더함: 획 });
}
function 도장그림(획, W, H) {                               // 쪽 svg — 도장캔버스(pen.js)와 같은 모양
  const a = 획.a, x0 = Math.min(a[0], a[2]) * W, x1 = Math.max(a[0], a[2]) * W, y0 = Math.min(a[1], a[3]) * H, y1 = Math.max(a[1], a[3]) * H;
  const cx = 수((x0 + x1) / 2), cy = 수((y0 + y1) / 2), r = 획.r || 0;
  let w = x1 - x0, h = y1 - y0; if (r & 1) [w, h] = [h, w];
  let 속 = '';
  if (획.f === 's') {
    const 굵 = Math.max(0.5, h * 0.045);
    속 = `<rect x="${수(cx - w / 2 + 굵 / 2)}" y="${수(cy - h / 2 + 굵 / 2)}" width="${수(w - 굵)}" height="${수(h - 굵)}" rx="${수(h * 0.08)}" fill="rgba(255,255,255,.35)" stroke="#d6262b" stroke-width="${수(굵)}"/>`
      + 도장줄(획, w, h).map(z => `<text x="${cx}" y="${수(cy + z.y)}" font-size="${수(z.크기)}" font-weight="${z.굵}" text-anchor="middle" dominant-baseline="central" fill="#d6262b" font-family="Pretendard, system-ui, sans-serif">${글(z.글)}</text>`).join('');
  } else {
    속 = (획.획 || []).map(s => { let d = ''; for (let k = 0; k < s.length; k += 2) d += `${k ? 'L' : 'M'}${수(cx - w / 2 + s[k] * w)} ${수(cy - h / 2 + s[k + 1] * h)}`; if (s.length === 2) d += 'l0.01 0'; return `<path d="${d}" fill="none" stroke="${색값('k')}" stroke-width="${수(Math.max(0.5, h * 0.045))}" stroke-linecap="round" stroke-linejoin="round"/>`; }).join('');
  }
  return `<g transform="rotate(${-r * 90} ${cx} ${cy})">${속}</g>`;
}
function 도장줄그리기() {
  const 설 = 도장설정(), 서명 = 서명읽기();
  $('#stampbar').innerHTML = 설.글들.map(t => `<button data-s="${글(t)}" class="${펜.도형 === 's' && 펜.도장글 === t ? 'on' : ''}"><span class="도장꼴">${글(t)}</span></button>`).join('')
    + `<button data-g class="${펜.도형 === 'g' ? 'on' : ''}"><span class="서명꼴">${서명 ? '서명' : '서명 그리기'}</span></button><button data-new>＋ 도장 · 이름</button>`;
}
$('#stampbar').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.hasAttribute('data-new')) return 도장설정판();
  if (b.hasAttribute('data-g')) { if (!서명읽기()) return 서명판(() => 도장고름('g')); return 도장고름('g'); }
  const t = b.dataset.s; if (!도장설정().이름) return 도장설정판(() => 도장고름('s', t), true);
  도장고름('s', t);
});
function 도장고름(f, t) {
  펜.도형 = f; if (t) 펜.도장글 = t; 펜.지우개 = false; 펜.메모 = false;
  if (도형선택) 선택바꿈(null);
  칩(f === 'g' ? '서명 찍을 곳을 톡' : `「${t}」 찍을 곳을 톡 · 찍은 것은 끌어 옮김`);
  도면판?.펜({ ...펜 }); 펜판갱신();
}
function 도장설정판(다음, 이름먼저) {
  const 설 = 도장설정();
  판열기(`<h3>${이름먼저 ? '도장에 넣을 이름' : '도장 · 이름 · 서명'} <span class="흐림">· 이 폰에만 저장</span></h3>
    <div class="opt"><span class="lab">이름</span><input id="stname" type="text" maxlength="12" placeholder="예 : 홍길동" style="flex:1"></div>
    ${이름먼저 ? '' : `<div class="도장목록" id="stlist">${설.글들.map((t, k) => `<span>${글(t)}<button data-k="${k}" aria-label="빼기">×</button></span>`).join('')}</div>
    <div class="row"><input id="stnew" type="text" maxlength="8" placeholder="새 도장 글 (예 : 보완 필요)" enterkeyhint="done"></div>
    <button class="act" id="stsign">✍ 서명 ${서명읽기() ? '다시 그리기' : '그리기'}</button>`}
    <div class="row 끝줄"><span style="flex:1"></span><button class="btn plain" onclick="판닫기()">닫기</button><button class="btn" id="stok">저장</button></div>
    <div class="판설명">도장 = 글 · 오늘 날짜 · 이름 · 원본은 안 고침 · 전자서명 아님 (보기 표시)</div>`);
  $('#stname').value = 설.이름 || '';
  $('#stlist')?.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; 설.글들.splice(+b.dataset.k, 1); b.parentElement.remove(); $('#stlist').querySelectorAll('[data-k]').forEach((x, k) => (x.dataset.k = k)); });
  if ($('#stsign')) $('#stsign').onclick = () => { 설.이름 = $('#stname').value.trim(); 도장설정저장(설); 서명판(() => 도장고름('g')); };
  $('#stok').onclick = () => {
    설.이름 = $('#stname').value.replace(/\s+/g, ' ').trim();
    const 새 = $('#stnew')?.value.replace(/\s+/g, ' ').trim(); if (새 && !설.글들.includes(새)) 설.글들.push(새);
    if (!설.글들.length) 설.글들 = ['검토필'];
    if (이름먼저 && !설.이름) return $('#stname').focus();
    도장설정저장(설); 판닫기(); 도장줄그리기(); 다음?.();
  };
  setTimeout(() => $('#stname').focus(), 60);
}
function 서명판(다음) {                                    // 한 번 그려 이 폰에 저장 — 0~1 선들
  판열기(`<h3>서명 그리기 <span class="흐림">· 이 폰에만 저장</span></h3><canvas class="서명판" id="signpad"></canvas>
    <div class="row 끝줄"><button class="btn plain" id="signclear">지우고 다시</button><span style="flex:1"></span><button class="btn plain" onclick="판닫기()">닫기</button><button class="btn" id="signok">저장</button></div>`);
  const c = $('#signpad'), 선들 = []; let 지금선 = null;
  const 맞춤 = () => { const r = c.getBoundingClientRect(), d = devicePixelRatio || 1; c.width = Math.round(r.width * d); c.height = Math.round(r.height * d); 그림(); };
  const 그림 = () => {
    const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height);
    x.strokeStyle = '#1b1f24'; x.lineWidth = c.height * 0.035; x.lineCap = 'round'; x.lineJoin = 'round';
    for (const s of 선들) { x.beginPath(); for (let k = 0; k < s.length; k += 2) { const X = s[k] * c.width, Y = s[k + 1] * c.height; if (k) x.lineTo(X, Y); else x.moveTo(X, Y); } if (s.length === 2) x.lineTo(s[0] * c.width + 0.5, s[1] * c.height); x.stroke(); }
  };
  const 점 = e => { const r = c.getBoundingClientRect(); return [네자리(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))), 네자리(Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)))]; };
  c.onpointerdown = e => { try { c.setPointerCapture(e.pointerId); } catch (x) {} 지금선 = 점(e); 선들.push(지금선); 그림(); };
  c.onpointermove = e => { if (!지금선) return; 지금선.push(...점(e)); 그림(); };
  c.onpointerup = c.onpointercancel = () => { 지금선 = null; };
  $('#signclear').onclick = () => { 선들.length = 0; 그림(); };
  $('#signok').onclick = () => { if (!선들.length) return; try { localStorage.setItem('도장서명', JSON.stringify({ 획: 선들 })); } catch (e) {} 판닫기(); 도장줄그리기(); 다음?.(); };
  setTimeout(맞춤, 30);
}
function 도면글톡(x, y, 배) {                              // 도면 — 「글」 로 톡 : 쓴 글 위면 고치기 · 빈 곳이면 새 글
  const 찾음 = [...(지금.표시.쪽.d || [])].reverse().find(획 => {
    if (획.t == null) return false;
    const [x0, y0, x1, y1] = 글상자(획.p[0], -획.p[1], 획.w, 획.t, 획.r || 0);
    return x > x0 && x < x1 && -y > y0 && -y < y1;
  });
  글판('d', [+x.toPrecision(9), +y.toPrecision(9)], 찾음 || null, 배);
}
function 펜판갱신() {
  $('#penbar').hidden = !펜.켬;
  if (!펜.켬) $('#penpal').hidden = true;
  $('#pen').classList.toggle('on', 펜.켬);
  const 형광 = 형광인가(펜.색);
  for (const b of $('#penbar').querySelectorAll('[data-m]')) b.classList.toggle('on', 펜.메모 ? b.dataset.m === '메모' : 펜.도형 ? b.dataset.m === (도장모드() ? '도장' : '도형') : !펜.지우개 && !['메모', '도형', '도장'].includes(b.dataset.m) && (b.dataset.m === '형광') === 형광);
  $('#shapebar').hidden = !펜.켬 || !펜.도형 || 도장모드();
  if ($('#stampbar').hidden !== !(펜.켬 && 도장모드())) { $('#stampbar').hidden = !(펜.켬 && 도장모드()); if (!$('#stampbar').hidden) 도장줄그리기(); }
  else if (!$('#stampbar').hidden) 도장줄그리기();
  for (const b of $('#shapebar').querySelectorAll('[data-f]')) b.classList.toggle('on', b.dataset.f === 펜.도형);
  $('#penbar').classList.toggle('메모중', !!펜.메모);
  $('#pencolordot').style.background = 색값(펜.색);
  $('#pencolordot').classList.toggle('형광점', 형광);
  $('#pencolor').setAttribute('aria-label', `색 고르기 · 지금 ${펜색표[펜.색][0]}`);
  $('#pencolor').classList.toggle('꺼짐', 펜.지우개);
  $('#eraser').classList.toggle('on', 펜.지우개);
  $('#undo').disabled = !되돌릴것.length;
  if (!$('#penpal').hidden) 색줄그리기();
}
function 색줄그리기() {                               // 펜이면 7색 · 형광이면 6색
  const 형광 = 형광인가(펜.색), 줄 = 형광 ? 형광들 : 펜들;
  $('#penpal').innerHTML = 줄.map(c => `<button class="펜색${c === 펜.색 ? ' on' : ''}" data-c="${c}" aria-label="${펜색표[c][0]}"><i class="${형광 ? '형광점' : ''}" style="background:${색값(c)}"></i><span>${펜색표[c][0]}</span></button>`).join('');
}
function 펜끄기() { 펜.켬 = false; 펜.지우개 = false; 펜.메모 = false; 펜.도형 = null; 긋기 = null; if (도형선택) 선택바꿈(null); 도면판?.펜({ ...펜 }); 펜판갱신(); 손모드(); }
$('#pen').addEventListener('click', () => {
  if (펜.켬) return 펜끄기();
  if (!$('#measbar').hidden) 재기끄기();
  펜.켬 = true; 펜.지우개 = false; 도면판?.펜({ ...펜 }); 펜판갱신(); 손모드();
  칩('한 손가락 긋기 · 두 손가락 밀기');
});
$('#penpal').addEventListener('click', e => {
  const b = e.target.closest('[data-c]'); if (!b) return;
  펜.색 = b.dataset.c; 형광인가(펜.색) ? (펜.형광색 = 펜.색) : (펜.펜색 = 펜.색); 펜.지우개 = false;
  if (펜.도형 && 도형선택 && 선택쪽 != null && 도형선택.c !== 펜.색) { const 옛 = { c: 도형선택.c }; 도형선택.c = 펜.색; 표시바꿈(선택쪽, { 고침: 도형선택, 옛 }); }   // 고른 도형 색도 (0.9.4)
  $('#penpal').hidden = true; 펜설정저장();
  도면판?.펜({ ...펜 }); 펜판갱신();
});
$('#penbar').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.m === '메모') {                       // 위치 메모 (memo.js) — 톡한 자리에 메모
    펜.메모 = true; 펜.도형 = null; 펜.지우개 = false; $('#penpal').hidden = true; 긋기 = null;
    칩('메모 넣을 곳을 톡 · 쪽지는 끌어 옮김');
  }
  else if (b.dataset.m === '도장') {                  // 도장 · 서명 (0.9.6) — 위 줄에서 고르고 톡
    $('#penpal').hidden = true; 긋기 = null;
    if (!도장모드()) { const t = 펜.도장글 || 도장설정().글들[0] || '검토필'; if (!도장설정().이름) { 펜.도형 = 's'; 펜.도장글 = t; 펜판갱신(); return 도장설정판(() => 도장고름('s', t), true); } return 도장고름('s', t); }
  }
  else if (b.dataset.m === '도형') {                  // 도형 (0.9.4) — 위에 작은 줄 · 색은 펜 색
    if (도장모드()) 펜.도형 = null;
    펜.도형 = 펜.도형 || 마지막도형; 펜.메모 = false; 펜.지우개 = false; $('#penpal').hidden = true; 긋기 = null;
    if (형광인가(펜.색)) { 펜.색 = 펜.펜색; 펜설정저장(); }
    칩(펜.도형 === 't' ? '글 넣을 곳을 톡' : '끌어서 그림 · 그린 것은 톡 → 옮기기 · 크기');
  }
  else if (b.dataset.m) {                              // 펜 ↔ 형광 — 각자 마지막 색으로
    const 형광 = b.dataset.m === '형광', 메모였음 = 펜.메모 || !!펜.도형; 펜.메모 = false; 펜.도형 = null;
    if (형광인가(펜.색) === 형광 && !펜.지우개 && !메모였음) { $('#penpal').hidden = !$('#penpal').hidden; if (!$('#penpal').hidden) 색줄그리기(); return; }
    펜.색 = 형광 ? 펜.형광색 : 펜.펜색; 펜.지우개 = false; $('#penpal').hidden = true; 펜설정저장();
  }
  else if (b.id === 'pencolor') { 펜.지우개 = false; 펜.메모 = false; $('#penpal').hidden = !$('#penpal').hidden; 색줄그리기(); }
  else if (b.id === 'eraser') { 펜.지우개 = !펜.지우개; 펜.메모 = false; 펜.도형 = null; $('#penpal').hidden = true; }
  else if (b.id === 'undo') 되돌리기();
  else if (b.id === 'penoff') return 펜끄기();
  if (!펜.도형 && 도형선택) 선택바꿈(null);
  도면판?.펜({ ...펜 }); 펜판갱신();
});
$('#shapebar').addEventListener('click', e => {
  const b = e.target.closest('[data-f]'); if (!b) return;
  펜.도형 = 마지막도형 = b.dataset.f; 펜.지우개 = false; 펜.메모 = false;
  if (펜.도형 === 't' && 도형선택) 선택바꿈(null);
  칩(펜.도형 === 't' ? '글 넣을 곳을 톡 · 쓴 글을 톡 → 고치기' : '끌어서 그림');
  도면판?.펜({ ...펜 }); 펜판갱신();
});

// ④-4 쪽 목록 (v0.7) — 쪽 그림을 줄줄이 · 누르면 그 쪽으로 · 위에 번호 넣고 이동 · 펜 표시 있는 쪽은 ✏
let 쪽목록지켜봄 = null;
function 보는쪽() {
  const r = $('#reader'), 가운데 = r.scrollTop + r.clientHeight / 2; let n = 0;
  for (const p of $('#pages').children) { if (p.offsetTop <= 가운데) n = Number(p.dataset.n); else break; }
  return n;
}
function 쪽으로(n) {
  const p = $('#pages').children[Math.min(지금.쪽수 - 1, Math.max(0, n))];
  if (p) { $('#reader').scrollTop = p.offsetTop - 10; 칩(`${Number(p.dataset.n) + 1} / ${지금.쪽수}${단위()}`); }
}
function 쪽목록열기() {
  if (!지금?.쪽수) return;
  const N = 지금.쪽수, 지금쪽 = 보는쪽(), 그리드 = $('#tgrid'), 책 = new Set(책갈피쪽들());
  history.pushState({ v: 'thumbs' }, '');
  $('#thumbs').hidden = false;
  $('#tsub').textContent = `${N}${단위()} · 지금 ${지금쪽 + 1}${단위()}`;
  $('#tn').max = N; $('#tn').value = '';
  그리드.innerHTML = [...$('#pages').children].map(pg => {
    const n = Number(pg.dataset.n);
    return `<button class="썸${n === 지금쪽 ? ' 지금' : ''}" data-n="${n}"><div class="썸틀" data-pw="${pg.dataset.pw}" data-ph="${pg.dataset.ph}"><div class="속"></div></div><span class="썸번호">${n + 1}${지금.표시.쪽[n] ? ' <i>✏</i>' : ''}${(지금.표시.메모 || []).some(m => m.k === String(n)) ? ' 📝' : ''}${책.has(n) ? ' <b class="책">🔖</b>' : ''}</span></button>`;
  }).join('');
  쪽목록보기 = '모두'; 쪽목록칩();
  그리드.querySelectorAll('.썸틀').forEach(쪽모양);
  쪽목록지켜봄?.disconnect();
  쪽목록지켜봄 = new IntersectionObserver(es => {
    for (const e of es) {
      if (!e.isIntersecting || e.target.querySelector('img')) continue;
      const 틀 = e.target, im = new Image(); im.alt = ''; im.decoding = 'async';
      const w = Math.round(Math.min(600, 틀.clientWidth * (devicePixelRatio || 1) * (지금.돌림 & 1 ? 틀.dataset.pw / 틀.dataset.ph : 1)));
      im.onerror = () => { 그림놓기(im); im.remove(); };
      틀.firstChild.append(im);
      쪽길().쪽(지금.id, Number(틀.parentNode.dataset.n), Math.max(200, w)).then(주소 => (im.isConnected ? (im.src = 주소) : 그림주소놓기(주소)), () => im.remove());
    }
  }, { root: 그리드, rootMargin: '400px 0px' });
  그리드.querySelectorAll('.썸틀').forEach(t => 쪽목록지켜봄.observe(t));
  그리드.querySelector('.지금')?.scrollIntoView({ block: 'center' });
}
// 쪽 목록 위 칩 「모든 쪽 · 🔖 3 · 목차 18 · 표시 7」 (10-05 · 0.9.8) — 있는 것만
//   목차 = PDF 책갈피(⑯ · 갤럭시 pdfmok.js · 웹 pdf.js) · 표시 = 쪽지 · 책갈피 · 펜 · 메모 · 글 · 도장을 쪽 차례로 (⑥)
let 쪽목록보기 = '모두';
function 표시목록() {
  const 줄 = [], 단 = 단위();
  if (지금.d.메모) 줄.push({ 아: '📝', 글: '쪽지 · ' + 지금.d.메모.split('\n')[0].slice(0, 40), 쪽: null });
  for (const n of 책갈피쪽들()) 줄.push({ 아: '🔖', 글: '책갈피', 쪽: n });
  for (const [k, 획들] of Object.entries(지금.표시.쪽 || {})) {
    if (k === 'd') continue; const n = Number(k), 셈 = {};
    for (const g of 획들) {
      if (g.f === 's') 줄.push({ 아: '印', 색: '#d6262b', 글: `도장 · ${g.s || ''} ${g.날 || ''}`, 쪽: n });
      else if (g.f === 'g') 줄.push({ 아: '✍', 글: '서명', 쪽: n });
      else if (g.t != null) 줄.push({ 아: 'T', 색: 색값(g.c), 글: '글 · ' + g.t, 쪽: n });
      else { const 이름 = g.f ? '도형' : 형광인가(g.c) ? '형광' : '펜'; 셈[이름] = (셈[이름] || 0) + 1; }
    }
    const 요약 = Object.entries(셈).map(([a, b]) => `${a} ${b}`).join(' · ');
    if (요약) 줄.push({ 아: '✎', 색: '#e5383b', 글: 요약, 쪽: n });
  }
  for (const m of 지금.표시.메모 || []) if (m.k !== 'd') 줄.push({ 아: '📍', 글: '메모 · ' + String(m.글 || '').split('\n')[0].slice(0, 40), 쪽: Number(m.k) });
  줄.sort((a, b) => (a.쪽 ?? -1) - (b.쪽 ?? -1));
  return 줄.map(x => ({ ...x, 쪽글: x.쪽 == null ? '문서' : `${x.쪽 + 1}${단}` }));
}
function 쪽목록칩() {
  const 책 = new Set(책갈피쪽들()), 목 = 지금.목차 || [], 표 = 표시목록(), k = $('#tkinds');
  if ((쪽목록보기 === '책' && !책.size) || (쪽목록보기 === '목차' && !목.length) || (쪽목록보기 === '표시' && !표.length)) 쪽목록보기 = '모두';
  const 칩 = (t, 글) => `<button class="칩${쪽목록보기 === t ? ' on' : ''}" data-t="${t}">${글}</button>`;
  k.innerHTML = 칩('모두', `모든 ${단위()} <i>${지금.쪽수}</i>`) + (책.size ? 칩('책', `🔖 <i>${책.size}</i>`) : '') + (목.length ? 칩('목차', `목차 <i>${목.length}</i>`) : '') + (표.length ? 칩('표시', `표시 <i>${표.length}</i>`) : '');
  k.hidden = !책.size && !목.length && !표.length;
  const 목록칸 = 쪽목록보기 === '목차' || 쪽목록보기 === '표시';
  $('#tgrid').hidden = 목록칸; $('#tlist').hidden = !목록칸;
  $('#tgrid').querySelectorAll('.썸').forEach(b => (b.style.display = 쪽목록보기 === '책' && !책.has(Number(b.dataset.n)) ? 'none' : ''));
  if (쪽목록보기 === '목차') $('#tlist').innerHTML = 목.map(x => `<button class="목줄 깊${Math.min(3, x.깊이)}" data-n="${x.쪽 ?? ''}"><span class="글">${글(x.글)}</span><span class="쪽번">${x.쪽 == null ? '' : `${x.쪽 + 1}${단위()}`}</span></button>`).join('');
  if (쪽목록보기 === '표시') $('#tlist').innerHTML = 표.map(x => `<button class="목줄" data-n="${x.쪽 ?? ''}"><span class="아"${x.색 ? ` style="color:${x.색}"` : ''}>${x.아}</span><span class="글">${글(x.글)}</span><span class="쪽번">${x.쪽글}</span></button>`).join('');
}
$('#tkinds').addEventListener('click', e => { const c = e.target.closest('[data-t]'); if (!c) return; 쪽목록보기 = c.dataset.t; 쪽목록칩(); $('#tgrid').scrollTop = 0; $('#tlist').scrollTop = 0; });
$('#tlist').addEventListener('click', e => { const b = e.target.closest('[data-n]'); if (!b) return; if (b.dataset.n === '') { 쪽목록닫기(); if (history.state?.v === 'thumbs') history.back(); return 쪽지보이기(); } 쪽목록에서(Number(b.dataset.n)); });
async function 목차얻기(d) {                                 // ⑯ PPT 는 없음 · 웹은 pdf.js · 갤럭시 · PC 는 pdfmok.js
  if (String(d.ext).toLowerCase() !== 'pdf') return [];
  if (PDF길.목차) return PDF길.목차(d.id).catch(() => []);
  const r = await fetch(문서주소(d)).catch(() => null); if (!r?.ok) return [];
  return PDF목차.읽기(new Uint8Array(await r.arrayBuffer()));
}
function 쪽목록닫기() {
  if ($('#thumbs').hidden) return;
  $('#thumbs').hidden = true; 쪽목록지켜봄?.disconnect();
  $('#tgrid').querySelectorAll('img').forEach(그림놓기); $('#tgrid').innerHTML = '';
}
function 쪽목록에서(n) { 쪽목록닫기(); if (history.state?.v === 'thumbs') history.back(); 쪽으로(n); }
$('#goto').addEventListener('click', 쪽목록열기);
$('#tgrid').addEventListener('click', e => { const b = e.target.closest('.썸'); if (b) 쪽목록에서(Number(b.dataset.n)); });
$('#tclose').addEventListener('click', () => history.state?.v === 'thumbs' ? history.back() : 쪽목록닫기());
const 번호로 = () => { const n = parseInt($('#tn').value, 10); if (n >= 1) 쪽목록에서(Math.min(지금.쪽수, n) - 1); };
$('#tgo').addEventListener('click', 번호로);
$('#tn').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); 번호로(); } });

// ④-4b 직전 자리 (10-05 · 0.9.3 · 목업 1_읽을거리\여덟가지_목업.html 승인 「바로 그 자리 + 알림」)
//   다시 열면 보던 쪽 · 확대 · 글 문서 스크롤 · 엑셀 시트 그대로 · recent 줄 「자리」 칸 (JSON 글)
//   쪽 문서 { p: 맨 위 쪽(0부터), r: 그 쪽 안 비율, c: 가운데 쪽(목록에 보임), n: 쪽수, z: 확대, x: 옆 비율 } · 글 문서 { f: 스크롤 비율, s: 시트 }
//   맨 앞이면 칸을 지움 · 다 그리기 전에 닫으면 안 적음 (지금.자리됨) · 그림 · 도면은 안 함
function 자리읽기(d) { try { return JSON.parse(d?.자리 || 'null'); } catch (e) { return null; } }
function 자리적기() {
  if (!지금?.자리됨) return;
  const r = $('#reader'), f = $('#flow');
  let o = null;
  if (지금.쪽수 && !r.hidden) {
    let 쪽 = null;
    for (const pg of $('#pages').children) if (pg.offsetTop + pg.offsetHeight > r.scrollTop) { 쪽 = pg; break; }
    if (!쪽 || !쪽.offsetHeight) return;
    const p = Number(쪽.dataset.n), 비 = Math.max(0, (r.scrollTop - 쪽.offsetTop) / 쪽.offsetHeight), 옆 = r.scrollWidth - r.clientWidth;
    if (p > 0 || 비 > 0.02 || Math.abs(확대 - 1) > 0.01) o = { p, r: +비.toFixed(4), c: 보는쪽(), n: 지금.쪽수, ...(Math.abs(확대 - 1) > 0.01 ? { z: +확대.toFixed(3), x: 옆 > 0 ? +(r.scrollLeft / 옆).toFixed(4) : 0 } : {}) };
  } else if (!f.hidden) {
    const 끝 = f.scrollHeight - f.clientHeight, 비 = 끝 > 0 ? f.scrollTop / 끝 : 0;
    const 시트 = [...$('#flowin').querySelectorAll('.시트탭 button')].findIndex(b => b.classList.contains('on'));
    if (비 > 0.01 || 시트 > 0) o = { f: +비.toFixed(4), ...(시트 > 0 ? { s: 시트 } : {}) };
  } else return;
  const 새 = o ? JSON.stringify(o) : '';
  if (새 === (지금.d.자리 || '')) return;
  지금.d.자리 = 새 || undefined;
  다리.setInfo(지금.id, '자리', 새);
}
function 자리되살리기() {
  if (!지금) return;
  지금.자리됨 = true;
  const o = 자리읽기(지금.d); if (!o) return;
  if (지금.쪽수 && o.p != null && !$('#reader').hidden) {
    const pg = $('#pages').children[Math.min(지금.쪽수 - 1, o.p)], r = $('#reader'); if (!pg) return;
    if (o.z && Math.abs(o.z - 1) > 0.01) { 확대 = Math.min(4, Math.max(0.3, o.z)); $('#pages').style.width = (100 * 확대) + '%'; 손모드(); }
    r.scrollTop = pg.offsetTop + (o.r || 0) * pg.offsetHeight;
    if (o.x) r.scrollLeft = o.x * (r.scrollWidth - r.clientWidth);
    이어봄알림(`보던 ${Math.min(지금.쪽수, (o.c ?? o.p) + 1)}${단위()}에서 이어 봄${o.z && Math.abs(o.z - 1) > 0.01 ? ` · ${Math.round(o.z * 100)}%` : ''}`);
  } else if (o.f != null && !$('#flow').hidden) {
    if (o.s) $('#flowin').querySelectorAll('.시트탭 button')[o.s]?.click();
    const f = $('#flow'); f.scrollTop = o.f * (f.scrollHeight - f.clientHeight);
    이어봄알림(o.s && o.f <= 0.01 ? '보던 시트로 엶' : `보던 자리(${Math.round(o.f * 100)}%)에서 이어 봄`);
  }
}
let 이어봄시계 = 0;
function 이어봄알림(말) {
  $('#resumetext').textContent = 말; $('#resume').hidden = false;
  clearTimeout(이어봄시계); 이어봄시계 = setTimeout(() => ($('#resume').hidden = true), 4500);
}
$('#resumetop').addEventListener('click', () => {
  $('#resume').hidden = true; if (!지금) return;
  if (지금.쪽수 && !$('#reader').hidden) {
    const r = $('#reader'); 미끄럼멈춤(); 확대 = 1; $('#pages').style.width = '100%'; 손모드(); r.scrollTop = 0; r.scrollLeft = 0; 선명하게();
  } else { $('#flowin').querySelector('.시트탭 button')?.click(); $('#flow').scrollTop = 0; }
});

// ④-4c 책갈피 (10-05 · 머리 📝 옆 🔖) — 쪽 문서는 쪽마다 여럿 (「책갈피」 칸 = 쪽 번호 0부터 쉼표로) · 글 문서는 자리 하나 (「f0.4123」)
const 책갈피쪽들 = () => { const s = String(지금?.d?.책갈피 || ''); return s && !s.startsWith('f') ? s.split(',').map(Number).filter(n => n >= 0) : []; };
function 책갈피쓰기(v) { 지금.d.책갈피 = v || undefined; 다리.setInfo(지금.id, '책갈피', v || ''); 책갈피단추(); }
function 책갈피단추() {
  const b = $('#bmk'); if (!지금) { b.hidden = true; return; }
  const 쪽 = 지금.쪽수 > 1 && !$('#reader').hidden, 흐름 = !$('#flow').hidden && !!지금.자리됨;
  b.hidden = !(쪽 || 흐름);
  b.classList.toggle('on', 쪽 ? 책갈피쪽들().includes(보는쪽()) : String(지금.d.책갈피 || '').startsWith('f'));
}
$('#bmk').addEventListener('click', () => {
  if (!지금) return;
  if (지금.쪽수 && !$('#reader').hidden) {
    const n = 보는쪽(), 들 = 책갈피쪽들(), 있음 = 들.includes(n);
    책갈피쓰기((있음 ? 들.filter(x => x !== n) : [...들, n].sort((a, b) => a - b)).join(','));
    return 칩(있음 ? `${n + 1}${단위()} 책갈피 뺌` : `🔖 ${n + 1}${단위()}에 꽂음 → 쪽 목록에서 모아 봄`);
  }
  const f = $('#flow'), 끝 = f.scrollHeight - f.clientHeight, 지금비 = 끝 > 0 ? f.scrollTop / 끝 : 0, 옛 = String(지금.d.책갈피 || '');
  if (!옛.startsWith('f')) { 책갈피쓰기('f' + 지금비.toFixed(4)); return 칩('🔖 이 자리에 꽂음 → 다시 누르면 가기'); }
  const 비 = Number(옛.slice(1)) || 0;
  판열기(`<h3>🔖 책갈피 · ${Math.round(비 * 100)}%</h3>
    <button class="act" id="bmgo">책갈피 자리로 가기</button>
    <button class="act" id="bmmove">지금 자리(${Math.round(지금비 * 100)}%)로 옮기기</button>
    <button class="act warn" id="bmdel">책갈피 빼기</button>`);
  $('#bmgo').onclick = () => { 판닫기(); f.scrollTop = 비 * (f.scrollHeight - f.clientHeight); };
  $('#bmmove').onclick = () => { 판닫기(); 책갈피쓰기('f' + 지금비.toFixed(4)); 칩('🔖 지금 자리로 옮김'); };
  $('#bmdel').onclick = () => { 판닫기(); 책갈피쓰기(''); 칩('책갈피 뺌'); };
});

// ④-5 치수 재기 (v0.7 · 도면) — 톡 찍을 때마다 점 · 가까운 끝점에 붙음 · 끌면 밀기 · 저장 안 함
function 재기글(o) {
  if (!o || !$('#measbar') || $('#measbar').hidden) return;
  const 단 = 지금?.단위 || '', 수 = v => v.toLocaleString('ko-KR', { maximumFractionDigits: Math.abs(v) >= 1000 ? 0 : Math.abs(v) >= 10 ? 1 : 3 });
  const 미터 = { mm: 1e-3, cm: 1e-2, m: 1, in: 0.0254, ft: 0.3048 }[단];
  // 단위를 「없음」 으로 저장한 도면이 많음 (10-03 실물 넷 중 둘) → 숫자 그대로 + «mm 라면» 을 곁들임
  const 길 = v => 단 ? `${수(v)} ${단}${단 !== 'm' && 미터 ? ` (${수(v * 미터)} m)` : ''}` : `${수(v)} <span class="흐림">(mm 라면 ${수(v / 1000)} m)</span>`;
  let t;
  if (!o.점수) t = o.안내 || ('재고 싶은 곳을 톡 → 점 · 끝점에 붙음' + (단 ? ` · 단위 ${단}` : ' · 도면에 단위 없음'));
  else if (o.점수 === 1) t = '다음 점을 톡';
  else {
    t = `거리 <b>${길(o.마지막)}</b>`;
    if (o.점수 > 2) t += ` · 합 ${길(o.합)}`;
    if (o.점수 > 2) t += ' · 넓이 ' + (미터 ? `<b>${수(o.면적 * 미터 * 미터)} m²</b>` : `<b>${수(o.면적)}</b> <span class="흐림">(mm 라면 ${수(o.면적 / 1e6)} m²)</span>`);
  }
  $('#meastext').innerHTML = t;
  $('#measundo').disabled = !o.점수;
}
function 재기끄기() { $('#measbar').hidden = true; $('#measure').classList.remove('on'); 도면판?.재기켬(false); 쪽재기끔(); }
$('#measure').addEventListener('click', () => {
  if (!$('#measbar').hidden) return 재기끄기();
  if (펜.켬) 펜끄기();
  if (!도면판) return 쪽재기시작();
  $('#measbar').hidden = false; $('#measure').classList.add('on');
  도면판?.재기켬(true);
});
$('#measundo').addEventListener('click', () => { if (쪽재.켬) { 쪽재.점.pop(); return 쪽재다시(); } 도면판?.재기빼기(); });
$('#measclear').addEventListener('click', () => { if (쪽재.켬) { 쪽재.점 = []; return 쪽재다시(); } 도면판?.재기새로(); });

// ④-5b PDF · 그림 축척 재기 (0.9.7 · 목업 1_읽을거리\축척재기_목업.html 승인 「둘 다」 · 「화면 + 표시로 남기기」)
//   축척 = 쪽 단위(PDF pt · 그림 화소) 하나가 실제 몇 mm 인가 (k) · recent 줄 「축척」 칸 { k, 글 }
//   PDF 는 1:S 를 고르면 k = 25.4/72 × S (용지 크기 그대로일 때) · 줄여 찍은 도면 · 그림은 «아는 치수로 맞추기» (두 점 + 길이)
//   점은 한 쪽 안에서만 (다른 쪽을 톡 하면 새로) · 끝점 붙기 없음 (PDF 선을 못 읽음) · 화면에만 (저장 안 함) — 「남기기」 = 펜 표시로
const 쪽재 = { 켬: false, 점: [], 쪽: null, 맞춤: false };
const PT_MM = 25.4 / 72;
function 축척읽기() { try { return JSON.parse(지금?.d?.축척 || 'null'); } catch (e) { return null; } }
function 축척쓰기(o) { 지금.d.축척 = o ? JSON.stringify(o) : undefined; 다리.setInfo(지금.id, '축척', o ? JSON.stringify(o) : ''); }
async function 도면축척찾기() {                              // 이 문서 글에서 「S=1:50」 · 「축척 1:100」 · 「SCALE 1/200」
  const o = await 글읽기(지금.d).catch(() => null); if (!o || o.없음) return null;
  const 글들 = o.쪽 ? [o.쪽[보는쪽()] || '', ...o.쪽] : [o.글 || ''];
  for (const t of 글들) { const m = /(?:S|축척|SCALE)\s*[=:：]?\s*1\s*[:/：]\s*([\d,]{1,6})/i.exec(t); if (m) return +m[1].replace(/,/g, ''); }
  return null;
}
async function 축척판(맞춤뒤) {
  const PDF임 = 지금.쪽수 && 지금.ext === 'pdf', 지금축 = 축척읽기(), 찾음 = PDF임 ? await 도면축척찾기() : null;
  const 칩들 = [10, 20, 30, 50, 100, 200, 300, 500, 1000];
  if (찾음 && !칩들.includes(찾음)) 칩들.push(찾음);
  const 고른 = 지금축?.S || 찾음;
  판열기(`<h3>축척 <span class="흐림">· 이 문서</span></h3>
    ${PDF임 ? `<div class="축척칩" id="scalechips">${칩들.sort((a, b) => a - b).map(S => `<button data-s="${S}" class="${S === 고른 ? 'on' : ''}">1:${S}${S === 찾음 ? ' <i>(도면 글)</i>' : ''}</button>`).join('')}</div>
    <div class="row"><input id="scalein" type="number" inputmode="numeric" placeholder="직접 — 1 : ○○" min="1"></div>
    <div class="판설명">용지 크기 그대로인 PDF 일 때 · 원도를 줄여 찍었으면 → 아는 치수로 맞추기</div>` : '<div class="판설명">그림은 용지 크기를 몰라 → 아는 치수로 맞추기 (도면 속 치수 양 끝을 톡 → 길이)</div>'}
    <div class="row 끝줄"><button class="btn plain" id="scalecal">아는 치수로 맞추기</button><span style="flex:1"></span>${PDF임 ? '<button class="btn" id="scaleok">이 축척으로 재기</button>' : ''}</div>`);
  let S = 고른 || null;
  $('#scalechips')?.addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (!b) return; S = +b.dataset.s; $('#scalein').value = ''; $('#scalechips').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); });
  if ($('#scaleok')) $('#scaleok').onclick = () => {
    const 직접 = +$('#scalein').value; if (직접 > 0) S = 직접;
    if (!S) return $('#scalein').focus();
    축척쓰기({ k: PT_MM * S, S, 글: `1:${S}` }); 판닫기(); 쪽재기켜기(); 맞춤뒤?.();
  };
  $('#scalecal').onclick = () => { 판닫기(); 쪽재기켜기(true); };
}
function 쪽재기시작() { if (!지금?.쪽수 && !지금?.그림) return; if (!축척읽기()) return 축척판(); 쪽재기켜기(); }
function 쪽재기켜기(맞춤) {
  Object.assign(쪽재, { 켬: true, 점: [], 쪽: null, 맞춤: !!맞춤 });
  지금.단위 = 'm';                                            // 재기글 은 m 로 (값도 m 로 넘김 · 짧게)
  $('#measbar').hidden = false; $('#measure').classList.add('on');
  $('#measscale').hidden = false; $('#meassave').hidden = 맞춤;
  쪽재다시();
}
function 쪽재기끔() { if (!쪽재.켬 && !$('#pages').querySelector('svg.재기층')) return; Object.assign(쪽재, { 켬: false, 점: [], 쪽: null, 맞춤: false }); $('#measscale').hidden = true; $('#meassave').hidden = true; $('#pages').querySelectorAll('svg.재기층').forEach(e => e.remove()); }
function 쪽재값() {                                          // 지금 점들 → 거리 · 합 · 넓이 (mm)
  const pg = $('#pages').querySelector(`.pg[data-n="${쪽재.쪽}"]`), W = +pg?.dataset.pw || 1, H = +pg?.dataset.ph || 1, k = 축척읽기()?.k || 1;
  const P = 쪽재.점.map(([x, y]) => [x * W, y * H]); let 합 = 0, 마지막 = 0, a = 0;
  for (let i = 1; i < P.length; i++) { 마지막 = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]) * k; 합 += 마지막; }
  if (P.length >= 3) { for (let i = 0; i < P.length; i++) { const j = (i + 1) % P.length; a += P[i][0] * P[j][1] - P[j][0] * P[i][1]; } a = Math.abs(a) / 2 * k * k; }
  return { 점수: P.length, 마지막, 합, 면적: a, P, W, H, pg };
}
function 쪽재다시() {
  $('#pages').querySelectorAll('svg.재기층').forEach(e => e.remove());
  const 축 = 축척읽기();
  $('#measscale').textContent = 축 ? 축.글 : '축척';
  if (쪽재.맞춤) {
    const n = 쪽재.점.length;
    $('#meastext').innerHTML = n === 0 ? '아는 치수 한쪽 끝을 톡' : n === 1 ? '다른 쪽 끝을 톡' : '길이를 적어 주세요';
    $('#measundo').disabled = !n;
  } else {
    const v = 쪽재값();
    재기글({ 점수: v.점수, 마지막: v.마지막 / 1000, 합: v.합 / 1000, 면적: v.면적 / 1e6, 안내: `톡 → 점 · 축척 ${축?.글 || '?'}` });
    $('#meassave').disabled = v.점수 < 2;
  }
  if (!쪽재.점.length) return;
  const { P, W, H, pg } = 쪽재값(); if (!pg) return;
  const b = pg.getBoundingClientRect(), 화 = (지금.돌림 & 1 ? b.height : b.width) || 1, u = W / 화, 색 = 쪽재.맞춤 ? '#e8743b' : '#00b7ff', k = 축?.k || 1;
  const 수글 = v => v.toLocaleString('ko-KR', { maximumFractionDigits: v >= 100 ? 0 : 2 });
  let h = `<svg class="재기층" viewBox="0 0 ${W} ${H}">`;
  if (P.length >= 3 && !쪽재.맞춤) h += `<polygon points="${P.map(p => p.join(',')).join(' ')}" fill="rgba(0,183,255,.13)" stroke="none"/>`;
  h += `<polyline points="${P.map(p => p.join(',')).join(' ')}" fill="none" stroke="${색}" stroke-width="${2.2 * u}" stroke-linecap="round"/>`;
  for (const [x, y] of P) h += `<rect x="${x - 4.5 * u}" y="${y - 4.5 * u}" width="${9 * u}" height="${9 * u}" fill="#fff" stroke="${색}" stroke-width="${1.6 * u}"/>`;
  if (!쪽재.맞춤) for (let i = 1; i < P.length; i++) {
    const [x0, y0] = P[i - 1], [x1, y1] = P[i], L = Math.hypot(x1 - x0, y1 - y0) * k; if (Math.hypot(x1 - x0, y1 - y0) / u < 30) continue;
    const 글m = L >= 1000 ? `${수글(L / 1000)} m` : `${수글(L)} mm`, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    h += `<text x="${cx}" y="${cy}" transform="rotate(${-지금.돌림 * 90} ${cx} ${cy}) translate(0 ${-9 * u})" font-size="${12.5 * u}" font-weight="700" text-anchor="middle" fill="#005b80" stroke="#fff" stroke-width="${3.5 * u}" paint-order="stroke" font-family="Pretendard, system-ui, sans-serif">${글m}</text>`;
  }
  pg.querySelector('.속').insertAdjacentHTML('beforeend', h + '</svg>');
}
$('#pages').addEventListener('click', e => {
  if (!쪽재.켬 || 펜.켬) return;
  const p = e.target.closest('.pg'); if (!p || !p.dataset.pw) return;
  const q = 쪽좌표(p, e.clientX, e.clientY);
  if (쪽재.쪽 !== p.dataset.n) { 쪽재.쪽 = p.dataset.n; 쪽재.점 = []; }
  if (쪽재.맞춤 && 쪽재.점.length >= 2) 쪽재.점 = [];
  쪽재.점.push([네자리(q.x), 네자리(q.y)]); 쪽재다시();
  if (쪽재.맞춤 && 쪽재.점.length === 2) 맞춤판();
});
function 맞춤판() {                                         // 두 점 사이 실제 길이 → k
  const pg = $('#pages').querySelector(`.pg[data-n="${쪽재.쪽}"]`), W = +pg.dataset.pw, H = +pg.dataset.ph, [[x0, y0], [x1, y1]] = 쪽재.점, 쪽길이 = Math.hypot((x1 - x0) * W, (y1 - y0) * H);
  판열기(`<h3>두 점 사이 실제 길이</h3>
    <div class="row"><input id="calin" type="number" inputmode="decimal" placeholder="예 : 3000" min="0"><div class="seg" id="calunit"><button data-v="1" class="on">mm</button><button data-v="1000">m</button></div></div>
    <div class="판설명" id="calnote">치수 글 그대로 적기 (3,000 → 3000)</div>
    <div class="row 끝줄"><button class="btn plain" id="calre">다시 찍기</button><span style="flex:1"></span><button class="btn" id="calok">이 축척으로</button></div>`);
  let 단 = 1;
  const 미리 = () => { const v = +$('#calin').value * 단; if (!(v > 0)) return; const k = v / 쪽길이; $('#calnote').textContent = 지금.ext === 'pdf' ? `→ 1 : ${(k / PT_MM).toFixed(1)} (용지 그대로라면)` : `→ 그림 1 화소 = ${k.toFixed(2)} mm`; };
  $('#calin').oninput = 미리;
  $('#calunit').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; 단 = +b.dataset.v; $('#calunit').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); 미리(); };
  $('#calre').onclick = () => { 판닫기(); 쪽재.점 = []; 쪽재다시(); };
  $('#calok').onclick = () => {
    const v = +$('#calin').value * 단; if (!(v > 0) || !(쪽길이 > 0)) return $('#calin').focus();
    const k = v / 쪽길이, S = 지금.ext === 'pdf' ? k / PT_MM : null;
    축척쓰기({ k, ...(S ? { S: Math.round(S) } : {}), 글: S ? `맞춤 1:${S >= 100 ? Math.round(S) : S.toFixed(1)}` : '맞춤' });
    판닫기(); 쪽재기켜기(); 칩('축척을 맞춤 → 이제 톡 해서 재기');
  };
  setTimeout(() => $('#calin').focus(), 60);
}
$('#measscale').addEventListener('click', () => 축척판());
$('#meassave').addEventListener('click', () => {                // 잰 것을 펜 표시로 (펜 획 + 글 획) → 보내기 사본에도
  const v = 쪽재값(); if (v.점수 < 2 || !v.pg) return;
  const 열쇠 = 쪽재.쪽, b = v.pg.getBoundingClientRect(), 화 = (지금.돌림 & 1 ? b.height : b.width) || 1, 굵 = +(3 / 화).toPrecision(4);
  const 수글 = x => x.toLocaleString('ko-KR', { maximumFractionDigits: x >= 100 ? 0 : 2 }), 길 = x => (x >= 1000 ? `${수글(x / 1000)} m` : `${수글(x)} mm`);
  const 점 = 쪽재.점.flat(), 끝 = 쪽재.점.length - 1, [ax, ay] = 쪽재.점[끝 - 1], [bx, by] = 쪽재.점[끝];
  표시바꿈(열쇠, { 더함: { c: 'r', w: 굵, p: 점 } });
  const 글 = v.점수 === 2 ? 길(v.마지막) : `합 ${길(v.합)}${v.면적 ? ` · 넓이 ${수글(v.면적 / 1e6)} m²` : ''}`;
  const fs = +(15 / 화).toPrecision(4), 비 = +v.pg.dataset.pw / +v.pg.dataset.ph, 폭 = 글폭(글) * fs;   // 글 가운데를 잰 선 가운데 위에 · 쪽 안으로
  const gx = Math.min(0.99 - 폭, Math.max(0.01, (ax + bx) / 2 - 폭 / 2)), gy = Math.max(0.01, (ay + by) / 2 - 24 / 화 * 비);
  표시바꿈(열쇠, { 더함: { c: 'r', w: fs, p: [네자리(gx), 네자리(gy)], t: 글, r: 지금.돌림 } });
  쪽재.점 = []; 쪽재다시(); 칩('표시로 남김 → 펜으로 고치기 · 지우기 · 보내기 사본에도');
});
$('#measoff').addEventListener('click', 재기끄기);

// ④-6 보내기 (v0.7) — 표시 입힌 사본 (share.js) 또는 원본 그대로
function 보내기판() {
  if (!지금) return;
  const d = 지금.d, 표쪽 = 표시한쪽들();
  const 덧 = [Object.keys(지금.표시.쪽).length ? '펜' : '', 지금.표시.메모?.length ? '메모' : '', d.메모 ? '쪽지' : '', 지금.돌림 ? '돌림' : ''].filter(Boolean).join(' · ');
  const 줄 = [];
  if (지금.쪽수) {
    if (표쪽.length) 줄.push(['표쪽', `✏ 펜 · 메모 있는 ${단위()}만 → PDF (${표쪽.length}${단위()})`]);
    if (지금.쪽수 <= 300) 줄.push(['모든쪽', `모든 ${단위()} → PDF (${지금.쪽수}${단위()})`]);
    줄.push(['이쪽', `지금 보는 ${단위()}만 → 그림 (${보는쪽() + 1}${단위()})`]);
  } else if (지금.그림) 줄.push(['그림', '표시 입힌 그림']);
  else if (도면판) { 줄.push(['도면전체', '도면 전체 → 그림 (흰 바탕)']); 줄.push(['도면화면', '지금 보이는 만큼 → 그림 (흰 바탕)']); }
  줄.push(['원본', '원본 그대로']);
  판열기(`<h3>보내기 · ${글(d.name)}</h3>
    ${줄.map(([k, t]) => `<button class="act" data-k="${k}">${t}</button>`).join('')}
    <div class="판설명">${덧 && (지금.쪽수 || 지금.그림 || 도면판) ? `사본에 ${덧} 입힘 · ` : ''}원본은 안 고침 → 카톡 · 메일 고르는 창</div>`);
  $('#sheet').onclick = e => { const b = e.target.closest('[data-k]'); if (b) { 판닫기(); 사본보내기(b.dataset.k); } };
}
$('#share').addEventListener('click', 보내기판);

// ④-6b 복사 (10-04 · 목업 승인) — 지금 보이는 쪽(그림 · 도면)에 표시를 입혀 클립보드로 → 다른 앱에서 길게 눌러 붙여넣기 · 원본은 안 고침
//   보내기 「지금 보는 쪽만 → 그림」 과 같은 그림 · 클립보드는 png
//   자름 = { x0, y0, x1, y1 } (보는 쪽 · 도면 화면의 0 ~ 1 비율) — 골라 복사(0.9.10)가 줌 · 메모 목록 띠는 자른 뒤에 붙임
async function 지금그림캔버스(자름) {
  const d = 지금.d, id = 지금.id, 번호표 = { n: 0, 목록: [] };
  let c = null;
  if (지금.쪽수) {
    const n = 보는쪽(), pg = $('#pages').children[n], pw = +pg.dataset.pw;
    const 몫 = 자름 ? Math.max(0.25, Math.max(자름.x1 - 자름.x0, 자름.y1 - 자름.y0)) : 1;   // 작게 고를수록 크게 그려 글씨가 안 뭉개지게 (긴 변 2800 까지)
    const 주소 = await 쪽길().쪽(id, n, Math.round(Math.min(자름 ? 2800 : 2000, Math.max(800, pw * 2 / 몫)))), im = await 보내기.그림받기(주소); 그림주소놓기(주소);
    c = 보내기.쪽캔버스(im, 지금.돌림, 지금.표시.쪽[n], d.메모);
    보내기.메모그리기(c, (지금.표시.메모 || []).filter(m => m.k === String(n)), { 돌: 지금.돌림, 번호표, 쪽: n + 1 });
  } else if (지금.그림) {
    c = 보내기.쪽캔버스($('#pages .pg img'), 지금.돌림, 지금.표시.쪽['0'], d.메모);
    보내기.메모그리기(c, (지금.표시.메모 || []).filter(m => m.k === '0'), { 돌: 지금.돌림, 번호표 });
  } else if (도면판) {
    c = 도면판.내보내기(false);
    보내기.메모그리기(c, (지금.표시.메모 || []).filter(m => m.k === 'd'), { 도면: c.점, 배율: c.배율, 번호표 });
    if (d.메모) 보내기.쪽지상자(c.getContext('2d'), c.width, d.메모);
  }
  if (c && 자름) c = 잘라내기(c, 자름);
  if (c && 번호표.목록.length) c = 보내기.아래목록(c, 번호표.목록);
  return c;
}
function 잘라내기(c, r) {
  const x = Math.round(r.x0 * c.width), y = Math.round(r.y0 * c.height);
  const w = Math.max(1, Math.round(r.x1 * c.width) - x), h = Math.max(1, Math.round(r.y1 * c.height) - y);
  const o = document.createElement('canvas'); o.width = w; o.height = h;
  o.getContext('2d').drawImage(c, x, y, w, h, 0, 0, w, h);
  c.width = c.height = 0;
  return o;
}
function 그림복사(만들기) {                                         // 만들기 = () => 캔버스 약속 · 누른 손가락 안에서 불러야 함 (아이폰)
  const 긴칩 = 말 => { 칩(말); clearTimeout(칩시계); 칩시계 = setTimeout(() => ($('#chip').hidden = true), 2800); };
  let 크기 = '';
  const 그림약속 = (async () => {
    const c = await 만들기(); if (!c) throw new Error('복사할 그림 없음');
    크기 = `${c.width} × ${c.height} `;
    const b = await new Promise(ok => c.toBlob(ok, 'image/png')); c.width = c.height = 0;
    if (!b) throw new Error('그림 만들기 실패 (메모리)');
    return b;
  })();
  칩('복사하는 중…');
  const 끝 = p => p.then(() => 긴칩(`📋 복사됨 ${크기}→ 다른 앱에서 길게 눌러 붙여넣기`), e => { $('#chip').hidden = true; 알림(`<b>복사 안 됨</b><div class="sm">${글(e?.message || e)} → 「보내기」 로</div>`); });
  if (다리.copyImage) {                                             // 아이폰 웹앱 · PC — 누른 손가락 안에서 «바로» 불러야 함 (그림은 약속으로 넘김)
    let p; try { p = Promise.resolve(다리.copyImage(그림약속)); } catch (e) { p = Promise.reject(e); }
    return 끝(p);
  }
  끝(그림약속.then(async b => {                                     // 갤럭시 — 껍데기가 클립보드에
    if (!다리.copyBegin) throw new Error('앱이 옛 판 → 새 판 설치');
    const 바이트 = new Uint8Array(await b.arrayBuffer());
    if (!다리.copyBegin()) throw new Error('파일을 못 만듦');
    for (let i = 0; i < 바이트.length; i += 393216) {
      const 덩 = 바이트.subarray(i, i + 393216); let s = '';
      for (let k = 0; k < 덩.length; k += 8192) s += String.fromCharCode.apply(null, 덩.subarray(k, k + 8192));
      if (!다리.copyChunk(btoa(s))) throw new Error('쓰기 실패 (폰 저장 공간?)');
    }
    if (!다리.copyEnd()) throw new Error('클립보드에 못 넣음');
  }));
}
$('#copy').addEventListener('click', () => { if (지금 && !보내는중) 골라열기(); });

// ④-6c 골라 복사 (0.9.10 · 목업 1_읽을거리\골라복사_목업.html · 전무님 「복사 누르면 틀 · 복사 · 보내기 · 새 그림 · 그림 + PDF · PPT + 도면」)
//   「복사」 → 틀 (처음 = 보는 쪽 중 화면에 보이는 만큼 → 바로 「복사」 = 전처럼 통째) · 귀 끌기 = 크기 · 틀 안 끌기 = 옮김 · 틀 밖 끌기 = 새로 그림
//   틀이 거의 전체(95% 넘게 · 처음)면 틀 안을 끌어도 새로 그림 — 처음엔 «틀 밖» 이 없어서 (시험에서 찾음)
//   틀은 보는 쪽(도면은 도면 화면) 안에서만 · 펜 · 형광 · 메모 표시째 · 원본 안 고침 · 틀 띄운 동안 확대 · 밀기는 안 됨 (먼저 키우고 띄움)
let 골 = null;                                                       // { 판:DOMRect(쪽 전체) · 한:{l,t,r,b}(고를 수 있는 곳) · 틀:{l,t,r,b} }
function 골판() {
  if (지금.쪽수 || 지금.그림) {
    const pg = 지금.그림 ? $('#pages .pg') : $('#pages').children[보는쪽()];
    return pg ? { 판: pg.getBoundingClientRect(), 보는: $('#reader').getBoundingClientRect() } : null;
  }
  if (도면판) { const r = $('#cad').getBoundingClientRect(); return { 판: r, 보는: r }; }
  return null;
}
function 골라열기() {
  const g = 골판();
  if (!g) return 알림판('이 문서는 복사 안 됨 → 「보내기」 로');
  찾기닫기(); 펜끄기(); 재기끄기();
  const { 판, 보는 } = g;
  const 한 = { l: Math.max(판.left, 보는.left), t: Math.max(판.top, 보는.top), r: Math.min(판.right, 보는.right), b: Math.min(판.bottom, 보는.bottom) };
  if (한.r - 한.l < 20 || 한.b - 한.t < 20) return 알림판('보는 쪽이 화면에 안 보임 → 쪽을 화면에 놓고 다시');
  골 = { 판, 한, 틀: { ...한 } };
  let el = $('#crop');
  if (!el) {
    el = document.createElement('div'); el.id = 'crop'; el.className = '골';
    el.innerHTML = '<div class="골안내">끌어서 고르기 · 귀 = 크기 · 틀 안 = 옮김</div><div class="골틀"><span class="골치수"></span><i data-g="lt"></i><i data-g="rt"></i><i data-g="lb"></i><i data-g="rb"></i></div>'
      + '<div class="골바"><button data-a="닫기">취소</button><button data-a="복사" class="주">📋 복사</button><button data-a="보내기">⇪ 보내기</button><button data-a="새그림">＋ 새 그림</button></div>';
    document.body.append(el);
    골손잡이(el);
    el.querySelector('.골바').addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (b) 골동작(b.dataset.a); });
  }
  el.hidden = false;
  if (history.state?.v !== '골라') history.pushState({ v: '골라' }, '');
  골그리기();
}
let 골뒤로 = false;                                                  // 틀을 닫으며 기록 한 칸을 되돌릴 때 popstate 가 다른 화면을 닫지 않게
function 골닫기(뒤로 = true) {
  if (!골) return;
  골 = null; const el = $('#crop'); if (el) el.hidden = true;
  if (뒤로 && history.state?.v === '골라') { 골뒤로 = true; history.back(); }
}
function 골그리기() {
  const el = $('#crop'); if (!el || !골) return;
  const t = 골.틀, b = el.querySelector('.골틀');
  Object.assign(b.style, { left: t.l + 'px', top: t.t + 'px', width: (t.r - t.l) + 'px', height: (t.b - t.t) + 'px' });
  const r = 골자름(), 몫 = 골원본크기();
  el.querySelector('.골치수').textContent = 몫 ? `${Math.round((r.x1 - r.x0) * 몫[0])} × ${Math.round((r.y1 - r.y0) * 몫[1])}` : '';
  el.querySelector('.골치수').classList.toggle('위', t.t > 96);   // 위에 자리가 있으면 틀 밖 위로 (고른 내용을 안 가리게)
}
function 골원본크기() {                                              // 틀 위 치수 — 그림은 원본 화소 · PDF · PPT 는 복사될 화소 · 도면은 화면 화소
  const 판 = 골.판;
  if (지금.그림) { const im = $('#pages .pg img'); const 옆 = 지금.돌림 & 1; return im?.naturalWidth ? (옆 ? [im.naturalHeight, im.naturalWidth] : [im.naturalWidth, im.naturalHeight]) : null; }
  if (지금.쪽수) { const r = 골자름(), 몫 = Math.max(0.25, Math.max(r.x1 - r.x0, r.y1 - r.y0)), pg = $('#pages').children[보는쪽()]; const w = Math.min(2800, Math.max(800, +pg.dataset.pw * 2 / 몫)); return [w, w * 판.height / 판.width]; }
  return [판.width * (devicePixelRatio || 1), 판.height * (devicePixelRatio || 1)];
}
function 골자름() {
  const p = 골.판, t = 골.틀;
  return { x0: (t.l - p.left) / p.width, y0: (t.t - p.top) / p.height, x1: (t.r - p.left) / p.width, y1: (t.b - p.top) / p.height };
}
function 골손잡이(el) {
  let 끌 = null;
  const 붙 = (v, a, b) => Math.min(b, Math.max(a, v));
  el.addEventListener('pointerdown', e => {
    if (!골 || e.target.closest('.골바')) return;
    e.preventDefault();
    const 한 = 골.한, t = 골.틀, x = 붙(e.clientX, 한.l, 한.r), y = 붙(e.clientY, 한.t, 한.b);
    const 귀 = e.target.closest('[data-g]')?.dataset.g;
    if (귀) 끌 = { 꼴: '귀', 귀, t0: { ...t } };
    else if (e.clientX > t.l && e.clientX < t.r && e.clientY > t.t && e.clientY < t.b && (t.r - t.l) * (t.b - t.t) < 0.95 * (한.r - 한.l) * (한.b - 한.t)) 끌 = { 꼴: '옮김', x, y, t0: { ...t } };   // 거의 전체인 틀(처음)은 안을 끌어도 새로 그림
    else 끌 = { 꼴: '새', x, y, t0: { ...t } };
    try { el.setPointerCapture(e.pointerId); } catch (e2) {}
  });
  el.addEventListener('pointermove', e => {
    if (!끌 || !골) return;
    e.preventDefault();
    const 한 = 골.한, x = 붙(e.clientX, 한.l, 한.r), y = 붙(e.clientY, 한.t, 한.b), 최소 = 24;
    const t = { ...끌.t0 };
    if (끌.꼴 === '귀') {
      if (끌.귀[0] === 'l') t.l = Math.min(x, t.r - 최소); else t.r = Math.max(x, t.l + 최소);
      if (끌.귀[1] === 't') t.t = Math.min(y, t.b - 최소); else t.b = Math.max(y, t.t + 최소);
    } else if (끌.꼴 === '옮김') {
      const w = t.r - t.l, h = t.b - t.t;
      t.l = 붙(끌.t0.l + x - 끌.x, 한.l, 한.r - w); t.t = 붙(끌.t0.t + y - 끌.y, 한.t, 한.b - h); t.r = t.l + w; t.b = t.t + h;
    } else {
      if (Math.abs(x - 끌.x) < 8 && Math.abs(y - 끌.y) < 8) return;   // 짧은 톡은 틀을 안 바꿈
      t.l = Math.min(x, 끌.x); t.r = Math.max(x, 끌.x); t.t = Math.min(y, 끌.y); t.b = Math.max(y, 끌.y);
      if (t.r - t.l < 최소) t.r = Math.min(한.r, t.l + 최소); if (t.b - t.t < 최소) t.b = Math.min(한.b, t.t + 최소);
    }
    골.틀 = t; 골그리기();
  });
  const 놓기 = () => { 끌 = null; };
  el.addEventListener('pointerup', 놓기); el.addEventListener('pointercancel', 놓기);
  el.addEventListener('touchmove', e => e.preventDefault(), { passive: false });   // 뒤 화면이 안 밀리게
}
async function 골동작(a) {
  if (!골) return;
  if (a === '닫기') return 골닫기();
  const 자름 = 골자름(), d = 지금.d, 밑 = d.name.replace(/\.[^.]+$/, '') + '_잘라냄', 쪽 = 지금.쪽수 ? `_${보는쪽() + 1}쪽` : '';
  골닫기();
  if (a === '복사') return 그림복사(() => 지금그림캔버스(자름));   // 누른 손가락 안에서 바로 (아이폰)
  if (보내는중) return;
  보내는중 = true;
  try {
    칩(a === '보내기' ? '보낼 그림 만드는 중…' : '새 그림 만드는 중…'); clearTimeout(칩시계);
    const c = await 지금그림캔버스(자름); if (!c) throw new Error('그림 없음');
    const 크기 = `${c.width} × ${c.height}`, png = await 보내기.바이트(c, 'image/png'); c.width = c.height = 0;
    if (a === '보내기') { await 보내기.넘기기(`${밑}${쪽}.png`, 'image/png', png); $('#chip').hidden = true; }
    else {
      const id = await 새문서넣기(`${밑}${쪽}.png`, '잘라 냄', png);
      if (!id) throw new Error('파일을 못 만듦 · 폰 저장 공간 확인');
      칩(`＋ 새 그림 「${밑}${쪽}」 ${크기} → 목록에 (원본 그대로)`); clearTimeout(칩시계); 칩시계 = setTimeout(() => ($('#chip').hidden = true), 3200);
    }
  } catch (e) {
    $('#chip').hidden = true;
    알림(`<b>${a === '보내기' ? '보내기' : '새 그림'} 실패</b><div class="sm">${글(e.message || e)}</div>`);
  } finally { 보내는중 = false; }
}
function 표시한쪽들() {
  const s = new Set(Object.keys(지금.표시.쪽).filter(k => k !== 'd'));
  for (const m of 지금.표시.메모 || []) if (m.k !== 'd') s.add(m.k);
  return [...s].map(Number).sort((a, b) => a - b);
}
let 보내는중 = false;
async function 사본보내기(k) {
  if (보내는중) return;
  const d = 지금.d, 밑 = d.name.replace(/\.[^.]+$/, ''), id = d.id;
  const 진행 = 말 => { const c = $('#chip'); c.textContent = 말; c.hidden = false; clearTimeout(칩시계); };
  보내는중 = true;
  try {
    if (k === '원본') { if (!다리.shareOriginal(id)) 알림('<b>원본 없음</b><div class="sm">목록에서 빼고 다시 받아 열기</div>'); return; }
    진행('사본 만드는 중…');
    await new Promise(r => setTimeout(r, 30));
    if (지금.쪽수) {
      const 쪽들 = k === '표쪽' ? 표시한쪽들() : k === '모든쪽' ? [...Array(지금.쪽수).keys()] : [보는쪽()];
      const 결과 = [], 번호표 = { n: 0, 목록: [] };
      for (const [i, n] of 쪽들.entries()) {
        if (지금?.id !== id) return;
        진행(`사본 만드는 중 ${i + 1} / ${쪽들.length}${단위()}`);
        const pg = $('#pages').children[n], pw = +pg.dataset.pw, ph = +pg.dataset.ph;
        const w = Math.round(Math.min(2000, Math.max(800, pw * 2)));          // 1pt = 2화소 (144 dpi)
        const 주소 = await 쪽길().쪽(id, n, w), im = await 보내기.그림받기(주소); 그림주소놓기(주소);
        const c = 보내기.쪽캔버스(im, 지금.돌림, 지금.표시.쪽[n], i === 0 ? d.메모 : null);
        보내기.메모그리기(c, (지금.표시.메모 || []).filter(m => m.k === String(n)), { 돌: 지금.돌림, 번호표, 쪽: n + 1 });
        const jpg = await 보내기.바이트(c, 'image/jpeg', 0.85);
        결과.push({ jpg, w: c.width, h: c.height, pw: 지금.돌림 & 1 ? ph : pw, ph: 지금.돌림 & 1 ? pw : ph });
        c.width = c.height = 0;
      }
      if (번호표.목록.length && k !== '이쪽') {           // 숨김 메모는 맨 끝에 「메모 목록」 쪽 (A4)
        for (const c of 보내기.메모목록쪽(번호표.목록, d.name, 1190, 1684)) {
          결과.push({ jpg: await 보내기.바이트(c, 'image/jpeg', 0.9), w: c.width, h: c.height, pw: 595, ph: 842 });
        }
      }
      if (k === '이쪽') {
        let jpg = 결과[0].jpg;
        if (번호표.목록.length) {                         // 그림 하나 — 목록을 아래에 붙임
          const im2 = await 보내기.그림받기(URL.createObjectURL(new Blob([jpg], { type: 'image/jpeg' })));
          jpg = await 보내기.바이트(보내기.아래목록(im2, 번호표.목록), 'image/jpeg', 0.88);
        }
        await 보내기.넘기기(`${밑}_${쪽들[0] + 1}쪽.jpg`, 'image/jpeg', jpg);
      }
      else await 보내기.넘기기(`${밑}_표시.pdf`, 'application/pdf', 보내기.PDF(결과));
    } else if (지금.그림) {
      const im = $('#pages .pg img');
      let c = 보내기.쪽캔버스(im, 지금.돌림, 지금.표시.쪽['0'], d.메모);
      const 번호표 = { n: 0, 목록: [] };
      보내기.메모그리기(c, (지금.표시.메모 || []).filter(m => m.k === '0'), { 돌: 지금.돌림, 번호표 });
      if (번호표.목록.length) c = 보내기.아래목록(c, 번호표.목록);
      const png = ['png', 'gif', 'bmp', 'webp'].includes(지금.ext);
      await 보내기.넘기기(`${밑}_표시.${png ? 'png' : 'jpg'}`, png ? 'image/png' : 'image/jpeg', await 보내기.바이트(c, png ? 'image/png' : 'image/jpeg', 0.9));
    } else if (도면판) {
      let c = 도면판.내보내기(k === '도면전체');
      const 번호표 = { n: 0, 목록: [] };
      보내기.메모그리기(c, (지금.표시.메모 || []).filter(m => m.k === 'd'), { 도면: c.점, 배율: c.배율, 번호표 });
      if (d.메모) 보내기.쪽지상자(c.getContext('2d'), c.width, d.메모);
      if (번호표.목록.length) c = 보내기.아래목록(c, 번호표.목록);
      await 보내기.넘기기(`${밑}_표시.png`, 'image/png', await 보내기.바이트(c, 'image/png'));
    }
    $('#chip').hidden = true;
  } catch (e) {
    $('#chip').hidden = true;
    알림(`<b>보내기 실패</b><div class="sm">${글(e.message || e)}</div>`);
  } finally { 보내는중 = false; }
}

// ⑤ 키우기 ────────────────────────────────────────
let 확대 = 1, 집기 = null, 톡시각 = 0;
function 확대하기(새, cx, cy) {
  const r = $('#reader'), 옛 = 확대;
  새 = Math.min(4, Math.max(최소확대(), 새));
  if (Math.abs(새 - 옛) < 0.001) return;
  const box = r.getBoundingClientRect();
  const px = r.scrollLeft + (cx - box.left), py = r.scrollTop + (cy - box.top);
  확대 = 새;
  $('#pages').style.width = (100 * 확대) + '%';
  r.scrollLeft = px * 새 / 옛 - (cx - box.left);
  r.scrollTop = py * 새 / 옛 - (cy - box.top);
}
// 줄이기 (10-05 · 전무님 「JPG 가 화면에 맞게 커져 있는데 축소가 안 됨」) — 1배(화면 너비에 맞춤) 아래로는
//   지금 보는 쪽 하나가 화면에 통째로 들어가는 크기까지 (적어도 30%) · 줄이면 가운데에
function 최소확대() {
  const r = $('#reader'), pg = $('#pages').children[지금?.쪽수 ? 보는쪽() : 0];
  if (!pg || !pg.offsetHeight || !pg.offsetWidth) return 1;
  const 높이1 = pg.offsetHeight * (r.clientWidth - 20) / pg.offsetWidth;          // 1배일 때 쪽 높이 (안쪽 여백 10 · 10)
  return Math.min(1, Math.max(0.3, (r.clientHeight - 20) / 높이1));
}
function 선명하게() {        // 손을 뗀 뒤 보이는 쪽만 더 촘촘히 다시 그림 — PDF 만 (그림은 원본이라 그대로)
  if (!지금?.쪽수) return;
  const r = $('#reader').getBoundingClientRect();
  $('#pages').querySelectorAll('.pg').forEach(p => {
    const b = p.getBoundingClientRect();
    if (b.bottom > r.top - 300 && b.top < r.bottom + 300 && p.querySelector('img')) 쪽그리기(p);
  });
}
// 확대한 뒤 한 손가락으로 밀기 — 폰 브라우저에 맡기지 않고 앱이 직접 따라감 (10-03 전무님 「확대 뒤 안 보이는 쪽으로 이동」)
//   확대 1 일 때는 폰 기본 스크롤(위아래 · 튕김)을 그대로 씀
let 끌기 = null, 미끄럼 = 0;
function 손모드() { $('#reader').style.touchAction = 확대 > 1.01 || 펜.켬 ? 'none' : 'pan-x pan-y'; }
function 미끄럼멈춤() { cancelAnimationFrame(미끄럼); 미끄럼 = 0; }
const 판 = $('#reader');
const 손각 = (a, b) => Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX);
판.addEventListener('touchstart', e => {
  미끄럼멈춤();
  if (펜.켬 && e.touches.length === 1) {               // 펜 — 한 손가락은 긋기 (밀기 · 두 번 톡 없음)
    if (펜.메모) { 끌기 = null; 톡시각 = 0; return; } // 메모 — 톡(click) 은 memo.js · 쪽지 끌기도 memo.js
    const p = e.touches[0]; 끌기 = null; 톡시각 = 0; 긋기시작(p.clientX, p.clientY); return;
  }
  if (e.touches.length === 2) {
    if (긋기) 긋기끝(!긋기.획 || 긋기.획.p.length < 12 || Date.now() - 긋기.t < 250);   // 막 그은 짧은 획은 두 손가락의 시작으로 봄
    const [a, b] = e.touches;
    집기 = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), z: 확대, cx: (a.clientX + b.clientX) / 2, cy: (a.clientY + b.clientY) / 2, a0: 손각(a, b), 돈: 0, 비틂: false };
    끌기 = null;
  } else if (e.touches.length === 1) {
    const t = Date.now(), p = e.touches[0];
    if (t - 톡시각 < 300) { 확대하기(Math.abs(확대 - 1) > 0.05 ? 1 : 2, p.clientX, p.clientY); 손모드(); 선명하게(); 톡시각 = 0; 끌기 = null; return; }
    톡시각 = t;
    끌기 = 확대 > 1.01 ? { x: p.clientX, y: p.clientY, vx: 0, vy: 0, t } : null;
  }
}, { passive: true });
판.addEventListener('touchmove', e => {
  if (긋기 && e.touches.length === 1) { e.preventDefault(); const p = e.touches[0]; 긋기이음(p.clientX, p.clientY); return; }
  if (집기 && e.touches.length === 2) {
    e.preventDefault();
    const [a, b] = e.touches;
    const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const cx = (a.clientX + b.clientX) / 2, cy = (a.clientY + b.clientY) / 2;
    // 두 손가락 비틀기 → 돌리기 (10-03 전무님) — 18° 넘게 비틀면 그때부터는 키우기 · 밀기를 멈추고 따라 돌기만
    let 돈 = 손각(a, b) - 집기.a0; while (돈 > Math.PI) 돈 -= 2 * Math.PI; while (돈 < -Math.PI) 돈 += 2 * Math.PI;
    집기.돈 = 돈;
    if (!집기.비틂 && Math.abs(돈) > 18 * Math.PI / 180 && (지금?.쪽수 || 지금?.그림)) {
      집기.비틂 = true; const r = $('#pages').getBoundingClientRect();
      $('#pages').style.transformOrigin = `${cx - r.left}px ${cy - r.top}px`;
    }
    if (집기.비틂) { $('#pages').style.transform = `rotate(${돈}rad)`; return; }
    확대하기(집기.z * d / 집기.d, cx, cy);
    // 두 손가락을 댄 채 끌면 가운데 점이 움직인 만큼 화면도 따라감 (10-03 전무님 · 도면과 같게)
    판.scrollLeft -= cx - 집기.cx; 판.scrollTop -= cy - 집기.cy;
    집기.cx = cx; 집기.cy = cy;
    return;
  }
  if (끌기 && e.touches.length === 1) {
    e.preventDefault();
    const p = e.touches[0], t = Date.now();
    const dx = p.clientX - 끌기.x, dy = p.clientY - 끌기.y, dt = Math.max(1, t - 끌기.t);
    판.scrollLeft -= dx; 판.scrollTop -= dy;
    끌기 = { x: p.clientX, y: p.clientY, vx: 0.8 * dx / dt + 0.2 * 끌기.vx, vy: 0.8 * dy / dt + 0.2 * 끌기.vy, t };
  }
}, { passive: false });
function 손뗌(e) {
  if (긋기 && e.touches.length === 0) 긋기끝();
  if (집기 && e.touches.length < 2) {
    const { 비틂, 돈 } = 집기; 집기 = null;
    if (비틂) {                                     // 30° 넘으면 가장 가까운 90° 로 (적어도 한 번) · 못 미치면 제자리
      $('#pages').style.transform = '';
      const 도 = 돈 * 180 / Math.PI;
      if (Math.abs(도) >= 30) 돌리기(Math.sign(도) * Math.max(1, Math.round(Math.abs(도) / 90)));
    }
    손모드(); 선명하게();
  }
  if (끌기 && e.touches.length === 0) {
    let { vx, vy } = 끌기; 끌기 = null;
    if (Date.now() - (톡시각 || 0) > 40 && Math.hypot(vx, vy) > 0.15) {     // 손을 뗀 뒤 미끄러지듯 조금 더
      let 앞 = performance.now();
      const 한걸음 = 지금 => {
        const dt = Math.min(32, 지금 - 앞); 앞 = 지금;
        판.scrollLeft -= vx * dt; 판.scrollTop -= vy * dt;
        vx *= Math.pow(0.995, dt); vy *= Math.pow(0.995, dt);
        미끄럼 = Math.hypot(vx, vy) > 0.02 ? requestAnimationFrame(한걸음) : 0;
        if (!미끄럼) 선명하게();
      };
      미끄럼 = requestAnimationFrame(한걸음);
    } else 선명하게();
  }
}
판.addEventListener('touchend', 손뗌);
판.addEventListener('touchcancel', e => { 집기 = null; 끌기 = null; if (긋기) 긋기끝(true); $('#pages').style.transform = ''; 손모드(); });

// ⑤-2 밤 보기 (0.9.8 ⑰ · 전무님 「계절별 일몰 후부터 일출 전까지 자동」) — 인터넷 · 위치 권한 없이 대전(36.35N 127.38E) 기준
//   해 뜨고 지는 시각은 NOAA 간이식 (한국 안 어디든 ±10분) · 밤이면 PDF · PPT 쪽을 어둡게(색 뒤집기 · 사진 · 그림 문서는 그대로) · 글 문서는 어두운 바탕
//   밤에만 머리에 🌙 — 누르면 이 문서만 잠깐 끔 / 다시 켬 · 5분마다 다시 봄
// ⑤-3 화면 안 꺼짐 (0.9.8 ⑮) — 문서를 보는 동안 늘 · 목록으로 나가면 폰 설정대로 (갤럭시 껍데기 keepScreen · 웹 Wake Lock)
function 해시각(t = new Date()) {
  const 위 = 36.35 * Math.PI / 180, 경 = 127.38, y = t.getUTCFullYear(), 처음 = Date.UTC(y, 0, 1), N = Math.floor((t - 처음) / 864e5) + 1;
  const γ = 2 * Math.PI / 365 * (N - 1), 식 = 229.18 * (0.000075 + 0.001868 * Math.cos(γ) - 0.032077 * Math.sin(γ) - 0.014615 * Math.cos(2 * γ) - 0.040849 * Math.sin(2 * γ));
  const 적 = 0.006918 - 0.399912 * Math.cos(γ) + 0.070257 * Math.sin(γ) - 0.006758 * Math.cos(2 * γ) + 0.000907 * Math.sin(2 * γ) - 0.002697 * Math.cos(3 * γ) + 0.00148 * Math.sin(3 * γ);
  const ha = Math.acos(Math.cos(90.833 * Math.PI / 180) / (Math.cos(위) * Math.cos(적)) - Math.tan(위) * Math.tan(적)) * 180 / Math.PI;
  const 날 = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
  return { 뜸: new Date(날 + (720 - 4 * (경 + ha) - 식) * 6e4), 짐: new Date(날 + (720 - 4 * (경 - ha) - 식) * 6e4) };
}
function 밤인가(t = new Date()) {                            // 한국 날짜 기준으로 그날 해를 봄
  const 한 = new Date(t.getTime() + 9 * 36e5), { 뜸, 짐 } = 해시각(new Date(Date.UTC(한.getUTCFullYear(), 한.getUTCMonth(), 한.getUTCDate(), 3)));
  return t < 뜸 || t >= 짐;
}
let 밤지금 = false; const 밤끔 = new Set();
function 밤적용() {
  const 밤 = 밤인가(), 켬 = 밤 && !!지금 && !밤끔.has(지금.id);
  if (켬 === 밤지금 && $('#nightbtn').hidden === !밤) return;
  밤지금 = 켬;
  $('#viewer').classList.toggle('밤', 켬);
  $('#nightbtn').hidden = !밤 || !지금; $('#nightbtn').classList.toggle('on', 켬);
  if (!$('#flow').hidden) 글설정입히기();
}
$('#nightbtn').addEventListener('click', () => { if (!지금) return; 밤끔.has(지금.id) ? 밤끔.delete(지금.id) : 밤끔.add(지금.id); 밤적용(); 칩(밤지금 ? '🌙 밤 보기 켬' : '밤 보기 끔 (이 문서만)'); });
setInterval(밤적용, 300000);
let 화면잠금 = null;
async function 화면켜둠(켬) {
  try { 다리.keepScreen?.(!!켬); } catch (e) {}
  if (!('wakeLock' in navigator)) return;
  try { if (켬 && !화면잠금 && document.visibilityState === 'visible') { 화면잠금 = await navigator.wakeLock.request('screen'); 화면잠금.addEventListener('release', () => (화면잠금 = null)); } else if (!켬 && 화면잠금) { await 화면잠금.release(); 화면잠금 = null; } } catch (e) {}
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && !$('#viewer').hidden) 화면켜둠(true); });

// ⑥ 뒤로 · 시작 ───────────────────────────────────
function 목록으로() {
  자리적기(); $('#resume').hidden = true; 화면켜둠(false);
  찾기닫기(); 표시마저쓰기(); 펜끄기(); 재기끄기(); 쪽목록닫기(); $('#memobox').hidden = true;
  $('#viewer').hidden = true; $('#home').hidden = false; 판닫기(); $('#zipbox').hidden = true; $('#zipbox').innerHTML = ''; 압축보기.비우기();
  if (지켜보기) 지켜보기.disconnect();
  for (const img of $('#flowin').querySelectorAll('img[src^="blob:"]')) URL.revokeObjectURL(img.src);
  $('#pages').querySelectorAll('img').forEach(그림놓기); $('#pages').innerHTML = ''; 흐름비우기(); 지금 = null; 밤적용();
  $('#plain').classList.remove('on'); $('#plainlab').textContent = '글자만';
  목록그리기();
}
$('#back').addEventListener('click', () => history.state?.v === 'viewer' ? history.back() : 목록으로());
window.addEventListener('popstate', () => {
  if (골 || 골뒤로) { 골뒤로 = false; 골닫기(false); return; }   // 골라 복사 틀에서 뒤로 = 틀만 닫음 (0.9.10)
  if (고름) {                                        // 고르기 중 뒤로 = 판 닫기 · 고르기 끝 (10-04)
    if (!$('#sheet').hidden) { 판닫기(); history.pushState({ v: '고르기' }, ''); return; }
    고름 = null; return 목록그리기();
  }
  if (!$('#cmpview').hidden) { 판닫기(); return 견닫기(); }      // 두 판 견주기에서 뒤로 (0.9.6)
  if (찾는중 && $('#viewer').hidden && history.state?.v !== '찾기') { 판닫기(); return 찾기닫기전체(); }   // 전체 찾기 화면에서 뒤로 (0.9.6)
  if (압축보기.뒤로()) return;                       // ZIP 폴더 · ZIP 에서 꺼내 연 문서 (10-04 · zipview.js)
  if (!$('#thumbs').hidden || (history.state?.v === 'viewer' && 지금)) { 쪽목록닫기(); 판닫기(); return; }   // 쪽 목록에서 뒤로 → 보기 화면
  if (!$('#sheet').hidden) { 판닫기(); if (지금) history.pushState({ v: 'viewer', 깊이: 지금.깊이 }, ''); return; }
  목록으로();
});

// ⑦ 화면 크기가 바뀔 때 (폴드를 펴고 접을 때 · 돌릴 때) — 맨 위에 보이던 문단 · 쪽으로 돌아가고 PDF 쪽은 새 너비로 다시 그림
//    비율로 돌아가면 글이 다시 줄바꿈되어 어긋남 (10-03 실측 0.50 → 0.84) → «맨 위 덩이» 를 기억
//    window 의 resize 신호에 기대지 않고 보기 화면 너비를 직접 지켜봄 (ResizeObserver) — 시험 창은 resize 를 안 보냄 (10-03)
let 표지 = null, 표지틀 = 0, 안정너비 = 0, 선명시계 = 0;
function 표지적기() {
  if (!지금) return;
  const 틀 = $('#flow').hidden ? $('#reader') : $('#flow');
  if (!안정너비 || Math.abs(틀.clientWidth - 안정너비) > 2) return;     // 너비가 바뀌는 중에는 새로 적지 않음
  if (틀.id === 'flow') {
    // 점으로 찍으면 문단 사이 빈틈에 걸려 못 적음 (10-03 실측) → 큰 덩이를 위에서부터 훑어 화면 위에 걸린 것
    const 위 = 틀.getBoundingClientRect().top;
    const 덩이들 = $('#flowin').firstElementChild?.children || [];
    for (const e of 덩이들) {
      const r = e.getBoundingClientRect();
      if (r.bottom > 위 + 1) { 표지 = { 틀: 'flow', e, 안쪽비율: Math.max(0, 위 - r.top) / Math.max(1, r.height) }; break; }
    }
    if (!덩이들.length && $('#flowin').firstElementChild) {        // TXT · 글자만 — 덩이가 하나뿐
      const e = $('#flowin').firstElementChild, r = e.getBoundingClientRect();
      표지 = { 틀: 'flow', e, 안쪽비율: Math.max(0, 위 - r.top) / Math.max(1, r.height) };
    }
  } else if (지금.쪽수) {
    let 쪽 = null;
    for (const pg of $('#pages').children) { if (pg.offsetTop + pg.offsetHeight > 틀.scrollTop) { 쪽 = pg; break; } }
    if (쪽) 표지 = { 틀: 'reader', e: 쪽, 비율: (틀.scrollTop - 쪽.offsetTop) / 쪽.offsetHeight };
  }
}
for (const k of ['reader', 'flow']) $('#' + k).addEventListener('scroll', () => {
  if (표지틀) return; 표지틀 = setTimeout(() => { 표지틀 = 0; 표지적기(); }, 80);     // 그리기(rAF)와 따로 — 그리기를 쉬는 창에서도 적힘
}, { passive: true });
new ResizeObserver(() => {
  const 틀 = $('#flow').hidden ? $('#reader') : $('#flow');
  const w = 틀.clientWidth;
  if (!w) return;                                                   // 보기 화면이 숨어 있음
  if (!안정너비 || Math.abs(w - 안정너비) < 40) { 안정너비 = w; return; }   // 처음 · 글자판처럼 작은 변화
  if (표지 && 표지.e.isConnected) {
    if (표지.틀 === 'flow') {
      const f = $('#flow');
      f.scrollTop += 표지.e.getBoundingClientRect().top - f.getBoundingClientRect().top + Math.min(0.9, 표지.안쪽비율) * 표지.e.offsetHeight;
    } else {
      $('#reader').scrollTop = 표지.e.offsetTop + 표지.비율 * 표지.e.offsetHeight;
    }
  }
  안정너비 = w;
  clearTimeout(선명시계);
  선명시계 = setTimeout(() => { if (지금?.쪽수) 선명하게(); }, 250);
}).observe($('#viewer'));

window.앱 = {
  받음() {                 // 껍데기가 «새 파일 받음» 을 알릴 때
    const s = 다리.takePending(); if (!s) return;
    let p; try { p = JSON.parse(s); } catch (e) { return; }
    if (p.error) { 목록으로(); 알림판('받은 파일을 못 읽음 → ' + p.error); return; }
    열기(p.id, true);
  },
};
window.판닫기 = 판닫기;
// DSM 서명 줄 (10-04) — 「DSM · 34 문서보기 · 판」 · 판은 껍데기(갤럭시 versionName 앞 낱말 · 웹 판 번호)에서
try { const 판 = String(다리.version?.() || '').split(' · ')[0].trim(); if (판) $('#sign').textContent = `DSM · 34 문서보기 · ${/^\d/.test(판) ? 'v' + 판 : 판}`; } catch (e) {}
목록그리기();
앱.받음();
