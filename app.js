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
};
const $ = s => document.querySelector(s);
const 글 = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ② 최근 목록 ──────────────────────────────────────
let 목록 = [];
function 목록그리기() {
  try { 목록 = JSON.parse(다리.recent() || '[]'); } catch (e) { 목록 = []; }
  $('#empty').hidden = 목록.length > 0;
  $('#list').hidden = 목록.length === 0;
  const 오늘0 = new Date(); 오늘0.setHours(0, 0, 0, 0);
  const 묶음 = { '오늘': [], '이번 주': [], '그 전': [] };
  for (const d of 목록) {
    const k = d.when >= 오늘0.getTime() ? '오늘' : d.when >= 오늘0.getTime() - 6 * 864e5 ? '이번 주' : '그 전';
    묶음[k].push(d);
  }
  let h = '';
  for (const [k, arr] of Object.entries(묶음)) {
    if (!arr.length) continue;
    h += `<div class="sec">${k}</div>`;
    for (const d of arr) {
      const ext = (d.ext || '').toLowerCase();
      const 딱지 = ['pdf', 'hwp', 'hwpx', 'doc', 'docx', 'txt'].includes(ext) ? ext : ['html', 'htm'].includes(ext) ? 'html' : ['xls', 'xlsx'].includes(ext) ? 'xls' : 그림형식.includes(ext) ? 'img' : ['dxf', 'dwg'].includes(ext) ? 'cad' : 'etc';
      h += `<div class="item" data-id="${글(d.id)}" role="button">
        <span class="badge b-${딱지}">${글((ext || '?').toUpperCase().slice(0, 4))}</span>
        <div class="t"><div class="n">${글(d.name)}</div><div class="s">${글(d.from || '')} · ${때(d.when)}${d.size > 0 ? ' · ' + 크기(d.size) : ''}</div>${d.메모 ? `<div class="memo">📝 ${글(d.메모.split('\n')[0].slice(0, 60))}</div>` : ''}</div>
        <button class="more" data-more="${글(d.id)}" aria-label="더 보기"><svg class="ico"><use href="#i-more"/></svg></button>
      </div>`;
    }
  }
  $('#list').innerHTML = h;
}
function 때(ms) {
  const d = new Date(ms), 오늘 = new Date();
  const hm = `${d.getHours() < 12 ? '오전' : '오후'} ${(d.getHours() % 12) || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
  return d.toDateString() === 오늘.toDateString() ? hm : `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
function 크기(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(b / 1024)) + 'KB'; }

$('#list').addEventListener('click', e => {
  const m = e.target.closest('[data-more]');
  if (m) { e.stopPropagation(); 더보기판(m.dataset.more); return; }
  const it = e.target.closest('.item');
  if (it) 열기(it.dataset.id, true);
});
$('#pick').addEventListener('click', () => 다리.pickFile());

function 판열기(html) { $('#sheet').onclick = null; $('#sheet').innerHTML = '<div class="grab"></div>' + html; $('#sheet').hidden = false; $('#dim').hidden = false; }
function 판닫기() { $('#sheet').hidden = true; $('#dim').hidden = true; }
$('#dim').addEventListener('click', 판닫기);
function 알림판(말) { 판열기(`<h3>${글(말)}</h3><button class="btn plain" onclick="판닫기()">닫기</button>`); }

function 더보기판(id) {
  const d = 목록.find(x => x.id === id); if (!d) return;
  판열기(`<h3>${글(d.name)}</h3>
    <button class="act" id="memoedit">📝 쪽지 ${d.메모 ? '고치기' : '쓰기'}</button>
    <button class="act warn" id="rm">목록에서 빼기 (폰 안의 사본 · 쪽지 · 펜 표시도 지움)</button>
    <button class="act" onclick="판닫기()">닫기</button>`);
  $('#rm').onclick = () => { 다리.remove(id); 판닫기(); 목록그리기(); };
  $('#memoedit').onclick = () => 쪽지판(d);
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
function 열기(id, 쌓기) {
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
  $('#cadbox').hidden = true; 도면판?.끝(); 도면판 = null;
  표시마저쓰기(); 펜끄기(); 재기끄기(); 쪽목록닫기(); 되돌릴것 = [];
  $('#cadbox').style.background = '';
  확대 = 1; $('#pages').style.width = '100%'; 미끄럼멈춤();
  지금 = { id, ext: (d.ext || '').toLowerCase(), d, 돌림: (Number(d.돌림) || 0) & 3, 표시: 표시읽기(id) };
  손모드(); 쪽지보이기();
  if (지금.표시.메모?.length) setTimeout(() => 지금?.id === id && 칩(`📝 메모 ${지금.표시.메모.length}개`), 700);
  if (지금.ext === 'pdf') return pdf열기(d);
  if (['txt', 'docx', 'hwpx', 'hwp', 'doc', 'xlsx', 'xls', 'html', 'htm'].includes(지금.ext)) return 글문서열기(d);
  if (그림형식.includes(지금.ext)) return 그림열기(d);
  if (지금.ext === 'dxf') return 도면열기(d);
  if (지금.ext === 'dwg') return 알림('<b>DWG → 못 엶</b><div class="sm">오토데스크 비공개 형식 · 보낸 분께 PDF 나 DXF 로 받기</div>');
  알림(`<b>아직 못 여는 형식 · ${글((지금.ext || '?').toUpperCase())}</b><div class="sm">되는 것 → PDF · 한글 · 워드 · TXT · 엑셀 · HTML · 그림 · DXF</div>`);
}
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

function 문서주소(d) { return 폰 ? `/doc/${encodeURIComponent(d.id)}` : 웹 ? `doc/${encodeURIComponent(d.id)}` : `_시험문서/${encodeURIComponent(d.name)}`; }   // 웹은 일꾼(sw.js)이 보관함에서 내줌
function 도구보이기(목록) {
  if (목록.length) 목록 = [...목록, 'share'];                  // 연 문서는 모두 「보내기」 (v0.7)
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
  const 종류 = { txt: 'TXT', docx: '워드', hwpx: '한글', hwp: '한글 (HWP)', doc: '옛 워드 (DOC)', xlsx: '엑셀', xls: '엑셀 (XLS)', html: 'HTML', htm: 'HTML' }[지금.ext];
  try {
    const 결과 = await 문서[지금.ext](buf);
    if (지금?.id !== d.id) return;
    안.innerHTML = ''; 안.append(결과.틀);
    $('#vsub').textContent = 종류 + (결과.덧 ? ' · ' + 결과.덧 : '');
    if (결과.알림) 알림(`<b>${글(결과.알림)}</b>`);
    if (!안.textContent.trim() && !안.querySelector('img')) 알림('<b>글자가 없는 문서</b><div class="sm">그림만 든 문서일 수 있음</div>');
    도구보이기(['txt', 'xlsx', 'xls'].includes(지금.ext) ? ['find', 'size'] : ['find', 'size', 'plain']);
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
  try { o = await PDF길.찾기(지금.id, q); }
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
    정보 = await PDF길.정보(d.id);
  } catch (e) {
    정보 = { error: '깨짐', detail: (폰 || 웹 ? '' : 'PC 시험 화면 · ') + String(e.message || e) };
  }
  if (지금?.id !== d.id) return;
  if (정보.error === '암호') return 알림('<b>암호 걸린 PDF → 아직 못 엶</b>');
  if (정보.error === '원본 없음') return 알림('<b>원본 없음</b><div class="sm">목록의 ⋯ → 목록에서 빼기 → 다시 받아 열기</div>');
  if (정보.error) return 알림(`<b>열 수 없음 · 파일이 깨졌을 수 있음</b><div class="sm">${글(정보.detail || 정보.error)}</div>`);
  지금.쪽수 = 정보.pages;
  $('#vsub').textContent = `PDF · ${정보.pages}쪽`;
  도구보이기(정보.pages < 2 ? ['find', 'rot', 'pen'] : ['goto', 'find', 'rot', 'pen']);
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
  PDF길.쪽(id, Number(p.dataset.n), w).then(주소 => {
    if (!img.isConnected || 지금?.id !== id || Number(img.dataset.w) !== w) return PDF길.놓기(주소);   // 그사이 비웠거나 다시 그림
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
  칩(`${n} / ${지금.쪽수}쪽`);
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
document.addEventListener('visibilitychange', () => { if (document.hidden) 표시마저쓰기(); });
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
  if (p) { $('#reader').scrollTop = p.offsetTop - 10; 칩(`${Number(p.dataset.n) + 1} / ${지금.쪽수}쪽`); }
}
function 쪽목록열기() {
  if (!지금?.쪽수) return;
  const N = 지금.쪽수, 지금쪽 = 보는쪽(), 그리드 = $('#tgrid');
  history.pushState({ v: 'thumbs' }, '');
  $('#thumbs').hidden = false;
  $('#tsub').textContent = `${N}쪽 · 지금 ${지금쪽 + 1}쪽`;
  $('#tn').max = N; $('#tn').value = '';
  그리드.innerHTML = [...$('#pages').children].map(pg => {
    const n = Number(pg.dataset.n);
    return `<button class="썸${n === 지금쪽 ? ' 지금' : ''}" data-n="${n}"><div class="썸틀" data-pw="${pg.dataset.pw}" data-ph="${pg.dataset.ph}"><div class="속"></div></div><span class="썸번호">${n + 1}${지금.표시.쪽[n] ? ' <i>✏</i>' : ''}${(지금.표시.메모 || []).some(m => m.k === String(n)) ? ' 📝' : ''}</span></button>`;
  }).join('');
  그리드.querySelectorAll('.썸틀').forEach(쪽모양);
  쪽목록지켜봄?.disconnect();
  쪽목록지켜봄 = new IntersectionObserver(es => {
    for (const e of es) {
      if (!e.isIntersecting || e.target.querySelector('img')) continue;
      const 틀 = e.target, im = new Image(); im.alt = ''; im.decoding = 'async';
      const w = Math.round(Math.min(600, 틀.clientWidth * (devicePixelRatio || 1) * (지금.돌림 & 1 ? 틀.dataset.pw / 틀.dataset.ph : 1)));
      im.onerror = () => { 그림놓기(im); im.remove(); };
      틀.firstChild.append(im);
      PDF길.쪽(지금.id, Number(틀.parentNode.dataset.n), Math.max(200, w)).then(주소 => (im.isConnected ? (im.src = 주소) : PDF길.놓기(주소)), () => im.remove());
    }
  }, { root: 그리드, rootMargin: '400px 0px' });
  그리드.querySelectorAll('.썸틀').forEach(t => 쪽목록지켜봄.observe(t));
  그리드.querySelector('.지금')?.scrollIntoView({ block: 'center' });
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
    if (표쪽.length) 줄.push(['표쪽', `✏ 펜 · 메모 있는 쪽만 → PDF (${표쪽.length}쪽)`]);
    if (지금.쪽수 <= 300) 줄.push(['모든쪽', `모든 쪽 → PDF (${지금.쪽수}쪽)`]);
    줄.push(['이쪽', `지금 보는 쪽만 → 그림 (${보는쪽() + 1}쪽)`]);
  } else if (지금.그림) 줄.push(['그림', '표시 입힌 그림']);
  else if (도면판) { 줄.push(['도면전체', '도면 전체 → 그림 (흰 바탕)']); 줄.push(['도면화면', '지금 보이는 만큼 → 그림 (흰 바탕)']); }
  줄.push(['원본', '원본 그대로']);
  판열기(`<h3>보내기 · ${글(d.name)}</h3>
    ${줄.map(([k, t]) => `<button class="act" data-k="${k}">${t}</button>`).join('')}
    <div class="판설명">${덧 && (지금.쪽수 || 지금.그림 || 도면판) ? `사본에 ${덧} 입힘 · ` : ''}원본은 안 고침 → 카톡 · 메일 고르는 창</div>`);
  $('#sheet').onclick = e => { const b = e.target.closest('[data-k]'); if (b) { 판닫기(); 사본보내기(b.dataset.k); } };
}
$('#share').addEventListener('click', 보내기판);
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
        진행(`사본 만드는 중 ${i + 1} / ${쪽들.length}쪽`);
        const pg = $('#pages').children[n], pw = +pg.dataset.pw, ph = +pg.dataset.ph;
        const w = Math.round(Math.min(2000, Math.max(800, pw * 2)));          // 1pt = 2화소 (144 dpi)
        const 주소 = await PDF길.쪽(id, n, w), im = await 보내기.그림받기(주소); PDF길.놓기(주소);
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
  찾기닫기(); 표시마저쓰기(); 펜끄기(); 재기끄기(); 쪽목록닫기(); $('#memobox').hidden = true;
  $('#viewer').hidden = true; $('#home').hidden = false; 판닫기();
  if (지켜보기) 지켜보기.disconnect();
  for (const img of $('#flowin').querySelectorAll('img[src^="blob:"]')) URL.revokeObjectURL(img.src);
  $('#pages').querySelectorAll('img').forEach(그림놓기); $('#pages').innerHTML = ''; $('#flowin').innerHTML = ''; 지금 = null;
  $('#plain').classList.remove('on'); $('#plainlab').textContent = '글자만';
  목록그리기();
}
$('#back').addEventListener('click', () => history.state?.v === 'viewer' ? history.back() : 목록으로());
window.addEventListener('popstate', () => {
  if (!$('#thumbs').hidden || (history.state?.v === 'viewer' && 지금)) { 쪽목록닫기(); 판닫기(); return; }   // 쪽 목록에서 뒤로 → 보기 화면
  if (!$('#sheet').hidden) { 판닫기(); if (지금) history.pushState({ v: 'viewer' }, ''); return; }
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
목록그리기();
앱.받음();
