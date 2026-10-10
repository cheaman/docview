// 영상 화면 움직임 (36번 · v0.1 · 2026-10-04) — 단추 · 칸 · 상황 한 줄. 셈은 영상.js 에 있다.
// 구역 지도 : ① 상태 · 단계 ② 1 가져오기 ③ 2 자르기 · 물을 말 ④ 3 장면 고르기 · 보내기 ⑤ 4 내용 문서 ⑥ 시험 걸쇠
// 잠금 표 (화면규칙 1장) — 잠그는 단추는 둘뿐, 나머지는 늘 눌림 · 안 되면 그 칸 «상황» 줄에 까닭을 씀
//   [장면 뽑기 →]      뽑는 동안 잠금        → 두 번 눌러 겹쳐 뽑는 것 막기 · 끝나면 풀림 (뽑기실행 finally)
//   [클로드에게 보내기] 고른 장면 0 이면 잠금  → 빈 장면판을 안 보냄 · 하나라도 고르면 풀림 (요약그리기)
//   4 내용 문서 단추 넷 — 잠그지 않음, 답이 비었으면 상황 줄에 «클로드 답을 먼저 붙여 넣기»
'use strict';
const $ = id => document.getElementById(id);
const v = $('영상');

// ① 상태 · 단계 ────────────────────────────────────────
const 상태 = { 파일: null, 출처: '녹화 영상', 길이: 0, 시작: 0, 끝: 0, 방식: '바뀔때', 손장면: [], 장면들: [], 꼴: '판', 지금: 1, 끝난단계: 0 };
function 단계(n) {
  상태.지금 = n; 상태.끝난단계 = Math.max(상태.끝난단계, n - 1);
  [1, 2, 3, 4].forEach(k => { $('칸' + k).hidden = k !== n; });
  document.querySelectorAll('#단계 span').forEach(s => {
    const k = +s.dataset.n;
    s.className = k === n ? '지금' : k <= 상태.끝난단계 || (k <= 3 && 상태.장면들.length && k < n) ? '됨' : '';
  });
  window.scrollTo(0, 0);
}
document.querySelectorAll('#단계 span').forEach(s => s.onclick = () => {
  const k = +s.dataset.n;
  if (k === 1 || k === 4 || (k === 2 && 상태.파일) || (k === 3 && 상태.장면들.length)) 단계(k);
});
function 칩고르기(묶음id, 바꿀때) {
  $(묶음id).querySelectorAll('.칩').forEach(b => b.onclick = () => {
    $(묶음id).querySelectorAll('.칩').forEach(x => x.classList.toggle('켬', x === b));
    바꿀때(b.dataset.v, b);
  });
}

// ② 1 가져오기 ─────────────────────────────────────────
async function 가져오기(파일) {
  상태.파일 = 파일; 상태.손장면 = []; 상태.장면들 = []; $('손수').textContent = '';
  $('상황2').textContent = '영상 여는 중 …';
  단계(2);
  try {
    상태.길이 = await 영상.열기(v, 파일);
    상태.시작 = 0; 상태.끝 = 상태.길이;
    $('시작').value = 0; $('끝').value = 1000;
    자르기그림();
    $('상황2').textContent = `영상 ${영상.시각(상태.길이)} · ${v.videoWidth}×${v.videoHeight}`;
  } catch (e) {
    $('상황2').textContent = '이 영상은 못 엶 → ' + e.message;
  }
}
$('파일').onchange = e => { const f = e.target.files[0]; if (f) 가져오기(f); };
const 놓는곳 = $('놓는곳');
놓는곳.ondragover = e => { e.preventDefault(); 놓는곳.classList.add('위'); };
놓는곳.ondragleave = () => 놓는곳.classList.remove('위');
놓는곳.ondrop = e => { e.preventDefault(); 놓는곳.classList.remove('위'); const f = e.dataTransfer.files[0]; if (f) 가져오기(f); };
$('문서만').onclick = () => { 단계(4); 문서그리기(); $('답').focus(); };

// ③ 2 자르기 · 물을 말 ─────────────────────────────────
function 자르기그림() {
  const 길이 = 상태.길이 || 1;
  $('쓸').style.left = (상태.시작 / 길이 * 100) + '%';
  $('쓸').style.width = ((상태.끝 - 상태.시작) / 길이 * 100) + '%';
  $('시작글').textContent = 영상.시각(상태.시작);
  $('끝글').textContent = 영상.시각(상태.끝);
  $('길이글').textContent = `쓸 부분 ${영상.시각(상태.끝 - 상태.시작)}`;
}
function 자르기바뀜(누구) {
  const 길이 = 상태.길이, 최소 = Math.min(1, 길이 / 2);
  let s = $('시작').value / 1000 * 길이, e = $('끝').value / 1000 * 길이;
  if (e - s < 최소) { if (누구 === '시작') s = e - 최소; else e = s + 최소; }
  상태.시작 = Math.max(0, s); 상태.끝 = Math.min(길이, e);
  $('시작').value = Math.round(상태.시작 / 길이 * 1000); $('끝').value = Math.round(상태.끝 / 길이 * 1000);
  자르기그림();
  v.currentTime = 누구 === '시작' ? 상태.시작 : Math.max(0, 상태.끝 - 0.05);
}
$('시작').oninput = () => 자르기바뀜('시작');
$('끝').oninput = () => 자르기바뀜('끝');
$('여기시작').onclick = () => { $('시작').value = Math.round(v.currentTime / 상태.길이 * 1000); 자르기바뀜('시작'); };
$('여기끝').onclick = () => { $('끝').value = Math.round(v.currentTime / 상태.길이 * 1000); 자르기바뀜('끝'); };
칩고르기('방식', 값 => { 상태.방식 = 값; });
칩고르기('물음칩', 값 => { $('물음').value = 값; if (!값) $('물음').focus(); });

$('뽑기').onclick = () => 뽑기실행();
async function 뽑기실행() {
  if (!상태.파일) return;
  v.pause();
  단계(3);
  $('뽑기').disabled = true;
  $('격자').innerHTML = ''; $('미리판').innerHTML = ''; $('상황3').textContent = '장면 뽑는 중 …';
  const 막대 = $('진행').firstElementChild; $('진행').hidden = false; 막대.style.width = '0%';
  try {
    const 뽑은 = await 영상.뽑기(v, { 시작: 상태.시작, 끝: 상태.끝, 방식: 상태.방식, 알림: p => { 막대.style.width = Math.round(p * 100) + '%'; } });
    const 모두 = [...뽑은, ...상태.손장면].sort((a, b) => a.t - b.t)
      .filter((s, i, 줄) => i === 0 || s.t - 줄[i - 1].t > 0.3);           // 손으로 넣은 것과 겹치면 하나만
    상태.장면들 = 모두.map(s => ({ ...s, 고름: true, 작은: s.그림.toDataURL('image/jpeg', 0.7) }));
    격자그리기();
    $('상황3').textContent = `장면 ${상태.장면들.length} 뽑음 → 필요 없는 장면은 눌러서 빼기`;
  } catch (e) {
    $('상황3').textContent = '장면을 못 뽑음 → ' + e.message;
  } finally {
    $('뽑기').disabled = false; $('진행').hidden = true;
  }
}

// ④ 3 장면 고르기 · 보내기 ─────────────────────────────
const 고른것 = () => 상태.장면들.filter(s => s.고름);
function 격자그리기() {
  $('격자').innerHTML = '';
  상태.장면들.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = '장면' + (s.고름 ? '' : ' 뺌');
    b.innerHTML = `<img alt="" src="${s.작은}"><b>${i + 1} · ${영상.시각(s.t)}</b><i>${s.고름 ? '✓' : '✕'}</i>`;
    b.onclick = () => { s.고름 = !s.고름; 격자그리기(); };
    $('격자').appendChild(b);
  });
  요약그리기();
}
let 미리판때 = 0;
function 요약그리기() {
  const n = 고른것().length;
  $('고른수').innerHTML = `장면 ${상태.장면들.length} 중 <b>${n}</b> 고름`;
  $('판수').textContent = 상태.꼴 === '판' ? `→ 장면판 ${Math.ceil(n / 9)}장` : `→ 그림 ${n}장`;
  $('함께글').value = 영상.함께갈글({ 출처: 상태.출처, 길이: 상태.끝 - 상태.시작, 장수: n, 낱장: 상태.꼴 === '낱장', 물음: $('물음').value });
  $('보내기').disabled = !n;
  if (typeof 준비버림 === 'function') 준비버림();     // 고른 장면이 바뀌면 만들어 둔 그림은 버림
  clearTimeout(미리판때); 미리판때 = setTimeout(미리판그리기, 200);
  if (typeof 복사줄그리기 === 'function') 복사줄그리기();
}
function 미리판그리기() {
  $('미리판').innerHTML = '';
  if (상태.꼴 !== '판') return;
  영상.장면판들(고른것(), { 머리글: 상태.출처 }).forEach(c => {
    const im = new Image(); im.src = c.toDataURL('image/jpeg', 0.6); $('미리판').appendChild(im);
  });
}
칩고르기('꼴', 값 => { 상태.꼴 = 값; 요약그리기(); });
$('손으로').onclick = () => {                     // 2 단계 — 영상을 멈춘 자리 한 장을 «꼭 넣을 장면» 으로
  const t = v.currentTime;
  if (상태.손장면.some(s => Math.abs(s.t - t) < 0.3)) return;
  상태.손장면.push({ t, 그림: 영상.한장(v) });
  $('손수').textContent = `꼭 넣을 장면 ${상태.손장면.length} (${상태.손장면.map(s => 영상.시각(s.t)).join(' · ')})`;
};

// 앱용 = 갤럭시 문서보기 앱으로 보낼 때 — toBlob 없이 바로 base64 (영상.앱그림 · 10-10 폰에서 멈춤)
async function 보낼파일들(앱용 = false) {
  const 고른 = 고른것();
  const 그림들 = 상태.꼴 === '판'
    ? 영상.장면판들(고른, { 머리글: 상태.출처 }).map((c, i) => [c, `장면판_${i + 1}.jpg`])
    : 고른.map((s, i) => [s.그림, `장면_${String(i + 1).padStart(2, '0')}_${영상.시각(s.t).replace(':', '-')}.jpg`]);
  if (앱용) return 그림들.map(([c, 이름]) => 영상.앱그림(c, 이름));
  return 영상.제한(Promise.all(그림들.map(([c, 이름]) => 영상.파일로(c, 이름))), 20000, '그림 만들기');
}
const 앱안 = () => !!(window.Android && window.Android.shareMultiBegin);
// 폰 공유 창은 «누른 손가락» 이 식으면 거절함 (34번 10-03 실측) → 그림을 만드느라 늦어 거절되면
// 만든 파일을 들고 「보낼 준비 됨 → 한 번 더 누르기」 로 바꿔 두고, 다음 누름에 바로 보냄
let 보낼준비 = null;
const 보내기글 = '클로드에게 보내기';
function 준비버림() { 보낼준비 = null; $('보내기').textContent = 보내기글; }
$('보내기').onclick = async () => {
  try {
    if (!보낼준비) { $('상황3').textContent = '그림 만드는 중 …'; await 쉼(30) /* 글이 먼저 화면에 그려지게 */; 보낼준비 = { 파일들: await 보낼파일들(앱안()), 글: $('함께글').value }; }
    const 어떻게 = await 영상.보내기(보낼준비.파일들, 보낼준비.글, 글 => { $('상황3').textContent = 글; });
    준비버림();
    $('상황3').textContent = 어떻게 === '공유'
      ? '공유 창을 열었음 → 클로드 고르기 · 답이 오면 「4 내용 문서」'
      : '내려받았음 · 함께 갈 글은 복사해 둠 → 클로드에 그림 올리고 글 붙여 넣기';
  } catch (e) {
    if (e.name === 'NotAllowedError' && 보낼준비) {
      $('보내기').textContent = '보낼 준비 됨 → 한 번 더 누르기';
      $('상황3').textContent = '그림 다 만듦 → 단추를 한 번 더 누르면 공유 창';
      return;
    }
    준비버림();
    $('상황3').textContent = e.name === 'AbortError' ? '보내기를 닫았음' : '못 보냄 → ' + e.message;
  }
};
$('함께글').oninput = 준비버림;
function 내려받기(파일) { const a = document.createElement('a'); a.href = URL.createObjectURL(파일); a.download = 파일.name; document.body.appendChild(a); a.click(); a.remove(); }
$('저장만').onclick = async () => {
  const 파일들 = await 보낼파일들();
  for (const f of 파일들) { 내려받기(f); await new Promise(r => setTimeout(r, 250)); }
  $('상황3').textContent = `그림 ${파일들.length}장 저장함`;
};
// 복사해서 붙여 넣기 (10-10 · «카피해서 클로드에 전달» 요청) — 공유 창이 안 뜰 때의 다른 길
//   폰 클립보드는 한 칸 → 그림 한 장 또는 글 하나씩 : 복사 → 클로드 입력칸 길게 눌러 붙여넣기 → 다음 것
//   갤럭시 앱 : 문서보기 「복사」 다리(copyBegin/Chunk/End → 클립보드 그림) · 웹 : ClipboardItem(약속을 누른 손가락 안에서 바로)
function 복사줄그리기() {
  const n = 고른것().length, 장수 = 상태.꼴 === '판' ? Math.ceil(n / 9) : n;
  $('복사줄').innerHTML = n ? '복사해서 붙여 넣기 :' : '';
  if (!n) return;
  const 단추 = (글, 할일) => { const b = document.createElement('button'); b.textContent = 글; b.onclick = 할일; $('복사줄').appendChild(b); };
  if (장수 > 1 && window.Android && window.Android.copyMultiBegin) 단추(`📋 모두 (그림 ${장수} + 글)`, 모두복사);
  단추('📋 글', 글복사);
  for (let i = 0; i < 장수; i++) 단추(`📋 그림 ${i + 1}`, () => 그림복사(i));
}
// 📋 모두 (10-10) — 갤럭시 앱만 : 클립보드 한 칸에 그림 여러 장 + 글 (붙여 넣는 앱이 첫 장만 받으면 낱개 단추로)
async function 모두복사() {
  const 앱 = window.Android, n = 상태.꼴 === '판' ? Math.ceil(고른것().length / 9) : 고른것().length;
  try {
    $('상황3').textContent = `그림 ${n}장 복사하는 중 …`; await 쉼(30);
    if (!앱.copyMultiBegin()) throw new Error('파일을 못 만듦');
    for (let i = 0; i < n; i++) {
      $('상황3').textContent = `그림 ${i + 1}/${n} 복사하는 중 …`; await 쉼(0);
      const b64 = 복사할캔버스(i).toDataURL('image/png').split(',')[1], 글크기 = 524288;
      if (!앱.copyMultiFile(i + 1)) throw new Error('파일을 못 만듦');
      for (let k = 0; k < b64.length; k += 글크기) if (!앱.copyChunk(b64.slice(k, k + 글크기))) throw new Error('쓰기 실패 (폰 저장 공간?)');
    }
    if (!앱.copyMultiEnd($('함께글').value)) throw new Error('클립보드에 못 넣음');
    $('상황3').textContent = `그림 ${n}장 + 글 복사함 → 클로드 입력칸 길게 눌러 붙여넣기 (한 장만 들어가면 아래 낱개 단추로)`;
  } catch (e) { $('상황3').textContent = '모두 복사 못 함 → ' + e.message; }
}
function 복사할캔버스(i) {
  const 고른 = 고른것();
  return 상태.꼴 === '판' ? 영상.장면판들(고른, { 머리글: 상태.출처 })[i] : 고른[i].그림;
}
function 글복사() {
  const 글 = $('함께글').value;
  const t = document.createElement('textarea'); t.value = 글; t.setAttribute('readonly', ''); t.style.cssText = 'position:fixed;top:0;left:-9999px';
  document.body.appendChild(t); t.select(); let 됨 = false;
  try { 됨 = document.execCommand('copy'); } catch (e) { /* 아래 길로 */ }
  t.remove();
  if (됨) { $('상황3').textContent = '글 복사함 → 클로드 입력칸 길게 눌러 붙여넣기'; return; }
  (navigator.clipboard ? 영상.제한(navigator.clipboard.writeText(글), 5000, '글 복사') : Promise.reject(new Error('복사 못 하는 브라우저')))
    .then(() => { $('상황3').textContent = '글 복사함 → 클로드 입력칸 길게 눌러 붙여넣기'; })
    .catch(e => { $('상황3').textContent = '글 복사 못 함 → 글 칸을 길게 눌러 직접 복사 (' + e.message + ')'; });
}
async function 그림복사(i) {
  const 다 = `그림 ${i + 1} 복사함 → 클로드 입력칸 길게 눌러 붙여넣기`;
  try {
    const c = 복사할캔버스(i);
    const 앱 = window.Android;
    if (앱 && 앱.copyBegin) {
      $('상황3').textContent = `그림 ${i + 1} 복사하는 중 …`; await 쉼(30);
      const b64 = c.toDataURL('image/png').split(',')[1], 글크기 = 524288;   // 다리 파일 이름이 .png — 꼴을 맞춤 · toBlob 안 씀
      if (!앱.copyBegin()) throw new Error('파일을 못 만듦');
      for (let k = 0; k < b64.length; k += 글크기) if (!앱.copyChunk(b64.slice(k, k + 글크기))) throw new Error('쓰기 실패 (폰 저장 공간?)');
      if (!앱.copyEnd()) throw new Error('클립보드에 못 넣음');
      $('상황3').textContent = 다; return;
    }
    if (!navigator.clipboard || !window.ClipboardItem) throw new Error('그림 복사를 못 하는 브라우저 → 「저장만」');
    const 약속 = new Promise((ok, no) => c.toBlob(b => b ? ok(b) : no(new Error('그림을 못 만듦')), 'image/png'));
    await 영상.제한(navigator.clipboard.write([new ClipboardItem({ 'image/png': 약속 })]), 15000, '그림 복사');
    $('상황3').textContent = 다;
  } catch (e) { $('상황3').textContent = `그림 ${i + 1} 복사 못 함 → ` + e.message; }
}
$('다음4').onclick = () => { 단계(4); 문서그리기(); $('답').focus(); };

// ⑤ 4 내용 문서 ────────────────────────────────────────
const 출처줄 = () => (상태.파일 ? `${상태.출처} · ${영상.시각(상태.끝 - 상태.시작)} · ` : '클로드 답 · ') + `${영상.오늘()} 정리 · DSM 문서보기`;
const 지금md = () => 영상.마크다운({ 제목: $('제목').value.trim(), 출처줄: 출처줄(), 본문: $('답').value });
const 파일이름 = 꼬리 => ($('제목').value.trim() || '내용 정리').replace(/[\\/:*?"<>|]/g, ' ').slice(0, 60) + 꼬리;
const 엑 = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const 굵게 = s => 엑(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
function 미리보기(md) {                            // 화면에 보이는 꼴 — 워드와 같은 몇 가지만
  const 줄들 = md.split('\n'), 결과 = [];
  for (let i = 0; i < 줄들.length; i++) {
    const l = 줄들[i]; let m;
    if (/^\s*\|/.test(l)) {
      const 묶 = []; while (i < 줄들.length && /^\s*\|/.test(줄들[i])) 묶.push(줄들[i++]); i--;
      결과.push('<table>' + 묶.filter(r => !/^\|?[\s:|-]+\|?$/.test(r.trim()) || !/-/.test(r)).map(r => '<tr>' + r.trim().replace(/^\||\|$/g, '').split('|').map(c => `<td>${굵게(c.trim())}</td>`).join('') + '</tr>').join('') + '</table>');
    } else if ((m = l.match(/^(#{1,3})\s+(.*)/))) 결과.push(`<h${m[1].length}>${굵게(m[2])}</h${m[1].length}>`);
    else if ((m = l.match(/^>\s?(.*)/))) 결과.push(`<blockquote>${굵게(m[1])}</blockquote>`);
    else if ((m = l.match(/^\s*[-*•]\s+(.*)/))) 결과.push(`<div>• ${굵게(m[1])}</div>`);
    else if (l.trim()) 결과.push(`<div>${굵게(l)}</div>`);
    else 결과.push('<div style="height:6px"></div>');
  }
  return 결과.join('');
}
function 문서그리기() {
  const 답 = $('답').value;
  const m = 답.match(/^#\s+(.+)/m);
  if (m && !$('제목').dataset.손) $('제목').value = m[1].trim();
  $('문서').innerHTML = 답.trim() ? 미리보기(지금md()) : '<span style="color:var(--faint)">붙여 넣으면 여기에 문서 모양으로 보임</span>';
}
$('답').oninput = 문서그리기;
$('제목').oninput = () => { $('제목').dataset.손 = '1'; 문서그리기(); };
const 문서있나 = () => { if ($('답').value.trim()) return true; $('상황4').textContent = '클로드 답을 먼저 붙여 넣기'; return false; };
$('복사').onclick = async () => { if (!문서있나()) return; try { await navigator.clipboard.writeText(지금md()); $('상황4').textContent = '복사함 → 메모 · 카톡에 붙여 넣기'; } catch (e) { $('상황4').textContent = '복사 못 함 → ' + e.message; } };
$('md').onclick = () => { if (!문서있나()) return; 내려받기(new File([지금md()], 파일이름('.md'), { type: 'text/markdown' })); $('상황4').textContent = '글 파일(.md) 저장함'; };
$('docx').onclick = () => { if (!문서있나()) return; 내려받기(new File([영상.워드(지금md())], 파일이름('.docx'))); $('상황4').textContent = '워드(.docx) 저장함'; };
$('문서보내기').onclick = async () => {
  if (!문서있나()) return;
  const 파일들 = [new File([지금md()], 파일이름('.md'), { type: 'text/markdown' }), new File([영상.워드(지금md())], 파일이름('.docx'), { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })];
  try {
    const 어떻게 = await 영상.보내기(파일들, '');
    $('상황4').textContent = 어떻게 === '공유' ? '공유 창을 열었음 → 옵시디언 · 카톡 · 노트 · 드라이브' : '글 파일 · 워드를 내려받았음';
  } catch (e) { $('상황4').textContent = e.name === 'AbortError' ? '보내기를 닫았음' : '못 보냄 → ' + e.message; }
};

// ⑥ 갤럭시 문서보기 앱 안에서 (34번에 실렸을 때) ─────────────
//   · 「영상 가져오기」 → 앱의 파일 고르기(Android.pickFile) → 껍데기가 앱 안에 복사하고 앱.받음() 을 부름
//   · video/index.html?doc=<id>&name=…  → 받은 영상(갤러리 「공유」 · 목록에서 누름)을 바로 엶
//   · video/index.html?text=1          → 클로드 앱에서 「공유」 한 답 글을 4 단계에 넣음
const 주소값 = new URLSearchParams(location.search);
async function 받은영상열기(id, 이름) {
  const 주소 = window.Android ? `/doc/${encodeURIComponent(id)}` : `../doc/${encodeURIComponent(id)}`;   // 웹앱은 일꾼(sw.js)이 보관함에서 내줌
  단계(2); $('상황2').textContent = '받은 영상 여는 중 …';
  try {
    const r = await fetch(주소); if (!r.ok) throw new Error('받은 영상을 못 찾음 ' + r.status);
    const b = await r.blob();
    상태.출처 = '받은 영상';
    await 가져오기(new File([b], 이름 || '영상', { type: b.type && b.type.startsWith('video/') ? b.type : 'video/mp4' }));
  } catch (e) { $('상황2').textContent = '영상을 못 엶 → ' + e.message; }
}
if (window.Android && window.Android.pickFile) {
  $('놓는곳').addEventListener('click', e => { e.preventDefault(); window.Android.pickFile(); });
  window.앱 = {                                    // 껍데기가 «새 파일 받음» 을 알릴 때 (문서보기 app.js 와 같은 이름)
    받음() {
      const s = window.Android.takePending(); if (!s) return;
      let p; try { p = JSON.parse(s); } catch (e) { return; }
      if (p.error) { 단계(1); $('상황2').textContent = '받은 파일을 못 읽음 → ' + p.error; return; }
      받은영상열기(p.id);
    },
  };
}

// ⑦ 시험 걸쇠 — 영상.html?시험=1 이면 3_시험\시험.js 를 불러 저절로 돌림
window.화면 = { 상태, 단계, 가져오기, 뽑기실행, 격자그리기, 요약그리기, 보낼파일들, 지금md, 문서그리기 };
단계(1);
if (주소값.get('doc')) 받은영상열기(주소값.get('doc'), 주소값.get('name'));
if (주소값.get('text') && window.Android && window.Android.takeSharedText) {
  const 받은글 = window.Android.takeSharedText();
  if (받은글) { 단계(4); $('답').value = 받은글; 문서그리기(); $('상황4').textContent = '클로드 답을 받았음 → 제목 확인 · 보내기'; }
}
if (/[?&]시험=1/.test(decodeURIComponent(location.search))) { const s = document.createElement('script'); s.src = '../3_시험/시험.js'; document.body.appendChild(s); }
