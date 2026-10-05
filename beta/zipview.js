// ZIP 보기 (10-04 · 전무님 「휴대폰에서 ZIP 풀기가 너무 복잡」) — 풀지 않고 안을 봄 · 갤럭시 · 아이폰 같은 코드
// 구역 지도
//   ① 열기 — 원본을 읽어 목차만 (zip.js) · 마지막 ZIP 하나는 기억해 뒤로 올 때 다시 안 읽음
//   ② 그리기 — 길(폴더) · 요약 · 폴더 먼저 · 파일 (첫 화면 목록과 같은 줄)
//   ③ 꺼내 열기 — 안 파일을 꺼내 최근 목록에 넣고 그대로 엶 (PDF · 한글 · 펜 · 보내기 모두 그대로)
//   ④ ⋯ 판 — 보내기 · 폰에 저장 (갤럭시 : 다운로드 › 문서보기 · 아이폰 : 보내기 판의 「파일 앱에 저장」)
//   ⑤ 모두 풀어 저장 (갤럭시) — 다운로드 › 문서보기 › <ZIP 이름> 에 폴더째
//   ⑥ 암호 — 옛 방식만 (zip.js) · 새 방식(AES) 은 못 푼다고 알림
//   ⑦ 뒤로 — 폴더마다 기록 한 칸 { v:'viewer', 깊이, zip폴더 } · 꺼내 연 문서는 깊이 +1 → 뒤로 = 그 ZIP 의 그 폴더
'use strict';
const 압축보기 = (() => {
  let 기억 = null;            // { id, z, 암호 } — 마지막 ZIP
  let 상태 = null;            // { id, d, 것, 폴더, 깊이, 압축에서, 파일들 }
  const 버림 = /(^|\/)(__MACOSX\/|\.DS_Store$|Thumbs\.db$|desktop\.ini$)/i;
  const 확장자 = n => (n.match(/\.([^./]+)$/)?.[1] || '').toLowerCase();
  const 파일이름 = f => f.길.split('/').pop();
  const 단 = 폴더 => 폴더.split('/').filter(Boolean).length;
  const 꼴 = n => ({ pdf: 'application/pdf', txt: 'text/plain', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic',
    hwp: 'application/x-hwp', hwpx: 'application/haansofthwpx', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', html: 'text/html', htm: 'text/html', zip: 'application/zip', mp4: 'video/mp4' }[확장자(n)] || 'application/octet-stream');
  const 진행 = 말 => { const c = $('#chip'); c.textContent = 말; c.hidden = false; clearTimeout(칩시계); };
  const 진행끝 = () => { $('#chip').hidden = true; };

  // ① 열기 ─────────────────────────────────────────
  async function 펼치기(d, 폴더) {
    const 틀 = $('#zipbox');
    $('#reader').hidden = true; $('#flow').hidden = true; 틀.hidden = false;
    틀.innerHTML = '<div class="zip요약">여는 중…</div>';
    $('#vsub').textContent = 'ZIP · 여는 중…';
    let 것 = 기억?.id === d.id ? 기억 : null;
    if (!것) {
      기억 = null;                                     // 옛 ZIP 은 먼저 놓음 (폰 메모리)
      let buf;
      try { const r = await fetch(문서주소(d)); if (!r.ok) throw new Error(r.status === 404 ? '원본 없음' : 'HTTP ' + r.status); buf = await r.arrayBuffer(); }
      catch (e) {
        틀.hidden = true;
        return 알림(String(e.message).includes('원본 없음') ? '<b>원본 없음</b><div class="sm">목록의 ⋯ → 목록에서 빼기 → 다시 받아 열기</div>' : `<b>열 수 없음</b><div class="sm">${글(e.message)}</div>`);
      }
      if (지금?.id !== d.id) return;
      try { 것 = { id: d.id, z: await 압축열기(buf), 암호: '' }; }
      catch (e) { 틀.hidden = true; return 알림(`<b>ZIP 을 못 읽음 · 깨졌거나 ZIP 이 아님</b><div class="sm">${글(e.message)}</div>`); }
      기억 = 것;
    }
    if (지금?.id !== d.id) return;
    const 파일들 = 것.z.항목들.filter(f => !f.폴더 && !버림.test(f.이름));
    파일들.forEach((f, i) => { f.번 = i; f.길 = f.이름.replace(/^(\.?\/)+/, ''); });
    상태 = { id: d.id, d, 것, 폴더: 폴더 ?? '', 깊이: 지금.깊이, 압축에서: 지금.압축에서, 파일들 };
    if (폴더 == null) {                                  // 처음 열 때 — 맨 위에 폴더 하나뿐이면 그 안으로 (폴더째 묶은 ZIP 이 많음)
      const 위 = 칸나누기('');
      if (!위.파일.length && 위.폴더.size === 1) {
        상태.폴더 = [...위.폴더.keys()][0] + '/';
        history.pushState({ v: 'viewer', 깊이: 상태.깊이, zip폴더: 상태.폴더 }, '');
      }
    }
    const 합 = 파일들.reduce((s, f) => s + f.크기, 0);
    $('#vsub').textContent = `ZIP · 파일 ${파일들.length.toLocaleString()}개 · 풀면 ${크기(합)}`;
    도구보이기(['share']);                               // 보내기 = 이 ZIP 원본 그대로
    if (!파일들.length) { 틀.hidden = true; return 알림('<b>빈 ZIP</b><div class="sm">안에 파일이 없음</div>'); }
    그리기();
  }
  function 칸나누기(앞) {
    const 폴더 = new Map(), 파일 = [];
    for (const f of 상태.파일들) {
      if (!f.길.startsWith(앞)) continue;
      const 나머지 = f.길.slice(앞.length), i = 나머지.indexOf('/');
      if (i < 0) { 파일.push(f); continue; }
      const k = 나머지.slice(0, i), o = 폴더.get(k) || { 수: 0, 크기: 0 };
      o.수++; o.크기 += f.크기; 폴더.set(k, o);
    }
    return { 폴더, 파일 };
  }

  // ② 그리기 ───────────────────────────────────────
  const 견줌 = (a, b) => a.localeCompare(b, 'ko', { numeric: true });
  const 날짜 = f => f.날 ? `${(f.날 >> 9) + 1980}.${(f.날 >> 5) & 15}.${f.날 & 31}` : '';
  function 그리기() {
    const 앞 = 상태.폴더, { 폴더, 파일 } = 칸나누기(앞), 마디 = 앞.split('/').filter(Boolean);
    let h = `<div class="zip길"><button data-go="" class="${마디.length ? '' : '지금'}">📦 ${글(상태.d.name)}</button>`;
    마디.forEach((m, i) => { h += `<span class="사이">›</span><button data-go="${글(마디.slice(0, i + 1).join('/') + '/')}" class="${i === 마디.length - 1 ? '지금' : ''}">${글(m)}</button>`; });
    h += '</div>';
    const 암호있음 = 상태.파일들.some(f => f.암호);
    h += `<div class="zip요약">${마디.length ? '이 폴더 → ' : ''}${폴더.size ? `폴더 ${폴더.size} · ` : ''}파일 ${파일.length}${암호있음 ? ' · 🔒 암호 걸림' : ''} · 누르면 바로 봄</div>`;
    // 「모두 풀어 저장」 — 맨 위 · 첫 폴더까지 (폴더째 묶은 ZIP 은 열면 바로 첫 폴더라서)
    if (마디.length <= 1 && (다리.saveBegin || 다리.saveBytes)) h += `<button class="zip모두" id="zipall">⬇ 모두 풀어 폰에 저장 (${상태.파일들.length}개)</button>`;
    if (마디.length) h += '<div class="item" data-up="1" role="button"><span class="badge b-dir">↰</span><div class="t"><div class="n">위 폴더로</div></div></div>';
    for (const k of [...폴더.keys()].sort(견줌)) {
      const o = 폴더.get(k);
      h += `<div class="item" data-dir="${글(앞 + k + '/')}" role="button"><span class="badge b-dir">📁</span><div class="t"><div class="n">${글(k)}</div><div class="s">파일 ${o.수} · ${크기(o.크기)}</div></div></div>`;
    }
    for (const f of 파일.sort((a, b) => 견줌(파일이름(a), 파일이름(b)))) {
      const 이름 = 파일이름(f), ext = 확장자(이름);
      h += `<div class="item" data-i="${f.번}" role="button"><span class="badge b-${딱지(ext)}">${글((ext || '?').toUpperCase().slice(0, 4))}</span>
        <div class="t"><div class="n">${글(이름)}</div><div class="s">${크기(f.크기)}${날짜(f) ? ' · ' + 날짜(f) : ''}${f.암호 ? ' · <span class="자물쇠">🔒</span>' : ''}</div></div>
        <button class="more" data-fm="${f.번}" aria-label="더 보기"><svg class="ico"><use href="#i-more"/></svg></button></div>`;
    }
    const 틀 = $('#zipbox'); 틀.innerHTML = h; 틀.scrollTop = 0;
  }
  function 폴더로(새) {
    const 옛단 = 단(상태.폴더), 새단 = 단(새);
    if (새단 < 옛단 && 상태.폴더.startsWith(새)) return history.go(새단 - 옛단);   // 윗 폴더 — 기록을 그만큼 되감음 (뒤로와 같게)
    if (새 === 상태.폴더) return;
    상태.폴더 = 새;
    history.pushState({ v: 'viewer', 깊이: 상태.깊이, zip폴더: 새 }, '');
    그리기();
  }
  document.querySelector('#zipbox').addEventListener('click', e => {
    if (!상태 || 지금?.id !== 상태.id) return;
    const g = e.target.closest('[data-go]'); if (g) return 폴더로(g.dataset.go);
    const m = e.target.closest('[data-fm]'); if (m) { e.stopPropagation(); return 더보기(상태.파일들[+m.dataset.fm]); }
    if (e.target.closest('#zipall')) return 모두저장();
    const it = e.target.closest('.item'); if (!it) return;
    if (it.dataset.up) return 폴더로(상태.폴더.replace(/[^/]+\/$/, ''));
    if (it.dataset.dir != null) return 폴더로(it.dataset.dir);
    if (it.dataset.i != null) 꺼내열기(상태.파일들[+it.dataset.i]);
  });

  // ③ 꺼내 열기 ────────────────────────────────────
  let 바쁨 = false;
  async function 꺼내열기(f) {
    if (바쁨) return; 바쁨 = true;
    try {
      진행('꺼내는 중…');
      const b = await 바이트얻기(f); if (!b) return;
      진행('꺼내는 중…');
      let id;
      try { id = await 넣기(파일이름(f), b); } catch (e) { return 알림(`<b>꺼내기 실패</b><div class="sm">${글(e.message || e)}</div>`); }
      if (!id) return 알림('<b>꺼내기 실패 · 폰 저장 공간 확인</b>');
      const 곳 = { id: 상태.id, 폴더: 상태.폴더, 깊이: 상태.깊이, 압축에서: 상태.압축에서 };
      history.pushState({ v: 'viewer', 깊이: 상태.깊이 + 1 }, '');
      열기(id, false, { 깊이: 상태.깊이 + 1, 압축에서: 곳 });
    } finally { 진행끝(); 바쁨 = false; }
  }
  async function 조각보내기(b, 보냄) {                  // 다리로는 글자만 오가므로 base64 조각(384KB) — share.js 와 같음
    const 크기 = 393216;
    for (let i = 0; i < b.length; i += 크기) {
      const 덩 = b.subarray(i, i + 크기); let s = '';
      for (let k = 0; k < 덩.length; k += 8192) s += String.fromCharCode.apply(null, 덩.subarray(k, k + 8192));
      if (!보냄(btoa(s))) throw new Error('쓰기 실패 (폰 저장 공간?)');
      if (i % (크기 * 8) === 0) await new Promise(r => setTimeout(r));
    }
  }
  async function 넣기(이름, b) {                       // 최근 목록에 새 문서로 — 같은 이름 · 크기면 옛 줄을 갈음 (껍데기 · web.js)
    const 어디서 = '압축 · ' + 상태.d.name;
    if (다리.addBytes) return 다리.addBytes(이름, 어디서, b);      // 아이폰 웹앱 · PC 시험
    if (!다리.addBegin) throw new Error('앱이 옛 판 → 새 판(0.8.1 이상) 설치');
    if (!다리.addBegin(이름, 어디서)) throw new Error('파일을 못 만듦');
    await 조각보내기(b, s => 다리.addChunk(s));
    return 다리.addEnd();
  }
  async function 저장하나(폴더, 이름, b) {             // 갤럭시 — 다운로드 › 문서보기 › 폴더
    if (다리.saveBytes) return 다리.saveBytes(폴더, 이름, b);
    if (!다리.saveBegin || !다리.saveBegin(폴더, 이름)) return false;
    await 조각보내기(b, s => 다리.saveChunk(s));
    return 다리.saveEnd();
  }

  // ⑥ 암호 ─────────────────────────────────────────
  let 취소함 = false;
  async function 바이트얻기(f) {
    취소함 = false;
    for (;;) {
      try { return await 상태.것.z.바이트(f.이름, 상태.것.암호); }
      catch (e) {
        if (e.코드 === '암호필요' || e.코드 === '암호틀림') {
          진행끝();
          const 암 = await 암호묻기(e.코드 === '암호틀림' && !!상태.것.암호);
          if (암 == null) { 취소함 = true; return null; }
          상태.것.암호 = 암; 진행('푸는 중…'); continue;
        }
        알림(오류글(e)); return null;
      }
    }
  }
  function 오류글(e) {
    if (e.코드 === 'AES') return '<b>새 방식(AES) 암호 → 이 앱에선 못 풂</b><div class="sm">보낸 분께 암호 없는 ZIP 으로 받거나 PC 에서 풀기</div>';
    if (e.코드 === '방식') return `<b>못 푸는 압축 방식 · ${글(e.message)}</b><div class="sm">보낸 분께 보통 ZIP 으로 받기</div>`;
    return `<b>꺼내기 실패 · 압축이 깨졌을 수 있음</b><div class="sm">${글(e.message || e)}</div>`;
  }
  function 암호묻기(틀림) {
    return new Promise(ok => {
      판열기(`<h3>🔒 암호 걸린 ZIP</h3>
        <div class="판설명"${틀림 ? ' style="color:#c0392b"' : ''}>${틀림 ? '암호가 틀림 → 다시 넣기' : '보낸 분께 받은 암호 → 한 번 넣으면 이 ZIP 은 다시 안 물음'}</div>
        <div class="row"><input id="zippw" type="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="암호" enterkeyhint="go"></div>
        <div class="row 끝줄"><span style="flex:1"></span><button class="btn plain" id="zippwno">닫기</button><button class="btn" id="zippwok">풀기</button></div>`);
      let 끝 = false;
      const 닫음 = v => { if (끝) return; 끝 = true; 판닫기(); ok(v); };
      $('#zippwok').onclick = () => 닫음($('#zippw').value);
      $('#zippwno').onclick = () => 닫음(null);
      $('#zippw').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); 닫음($('#zippw').value); } };
      $('#dim').addEventListener('click', () => 닫음(null), { once: true });
      setTimeout(() => $('#zippw')?.focus(), 60);
    });
  }

  // ④ ⋯ 판 ─────────────────────────────────────────
  function 더보기(f) {
    const 이름 = 파일이름(f), 폰저장 = !!(다리.saveBegin || 다리.saveBytes);
    판열기(`<h3>${글(이름)}</h3>
      <button class="act" data-k="열기">열어 보기</button>
      <button class="act" data-k="보내기">${웹 ? '보내기 · 파일 앱에 저장' : '보내기 (카톡 · 메일)'}</button>
      ${폰저장 ? '<button class="act" data-k="저장">폰에 저장 → 내 파일 › 다운로드 › 문서보기</button>' : ''}
      <button class="act" onclick="판닫기()">닫기</button>`);
    $('#sheet').onclick = async e => {
      const b = e.target.closest('[data-k]'); if (!b) return;
      판닫기();
      if (b.dataset.k === '열기') return 꺼내열기(f);
      if (바쁨) return; 바쁨 = true;
      try {
        진행('꺼내는 중…');
        const 바이트 = await 바이트얻기(f); if (!바이트) return;
        if (b.dataset.k === '보내기') await 보내기.넘기기(이름, 꼴(이름), 바이트);
        else if (await 저장하나('', 이름, 바이트)) 칩('저장함 → 내 파일 › 다운로드 › 문서보기');
        else 알림('<b>폰에 저장 안 됨</b><div class="sm">안드로이드 9 이하는 안 됨 → 「보내기」 로</div>');
      } catch (x) { 알림(`<b>실패</b><div class="sm">${글(x.message || x)}</div>`); }
      finally { if (!$('#chip').textContent.startsWith('저장함')) 진행끝(); 바쁨 = false; }
    };
  }

  // ⑤ 모두 풀어 저장 (갤럭시) ──────────────────────
  async function 모두저장() {
    if (바쁨) return; 바쁨 = true;
    const 밑 = 상태.d.name.replace(/\.zip$/i, '').trim() || '압축', 목록 = 상태.파일들, id = 상태.id;
    let 됨 = 0, 못 = 0;
    try {
      for (const [i, f] of 목록.entries()) {
        if (지금?.id !== id) break;
        진행(`저장 중 ${i + 1} / ${목록.length}`);
        const b = await 바이트얻기(f);
        if (!b) { if (취소함) break; 못++; continue; }
        const 마디 = f.길.split('/'), 이름 = 마디.pop();
        if (await 저장하나([밑, ...마디].join('/'), 이름, b)) 됨++; else 못++;
        if (!됨 && 못 && !다리.saveBytes) break;                // 첫 파일부터 안 되면 (안드로이드 9 이하) 그만
      }
    } catch (e) { 못++; }
    finally { 진행끝(); 바쁨 = false; }
    알림(됨 ? `<b>${됨}개 저장 → 내 파일 › 다운로드 › 문서보기 › ${글(밑)}</b>${못 ? `<div class="sm">못 한 것 ${못}개</div>` : '<div class="sm">폴더 짜임 그대로</div>'}`
      : '<b>저장 안 됨</b><div class="sm">안드로이드 9 이하는 안 됨 → 파일마다 ⋯ → 보내기</div>');
  }

  // ⑦ 뒤로 — app.js 의 popstate 가 맨 먼저 부름 · 맡으면 true
  function 뒤로() {
    const s = history.state, 깊 = s?.v === 'viewer' ? (s.깊이 || 0) : -1;
    if (!지금 || 깊 < 0 || !$('#thumbs').hidden) return false;
    const 압축쪽 = 지금.압축에서 || (지금.ext === 'zip' && 상태?.id === 지금.id);
    if (!압축쪽) return false;
    if (!$('#sheet').hidden) { 판닫기(); history.pushState({ v: 'viewer', 깊이: 지금.깊이, zip폴더: 지금.ext === 'zip' ? 상태.폴더 : undefined }, ''); return true; }
    if (지금.압축에서 && 깊 < 지금.깊이) {               // 꺼내 본 문서 → 그 ZIP 의 그 폴더
      const 곳 = 지금.압축에서;
      열기(곳.id, false, { 폴더: s.zip폴더 ?? 곳.폴더, 깊이: 곳.깊이, 압축에서: 곳.압축에서 });
      return true;
    }
    if (지금.ext === 'zip' && 깊 === 지금.깊이) { 상태.폴더 = s.zip폴더 || ''; 그리기(); return true; }
    return false;
  }

  return { 열기: 펼치기, 뒤로, 비우기: () => { 기억 = null; 상태 = null; } };
})();
