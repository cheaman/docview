// 문서 보기 — 아이폰 웹앱 다리 (2026-10-03 전무님 「아이폰에서도」 → 웹앱으로)
// 갤럭시 앱의 껍데기(MainActivity.java)가 하던 일을 브라우저 안에서 한다. 화면(app.js 등)은 갤럭시와 같은 파일
// 구역 지도
//   ① 보관함 — 받은 파일은 IndexedDB(docview/files) · 최근 목록 · 펜 표시는 localStorage (다리가 바로 답해야 해서)
//   ② 웹다리 — recent · remove · setInfo · loadMarks · saveMarks · pickFile · takePending · 보내기
//   ③ 웹PDF — 모질라 pdf.js(legacy 판 · pdfjs/)로 쪽 정보 · 쪽 그림 · 글 찾기
//   ④ 일꾼(sw.js) 등록 · 아이폰 화면 손질 (두 손가락 확대 막기 · 홈 화면 안내)
// 인터넷 : 처음 한 번 앱을 받을 때만. 문서는 이 폰 밖으로 나가지 않는다 (보내기는 사용자가 고른 앱으로만)
'use strict';
(() => {
  const 최대 = 30;
  const 덧칸 = ['메모', '돌림', '묶음', '자리', '즐겨', '책갈피', '축척'];   // 문서마다 덧붙이는 칸 · 묶음(10-04) 과업 이름표 · 자리 · 즐겨 · 책갈피(10-05)
  const 읽기 = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const 쓰기 = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); return true; } catch (e) { return false; } };
  const 표열쇠 = id => 'docview-marks-' + id;

  // ① 보관함 ─────────────────────────────────────────
  let 보관함약속 = null;
  const 보관함 = () => (보관함약속 ||= new Promise((ok, no) => {
    const r = indexedDB.open('docview', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
  }));
  const 일 = (방식, f) => 보관함().then(db => new Promise((ok, no) => {
    const t = db.transaction('files', 방식), q = f(t.objectStore('files'));
    t.oncomplete = () => ok(q?.result); t.onerror = () => no(t.error); t.onabort = () => no(t.error);
  }));
  const 파일넣기 = (id, 것) => 일('readwrite', s => s.put(것, id));
  const 파일꺼내기 = id => 일('readonly', s => s.get(id));
  const 파일빼기 = id => 일('readwrite', s => s.delete(id)).catch(() => {}).then(() => 일('readwrite', s => s.delete('text:' + id)).catch(() => {}));   // 문서 속 글(0.9.6)도 같이
  navigator.storage?.persist?.();                      // 사파리가 오래 안 쓴 보관함을 지우지 않게 부탁
  // doc/<id> 는 일꾼을 거치지 않고 여기서 보관함으로 바로 — 처음 연 날은 일꾼이 아직 자리를 안 잡아 「원본 없음」 이 났음 (10-03 실측)
  const 원래fetch = window.fetch.bind(window);
  window.fetch = async (u, o) => {
    const 주소 = new URL(typeof u === 'string' ? u : u?.url || '', location.href);
    const m = 주소.origin === location.origin && /\/doc\/([^/?#]+)$/.exec(주소.pathname);
    if (!m) return 원래fetch(u, o);
    const 것 = await 파일꺼내기(decodeURIComponent(m[1])).catch(() => null);
    if (!것) return new Response('{"error":"원본 없음"}', { status: 404, headers: { 'Content-Type': 'application/json' } });
    return new Response(것.blob, { headers: { 'Content-Type': 것.type || 'application/octet-stream' } });
  };

  const 목록 = () => 읽기('docview-recent', []);
  const 목록쓰기 = a => 쓰기('docview-recent', a);
  const 확장자 = (이름, 꼴) => {
    const i = 이름.lastIndexOf('.');
    if (i > 0 && i < 이름.length - 1) return 이름.slice(i + 1).toLowerCase();
    return { 'application/pdf': 'pdf', 'text/plain': 'txt', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'text/html': 'html' }[꼴] || '';
  };
  let 마지막id = 0;
  async function 받기(파일, 어디서 = '내 파일') {         // 갤럭시 껍데기의 copyIn + addRecent 와 같음
    마지막id = Math.max(Date.now(), 마지막id + 1);       // ZIP 에서 잇달아 꺼내도 번호가 안 겹치게
    const id = String(마지막id), ext = 확장자(파일.name, 파일.type);
    await 파일넣기(id, { blob: 파일, type: 파일.type || '', name: 파일.name });
    const 새 = { id, name: 파일.name || '이름 없는 문서', ext, from: 어디서, when: Date.now(), size: 파일.size };
    const 옛 = 목록(), a = [새];
    for (const o of 옛) {
      const 같음 = o.name === 새.name && o.size === 새.size;   // 같은 파일을 또 받으면 쪽지 · 돌림 · 펜 표시를 새 줄로
      if (같음) {
        for (const k of 덧칸) if (o[k] != null && 새[k] == null) 새[k] = o[k];
        const 표 = localStorage.getItem(표열쇠(o.id)); if (표 && !localStorage.getItem(표열쇠(id))) 쓰기(표열쇠(id), 표);
      }
      if (같음 || (a.length >= 최대 && !o.즐겨)) { 파일빼기(o.id); 쓰기(표열쇠(o.id), null); } else a.push(o);   // 즐겨찾기(⭐)는 30개를 넘어도 남김 (10-05)
    }
    목록쓰기(a);
    return id;
  }

  // 보내기 — 사본이 다 만들어진 뒤에는 «누른 손가락» 이 지나가 바로 못 보냄(사파리 규칙) → 「보내기」 단추를 한 번 더
  function 보낼판(파일) {
    const 됨 = !!navigator.canShare?.({ files: [파일] });
    판열기(`<h3>보낼 준비 됨</h3>
      <div class="판설명">${글(파일.name)} · ${크기(파일.size)}</div>
      ${됨 ? '<button class="act" id="웹보냄">카톡 · 메일 · 메시지로 보내기</button>' : ''}
      <button class="act" id="웹저장">파일 앱에 저장</button>
      <button class="act" onclick="판닫기()">닫기</button>`);
    if (됨) $('#웹보냄').onclick = async () => {
      try { await navigator.share({ files: [파일], title: 파일.name }); 판닫기(); }
      catch (e) { if (e.name !== 'AbortError') 알림판('보내기 안 됨 → 「파일 앱에 저장」 뒤 거기서 보내기'); }
    };
    $('#웹저장').onclick = () => {
      const a = document.createElement('a'), u = URL.createObjectURL(파일);
      a.href = u; a.download = 파일.name; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(u), 60000); 판닫기();
    };
  }

  // ② 웹다리 ─────────────────────────────────────────
  let 대기 = '';
  window.웹다리 = {
    recent: () => JSON.stringify(목록()),
    remove: id => { 목록쓰기(목록().filter(o => o.id !== id)); 파일빼기(id); 쓰기(표열쇠(id), null); },
    setInfo: (id, k, v) => {
      if (!덧칸.includes(k)) return;
      const a = 목록();
      for (const o of a) if (o.id === id) { if (!v || (k === '돌림' && v === '0')) delete o[k]; else o[k] = String(v).slice(0, 20000); }
      목록쓰기(a);
    },
    loadText: id => 일('readonly', s => s.get('text:' + id)).then(v => v || '', () => ''),   // 문서 속 글 (0.9.6 · 전체 찾기)
    saveText: (id, j) => (목록().some(o => o.id === id) ? 일('readwrite', s => (j ? s.put(j, 'text:' + id) : s.delete('text:' + id))).then(() => true, () => false) : false),
    loadMarks: id => localStorage.getItem(표열쇠(id)) || '',
    saveMarks: (id, j) => {
      if (!목록().some(o => o.id === id)) return false;
      if (!쓰기(표열쇠(id), j || null)) { 알림판('펜 표시를 못 저장함 → 폰 저장 공간 확인'); return false; }
      return true;
    },
    takePending: () => { const p = 대기; 대기 = ''; return p; },
    pickFile: () => {
      const i = document.createElement('input');
      i.type = 'file';
      // 아이폰 파일 고르기는 애플이 모르는 확장자(.hwp · .dxf 등)를 흐리게 막음 → 아이폰은 제한 없이 (못 여는 형식은 앱이 알림)
      if (!/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) || !('ontouchend' in document))
        i.accept = '.pdf,.hwp,.hwpx,.doc,.docx,.txt,.xls,.xlsx,.html,.htm,.dxf,.dwg,.zip,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.bmp,.heic,.heif,application/pdf,image/*,text/plain';
      i.onchange = async () => {
        const f = i.files?.[0]; if (!f) return;
        try { 대기 = JSON.stringify({ id: await 받기(f) }); }
        catch (e) { 대기 = JSON.stringify({ error: (e && e.name === 'QuotaExceededError') ? '폰 저장 공간이 모자람' : String(e?.message || e) }); }
        window.앱?.받음();
      };
      i.click();
    },
    shareBytes: (이름, 꼴, 바이트) => 보낼판(new File([바이트], 이름, { type: 꼴 })),
    // 복사 (10-04) — 그림을 클립보드로 · 사파리는 «누른 손가락» 안에서 바로 불러야 해서 그림은 약속(Promise)으로 받음
    copyImage: 약속 => {
      if (!navigator.clipboard?.write || !window.ClipboardItem) return Promise.reject(new Error('이 브라우저는 그림 복사를 못 함'));
      return navigator.clipboard.write([new ClipboardItem({ 'image/png': 약속 })]);
    },
    // ZIP 에서 꺼낸 파일을 받은 문서처럼 (10-04 · zipview.js) → 새 id
    addBytes: (이름, 어디서, 바이트) => 받기(new File([바이트], 이름, { type: '' }), 어디서),
    shareOriginal: id => {
      const d = 목록().find(o => o.id === id);
      파일꺼내기(id).then(것 => {
        if (!것) return 알림판('원본 없음 → 목록에서 빼고 다시 넣기');
        보낼판(new File([것.blob], d?.name || 것.name || '문서', { type: 것.type || 'application/octet-stream' }));
      }, e => 알림판('원본을 못 읽음 · ' + e));
      return true;
    },
    version: () => '웹 ' + (document.querySelector('meta[name="docview-ver"]')?.content || ''),
    android: () => navigator.userAgent.replace(/^.*?\(([^)]*)\).*$/, '$1'),
  };

  // ③ 웹PDF — pdf.js 는 처음 PDF 를 열 때 한 번 불러옴 (모듈 · 일꾼)
  let 라이브러리약속 = null, 열린 = null;              // 열린 = { id, 약속, 글: Map(쪽 → 글자 배열) }
  const 라이브러리 = () => (라이브러리약속 ||= import('./pdfjs/pdf.min.mjs').then(lib => {
    lib.GlobalWorkerOptions.workerSrc = 'pdfjs/pdf.worker.min.mjs'; return lib;
  }));
  function 문서(id) {
    if (열린?.id === id) return 열린.약속;
    열린?.약속.then(d => d.destroy()).catch(() => {});
    const 약속 = (async () => {
      const lib = await 라이브러리();
      const r = await fetch('doc/' + encodeURIComponent(id));
      if (!r.ok) throw Object.assign(new Error('원본 없음'), { 원본없음: true });
      const data = new Uint8Array(await r.arrayBuffer());
      return lib.getDocument({ data, cMapUrl: 'pdfjs/cmaps/', cMapPacked: true, standardFontDataUrl: 'pdfjs/standard_fonts/', wasmUrl: 'pdfjs/wasm/', isEvalSupported: false, enableXfa: false }).promise;
    })();
    열린 = { id, 약속, 글: new Map() };
    약속.catch(() => { if (열린?.약속 === 약속) 열린 = null; });
    return 약속;
  }
  // 쪽 그리기는 둘씩만 (아이폰 메모리) — 줄 세움
  let 그리는중 = 0; const 줄 = [];
  const 차례 = f => new Promise((ok, no) => { 줄.push({ f, ok, no }); 다음(); });
  function 다음() {
    while (그리는중 < 2 && 줄.length) {
      const { f, ok, no } = 줄.shift(); 그리는중++;
      f().then(ok, no).finally(() => { 그리는중--; 다음(); });
    }
  }
  window.웹PDF = {
    async 정보(id) {
      try {
        const doc = await 문서(id), sizes = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const vp = (await doc.getPage(i)).getViewport({ scale: 1 });
          sizes.push([Math.round(vp.width), Math.round(vp.height)]);
        }
        return { pages: doc.numPages, sizes };
      } catch (e) {
        if (e?.원본없음) return { error: '원본 없음' };
        if (e?.name === 'PasswordException') return { error: '암호', detail: e.message };
        return { error: '깨짐', detail: `${e?.name || ''} ${e?.message || e}`.trim() };
      }
    },
    쪽: (id, n, w) => 차례(async () => {
      const page = await (await 문서(id)).getPage(n + 1);
      const vp0 = page.getViewport({ scale: 1 });
      const 배 = Math.min(w / vp0.width, Math.sqrt(16e6 / (vp0.width * vp0.height)));   // 아이폰 캔버스 한도(약 1,670만 화소) 안
      const vp = page.getViewport({ scale: 배 });
      const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(vp.width)); c.height = Math.max(1, Math.round(vp.height));
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      await page.render({ canvasContext: x, canvas: c, viewport: vp }).promise;
      const b = await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.9));
      c.width = c.height = 0;
      if (!b) throw new Error('쪽 그림 만들기 실패 (메모리)');
      return URL.createObjectURL(b);
    }),
    놓기: u => { if (typeof u === 'string' && u.startsWith('blob:')) URL.revokeObjectURL(u); },
    // 목차 (0.9.8 ⑯) — pdf.js 책갈피 → [{ 글, 쪽, 깊이 }]
    async 목차(id) {
      const doc = await 문서(id), ol = await doc.getOutline().catch(() => null), 목 = [];
      const 쪽 = async dest => { try { if (typeof dest === 'string') dest = await doc.getDestination(dest); if (!Array.isArray(dest)) return null; const r = dest[0]; return typeof r === 'number' ? r : await doc.getPageIndex(r); } catch (e) { return null; } };
      const 걷기 = async (items, 깊이) => { for (const it of items || []) { if (목.length >= 800) return; 목.push({ 글: String(it.title || '').replace(/\s+/g, ' ').trim(), 쪽: await 쪽(it.dest), 깊이 }); if (깊이 < 6) await 걷기(it.items, 깊이 + 1); } };
      await 걷기(ol, 0);
      return 목.filter(x => x.글);
    },
    // 쪽마다 글 (0.9.6 · 전체 찾기)
    async 글(id) {
      const doc = await 문서(id), pages = [];
      for (let i = 0; i < doc.numPages; i++) {
        const tc = await (await doc.getPage(i + 1)).getTextContent();
        pages.push(tc.items.map(it => (it.str || '') + (it.hasEOL ? '\n' : '')).join('').slice(0, 200000));
      }
      return { pages };
    },
    // 글 찾기 — 빈칸은 빼고 견줌(한글 PDF 는 글자마다 끊기거나 빈칸이 끼는 일이 많음) · 상자는 쪽 안 0~1
    async 찾기(id, q) {
      const doc = await 문서(id), 낱 = q.replace(/\s+/g, '').toLowerCase();
      if (!낱) return { hits: [] };
      const hits = []; let 글있음 = false;
      for (let i = 0; i < doc.numPages && hits.length < 2000; i++) {
        let 쪽글 = 열린?.id === id ? 열린.글.get(i) : null;
        const page = await doc.getPage(i + 1), vp = page.getViewport({ scale: 1 });
        if (!쪽글) {
          const tc = await page.getTextContent(), 자 = [];
          tc.items.forEach((it, k) => { if (!it.str) return; for (let j = 0; j < it.str.length; j++) if (!/\s/.test(it.str[j])) 자.push([it.str[j].toLowerCase(), k, j]); });
          쪽글 = { 자, 글: 자.map(a => a[0]).join(''), items: tc.items };
          if (열린?.id === id) 열린.글.set(i, 쪽글);
        }
        if (쪽글.글) 글있음 = true;
        for (let at = 쪽글.글.indexOf(낱); at >= 0 && hits.length < 2000; at = 쪽글.글.indexOf(낱, at + 낱.length)) {
          const 조각 = new Map();                           // 글 조각(item)마다 [처음 글자, 끝 글자]
          for (let k = at; k < at + 낱.length; k++) { const [, it, j] = 쪽글.자[k]; const s = 조각.get(it); 조각.set(it, s ? [s[0], j] : [j, j]); }
          const b = [];
          for (const [k, [s, e]] of 조각) {
            const it = 쪽글.items[k], L = it.str.length || 1, t = it.transform;
            const 높 = it.height || Math.hypot(t[2], t[3]) || 10;
            const x0 = t[4] + it.width * s / L, x1 = t[4] + it.width * (e + 1) / L;
            const m = vp.transform, 점 = (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];   // pdf.js 6 에는 convertToViewportRectangle 이 없음
            const [a0, b0] = 점(x0, t[5] - 높 * 0.22), [a1, b1] = 점(x1, t[5] + 높 * 0.88);
            b.push([Math.min(a0, a1) / vp.width, Math.min(b0, b1) / vp.height, Math.max(a0, a1) / vp.width, Math.max(b0, b1) / vp.height].map(v => Math.round(v * 1e4) / 1e4));
          }
          hits.push({ p: i, b });
        }
      }
      return { hits, text: 글있음, more: hits.length >= 2000 };
    },
  };

  // ④ 일꾼 · 아이폰 손질 ─────────────────────────────
  if ('serviceWorker' in navigator) {
    // 새 판 받기 (10-05) — 아이폰 홈 화면 앱은 다른 앱에 갔다 와도 새로 읽지 않아 옛 판에 머묾 (전무님 폰이 10-04 판 그대로였음)
    //   → 앱이 앞으로 나올 때마다 새 판 확인 · 새 일꾼이 자리 잡으면 목록 화면에서 저절로 새로 엶 (문서를 보는 중이면 목록으로 나올 때)
    const 처음일꾼 = navigator.serviceWorker.controller;
    navigator.serviceWorker.register('sw.js').then(reg => {
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(e => console.warn('일꾼 등록 실패', e));
    let 새판 = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!처음일꾼 || 새판) return;                   // 처음 설치 때는 그대로
      새판 = true;
      const 목록인가 = () => !document.getElementById('home')?.hidden;
      if (목록인가()) return location.reload();
      const 지켜 = setInterval(() => { if (목록인가()) { clearInterval(지켜); location.reload(); } }, 1000);
    });
  }
  document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });   // 사파리가 화면 전체를 키우지 않게
  document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
  addEventListener('DOMContentLoaded', () => {
    const how = document.querySelector('#empty .how');
    if (how) how.innerHTML = `<div><b>카톡에서</b> → 파일 누름 → <span class="pill">공유</span> → <span class="pill">파일에 저장</span> → 여기서 <b>파일 열기</b></div>
      <div><b>되는 파일</b> → PDF · 한글(HWP · HWPX) · 워드(DOC · DOCX) · TXT · 엑셀 · PPT · HTML · 그림(HEIC 포함) · 도면(DXF) · 압축(ZIP — 풀지 않고 안을 봄)</div>`;
    const 홈에있음 = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
    if (!홈에있음 && /iPhone|iPad|iPod/.test(navigator.userAgent)) {
      const 띠 = document.createElement('div'); 띠.className = '홈안내';
      띠.innerHTML = '<b>홈 화면에 붙이기</b> → 아래 <span class="pill">공유 ⬆</span> → <span class="pill">홈 화면에 추가</span> · 그 뒤로는 인터넷 없이 열림<button class="ib" aria-label="닫기">×</button>';
      띠.querySelector('button').onclick = () => 띠.remove();
      document.querySelector('#home')?.insertBefore(띠, document.querySelector('#list'));
    }
  });
})();
