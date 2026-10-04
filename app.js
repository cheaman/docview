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
};
const 그림놓기 = img => { if (img?.src?.startsWith('blob:')) URL.revokeObjectURL(img.src); };
const 그림주소놓기 = u => { if (typeof u === 'string' && u.startsWith('blob:')) URL.revokeObjectURL(u); };
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
const PC꺼낸것 = [];
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
  $('#kinds').hidden = 목록.length === 0;
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
  $('#homebar').hidden = 켬; $('#selbar').hidden = !켬; $('#pick').hidden = 켬; $('#selfoot').hidden = !켬;
  if (!켬) return;
  const n = 고름.size, 보일것 = 목록.filter(통과);
  $('#selcnt').textContent = `${n}개 고름`;
  $('#selall').textContent = 보일것.length && 보일것.every(d => 고름.has(d.id)) ? '다 풀기' : '다 고르기';
  $('#seldel').textContent = n ? `${n}개 지우기` : '지우기';
  $('#seldel').disabled = !n; $('#selgroup').disabled = !n; $('#selfav').disabled = !n;
  $('#selfav').textContent = n && [...고름].every(id => 목록.find(d => d.id === id)?.즐겨) ? '⭐ 빼기' : '⭐ 즐겨찾기';
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
    시계 = setTimeout(() => { 시계 = 0; 길게됨 = true; 할일(t); setTimeout(() => (길게됨 = false), 800); }, 550);
  });
  const 그만 = e => { if (시계 && (!처음 || e.type !== 'pointermove' || Math.hypot(e.clientX - 처음[0], e.clientY - 처음[1]) > 10)) { clearTimeout(시계); 시계 = 0; } };
  for (const k of ['pointerup', 'pointercancel', 'pointermove', 'pointerleave']) 틀.addEventListener(k, 그만);
  틀.addEventListener('contextmenu', e => { if (e.target.closest(고름표)) e.preventDefault(); });
}
길게($('#list'), '.item', it => { navigator.vibrate?.(15); 고르기시작(it.dataset.id); });
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
  찾기닫기(); $('#flowin').innerHTML = ''; $('#flow').hidden = true; $('#reader').hidden = false;
  $('#cadbox').hidden = true; 도면판?.끝(); 도면판 = null; $('#zipbox').hidden = true;
  표시마저쓰기(); 펜끄기(); 재기끄기(); 쪽목록닫기(); 되돌릴것 = [];
  $('#bmk').hidden = true; $('#resume').hidden = true;
  $('#cadbox').style.background = '';
  확대 = 1; $('#pages').style.width = '100%'; 미끄럼멈춤();
  지금 = { id, ext: (d.ext || '').toLowerCase(), d, 돌림: (Number(d.돌림) || 0) & 3, 표시: 표시읽기(id), 깊이: 덧.깊이 || 0, 압축에서: 덧.압축에서 };
  손모드(); 쪽지보이기();
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
    도구보이기(['rot', 'pen']);
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
      메모톡: (x, y) => 새메모('d', x, y), 그린뒤: () => 도면메모배치(),
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
    자리되살리기(); 책갈피단추();
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
    안.innerHTML = '';
    안.append(Object.assign(document.createElement('div'), { className: '글자만', textContent: 글자 }));
    지금.글자만 = true;
  } else {
    const 결과 = await 문서[지금.ext](지금.buf);
    안.innerHTML = ''; 안.append(결과.틀);
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
  안.classList.toggle('바탕-어둡게', 글설정.바탕 === '어둡게');
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
  if (!찾은것.length) { $('#fcnt').textContent = '없음'; return; }
  찾아가기(0);
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
    찾은것.push(h.b.map(([l, t, r, b]) => {
      const e = document.createElement('div'); e.className = '찾은칸';
      Object.assign(e.style, { left: l * 100 + '%', top: t * 100 + '%', width: (r - l) * 100 + '%', height: (b - t) * 100 + '%' });
      속.insertBefore(e, 속.querySelector('svg.mk')); return e;
    }));
  }
  찾은것.더 = o.more;
  찾아가기(0);
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
  도구보이기([...(정보.pages < 2 ? [] : ['goto']), 'find', 'rot', 'pen', ...(ppt ? ['pptmode'] : [])]);
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
  자리되살리기(); 책갈피단추();
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
  const 그림 = 획 => `<path d="${획경로(획, W, H)}" ${획모양(획, W)}/>`;
  svg.innerHTML = 획들.filter(획 => !형광인가(획.c)).map(그림).join('');
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
  const q = 쪽좌표(긋기.p, x, y), a = 긋기.획.p, n = a.length;
  if (Math.hypot(q.x - a[n - 2], q.y - a[n - 1]) * 긋기.화소 < 1.5) return;
  a.push(네자리(q.x), 네자리(q.y)); 긋기.화면.push(x, y); 긋기그림();
}
function 긋기끝(버림) {
  const g = 긋기; 긋기 = null;
  if (!g?.획) return;
  if (버림) { g.path.remove(); return; }
  const 곧은 = 형광인가(g.획.c) && 곧게(g.화면);              // 형광을 거의 곧게 그었으면 반듯한 줄로 (화면 기준 가로 · 세로)
  if (곧은) { const a = 쪽좌표(g.p, 곧은[0], 곧은[1]), b = 쪽좌표(g.p, 곧은[2], 곧은[3]); g.획.p = [a.x, a.y, b.x, b.y].map(네자리); }
  g.path.remove(); 표시바꿈(g.p.dataset.n, { 더함: g.획 });
}
function 쪽지우기(x, y) {                                  // 손가락 둘레 14 화소 안에 닿은 획을 통째로 뺌
  const p = document.elementFromPoint(x, y)?.closest('#pages .pg'); if (!p) return;
  const q = 쪽좌표(p, x, y), H비 = p.dataset.ph / p.dataset.pw;
  for (const 획 of [...(지금.표시.쪽[p.dataset.n] || [])]) {
    const 둘레 = (14 / q.화소) + 획.w / 2, a = 획.p;
    for (let k = 0; k < a.length; k += 2) {
      if (Math.abs(a[k] - q.x) < 둘레 && Math.abs(a[k + 1] - q.y) * H비 < 둘레) { 표시바꿈(p.dataset.n, { 뺌: 획 }); break; }
    }
  }
}
function 펜판갱신() {
  $('#penbar').hidden = !펜.켬;
  if (!펜.켬) $('#penpal').hidden = true;
  $('#pen').classList.toggle('on', 펜.켬);
  const 형광 = 형광인가(펜.색);
  for (const b of $('#penbar').querySelectorAll('[data-m]')) b.classList.toggle('on', 펜.메모 ? b.dataset.m === '메모' : !펜.지우개 && b.dataset.m !== '메모' && (b.dataset.m === '형광') === 형광);
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
function 펜끄기() { 펜.켬 = false; 펜.지우개 = false; 펜.메모 = false; 긋기 = null; 도면판?.펜({ ...펜 }); 펜판갱신(); 손모드(); }
$('#pen').addEventListener('click', () => {
  if (펜.켬) return 펜끄기();
  if (!$('#measbar').hidden) 재기끄기();
  펜.켬 = true; 펜.지우개 = false; 도면판?.펜({ ...펜 }); 펜판갱신(); 손모드();
  칩('한 손가락 긋기 · 두 손가락 밀기');
});
$('#penpal').addEventListener('click', e => {
  const b = e.target.closest('[data-c]'); if (!b) return;
  펜.색 = b.dataset.c; 형광인가(펜.색) ? (펜.형광색 = 펜.색) : (펜.펜색 = 펜.색); 펜.지우개 = false;
  $('#penpal').hidden = true; 펜설정저장();
  도면판?.펜({ ...펜 }); 펜판갱신();
});
$('#penbar').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.m === '메모') {                       // 위치 메모 (memo.js) — 톡한 자리에 메모
    펜.메모 = true; 펜.지우개 = false; $('#penpal').hidden = true; 긋기 = null;
    칩('메모 넣을 곳을 톡 · 쪽지는 끌어 옮김');
  }
  else if (b.dataset.m) {                              // 펜 ↔ 형광 — 각자 마지막 색으로
    const 형광 = b.dataset.m === '형광', 메모였음 = 펜.메모; 펜.메모 = false;
    if (형광인가(펜.색) === 형광 && !펜.지우개 && !메모였음) { $('#penpal').hidden = !$('#penpal').hidden; if (!$('#penpal').hidden) 색줄그리기(); return; }
    펜.색 = 형광 ? 펜.형광색 : 펜.펜색; 펜.지우개 = false; $('#penpal').hidden = true; 펜설정저장();
  }
  else if (b.id === 'pencolor') { 펜.지우개 = false; 펜.메모 = false; $('#penpal').hidden = !$('#penpal').hidden; 색줄그리기(); }
  else if (b.id === 'eraser') { 펜.지우개 = !펜.지우개; 펜.메모 = false; $('#penpal').hidden = true; }
  else if (b.id === 'undo') 되돌리기();
  else if (b.id === 'penoff') return 펜끄기();
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
  쪽목록책만 = false; 쪽목록칩();
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
// 쪽 목록 위 칩 「모든 쪽 · 🔖 3」 (10-05) — 책갈피가 있을 때만
let 쪽목록책만 = false;
function 쪽목록칩() {
  const 책 = new Set(책갈피쪽들()), k = $('#tkinds');
  k.hidden = !책.size; if (!책.size) 쪽목록책만 = false;
  k.innerHTML = `<button class="칩${쪽목록책만 ? '' : ' on'}" data-t="모두">모든 ${단위()} <i>${지금.쪽수}</i></button><button class="칩${쪽목록책만 ? ' on' : ''}" data-t="책">🔖 <i>${책.size}</i></button>`;
  $('#tgrid').querySelectorAll('.썸').forEach(b => (b.style.display = 쪽목록책만 && !책.has(Number(b.dataset.n)) ? 'none' : ''));
}
$('#tkinds').addEventListener('click', e => { const c = e.target.closest('[data-t]'); if (!c) return; 쪽목록책만 = c.dataset.t === '책'; 쪽목록칩(); $('#tgrid').scrollTop = 0; });
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
    if (p > 0 || 비 > 0.02 || 확대 > 1.01) o = { p, r: +비.toFixed(4), c: 보는쪽(), n: 지금.쪽수, ...(확대 > 1.01 ? { z: +확대.toFixed(3), x: 옆 > 0 ? +(r.scrollLeft / 옆).toFixed(4) : 0 } : {}) };
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
    if (o.z > 1.01) { 확대 = Math.min(4, o.z); $('#pages').style.width = (100 * 확대) + '%'; 손모드(); }
    r.scrollTop = pg.offsetTop + (o.r || 0) * pg.offsetHeight;
    if (o.x) r.scrollLeft = o.x * (r.scrollWidth - r.clientWidth);
    이어봄알림(`보던 ${Math.min(지금.쪽수, (o.c ?? o.p) + 1)}${단위()}에서 이어 봄${o.z > 1.01 ? ` · ${Math.round(o.z * 100)}%` : ''}`);
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
  if (!o.점수) t = '재고 싶은 곳을 톡 → 점 · 끝점에 붙음' + (단 ? ` · 단위 ${단}` : ' · 도면에 단위 없음');
  else if (o.점수 === 1) t = '다음 점을 톡';
  else {
    t = `거리 <b>${길(o.마지막)}</b>`;
    if (o.점수 > 2) t += ` · 합 ${길(o.합)}`;
    if (o.점수 > 2) t += ' · 넓이 ' + (미터 ? `<b>${수(o.면적 * 미터 * 미터)} m²</b>` : `<b>${수(o.면적)}</b> <span class="흐림">(mm 라면 ${수(o.면적 / 1e6)} m²)</span>`);
  }
  $('#meastext').innerHTML = t;
  $('#measundo').disabled = !o.점수;
}
function 재기끄기() { $('#measbar').hidden = true; $('#measure').classList.remove('on'); 도면판?.재기켬(false); }
$('#measure').addEventListener('click', () => {
  if (!$('#measbar').hidden) return 재기끄기();
  if (펜.켬) 펜끄기();
  $('#measbar').hidden = false; $('#measure').classList.add('on');
  도면판?.재기켬(true);
});
$('#measundo').addEventListener('click', () => 도면판?.재기빼기());
$('#measclear').addEventListener('click', () => 도면판?.재기새로());
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
async function 지금그림캔버스() {
  const d = 지금.d, id = 지금.id, 번호표 = { n: 0, 목록: [] };
  let c = null;
  if (지금.쪽수) {
    const n = 보는쪽(), pg = $('#pages').children[n], pw = +pg.dataset.pw;
    const 주소 = await 쪽길().쪽(id, n, Math.round(Math.min(2000, Math.max(800, pw * 2)))), im = await 보내기.그림받기(주소); 그림주소놓기(주소);
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
  if (c && 번호표.목록.length) c = 보내기.아래목록(c, 번호표.목록);
  return c;
}
$('#copy').addEventListener('click', () => {
  if (!지금 || 보내는중) return;
  const 긴칩 = 말 => { 칩(말); clearTimeout(칩시계); 칩시계 = setTimeout(() => ($('#chip').hidden = true), 2800); };
  const 그림약속 = (async () => {
    const c = await 지금그림캔버스(); if (!c) throw new Error('복사할 그림 없음');
    const b = await new Promise(ok => c.toBlob(ok, 'image/png')); c.width = c.height = 0;
    if (!b) throw new Error('그림 만들기 실패 (메모리)');
    return b;
  })();
  칩('복사하는 중…');
  const 끝 = p => p.then(() => 긴칩('📋 복사됨 → 다른 앱에서 길게 눌러 붙여넣기'), e => { $('#chip').hidden = true; 알림(`<b>복사 안 됨</b><div class="sm">${글(e?.message || e)} → 「보내기」 로</div>`); });
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
});
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
  새 = Math.min(4, Math.max(1, 새));
  if (Math.abs(새 - 옛) < 0.001) return;
  const box = r.getBoundingClientRect();
  const px = r.scrollLeft + (cx - box.left), py = r.scrollTop + (cy - box.top);
  확대 = 새;
  $('#pages').style.width = (100 * 확대) + '%';
  r.scrollLeft = px * 새 / 옛 - (cx - box.left);
  r.scrollTop = py * 새 / 옛 - (cy - box.top);
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
    if (t - 톡시각 < 300) { 확대하기(확대 > 1.05 ? 1 : 2, p.clientX, p.clientY); 손모드(); 선명하게(); 톡시각 = 0; 끌기 = null; return; }
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

// ⑥ 뒤로 · 시작 ───────────────────────────────────
function 목록으로() {
  자리적기(); $('#resume').hidden = true;
  찾기닫기(); 표시마저쓰기(); 펜끄기(); 재기끄기(); 쪽목록닫기(); $('#memobox').hidden = true;
  $('#viewer').hidden = true; $('#home').hidden = false; 판닫기(); $('#zipbox').hidden = true; $('#zipbox').innerHTML = ''; 압축보기.비우기();
  if (지켜보기) 지켜보기.disconnect();
  for (const img of $('#flowin').querySelectorAll('img[src^="blob:"]')) URL.revokeObjectURL(img.src);
  $('#pages').querySelectorAll('img').forEach(그림놓기); $('#pages').innerHTML = ''; $('#flowin').innerHTML = ''; 지금 = null;
  $('#plain').classList.remove('on'); $('#plainlab').textContent = '글자만';
  목록그리기();
}
$('#back').addEventListener('click', () => history.state?.v === 'viewer' ? history.back() : 목록으로());
window.addEventListener('popstate', () => {
  if (고름) {                                        // 고르기 중 뒤로 = 판 닫기 · 고르기 끝 (10-04)
    if (!$('#sheet').hidden) { 판닫기(); history.pushState({ v: '고르기' }, ''); return; }
    고름 = null; return 목록그리기();
  }
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
