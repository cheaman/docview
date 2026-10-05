// 위치 메모 (v0.7.1 · 2026-10-03 전무님 「메모넣기 · 화면에서 위치 선택 · 보이게/안 보이게 · 움직이고 크기 조정」)
// 펜 판의 「메모」 를 켜고 문서를 톡 → 그 자리에 메모. 보이게(노란 쪽지) 또는 숨김(📝 표만 · 누르면 펼침)
//   메모 켠 동안 : 쪽지를 끌면 옮김 · 오른쪽 아래 모서리를 끌면 너비 · 톡하면 고치기 / 메모 끈 동안 : 쪽지 톡 = 고치기 · 📝 톡 = 펼치기
// 저장은 펜 표시와 같은 파일(files/marks/<id>.json)의 「메모」 줄 · 원본은 안 고침
//   메모 = { id, k: 쪽 열쇠('0'… · 도면 'd'), x, y, w, f, 글, 숨김 }
//   PDF · 그림 : x · y 는 안 돌린 원래 쪽의 0~1 · w(너비) · f(글씨)는 쪽 틀 너비 비율 → 키우면 같이 커짐 (종이에 붙인 쪽지처럼)
//   도면 : x · y 는 도면 좌표 · w · f 는 화면 화소 (도면은 수천 배까지 키우므로 쪽지는 늘 같은 크기)
// 화면 → 이 파일만 · 사본(보내기)은 share.js 의 보내기.메모그리기
'use strict';
const 메모기본 = { 쪽: { w: 0.46, f: 0.04 }, 도면: { w: 200, f: 14 } };
const 메모모드 = () => 펜.켬 && 펜.메모;
function 메모들() { return 지금 ? (지금.표시.메모 ||= []) : []; }
// 안 돌린 쪽 (a, c) → 지금 보이는 쪽 틀 (u, v) — 쪽좌표() 의 거꾸로
function 보이는자리(a, c) { const 돌 = 지금?.돌림 || 0; return 돌 === 0 ? [a, c] : 돌 === 1 ? [1 - c, a] : 돌 === 2 ? [1 - a, 1 - c] : [c, 1 - a]; }

function 메모요소(m, 쪽) {
  const e = document.createElement('div'); e.dataset.id = m.id;
  const 크기 = (v, 단) => (쪽 ? v * 100 + 'cqw' : v + 'px');
  if (m.숨김) {
    e.className = '메모핀';
    e.innerHTML = `<span class="핀">📝</span><div class="메모말" style="font-size:${크기(m.f)}">${글(m.글)}</div>`;
  } else {
    e.className = '메모쪽';
    e.style.width = 크기(m.w); e.style.fontSize = 크기(m.f);
    e.innerHTML = `<div class="메모글">${글(m.글)}</div><div class="메모손잡이" aria-label="크기"></div>`;
  }
  if (쪽) {
    const [u, v] = 보이는자리(m.x, m.y);
    e.style.left = m.숨김 ? u * 100 + '%' : `min(${u * 100}%, calc(100% - ${m.w * 100}cqw))`;   // 쪽지가 쪽 밖으로 나가지 않게
    e.style.top = v * 100 + '%';
  }
  return e;
}
function 쪽메모그리기(p) {                              // PDF · 그림 쪽 틀 하나 (돌려도 글은 늘 똑바로 — 돌지 않는 층)
  if (!지금 || !p.classList.contains('pg')) return;
  let 층 = p.querySelector(':scope > .메모층');
  const 이것들 = 메모들().filter(m => m.k === p.dataset.n);
  if (!이것들.length) { 층?.remove(); return; }
  if (!층) { 층 = document.createElement('div'); 층.className = '메모층'; p.append(층); }
  층.replaceChildren(...이것들.map(m => 메모요소(m, true)));
}
function 도면메모그리기() {                             // 도면 — 쪽지를 한 번 만들고, 그릴 때마다 자리만 옮김
  const 층 = $('#cadnotes'); if (!층) return;
  층.replaceChildren(...메모들().filter(m => m.k === 'd').map(m => 메모요소(m, false)));
  도면메모배치();
}
function 도면메모배치() {
  const 층 = $('#cadnotes'); if (!층 || !도면판 || !층.childElementCount) return;
  const r = 층.getBoundingClientRect();
  for (const e of 층.children) {
    const m = 메모들().find(x => x.id === e.dataset.id); if (!m) continue;
    const [sx, sy] = 도면판.점화면(m.x, m.y);
    e.style.left = sx - r.left + 'px'; e.style.top = sy - r.top + 'px';
  }
}
function 메모다시(m) {
  if (m.k === 'd') return 도면메모그리기();
  const p = $('#pages').querySelector(`.pg[data-n="${m.k}"]`); if (p) 쪽메모그리기(p);
}

// 새 메모 · 고치기 판
function 새메모(k, x, y) {
  const 기본 = k === 'd' ? 메모기본.도면 : 메모기본.쪽;
  메모편집판({ id: Date.now().toString(36), k, x, y, w: 기본.w, f: 기본.f, 글: '', 숨김: false }, true);
}
function 메모편집판(m, 새것) {
  const 쪽 = m.k !== 'd';
  판열기(`<h3>📝 메모${쪽 && 지금?.쪽수 ? ` · ${Number(m.k) + 1}쪽` : ''}</h3>
    <textarea id="memoNote" rows="4" maxlength="5000" placeholder="이 자리에 남길 말"></textarea>
    <div class="opt"><span class="lab">보이기</span><div class="seg" id="메모보임"><button data-v="0" class="${m.숨김 ? '' : 'on'}">글 보이게</button><button data-v="1" class="${m.숨김 ? 'on' : ''}">📝 표만</button></div></div>
    <div class="opt"><span class="lab">글씨</span><div class="step"><button data-d="-1">가−</button><span class="v" id="메모글씨"></span><button data-d="1">가+</button></div></div>
    <div class="row 끝줄">${새것 ? '' : '<button class="btn plain warn" id="메모지움">메모 지우기</button>'}<span style="flex:1"></span><button class="btn plain" id="메모닫기">닫기</button><button class="btn" id="메모저장">저장</button></div>`);
  const 칸 = $('#memoNote'); 칸.value = m.글;
  let 숨김 = !!m.숨김, f = m.f;
  const 글씨보기 = () => ($('#메모글씨').textContent = 쪽 ? Math.round(f / 메모기본.쪽.f * 100) + '%' : Math.round(f) + 'px');
  글씨보기();
  $('#메모보임').onclick = e => { const b = e.target.closest('button'); if (!b) return; 숨김 = b.dataset.v === '1'; $('#메모보임').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); };
  $('#sheet').querySelector('.step').onclick = e => {
    const b = e.target.closest('[data-d]'); if (!b) return;
    f = 쪽 ? Math.min(0.12, Math.max(0.015, f * (b.dataset.d > 0 ? 1.15 : 1 / 1.15))) : Math.min(40, Math.max(11, f + Number(b.dataset.d) * 2));
    글씨보기();
  };
  $('#메모닫기').onclick = 판닫기;
  $('#메모저장').onclick = () => {
    const 새글 = 칸.value.replace(/\s+$/, '');
    if (!새글) { if (!새것) 메모빼기(m); 판닫기(); return; }
    Object.assign(m, { 글: 새글, 숨김, f });
    if (새것 && !메모들().includes(m)) 메모들().push(m);
    표시저장(); 메모다시(m); 판닫기();
  };
  if ($('#메모지움')) $('#메모지움').onclick = () => { 메모빼기(m); 판닫기(); };
  setTimeout(() => { 칸.focus(); 칸.setSelectionRange(칸.value.length, 칸.value.length); }, 60);
}
function 메모빼기(m) {
  const a = 메모들(), i = a.indexOf(m); if (i < 0) return;
  a.splice(i, 1); 표시저장(); 메모다시(m);
}

// 손가락 — 쪽지 · 📝 위에서 (메모를 켰을 때 끌기 · 너비, 껐을 때 톡)
let 메모끌기 = null;
function 메모손가락(층) {
  층.addEventListener('pointerdown', e => {
    const el = e.target.closest('.메모쪽, .메모핀'); if (!el) return;
    e.stopPropagation();
    if (!메모모드()) return;                          // 보기 중에는 끌지 않음 (스크롤과 헷갈리지 않게) — 톡은 click 에서
    const m = 메모들().find(x => x.id === el.dataset.id); if (!m) return;
    e.preventDefault();
    try { el.setPointerCapture(e.pointerId); } catch (오류) {}   // 손가락이 이미 떨어졌으면 못 잡음 — 그래도 끌기는 됨
    const r = el.getBoundingClientRect(), p = el.closest('.pg');
    메모끌기 = {
      m, el, p, id: e.pointerId, sx: e.clientX, sy: e.clientY, 움직임: false,
      손잡이: !!e.target.closest('.메모손잡이'), 너비: r.width,
      닻: m.숨김 ? [r.left + r.width / 2, r.top + r.height / 2] : [r.left, r.top],   // 쪽지는 왼쪽 위 · 📝 는 가운데가 자리
    };
  });
  층.addEventListener('pointermove', e => {
    const g = 메모끌기; if (!g || g.id !== e.pointerId) return;
    const dx = e.clientX - g.sx, dy = e.clientY - g.sy;
    if (!g.움직임 && Math.hypot(dx, dy) < 6) return;
    g.움직임 = true; e.preventDefault();
    if (g.손잡이) {
      const 새 = Math.max(90, g.너비 + dx);
      if (g.p) { g.m.w = Math.min(1, 새 / g.p.getBoundingClientRect().width); g.el.style.width = g.m.w * 100 + 'cqw'; }
      else { g.m.w = Math.min(600, 새); g.el.style.width = g.m.w + 'px'; }
      return;
    }
    const X = g.닻[0] + dx, Y = g.닻[1] + dy;
    if (g.p) {
      const q = 쪽좌표(g.p, X, Y); g.m.x = Math.min(1, Math.max(0, q.x)); g.m.y = Math.min(1, Math.max(0, q.y));
      const [u, v] = 보이는자리(g.m.x, g.m.y);
      g.el.style.left = g.m.숨김 ? u * 100 + '%' : `min(${u * 100}%, calc(100% - ${g.m.w * 100}cqw))`; g.el.style.top = v * 100 + '%';
    } else {
      [g.m.x, g.m.y] = 도면판.도면점(X, Y); 도면메모배치();
    }
  });
  const 뗌 = e => {
    const g = 메모끌기; if (!g || g.id !== e.pointerId) return;
    메모끌기 = null;
    if (g.움직임) { 표시저장(); 메모다시(g.m); }
    else if (e.type === 'pointerup') 메모편집판(g.m, false);
  };
  층.addEventListener('pointerup', 뗌); 층.addEventListener('pointercancel', 뗌);
  층.addEventListener('click', e => {                 // 메모를 끈 보기 중 — 📝 는 펼치기 · 쪽지는 고치기
    const el = e.target.closest('.메모쪽, .메모핀'); if (!el || 메모모드()) return;
    e.stopPropagation();
    const m = 메모들().find(x => x.id === el.dataset.id); if (!m) return;
    if (m.숨김 && !el.classList.contains('펼침')) { el.classList.add('펼침'); return; }
    메모편집판(m, false);
  });
}
메모손가락($('#pages'));
메모손가락($('#cadnotes'));
// 메모를 켜고 빈 곳을 톡 → 새 메모 (PDF · 그림). 도면은 dxf.js 가 톡을 알려 줌 (자료.메모톡)
$('#pages').addEventListener('click', e => {
  if (!메모모드() || e.target.closest('.메모쪽, .메모핀')) return;
  const p = e.target.closest('.pg'); if (!p || !p.dataset.pw || !p.querySelector('svg.mk')) return;
  const q = 쪽좌표(p, e.clientX, e.clientY);
  새메모(p.dataset.n, q.x, q.y);
});
